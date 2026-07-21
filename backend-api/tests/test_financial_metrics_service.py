import pytest
from services.financial_metrics_service import (
    round_number,
    percentage,
    calculate_totals,
    calculate_financial_metrics,
)

def test_round_number_utility():
    assert round_number(123.456) == 123.46
    assert round_number("45.678") == 45.68
    assert round_number(None) == 0.0
    assert round_number("invalido") == 0.0

def test_percentage_utility():
    assert percentage(50, 200) == 25.0
    assert percentage(10, 0) == 0.0
    assert percentage(10, -5) == 0.0

def test_calculate_totals_aggregation():
    movimientos = [
        {"tipo": "ingreso", "monto": 3000000.0},
        {"tipo": "gasto", "monto": 500000.0},
        {"tipo": "gasto", "monto": 150000.0},
        {"tipo": "ahorro", "monto": 300000.0},
        {"tipo": "deuda", "monto": 200000.0},
        {"tipo": "desconocido", "monto": 999999.0}, # Debe ignorarse
    ]
    totales = calculate_totals(movimientos)
    assert totales["ingresos"] == 3000000.0
    assert totales["gastos"] == 650000.0
    assert totales["ahorros"] == 300000.0
    assert totales["deudas"] == 200000.0

def test_calculate_financial_metrics_alerts():
    # Caso crítico: Gastos > 80% e ingresos bajos para disparar alertas
    movimientos = [
        {"tipo": "ingreso", "monto": 1000000.0},
        {"tipo": "gasto", "monto": 850000.0}, # 85% de ingresos
        {"tipo": "ahorro", "monto": 50000.0},  # 5% (Menor al 10%)
    ]
    resultado = calculate_financial_metrics(movimientos, "2026-06-01", "2026-06-30")
    
    assert resultado["resumenGeneral"]["totalIngresos"] == 1000000.0
    assert resultado["resumenGeneral"]["totalGastos"] == 850000.0
    
    # Validamos que se activen las alertas configuradas en tu servicio
    assert any("más del 80%" in alerta for alerta in resultado["alertas"])
    assert any("menor al 10%" in alerta for alerta in resultado["alertas"])