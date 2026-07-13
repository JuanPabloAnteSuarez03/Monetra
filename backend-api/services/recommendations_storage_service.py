
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from firebase_admin import firestore

from services.firebase_service import get_firestore_client


class RecommendationStorageError(Exception):
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_recommendations_collection(uid: str):

    db = get_firestore_client()
    return db.collection("users").document(uid).collection("recommendations")


def normalize_recommendation_document(document) -> Dict[str, Any]:
    """Convierte un documento crudo de Firestore al formato limpio de respuesta."""
    data = document.to_dict() or {}

    return {
        "id": document.id,
        "uid": data.get("uid", ""),
        "estado": data.get("estado"),
        "generadoPorLLM": data.get("generadoPorLLM", False),
        "modelo": data.get("modelo"),
        "data": data.get("data", {}),
        "advertencias": data.get("advertencias", []),
        "periodo": data.get("periodo"),
        "creadoEn": str(data.get("creadoEn")) if data.get("creadoEn") else None,
    }

# Operaciones

def save_recommendation(
    uid: str,
    recommendation_response: Dict[str, Any],
    periodo: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:

    collection_ref = get_recommendations_collection(uid)

    # Elimina cualquier documento previo que no sea "latest"
    # (limpia restos de guardados antiguos con IDs aleatorios)
    existing_docs = collection_ref.stream()
    for doc in existing_docs:
        if doc.id != "latest":
            doc.reference.delete()

    document_data = {
        "uid": uid,
        "estado": recommendation_response.get("estado"),
        "generadoPorLLM": recommendation_response.get("generadoPorLLM", False),
        "modelo": recommendation_response.get("modelo"),
        "data": recommendation_response.get("data", {}),
        "advertencias": recommendation_response.get("advertencias", []),
        "periodo": periodo,
        "creadoEn": firestore.SERVER_TIMESTAMP,
    }

    # Documento con ID fijo "latest" — set() sobreescribe completo
    document_ref = collection_ref.document("latest")
    document_ref.set(document_data)

    saved = document_ref.get()

    return {
        "exito": True,
        "mensaje": "Recomendación almacenada correctamente.",
        "recomendacion": normalize_recommendation_document(saved),
    }


def list_recommendations(uid: str, limit_value: int = 20) -> List[Dict[str, Any]]:
    
    collection_ref = get_recommendations_collection(uid)

    query = collection_ref.order_by(
        "creadoEn", direction=firestore.Query.DESCENDING
    ).limit(limit_value)

    documents = query.stream()

    return [normalize_recommendation_document(document) for document in documents]


def get_recommendation(uid: str, recommendation_id: str) -> Dict[str, Any]:
    
    document_ref = get_recommendations_collection(uid).document(recommendation_id)
    document = document_ref.get()

    if not document.exists:
        raise RecommendationStorageError(
            "La recomendación no existe o no pertenece al usuario."
        )

    return normalize_recommendation_document(document)


def delete_recommendation(uid: str, recommendation_id: str) -> Dict[str, Any]:
    
    document_ref = get_recommendations_collection(uid).document(recommendation_id)
    document = document_ref.get()

    if not document.exists:
        raise RecommendationStorageError(
            "La recomendación no existe o no pertenece al usuario."
        )

    document_ref.delete()

    return {
        "id": recommendation_id,
        "eliminado": True,
        "mensaje": "Recomendación eliminada correctamente.",
    }