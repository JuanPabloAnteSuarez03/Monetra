from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from services.ocr_service import extract_text_from_image
from services.gemini_service import analyze_invoice_text


router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB (Pillow comprimirá si supera 1MB)


@router.post("/scan-invoice")
async def scan_invoice(file: UploadFile = File(...)):
    """
    Recibe una imagen de factura/comprobante, extrae el texto con OCR
    y lo analiza con Gemini para estructurar los datos relevantes.

    Retorna los campos: monto, fecha, descripción, proveedor, etc.
    """
    # Validar tipo de archivo
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no soportado: {file.content_type}. "
                   f"Use JPG, PNG o WEBP."
        )

    # Leer y validar tamaño
    image_bytes = await file.read()
    if len(image_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="El archivo supera el tamaño máximo permitido de 5MB."
        )
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    # Paso 1: OCR — extraer texto crudo
    ocr_result = await extract_text_from_image(image_bytes, file.content_type)

    if not ocr_result["success"]:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": ocr_result["error"],
                "data": None,
                "raw_text": None,
            }
        )

    # Paso 2: Gemini — estructurar los datos
    analysis_result = await analyze_invoice_text(ocr_result["text"])

    if not analysis_result["success"]:
        # OCR funcionó pero Gemini falló: devolver al menos el texto crudo
        return JSONResponse(
            status_code=206,  # Partial Content
            content={
                "success": False,
                "message": analysis_result["error"],
                "data": None,
                "raw_text": ocr_result["text"],
            }
        )

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Documento procesado correctamente",
            "data": analysis_result["data"],
            "raw_text": ocr_result["text"],  # Para que el frontend muestre corrección
        }
    )