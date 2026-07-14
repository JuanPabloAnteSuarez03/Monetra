import pytest
from pydantic import ValidationError
from schemas.financial_ai_schemas import FinancialAIRequest, FinancialMovement
from schemas.financial_data_schemas import MovementCreate

def test_financial_movement_valid():
    """Debería crear un movimiento financiero válido."""
    movement = FinancialMovement(tipo="gasto", monto=15000.0, categoria="comida")
    assert movement.tipo == "gasto"
    assert movement.monto == 15000.0

def test_financial_movement_invalid_monto():
    """Debería fallar si el monto es menor o igual a cero."""
    with pytest.raises(ValidationError):
        FinancialMovement(tipo="gasto", monto=-50, categoria="comida")

def test_movement_create_validation():
    """Debería validar los campos requeridos de MovementCreate."""
    payload = {
        "tipo": "ingreso",
        "monto": 2500000,
        "categoria": "Salario",
        "fecha": "2026-06-15"
    }
    movement = MovementCreate(**payload)
    assert movement.moneda == "COP"  # Verifica el default

    # Falla por categoría vacía (min_length=1)
    payload["categoria"] = ""
    with pytest.raises(ValidationError):
        MovementCreate(**payload)