
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from schemas.financial_data_schemas import MovementUpdate

VALID_TYPES = {"ingreso", "gasto", "ahorro", "deuda"}
VALID_CURRENCIES = {"COP"}
VALID_ORIGINS = {"manual", "ocr"}
MAX_DESCRIPTION_LENGTH = 140
MAX_CATEGORY_LENGTH = 80
DATE_FORMAT = "%Y-%m-%d"

class MovementValidationError(Exception):
    
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__("; ".join(errors))

def validate_tipo(tipo: Optional[str], errors: List[str]) -> None:
    """El tipo debe ser uno de los cuatro valores válidos del sistema."""
    if tipo is None:
        return  

    if tipo not in VALID_TYPES:
        errors.append(
            f"El tipo '{tipo}' no es válido. Valores permitidos: {', '.join(sorted(VALID_TYPES))}."
        )


def validate_monto(monto: Optional[float], errors: List[str]) -> None:
    """El monto debe ser un número positivo mayor a cero."""
    if monto is None:
        return 

    if monto <= 0:
        errors.append("El monto debe ser mayor a cero.")

    if monto > 999_999_999:
        errors.append("El monto ingresado supera el límite permitido.")


def validate_categoria(categoria: Optional[str], errors: List[str]) -> None:
    """La categoría no puede ser vacía ni exceder el límite de caracteres."""
    if categoria is None:
        return  

    stripped = categoria.strip()

    if not stripped:
        errors.append("La categoría no puede estar vacía.")
        return

    if len(stripped) > MAX_CATEGORY_LENGTH:
        errors.append(
            f"La categoría no puede superar {MAX_CATEGORY_LENGTH} caracteres "
            f"(tiene {len(stripped)})."
        )


def validate_fecha(fecha: Optional[str], errors: List[str]) -> None:
    
    if fecha is None:
        return  

    try:
        parsed = datetime.strptime(fecha, DATE_FORMAT).date()
    except ValueError:
        errors.append(
            f"La fecha '{fecha}' no tiene un formato válido. Usa el formato YYYY-MM-DD."
        )
        return

    if parsed > date.today():
        errors.append(
            "La fecha del movimiento no puede ser futura. "
            "Solo se pueden registrar movimientos pasados o del día de hoy."
        )


def validate_descripcion(descripcion: Optional[str], errors: List[str]) -> None:
    """La descripción es opcional pero no puede exceder el límite de caracteres."""
    if descripcion is None:
        return  

    if len(descripcion) > MAX_DESCRIPTION_LENGTH:
        errors.append(
            f"La descripción no puede superar {MAX_DESCRIPTION_LENGTH} caracteres "
            f"(tiene {len(descripcion)})."
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


def validate_origen(origen: Optional[str], errors: List[str]) -> None:
    """El origen solo puede ser 'manual' u 'ocr'."""
    if origen is None:
        return 

    if origen not in VALID_ORIGINS:
        errors.append(
            f"El origen '{origen}' no es válido. "
            f"Valores permitidos: {', '.join(sorted(VALID_ORIGINS))}."
        )


def validate_at_least_one_field(payload: MovementUpdate, errors: List[str]) -> None:
    
    fields = [
        payload.tipo,
        payload.monto,
        payload.categoria,
        payload.fecha,
        payload.descripcion,
        payload.moneda,
        payload.origen,
    ]

    if all(field is None for field in fields):
        errors.append(
            "Debes modificar al menos un campo para actualizar el movimiento."
        )

def validate_movement_update(payload: MovementUpdate) -> Dict[str, Any]:
    
    errors: List[str] = []

    validate_at_least_one_field(payload, errors)
    validate_tipo(payload.tipo, errors)
    validate_monto(payload.monto, errors)
    validate_categoria(payload.categoria, errors)
    validate_fecha(payload.fecha, errors)
    validate_descripcion(payload.descripcion, errors)
    validate_moneda(payload.moneda, errors)
    validate_origen(payload.origen, errors)

    if errors:
        raise MovementValidationError(errors)

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