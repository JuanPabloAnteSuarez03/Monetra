import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from routers.movements_router import router

@pytest.fixture
def movements_client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)

def test_create_user_movement_success(movements_client, monkeypatch):
    """Debería crear un movimiento y retornar 200."""
    mock_result = {"id": "mov_999", "mensaje": "Movimiento guardado"}

    # Forzamos el mock del servicio que procesa la creación
    monkeypatch.setattr("routers.movements_router.create_movement", MagicMock(return_value=mock_result))

    payload = {
        "tipo": "gasto",
        "monto": 45000,
        "categoria": "Suscripciones",
        "fecha": "2026-06-16"
    }

    response = movements_client.post("/", json=payload)
    assert response.status_code == 200
    assert response.json()["id"] == "mov_999"

def test_delete_movement_without_confirmation(movements_client):
    """Debería fallar con 400 si no se envía el parámetro confirmar=true."""
    # Al estar el mock de autenticación global en conftest.py, saltará el 401
    # y evaluará de forma correcta la lógica de confirmación del router
    response = movements_client.delete("/mov_999")
    assert response.status_code == 400
    assert "confirmar" in response.json()["detail"] or "Confirmar" in response.json()["detail"]
