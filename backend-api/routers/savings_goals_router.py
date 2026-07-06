from fastapi import APIRouter, HTTPException, Query, Request

from schemas.savings_goal_schemas import SavingsGoalCreate, SavingsGoalUpdate, AbonoCreate, RetiroCreate
from services.firebase_service import get_authenticated_uid
from services.savings_goal_progress_service import (
    get_all_goals_progress,
    get_goal_progress,
)
from services.savings_goal_validation_service import (
    SavingsGoalValidationError,
    validate_savings_goal_create,
    validate_savings_goal_update,
)
from services.savings_goals_service import (
    SavingsGoalServiceError,
    create_goal,
    delete_goal,
    get_goal,
    list_goals,
    update_goal,
)

from services.savings_goal_abono_service import (
     AbonoValidationError,
     register_abono,
)

from services.savings_goal_retiro_service import (
     RetiroValidationError,
     register_retiro,
)

router = APIRouter()


@router.post("/")
def create_savings_goal(payload: SavingsGoalCreate, request: Request):
    uid = get_authenticated_uid(request)

    try:
        validate_savings_goal_create(payload)
    except SavingsGoalValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "mensaje": "Los datos de la meta no son válidos.",
                "errores": error.errors,
            },
        ) from error

    try:
        return create_goal(uid, payload)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/")
def list_savings_goals(
    request: Request,
    soloActivas: bool = Query(default=False),
):
    uid = get_authenticated_uid(request)

    try:
        metas = list_goals(uid, solo_activas=soloActivas)
        return {
            "uid": uid,
            "total": len(metas),
            "metas": metas,
        }
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

@router.get("/progress/all")
def get_all_goals_progress_endpoint(
    request: Request,
    soloActivas: bool = Query(default=False),
):
    uid = get_authenticated_uid(request)

    try:
        return get_all_goals_progress(uid, solo_activas=soloActivas)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/{goal_id}/abonos")
def add_abono(goal_id: str, payload: AbonoCreate, request: Request):
    
    uid = get_authenticated_uid(request)
 
    try:
        return register_abono(uid, goal_id, payload.monto)
    except AbonoValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

@router.post("/{goal_id}/retiros")
def add_retiro(goal_id: str, payload: RetiroCreate, request: Request):
    
    uid = get_authenticated_uid(request)
 
    try:
        return register_retiro(uid, goal_id, payload.monto)
    except RetiroValidationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

@router.get("/{goal_id}")
def get_savings_goal(goal_id: str, request: Request):
    uid = get_authenticated_uid(request)

    try:
        return get_goal(uid, goal_id)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{goal_id}/progress")
def get_goal_progress_endpoint(goal_id: str, request: Request):
    uid = get_authenticated_uid(request)

    try:
        return get_goal_progress(uid, goal_id)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("/{goal_id}")
def update_savings_goal(goal_id: str, payload: SavingsGoalUpdate, request: Request):
    uid = get_authenticated_uid(request)

    try:
        validate_savings_goal_update(payload)
    except SavingsGoalValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "mensaje": "Los datos enviados no son válidos.",
                "errores": error.errors,
            },
        ) from error

    try:
        return update_goal(uid, goal_id, payload)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/{goal_id}")
def delete_savings_goal(
    goal_id: str,
    request: Request,
    confirmar: bool = Query(default=False),
):
    uid = get_authenticated_uid(request)

    if not confirmar:
        raise HTTPException(
            status_code=400,
            detail="Debes confirmar la eliminación usando ?confirmar=true.",
        )

    try:
        return delete_goal(uid, goal_id)
    except SavingsGoalServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error