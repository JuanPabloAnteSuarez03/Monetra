from typing import Literal, Optional

from pydantic import BaseModel, Field

MovementType = Literal["ingreso", "gasto", "ahorro", "deuda"]


class MovementCreate(BaseModel):
    tipo: MovementType
    monto: float = Field(gt=0)
    categoria: str = Field(min_length=1)
    fecha: str
    descripcion: Optional[str] = ""
    moneda: Optional[str] = "COP"
    origen: Optional[str] = "manual"


class MovementUpdate(BaseModel):
    tipo: Optional[MovementType] = None
    monto: Optional[float] = Field(default=None, gt=0)
    categoria: Optional[str] = None
    fecha: Optional[str] = None
    descripcion: Optional[str] = None
    moneda: Optional[str] = None
    origen: Optional[str] = None


class ReportQuery(BaseModel):
    fechaInicio: str
    fechaFin: str


class HistoryQuery(BaseModel):
    fechaInicio: Optional[str] = None
    fechaFin: Optional[str] = None
    meses: int = Field(default=6, ge=1, le=24)
    limiteMovimientos: int = Field(default=500, ge=1, le=2000)


class PredictionQuery(BaseModel):
    mesesHistorial: int = Field(default=6, ge=1, le=24)
    mesesPrediccion: int = Field(default=3, ge=1, le=12)