import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from routers.reports_router import router

@pytest.fixture
def reports_client():
    app = FastAPI()
    app.include_router(router, prefix="/reports")
    return TestClient(app)

def test_get_financial_report_success(reports_client, monkeypatch):
    """Debería construir un reporte financiero dado un rango de fechas correcto."""
    mock_report = {"balance_total": 500000.0, "categorias": {}}
    monkeypatch.setattr("routers.reports_router.generate_financial_report", MagicMock(return_value=mock_report))

    response = reports_client.get("/reports/financial?fechaInicio=2026-01-01&fechaFin=2026-01-31")
    assert response.status_code == 200
    assert response.json()["balance_total"] == 500000.0

def test_get_financial_metrics_missing_params(reports_client):
    """Debería fallar con 422 si faltan los parámetros requeridos de fecha."""
    response = reports_client.get("/reports/metrics")
    assert response.status_code == 422  # Error por parámetros Query faltantes