
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from firebase_admin import firestore

from schemas.savings_goal_schemas import SavingsGoalCreate, SavingsGoalUpdate
from services.firebase_service import get_firestore_client


class SavingsGoalServiceError(Exception):
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_datetime(value: Any) -> Optional[str]:
    """Convierte timestamps de Firestore o datetime a string ISO date."""
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    try:
        return value.to_datetime().date().isoformat()
    except Exception:
        return None


def get_goals_collection(uid: str):
    
    db = get_firestore_client()
    return db.collection("users").document(uid).collection("savingsGoals")


def normalize_goal_document(document) -> Dict[str, Any]:
    
    data = document.to_dict() or {}

    return {
        "id": document.id,
        "uid": data.get("uid", ""),
        "nombre": data.get("nombre", ""),
        "montoObjetivo": float(data.get("montoObjetivo", 0) or 0),
        "montoActual": float(data.get("montoActual", 0) or 0),
        "fechaEstimada": normalize_datetime(data.get("fechaEstimada")) or data.get("fechaEstimada", ""),
        "descripcion": data.get("descripcion", ""),
        "moneda": data.get("moneda", "COP"),
        "estado": data.get("estado", "activa"),
        "creadoEn": str(data.get("creadoEn")) if data.get("creadoEn") else None,
        "actualizadoEn": str(data.get("actualizadoEn")) if data.get("actualizadoEn") else None,
    }


def create_goal(uid: str, payload: SavingsGoalCreate) -> Dict[str, Any]:
    
    collection_ref = get_goals_collection(uid)

    goal = {
        "uid": uid,
        "nombre": payload.nombre.strip(),
        "montoObjetivo": float(payload.montoObjetivo),
        "montoActual": 0.0,  # Toda meta nueva empieza sin abonos
        "fechaEstimada": payload.fechaEstimada,
        "descripcion": (payload.descripcion or "").strip(),
        "moneda": payload.moneda or "COP",
        "estado": "activa",  # Toda meta nueva empieza activa
        "creadoEn": firestore.SERVER_TIMESTAMP,
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    }

    document_ref = collection_ref.document()
    document_ref.set(goal)

    saved = document_ref.get()

    return {
        "exito": True,
        "mensaje": f"Meta '{payload.nombre.strip()}' creada correctamente.",
        "meta": normalize_goal_document(saved),
    }


def get_goal(uid: str, goal_id: str) -> Dict[str, Any]:
    
    document_ref = get_goals_collection(uid).document(goal_id)
    document = document_ref.get()

    if not document.exists:
        raise SavingsGoalServiceError(
            "La meta no existe o no pertenece al usuario."
        )

    return normalize_goal_document(document)


def list_goals(uid: str, solo_activas: bool = False) -> List[Dict[str, Any]]:
    collection_ref = get_goals_collection(uid)

    query = collection_ref

    if solo_activas:
        query = query.where("estado", "==", "activa")

    # SOLUCIÓN: Eliminamos .order_by() de Firestore para evitar la necesidad del índice compuesto.
    # Traemos los documentos usando solo el filtro básico.
    documents = query.stream()

    # Procesamos y normalizamos los documentos a diccionarios de Python
    goals_list = [normalize_goal_document(document) for document in documents]

    # Ordenamos manualmente en memoria con Python usando la clave "creadoEn" (Descendente)
    # Usamos un valor por defecto vacío "" en caso de que "creadoEn" venga como None
    goals_list.sort(key=lambda x: x.get("creadoEn") or "", reverse=True)

    return goals_list

def update_goal(
    uid: str,
    goal_id: str,
    payload: SavingsGoalUpdate,
) -> Dict[str, Any]:
    
    document_ref = get_goals_collection(uid).document(goal_id)
    document = document_ref.get()

    if not document.exists:
        raise SavingsGoalServiceError(
            "La meta no existe o no pertenece al usuario."
        )

    update_data: Dict[str, Any] = {
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    }

    if payload.nombre is not None:
        stripped = payload.nombre.strip()
        if not stripped:
            raise SavingsGoalServiceError("El nombre de la meta no puede estar vacío.")
        update_data["nombre"] = stripped

    if payload.montoObjetivo is not None:
        update_data["montoObjetivo"] = float(payload.montoObjetivo)

    if payload.fechaEstimada is not None:
        update_data["fechaEstimada"] = payload.fechaEstimada

    if payload.descripcion is not None:
        update_data["descripcion"] = payload.descripcion.strip()

    if payload.moneda is not None:
        update_data["moneda"] = payload.moneda

    if payload.estado is not None:
        update_data["estado"] = payload.estado

    document_ref.update(update_data)

    updated = document_ref.get()

    return normalize_goal_document(updated)


def delete_goal(uid: str, goal_id: str) -> Dict[str, Any]:
    
    document_ref = get_goals_collection(uid).document(goal_id)
    document = document_ref.get()

    if not document.exists:
        raise SavingsGoalServiceError(
            "La meta no existe o no pertenece al usuario."
        )

    document_ref.delete()

    return {
        "id": goal_id,
        "eliminado": True,
        "mensaje": "Meta de ahorro eliminada correctamente.",
    }