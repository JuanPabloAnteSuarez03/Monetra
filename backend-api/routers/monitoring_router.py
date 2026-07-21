from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from services.ai_monitoring_service import get_monitoring_stats

router = APIRouter()


@router.get("/stats")
def get_ai_monitoring_stats(
    fechaInicio: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    fechaFin: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    limit: int = Query(default=500, ge=1, le=2000),
):
    """
    Retorna métricas de uso del servicio de IA.
    Incluye totales, tiempos de respuesta, uso por tipo y alertas de consumo anormal.
    """
    try:
        return get_monitoring_stats(
            fecha_inicio=fechaInicio,
            fecha_fin=fechaFin,
            limit_value=limit,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error