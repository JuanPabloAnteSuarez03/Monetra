
from typing import Any, Dict

from firebase_admin import firestore

from services.firebase_service import get_firestore_client
from services.savings_goal_progress_service import calculate_goal_progress
from services.savings_goals_service import (
    SavingsGoalServiceError,
    get_goals_collection,
    normalize_goal_document,
)

MAX_RETIRO = 999_999_999


class RetiroValidationError(Exception):
    """Error lanzado cuando el monto del retiro no es válido."""
    pass


# Validación del retiro

def validate_retiro(monto: Any, meta: Dict[str, Any]) -> None:
    
    try:
        valor = float(monto)
    except (TypeError, ValueError):
        raise RetiroValidationError("El monto del retiro debe ser un número válido.")

    if valor <= 0:
        raise RetiroValidationError("El monto del retiro debe ser mayor a cero.")

    if valor > MAX_RETIRO:
        raise RetiroValidationError(
            f"El monto del retiro supera el límite permitido de {MAX_RETIRO:,} COP."
        )

    monto_actual = float(meta.get("montoActual") or 0)
    
    if valor > monto_actual:
        raise RetiroValidationError(
            f"El monto del retiro ({valor:,.0f} COP) supera el monto actual ({monto_actual:,.0f} COP)."
        )

    if meta.get("estado") != "activa":
        raise RetiroValidationError(
            f"No se pueden registrar retiros en una meta con estado '{meta.get('estado')}'. "
            "Solo las metas activas aceptan retiros."
        )


# Lógica de actualización en Firestore

def apply_retiro(uid: str, goal_id: str, monto: float) -> Dict[str, Any]:
   
    document_ref = get_goals_collection(uid).document(goal_id)

    # Decrementa el montoActual de forma atómica
    document_ref.update({
        "montoActual": firestore.Increment(-monto),
        "actualizadoEn": firestore.SERVER_TIMESTAMP,
    })

    # Lee el documento actualizado
    updated_doc = document_ref.get()
    
    return normalize_goal_document(updated_doc)


# Función principal

def register_retiro(uid: str, goal_id: str, monto: Any) -> Dict[str, Any]:
    
    # Carga la meta — lanza SavingsGoalServiceError si no existe
    from services.savings_goals_service import get_goal
    meta = get_goal(uid, goal_id)

    # Valida el retiro contra las reglas de negocio
    monto_float = float(monto)
    validate_retiro(monto_float, meta)

    # Aplica el retiro en Firestore y obtiene la meta actualizada
    meta_actualizada = apply_retiro(uid, goal_id, monto_float)

    # Recalcula el progreso con los nuevos valores
    progreso = calculate_goal_progress(meta_actualizada)

    mensaje = (
        f"Retiro de {monto_float:,.0f} COP registrado correctamente. "
        f"Llevas el {progreso['porcentajeAvance']}% de tu meta."
    )

    return {
        "exito": True,
        "mensaje": mensaje,
        "retiro": {
            "montoRetirado": monto_float,
            "montoAnterior": float(meta.get("montoActual") or 0),
            "montoActual": meta_actualizada.get("montoActual"),
        },
        "progreso": progreso,
    }
