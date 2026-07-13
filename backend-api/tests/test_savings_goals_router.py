import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from routers.savings_goals_router import router

@pytest.fixture
def goals_client():
    app = FastAPI()
    app.include_router(router, prefix="/savings-goals")
    return TestClient(app)

def test_create_savings_goal_invalid_schema(goals_client, monkeypatch):
    """Debería fallar si los datos mínimos de Pydantic no se cumplen (monto <= 0)."""
    # Forzamos un mock de la validación para asegurar aislamiento del router
    monkeypatch.setattr("routers.savings_goals_router.validate_savings_goal_create", MagicMock())

    payload = {
        "nombre": "Viaje a San Andrés",
        "montoObjetivo": -1000,  # Inválido por regla gt=0 en el Schema
        "fechaEstimada": "2026-12-31"
    }
    response = goals_client.post("/savings-goals/", json=payload)
    assert response.status_code == 422

def test_delete_savings_goal_without_confirmation(goals_client):
    """Debería denegar el borrado (400) si confirmar no viene explícito como true."""
    response = goals_client.delete("/savings-goals/meta_abc_123")
    assert response.status_code == 400
    assert "confirmar" in response.json()["detail"].lower()
