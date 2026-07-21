import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from routers.ai_router import router

@pytest.fixture
def ai_client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)

def test_financial_analysis_success(ai_client, monkeypatch):
    """Debería retornar el análisis financiero exitosamente."""
    mock_response = {"exito": True, "data": {"analisis": "Vas muy bien con tus ahorros"}}
    
    # Mockear el servicio asíncrono
    async_mock = AsyncMock(return_value=mock_response)
    monkeypatch.setattr("routers.ai_router.generate_financial_analysis", async_mock)

    payload = {
        "casoUso": "analisis_financiero",
        "movimientos": [{"tipo": "gasto", "monto": 20000, "categoria": "transporte"}]
    }

    response = ai_client.post("/analysis", json=payload)
    assert response.status_code == 200
    assert response.json()["exito"] is True