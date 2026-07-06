from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from firebase_admin import firestore

from schemas.financial_data_schemas import MovementCreate, MovementUpdate
from services.firebase_service import get_firestore_client

MOVEMENT_TYPES = {"ingreso", "gasto", "ahorro", "deuda"}


class MovementServiceError(Exception):
    pass


def parse_date_start(date_value: str) -> datetime:
    try:
        date = datetime.fromisoformat(date_value)
        return datetime.combine(date.date(), time.min, tzinfo=timezone.utc)
    except Exception as error:
        raise MovementServiceError("La fecha de inicio no es válida.") from error


def parse_date_end(date_value: str) -> datetime:
    try:
        date = datetime.fromisoformat(date_value)
        return datetime.combine(date.date(), time.max, tzinfo=timezone.utc)
    except Exception as error:
        raise MovementServiceError("La fecha de fin no es válida.") from error


def parse_movement_date(date_value: str) -> datetime:
    try:
        date = datetime.fromisoformat(date_value)
        return datetime.combine(date.date(), time(hour=12), tzinfo=timezone.utc)
    except Exception as error:
        raise MovementServiceError("La fecha del movimiento no es válida.") from error


def normalize_datetime(value: Any) -> Optional[str]:
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    try:
        return value.to_datetime().date().isoformat()
    except Exception:
        return None


def get_movements_collection(uid: str):
    db = get_firestore_client()
    return db.collection("users").document(uid).collection("movements")


def normalize_movement_document(document) -> Dict[str, Any]:
    data = document.to_dict() or {}

    return {
        "id": document.id,
        "uid": data.get("uid", ""),
        "tipo": data.get("tipo", "gasto"),
        "monto": float(data.get("monto", 0) or 0),
        "categoria": data.get("categoria", "Sin categoría"),
        "fecha": normalize_datetime(data.get("fecha")),
        "descripcion": data.get("descripcion", ""),
        "moneda": data.get("moneda", "COP"),
        "origen": data.get("origen", "manual"),
        "creadoEn": str(data.get("creadoEn")) if data.get("creadoEn") else None,
        "actualizadoEn": str(data.get("actualizadoEn")) if data.get("actualizadoEn") else None,
    }


def create_movement(uid: str, payload: MovementCreate) -> Dict[str, Any]:
    collection_ref = get_movements_collection(uid)

    movement = {
        "uid": uid,
        "tipo": payload.tipo,
        "monto": float(payload.monto),
        "categoria": payload.categoria.strip(),
        "fecha": parse_movement_date(payload.fecha),
        "descripcion": (payload.descripcion or "").strip(),
        "moneda": payload.moneda or "COP",
        "origen": payload.origen or "manual",
        "creadoEn": firestore.SERVER_TIMESTAMP,
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    }

    document_ref = collection_ref.document()
    document_ref.set(movement)

    saved = document_ref.get()

    return normalize_movement_document(saved)


def get_movement(uid: str, movement_id: str) -> Dict[str, Any]:
    document_ref = get_movements_collection(uid).document(movement_id)
    document = document_ref.get()

    if not document.exists:
        raise MovementServiceError("El movimiento no existe o no pertenece al usuario.")

    return normalize_movement_document(document)


def list_movements(
    uid: str,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    limit_value: int = 500,
) -> List[Dict[str, Any]]:
    collection_ref = get_movements_collection(uid)

    query = collection_ref

    if fecha_inicio:
        query = query.where("fecha", ">=", parse_date_start(fecha_inicio))

    if fecha_fin:
        query = query.where("fecha", "<=", parse_date_end(fecha_fin))

    query = query.order_by("fecha", direction=firestore.Query.DESCENDING).limit(limit_value)

    documents = query.stream()

    return [normalize_movement_document(document) for document in documents]


def update_movement(
    uid: str,
    movement_id: str,
    payload: MovementUpdate,
) -> Dict[str, Any]:
    document_ref = get_movements_collection(uid).document(movement_id)
    document = document_ref.get()

    if not document.exists:
        raise MovementServiceError("El movimiento no existe o no pertenece al usuario.")

    update_data: Dict[str, Any] = {
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    }

    if payload.tipo is not None:
        update_data["tipo"] = payload.tipo

    if payload.monto is not None:
        update_data["monto"] = float(payload.monto)

    if payload.categoria is not None:
        if not payload.categoria.strip():
            raise MovementServiceError("La categoría no puede estar vacía.")
        update_data["categoria"] = payload.categoria.strip()

    if payload.fecha is not None:
        update_data["fecha"] = parse_movement_date(payload.fecha)

    if payload.descripcion is not None:
        update_data["descripcion"] = payload.descripcion.strip()

    if payload.moneda is not None:
        update_data["moneda"] = payload.moneda

    if payload.origen is not None:
        update_data["origen"] = payload.origen

    document_ref.update(update_data)

    updated = document_ref.get()

    return normalize_movement_document(updated)


def delete_movement(uid: str, movement_id: str) -> Dict[str, Any]:
    document_ref = get_movements_collection(uid).document(movement_id)
    document = document_ref.get()

    if not document.exists:
        raise MovementServiceError("El movimiento no existe o no pertenece al usuario.")

    document_ref.delete()

    return {
        "id": movement_id,
        "eliminado": True,
        "mensaje": "Movimiento eliminado correctamente.",
    }