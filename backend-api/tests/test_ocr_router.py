import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from routers.ocr_router import router

@pytest.fixture
def ocr_client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)

def test_scan_invoice_invalid_type(ocr_client):
    """Debería rechazar archivos que no sean imágenes permitidas (415)."""
    files = {"file": ("test.txt", b"contenido_falso", "text/plain")}
    response = ocr_client.post("/ocr/scan-invoice", files=files)
    assert response.status_code == 415

@pytest.mark.asyncio
async def test_scan_invoice_success(ocr_client, monkeypatch):
    """Debería procesar la imagen simulando el OCR y Gemini en verde."""
    # Mock de OCR
    mock_ocr = AsyncMock(return_value={"success": True, "text": "Factura Exito Total: $50000"})
    monkeypatch.setattr("routers.ocr_router.extract_text_from_image", mock_ocr)
    
    # Mock de Gemini
    mock_gemini = AsyncMock(return_value={"success": True, "data": {"monto": 50000, "proveedor": "Exito"}})
    monkeypatch.setattr("routers.ocr_router.analyze_invoice_text", mock_gemini)

    files = {"file": ("factura.png", b"bytes_de_imagen_falsos", "image/png")}
    response = ocr_client.post("/ocr/scan-invoice", files=files)
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["data"]["proveedor"] == "Exito"