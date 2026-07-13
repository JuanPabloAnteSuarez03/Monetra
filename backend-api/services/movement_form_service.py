
from typing import Any, Dict

from services.movements_service import MovementServiceError, get_movement

# Tipos y categorías válidas según el sistema Monetra
VALID_TYPES = ["ingreso", "gasto", "ahorro", "deuda"]

DEFAULT_CATEGORIES = [
    "Alimentación",
    "Transporte",
    "Salud",
    "Educación",
    "Ocio",
    "Vivienda",
    "Servicios",
    "Sin categoría",
]


def prepare_form_data(movement: Dict[str, Any]) -> Dict[str, Any]:

    # Asegura que el monto sea float válido y positivo
    monto = float(movement.get("monto") or 0)

    # Garantiza que el tipo sea uno válido; si viene corrupto, usa "gasto" por defecto
    tipo = movement.get("tipo")
    if tipo not in VALID_TYPES:
        tipo = "gasto"

    # La fecha ya viene en formato YYYY-MM-DD desde normalize_movement_document
    # Solo la validamos; si no existe, enviamos cadena vacía para que el frontend
    # muestre el campo vacío y obligue al usuario a seleccionar una fecha
    fecha = movement.get("fecha") or ""

    return {
        # Identificadores necesarios para que el frontend sepa qué movimiento actualizar
        "id": movement.get("id"),
        "uid": movement.get("uid"),

        # Campos del formulario — cada clave corresponde a un campo del form
        "formData": {
            "tipo": tipo,
            "monto": monto,
            "categoria": movement.get("categoria") or "Sin categoría",
            "fecha": fecha,
            "descripcion": movement.get("descripcion") or "",
            "moneda": movement.get("moneda") or "COP",
        },

        # Metadatos útiles para el frontend (mostrar cuándo fue creado, origen, etc.)
        "meta": {
            "origen": movement.get("origen") or "manual",
            "creadoEn": movement.get("creadoEn"),
            "actualizadoEn": movement.get("actualizadoEn"),
        },

        # Opciones válidas que el frontend puede usar para construir los dropdowns
        # sin necesidad de tenerlas hardcodeadas
        "opcionesFormulario": {
            "tipos": VALID_TYPES,
            "categorias": DEFAULT_CATEGORIES,
            "monedas": ["COP"],
        },
    }


def load_movement_for_edit(uid: str, movement_id: str) -> Dict[str, Any]:

    # Obtiene el movimiento desde Firestore usando el servicio existente.
    # get_movement ya valida que el movimiento exista y pertenezca al uid.
    movement = get_movement(uid, movement_id)

    # Formatea los datos para el formulario
    form_data = prepare_form_data(movement)

    return {
        "exito": True,
        "mensaje": "Datos del movimiento cargados correctamente para edición.",
        "movimiento": form_data,
    }