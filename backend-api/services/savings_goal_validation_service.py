
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from schemas.savings_goal_schemas import SavingsGoalCreate, SavingsGoalUpdate

# Constantes de negocio
VALID_CURRENCIES = {"COP"}
VALID_STATUSES = {"activa", "completada", "cancelada"}
MAX_NOMBRE_LENGTH = 100
MAX_DESCRIPCION_LENGTH = 200
MAX_MONTO_OBJETIVO = 999_999_999
DATE_FORMAT = "%Y-%m-%d"


class SavingsGoalValidationError(Exception):

    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_nombre(nombre: Optional[str], errors: List[str]) -> None:
    """El nombre no puede ser vacío, solo espacios, ni exceder el límite."""
    if nombre is None:
        return

    stripped = nombre.strip()

    if not stripped:
        errors.append("El nombre de la meta no puede estar vacío.")
        return

    if len(stripped) > MAX_NOMBRE_LENGTH:
        errors.append(
            f"El nombre no puede superar {MAX_NOMBRE_LENGTH} caracteres "
            f"(tiene {len(stripped)})."
        )


def validate_monto_objetivo(monto: Optional[float], errors: List[str]) -> None:

    if monto is None:
        return

    if monto <= 0:
        errors.append(
            "El monto objetivo debe ser mayor a cero."
        )
        return

    if monto > MAX_MONTO_OBJETIVO:
        errors.append(
            f"El monto objetivo supera el límite permitido de "
            f"{MAX_MONTO_OBJETIVO:,} COP."
        )


def validate_fecha_estimada(fecha: Optional[str], errors: List[str]) -> None:
    
    if fecha is None:
        return

    try:
        parsed = datetime.strptime(fecha, DATE_FORMAT).date()
    except ValueError:
        errors.append(
            f"La fecha estimada '{fecha}' no tiene formato válido. "
            "Usa el formato YYYY-MM-DD."
        )
        return

    if parsed <= date.today():
        errors.append(
            "La fecha estimada debe ser una fecha futura. "
            "Elige una fecha posterior al día de hoy para tu meta."
        )


def validate_descripcion(descripcion: Optional[str], errors: List[str]) -> None:
    """La descripción es opcional pero no puede exceder el límite."""
    if descripcion is None:
        return

    if len(descripcion) > MAX_DESCRIPCION_LENGTH:
        errors.append(
            f"La descripción no puede superar {MAX_DESCRIPCION_LENGTH} "
            f"caracteres (tiene {len(descripcion)})."
        )


def validate_moneda(moneda: Optional[str], errors: List[str]) -> None:
    """Solo se aceptan las monedas soportadas por el sistema."""
    if moneda is None:
        return

    if moneda not in VALID_CURRENCIES:
        errors.append(
            f"La moneda '{moneda}' no es compatible. "
            f"Monedas soportadas: {', '.join(sorted(VALID_CURRENCIES))}."
        )


def validate_estado(estado: Optional[str], errors: List[str]) -> None:
    """El estado solo puede ser uno de los tres valores válidos."""
    if estado is None:
        return

    if estado not in VALID_STATUSES:
        errors.append(
            f"El estado '{estado}' no es válido. "
            f"Valores permitidos: {', '.join(sorted(VALID_STATUSES))}."
        )


def validate_at_least_one_field(payload: SavingsGoalUpdate, errors: List[str]) -> None:
    """En un update, al menos un campo debe venir con valor."""
    fields = [
        payload.nombre,
        payload.montoObjetivo,
        payload.fechaEstimada,
        payload.descripcion,
        payload.moneda,
        payload.estado,
    ]

    if all(field is None for field in fields):
        errors.append(
            "Debes modificar al menos un campo para actualizar la meta."
        )


def validate_savings_goal_create(payload: SavingsGoalCreate) -> Dict[str, Any]:
    
    errors: List[str] = []

    validate_nombre(payload.nombre, errors)
    validate_monto_objetivo(payload.montoObjetivo, errors)
    validate_fecha_estimada(payload.fechaEstimada, errors)
    validate_descripcion(payload.descripcion, errors)
    validate_moneda(payload.moneda, errors)

    if errors:
        raise SavingsGoalValidationError(errors)

    return {
        "valido": True,
        "mensaje": "Los datos de la meta son válidos.",
    }


def validate_savings_goal_update(payload: SavingsGoalUpdate) -> Dict[str, Any]:

    errors: List[str] = []

    validate_at_least_one_field(payload, errors)
    validate_nombre(payload.nombre, errors)
    validate_monto_objetivo(payload.montoObjetivo, errors)
    validate_fecha_estimada(payload.fechaEstimada, errors)
    validate_descripcion(payload.descripcion, errors)
    validate_moneda(payload.moneda, errors)
    validate_estado(payload.estado, errors)

    if errors:
        raise SavingsGoalValidationError(errors)

    fields_to_update = [
        field for field, value in payload.model_dump().items()
        if value is not None
    ]

    return {
        "valido": True,
        "camposAActualizar": fields_to_update,
        "totalCampos": len(fields_to_update),
        "mensaje": f"Validación correcta. Se actualizarán {len(fields_to_update)} campo(s).",
    }