import pytest
from unittest.mock import patch
from datetime import date, timedelta
from services import ai_monitoring_service
from services.ai_monitoring_service import get_monitoring_stats, register_ai_request

@pytest.fixture(autouse=True)
def reset_monitoring_records():
    """Fixture que limpia los registros en memoria antes y después de cada test."""
    ai_monitoring_service._monitoring_records = []
    yield
    ai_monitoring_service._monitoring_records = []


def test_monitoring_sin_registros():
    """Sin registros, las métricas deben ser 0 y sin alertas."""
    result = get_monitoring_stats()

    assert result["totalSolicitudes"] == 0
    assert result["solicitudesLLM"] == 0
    assert result["porcentajeUsoLLM"] == 0
    assert result["alertas"]["hayIncremento"] is False


def test_monitoring_con_registros():
    """Con registros, debe calcular métricas correctamente."""
    # Insertamos datos simulando las peticiones a través del método de registro real
    register_ai_request("user123", "analysis", "llama-3.1-8b-instant", True, 800, "generado")
    register_ai_request("user123", "recommendations", "llama-3.1-8b-instant", True, 800, "generado")
    register_ai_request("user123", "predictions", "llama-3.1-8b-instant", True, 800, "generado")

    result = get_monitoring_stats()

    assert result["totalSolicitudes"] == 3
    assert result["solicitudesLLM"] == 3
    assert result["porcentajeUsoLLM"] == 100.0
    assert result["tiempoRespuestaMs"]["promedio"] == 800
    assert "analysis" in result["porTipo"]
    assert "recommendations" in result["porTipo"]
    assert "predictions" in result["porTipo"]


def test_monitoring_detecta_dia_anormal():
    """Debe detectar días con consumo anormal superando los umbrales del backend."""
    hoy_str = date.today().isoformat()

    # 1. Creamos un pico masivo el día de hoy (50 solicitudes) usando bypass directo a memoria
    # ya que register_ai_request clava la fecha actual de forma rígida
    for _ in range(50):
        ai_monitoring_service._monitoring_records.append({
            "uid": "user123",
            "tipo": "analysis",
            "modelo": "llama-3.1-8b-instant",
            "generadoPorLLM": True,
            "tiempoRespuestaMs": 300,
            "estado": "generado",
            "fecha": hoy_str,
        })

    # 2. Creamos un historial estable de días anteriores con uso mínimo (1 sol. por día)
    for i in range(1, 6):
        fecha_pasada = (date.today() - timedelta(days=i)).isoformat()
        ai_monitoring_service._monitoring_records.append({
            "uid": "user456",
            "tipo": "recommendations",
            "modelo": "analisis_local",
            "generadoPorLLM": False,
            "tiempoRespuestaMs": 100,
            "estado": "sin_datos",
            "fecha": fecha_pasada,
        })

    # 3. Ejecución directa sin mocks de Firestore
    result = get_monitoring_stats()

    print("\nResultado Alertas Recibidas:", result["alertas"])

    assert result["alertas"]["hayIncremento"] is True
    assert len(result["alertas"]["diasConConsumoAnormal"]) > 0