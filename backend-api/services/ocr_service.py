import httpx
import os
import base64
from PIL import Image
import io

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")
OCR_SPACE_URL = "https://api.ocr.space/parse/image"

# Tamaño máximo permitido por OCR.space en plan free (1MB via API)
MAX_FILE_SIZE_BYTES = 900_000  # 900KB para tener margen


def _compress_image_if_needed(image_bytes: bytes, content_type: str) -> tuple[bytes, str]:
    """
    Comprime la imagen si supera el límite de OCR.space (1MB).
    Retorna (bytes_finales, content_type_final).
    """
    if len(image_bytes) <= MAX_FILE_SIZE_BYTES:
        return image_bytes, content_type

    img = Image.open(io.BytesIO(image_bytes))

    # Convertir a RGB si es necesario (ej: PNG con transparencia)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    output = io.BytesIO()
    quality = 85

    while quality >= 40:
        output.seek(0)
        output.truncate()
        img.save(output, format="JPEG", quality=quality, optimize=True)
        if output.tell() <= MAX_FILE_SIZE_BYTES:
            break
        quality -= 15

    return output.getvalue(), "image/jpeg"


async def extract_text_from_image(image_bytes: bytes, content_type: str) -> dict:
    """
    Envía la imagen a OCR.space y retorna el texto extraído.

    Retorna:
        {
            "success": bool,
            "text": str,           # texto crudo extraído
            "error": str | None    # mensaje de error si aplica
        }
    """
    # Comprimir si es necesario
    processed_bytes, processed_type = _compress_image_if_needed(image_bytes, content_type)

    # Convertir a base64 para enviar
    image_b64 = base64.b64encode(processed_bytes).decode("utf-8")

    # OCR.space espera el base64 con prefijo de data URI
    base64_payload = f"data:{processed_type};base64,{image_b64}"

    payload = {
        "base64Image": base64_payload,
        "apikey": OCR_SPACE_API_KEY,
        "language": "spa",          # Español, acepta facturas en inglés también
        "isOverlayRequired": False,
        "detectOrientation": True,  # Útil para fotos de facturas giradas
        "scale": True,              # Mejora precisión en imágenes pequeñas
        "isTable": True,            # Mejor reconocimiento de tablas/columnas
        "OCREngine": 2,             # Motor 2: mejor para documentos complejos
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(OCR_SPACE_URL, data=payload)
            response.raise_for_status()
            result = response.json()

        # Validar respuesta de OCR.space
        if result.get("IsErroredOnProcessing"):
            error_msg = result.get("ErrorMessage", ["Error desconocido en OCR"])[0]
            return {"success": False, "text": "", "error": error_msg}

        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return {
                "success": False,
                "text": "",
                "error": "No se pudo extraer texto del documento"
            }

        # Unir texto de todas las páginas/secciones
        full_text = "\n".join(
            r.get("ParsedText", "") for r in parsed_results
        ).strip()

        if not full_text:
            return {
                "success": False,
                "text": "",
                "error": "El documento no contiene texto legible"
            }

        return {"success": True, "text": full_text, "error": None}

    except httpx.TimeoutException:
        return {
            "success": False,
            "text": "",
            "error": "Tiempo de espera agotado al procesar el documento"
        }
    except httpx.HTTPStatusError as e:
        return {
            "success": False,
            "text": "",
            "error": f"Error del servicio OCR: {e.response.status_code}"
        }
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "error": f"Error inesperado al procesar la imagen: {str(e)}"
        }