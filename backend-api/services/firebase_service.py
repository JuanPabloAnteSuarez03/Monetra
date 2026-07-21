import json
import os
from typing import Optional

import firebase_admin
from dotenv import load_dotenv
from fastapi import HTTPException, Request
from firebase_admin import auth, credentials, firestore

load_dotenv()


class FirebaseServiceError(Exception):
    pass


def initialize_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    print(
        f"FIREBASE INIT DEBUG: service_account_json presente={bool(service_account_json)} "
        f"len={len(service_account_json) if service_account_json else 0} "
        f"service_account_path={service_account_path!r} project_id={project_id!r}"
    )

    try:
        if service_account_json:
            service_account_data = json.loads(service_account_json)
            cred = credentials.Certificate(service_account_data)
            return firebase_admin.initialize_app(cred)

        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            return firebase_admin.initialize_app(cred)

        if project_id:
            return firebase_admin.initialize_app(
                options={
                    "projectId": project_id,
                }
            )

        return firebase_admin.initialize_app()
    except Exception as error:
        print(f"FIREBASE INIT ERROR REAL: {type(error).__name__}: {error}")
        raise FirebaseServiceError(
            "No fue posible inicializar Firebase Admin. Revisa FIREBASE_SERVICE_ACCOUNT_PATH o FIREBASE_PROJECT_ID."
        ) from error


def get_firestore_client():
    initialize_firebase_app()
    return firestore.client()


def get_bearer_token(request: Request) -> Optional[str]:
    authorization = request.headers.get("Authorization", "")

    if not authorization.startswith("Bearer "):
        return None

    return authorization.replace("Bearer ", "").strip()


def get_authenticated_uid(request: Request) -> str:
    allow_dev_auth = os.getenv("ALLOW_DEV_AUTH", "false").lower() == "true"

    if allow_dev_auth:
        dev_uid = request.headers.get("x-user-id")

        if dev_uid:
            return dev_uid

    token = get_bearer_token(request)

    if not token:
        raise HTTPException(
            status_code=401,
            detail="No se recibió token de autenticación Firebase.",
        )

    try:
        initialize_firebase_app()
        print(f"TOKEN RECIBIDO: {token[:30]}...") 
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        print(f"UID DECODIFICADO: {decoded_token.get('uid')}")
        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=401,
                detail="El token no contiene UID válido.",
            )

        return uid
    except HTTPException:
        raise
    except Exception as error:
        print(f"ERROR VERIFICANDO TOKEN: {error}") 
        raise HTTPException(
            status_code=401,
            detail="Token Firebase inválido o expirado.",
        ) from error