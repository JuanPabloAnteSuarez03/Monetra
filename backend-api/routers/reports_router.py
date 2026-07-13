from fastapi import APIRouter, HTTPException, Request

from services.firebase_service import get_authenticated_uid
from services.financial_indicators_service import calculate_financial_indicators
from services.financial_metrics_service import calculate_financial_metrics
from services.movements_service import MovementServiceError, list_movements
from services.reports_service import generate_financial_report

router = APIRouter()


@router.get("/financial")
def get_financial_report(
    request: Request,
    fechaInicio: str,
    fechaFin: str,
):
    uid = get_authenticated_uid(request)

    try:
        return generate_financial_report(uid, fechaInicio, fechaFin)
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/metrics")
def get_financial_metrics(
    request: Request,
    fechaInicio: str,
    fechaFin: str,
):
    uid = get_authenticated_uid(request)

    try:
        movements = list_movements(
            uid,
            fecha_inicio=fechaInicio,
            fecha_fin=fechaFin,
            limit_value=2000,
        )

        return calculate_financial_metrics(movements, fechaInicio, fechaFin)
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/indicators")
def get_financial_indicators(
    request: Request,
    fechaInicio: str,
    fechaFin: str,
):
    uid = get_authenticated_uid(request)

    try:
        movements = list_movements(
            uid,
            fecha_inicio=fechaInicio,
            fecha_fin=fechaFin,
            limit_value=2000,
        )

        return calculate_financial_indicators(movements, fechaInicio, fechaFin)
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error