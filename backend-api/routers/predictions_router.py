from fastapi import APIRouter, HTTPException, Query, Request

from services.expense_prediction_service import generate_user_expense_prediction
from services.financial_history_service import collect_financial_history
from services.firebase_service import get_authenticated_uid
from services.future_estimates_service import generate_user_future_estimates

router = APIRouter()


@router.get("/history")
def get_financial_history(
    request: Request,
    meses: int = Query(default=6, ge=1, le=24),
    limiteMovimientos: int = Query(default=500, ge=1, le=2000),
):
    uid = get_authenticated_uid(request)

    try:
        return collect_financial_history(
            uid,
            meses=meses,
            limite_movimientos=limiteMovimientos,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/expenses")
def get_expense_prediction(
    request: Request,
    mesesHistorial: int = Query(default=6, ge=1, le=24),
    mesesPrediccion: int = Query(default=3, ge=1, le=12),
):
    uid = get_authenticated_uid(request)

    try:
        return generate_user_expense_prediction(
            uid,
            history_months=mesesHistorial,
            prediction_months=mesesPrediccion,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/estimates")
def get_future_estimates(
    request: Request,
    mesesHistorial: int = Query(default=6, ge=1, le=24),
    mesesPrediccion: int = Query(default=3, ge=1, le=12),
):
    uid = get_authenticated_uid(request)

    try:
        return generate_user_future_estimates(
            uid,
            history_months=mesesHistorial,
            prediction_months=mesesPrediccion,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error