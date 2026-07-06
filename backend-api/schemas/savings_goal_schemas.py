
from typing import Literal, Optional

from pydantic import BaseModel, Field

# Estado posible de una meta de ahorro
GoalStatus = Literal["activa", "completada", "cancelada"]


class SavingsGoalCreate(BaseModel):

    nombre: str = Field(min_length=1, max_length=100)
    montoObjetivo: float = Field(gt=0)
    fechaEstimada: str  # Formato esperado: YYYY-MM-DD
    descripcion: Optional[str] = Field(default="", max_length=200)
    moneda: Optional[str] = "COP"


class SavingsGoalUpdate(BaseModel):

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    montoObjetivo: Optional[float] = Field(default=None, gt=0)
    fechaEstimada: Optional[str] = None
    descripcion: Optional[str] = Field(default=None, max_length=200)
    moneda: Optional[str] = None
    estado: Optional[GoalStatus] = None

class AbonoCreate(BaseModel):
    """Datos requeridos para registrar un abono a una meta de ahorro."""
    monto: float = Field(gt=0)

class RetiroCreate(BaseModel):
    """Datos requeridos para registrar un retiro de una meta de ahorro."""
    monto: float = Field(gt=0)