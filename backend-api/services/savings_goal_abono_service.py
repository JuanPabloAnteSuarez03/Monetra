
from typing import Any, Dict

from firebase_admin import firestore

from services.firebase_service import get_firestore_client
from services.savings_goal_progress_service import calculate_goal_progress
from services.savings_goals_service import (
    SavingsGoalServiceError,
    get_goals_collection,
    normalize_goal_document,
)

MAX_ABONO = 999_999_999


class AbonoValidationError(Exception):
    """Error lanzado cuando el monto del abono no es válido."""
    pass

# Validación del abono

def validate_abono(monto: Any, meta: Dict[str, Any]) -> None:
    
    try:
        valor = float(monto)
    except (TypeError, ValueError):
        raise AbonoValidationError("El monto del abono debe ser un número válido.")

    if valor <= 0:
        raise AbonoValidationError("El monto del abono debe ser mayor a cero.")

    if valor > MAX_ABONO:
        raise AbonoValidationError(
            f"El monto del abono supera el límite permitido de {MAX_ABONO:,} COP."
        )

    if meta.get("estado") != "activa":
        raise AbonoValidationError(
            f"No se pueden registrar abonos en una meta con estado '{meta.get('estado')}'. "
            "Solo las metas activas aceptan abonos."
        )

# Lógica de actualización en Firestore

def apply_abono(uid: str, goal_id: str, monto: float) -> Dict[str, Any]:
   
    document_ref = get_goals_collection(uid).document(goal_id)

    # Incrementa el montoActual de forma atómica
    document_ref.update({
        "montoActual": firestore.Increment(monto),
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    })

    # Lee el documento actualizado para verificar si se completó la meta
    updated_doc = document_ref.get()
    data = updated_doc.to_dict() or {}

    monto_actual = float(data.get("montoActual") or 0)
    monto_objetivo = float(data.get("montoObjetivo") or 0)

    # Marca como completada automáticamente si se alcanzó el objetivo
    if monto_actual >= monto_objetivo and data.get("estado") == "activa":
        document_ref.update({
            "estado": "completada",
            "actualizadoEn": firestore.SERVER_TIMESTAMP,
        })
        updated_doc = document_ref.get()

    return normalize_goal_document(updated_doc)

# Función principal

def register_abono(uid: str, goal_id: str, monto: Any) -> Dict[str, Any]:
    
    # Carga la meta — lanza SavingsGoalServiceError si no existe
    from services.savings_goals_service import get_goal
    meta = get_goal(uid, goal_id)

    # Valida el abono contra las reglas de negocio
    monto_float = float(monto)
    validate_abono(monto_float, meta)

    # Aplica el abono en Firestore y obtiene la meta actualizada
    meta_actualizada = apply_abono(uid, goal_id, monto_float)

    # Recalcula el progreso con los nuevos valores
    progreso = calculate_goal_progress(meta_actualizada)

    # Mensaje de confirmación según si se completó o no la meta
    if meta_actualizada.get("estado") == "completada":
        mensaje = f"¡Felicitaciones! Alcanzaste tu meta '{meta_actualizada.get('nombre')}'."
    else:
        mensaje = (
            f"Abono de {monto_float:,.0f} COP registrado correctamente. "
            f"Llevas el {progreso['porcentajeAvance']}% de tu meta."
        )

    return {
        "exito": True,
        "mensaje": mensaje,
        "abono": {
            "montoAbonado": monto_float,
            "montoAnterior": float(meta.get("montoActual") or 0),
            "montoActual": meta_actualizada.get("montoActual"),
        },
        "progreso": progreso,
    }