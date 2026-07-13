from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

MovementType = Literal["ingreso", "gasto", "ahorro", "deuda"]

UseCase = Literal[
    "analisis_financiero",
    "recomendaciones_financieras",
    "predicciones_financieras",
    "general",
]


class FinancialMovement(BaseModel):
    id: Optional[str] = None
    uid: Optional[str] = None
    tipo: MovementType
    monto: float = Field(gt=0)
    categoria: str = "Sin categoría"
    fecha: Optional[str] = None
    descripcion: Optional[str] = ""
    origen: Optional[str] = "manual"


class PredictionEstimates(BaseModel):
    exito: bool = False
    estado: Optional[str] = None
    periodoHistorico: Optional[Dict[str, Any]] = None
    horizontePrediccion: Optional[Dict[str, Any]] = None
    estimacionesMensuales: List[Dict[str, Any]] = []
    estimacionTotal: Optional[Dict[str, Any]] = None
    tendenciaEstimaciones: Optional[Dict[str, Any]] = None
    confianza: Optional[Dict[str, Any]] = None
    categoriasEstimadasTotales: List[Dict[str, Any]] = []
    advertencias: List[str] = []


class FinancialAIRequest(BaseModel):
    periodo: Optional[Dict[str, Any]] = None
    movimientos: List[FinancialMovement] = []
    estimacionesFuturas: Optional[PredictionEstimates] = None
    casoUso: UseCase = "general"
    limiteMovimientos: int = Field(default=20, ge=1, le=100)
    permitirRespaldoLocal: bool = True


class FinancialAIResponse(BaseModel):
    exito: bool
    estado: str
    mensaje: str
    generadoPorLLM: bool = False
    modelo: str
    data: Dict[str, Any]
    advertencias: List[str] = []
    tiempoRespuestaMs: int = 0
    generadoEn: str


class RecomendacionItem(BaseModel):
    tipo: Literal[
        "ahorro",
        "control_gastos",
        "deudas",
        "flujo_neto",
        "habitos",
        "general"
    ]
    prioridad: Literal["alta", "media", "baja"]
    titulo: str
    descripcion: str
    accionSugerida: str
    motivo: str
    beneficioEsperado: str
    metricaRelacionada: Optional[Dict[str, Any]] = None
    etiquetas: List[str] = []


class RecomendacionesResponse(BaseModel):
    resumenGeneral: str
    recomendaciones: List[RecomendacionItem]
    mensajeFinal: str
    fuente: str = "llm"
    errorOriginal: Optional[str] = None


class AnalisisResponse(BaseModel):
    resumenEjecutivo: str
    patronesDetectados: List[Dict[str, Any]]
    conclusiones: List[str]
    oportunidadesMejora: List[str]
    advertencias: List[str] = []
    mensajeFinal: str
    fuente: str = "llm"
    errorOriginal: Optional[str] = None


class PrediccionItem(BaseModel):
    periodo: str
    gastoEstimado: float
    rangoMinimo: float
    rangoMaximo: float
    interpretacion: str
    nivelConfianza: Literal["alta", "media", "baja"]
    categoriaPrincipalEsperada: str = "Sin datos"
    advertencia: Optional[str] = None


class PrediccionesResponse(BaseModel):
    resumenPredictivo: str
    horizonteAnalizado: str
    predicciones: List[PrediccionItem]
    escenarios: Dict[str, str]
    conclusiones: List[str]
    accionesSugeridas: List[str]
    advertencias: List[str] = []
    mensajeFinal: str
    fuente: str = "llm"
    errorOriginal: Optional[str] = None