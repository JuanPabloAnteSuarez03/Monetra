from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

from schemas.financial_data_schemas import MovementCreate, MovementUpdate
from services.firebase_service import get_authenticated_uid
from services.movement_form_service import load_movement_for_edit
from services.movement_validation_service import (
    MovementValidationError,
    validate_movement_update,
)
from services.movements_service import (
    MovementServiceError,
    create_movement,
    delete_movement,
    get_movement,
    list_movements,
    update_movement,
)

router = APIRouter()


@router.post("/")
def create_user_movement(payload: MovementCreate, request: Request):
    uid = get_authenticated_uid(request)

    try:
        return create_movement(uid, payload)
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/")
def get_user_movements(
    request: Request,
    fechaInicio: Optional[str] = None,
    fechaFin: Optional[str] = None,
    limit: int = Query(default=500, ge=1, le=2000),
):
    uid = get_authenticated_uid(request)

    try:
        return {
            "uid": uid,
            "movimientos": list_movements(
                uid,
                fecha_inicio=fechaInicio,
                fecha_fin=fechaFin,
                limit_value=limit,
            ),
        }
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("/{movement_id}")
def get_user_movement(movement_id: str, request: Request):
    uid = get_authenticated_uid(request)

    try:
        return get_movement(uid, movement_id)
    except MovementServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{movement_id}/edit-form")
def get_movement_form_data(movement_id: str, request: Request):
    uid = get_authenticated_uid(request)

    try:
        return load_movement_for_edit(uid, movement_id)
    except MovementServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.put("/{movement_id}")
def update_user_movement(
    movement_id: str,
    payload: MovementUpdate,
    request: Request,
):
    uid = get_authenticated_uid(request)

    try:
        validate_movement_update(payload)
    except MovementValidationError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "mensaje": "Los datos enviados no son válidos.",
                "errores": error.errors,
            },
        ) from error

    try:
        return update_movement(uid, movement_id, payload)
    except MovementServiceError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.delete("/{movement_id}")
def delete_user_movement(
    movement_id: str,
    request: Request,
    confirmar: bool = False,
):
    uid = get_authenticated_uid(request)

    if not confirmar:
        raise HTTPException(
            status_code=400,
            detail="Debes confirmar la eliminación usando ?confirmar=true.",
        )

    try:
        resultado = delete_movement(uid, movement_id)
    except MovementServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    
    return {
        **resultado
    }