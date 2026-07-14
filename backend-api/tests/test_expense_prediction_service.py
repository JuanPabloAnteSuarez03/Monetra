import pytest
from unittest.mock import MagicMock
from services.expense_prediction_service import (
    average,
    std_dev,
    weighted_recent_average,
    generate_user_expense_prediction,
)

def test_math_utilities():
    valores = [100.0, 200.0, 300.0]
    assert average(valores) == 200.0
    assert std_dev(valores) > 0
    assert average([]) == 0.0
    assert std_dev([]) == 0.0

def test_weighted_recent_average():
    valores = [100.0, 100.0, 400.0]
    assert weighted_recent_average(valores, limit=3) == 250.0

def test_generate_user_expense_prediction_success(monkeypatch):
    uid_prueba = "user_test_predictive_123"
    
    # MOCK CORREGIDO: historialMensual debe ser una LISTA de diccionarios con las llaves 'mes' y 'gastos'
    mock_history = {
        "totalMovimientosRecopilados": 5,
        "periodo": {"fechaInicio": "2026-01-01", "fechaFin": "2026-03-31", "meses": 3},
        "historialMensual": [
            {"mes": "2026-01", "gastos": 500000.0},
            {"mes": "2026-02", "gastos": 600000.0},
            {"mes": "2026-03", "gastos": 550000.0},
        ],
        "advertencias": ["Advertencia de prueba"]
    }
    
    monkeypatch.setattr(
        "services.expense_prediction_service.collect_financial_history",
        MagicMock(return_value=mock_history)
    )
    
    prediction = generate_user_expense_prediction(uid_prueba, history_months=3, prediction_months=2)
    
    # Aserciones corregidas usando las llaves reales del servicio
    assert "resumenHistorico" in prediction
    assert prediction["resumenHistorico"]["totalMesesAnalizados"] == 3
    assert "prediccionesMensuales" in prediction
    assert len(prediction["prediccionesMensuales"]) == 2  # prediction_months=2
    assert "prediccionTotal" in prediction
    assert prediction["prediccionTotal"]["gastoEstimado"] > 0
    assert any("Las predicciones son aproximaciones" in adv for adv in prediction["advertencias"])