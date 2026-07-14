import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from routers.predictions_router import router

@pytest.fixture
def predictions_client():
    app = FastAPI()
    app.include_router(router, prefix="/predictions")
    return TestClient(app)

def test_get_financial_history_success(predictions_client, monkeypatch):
    """Debería retornar el historial financiero con los parámetros por defecto."""
    mock_history = {"uid": "uid_prueba_monetra_123", "meses": 6, "movimientos": []}
    monkeypatch.setattr("routers.predictions_router.collect_financial_history", MagicMock(return_value=mock_history))

    response = predictions_client.get("/predictions/history")
    assert response.status_code == 200
    assert response.json()["meses"] == 6

def test_get_expense_prediction_params_out_of_bounds(predictions_client):
    """Debería fallar con 422 si los parámetros numéricos exceden los límites de validación de Query."""
    # mesesHistorial máximo permitido es 24, le enviaremos 30
    response = predictions_client.get("/predictions/expenses?mesesHistorial=30")
    assert response.status_code == 422