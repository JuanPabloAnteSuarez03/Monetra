from fastapi import APIRouter, HTTPException, Request

from schemas.financial_ai_schemas import FinancialAIRequest
from services.financial_ai_service import (
    generate_financial_analysis,
    generate_predictions,
    generate_recommendations,
)

from services.firebase_service import get_authenticated_uid
from services.recommendations_storage_service import (
     RecommendationStorageError,
     delete_recommendation,
     get_recommendation,
     list_recommendations,
     save_recommendation,
 )

from services.ai_monitoring_service import register_ai_request

router = APIRouter()


@router.post("/analysis")
async def financial_analysis(request: Request, body: FinancialAIRequest):
    uid = get_authenticated_uid(request)
    try:
        result = await generate_financial_analysis(body)
        register_ai_request(
            uid=uid,
            tipo="analysis",
            modelo=result.get("modelo", "desconocido"),
            generado_por_llm=result.get("generadoPorLLM", False),
            tiempo_respuesta_ms=result.get("tiempoRespuestaMs", 0),
            estado=result.get("estado", "desconocido"),
            advertencias=result.get("advertencias", []),
        )
        return result
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    

@router.post("/recommendations")
async def financial_recommendations(request: Request, body: FinancialAIRequest):
    uid = get_authenticated_uid(request)
    try:
        result = await generate_recommendations(body)
        register_ai_request(
            uid=uid,
            tipo="recommendations",
            modelo=result.get("modelo", "desconocido"),
            generado_por_llm=result.get("generadoPorLLM", False),
            tiempo_respuesta_ms=result.get("tiempoRespuestaMs", 0),
            estado=result.get("estado", "desconocido"),
            advertencias=result.get("advertencias", []),
        )
        return result
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.post("/predictions")
async def financial_predictions(request: Request, body: FinancialAIRequest):
    uid = get_authenticated_uid(request)
    try:
        result = await generate_predictions(body)
        register_ai_request(
            uid=uid,
            tipo="predictions",
            modelo=result.get("modelo", "desconocido"),
            generado_por_llm=result.get("generadoPorLLM", False),
            tiempo_respuesta_ms=result.get("tiempoRespuestaMs", 0),
            estado=result.get("estado", "desconocido"),
            advertencias=result.get("advertencias", []),
        )
        return result
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    
 
@router.post("/recommendations/save")
async def financial_recommendations_save(request: FinancialAIRequest, http_request: Request):
    uid = get_authenticated_uid(http_request)
 
    try:
        # Genera ambos en paralelo
        analisis_response = await generate_financial_analysis(request)
        recommendation_response = await generate_recommendations(request)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
 
    # Combina todo en un solo objeto antes de guardar
    combined_data = {
        **recommendation_response,
        "data": {
            **(recommendation_response.get("data") or {}),
            "analisis": analisis_response.get("data") or {},
        }
    }

    try:
        storage_result = save_recommendation(
            uid,
            combined_data,
            periodo=request.periodo,
        )
    except RecommendationStorageError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
 
    return {
        **combined_data,
        "almacenamiento": storage_result,
    }
 
@router.get("/recommendations/history")
def financial_recommendations_history(
    request: Request,
    limite: int = 20,
):
    """
    Retorna el historial de recomendaciones almacenadas del usuario,
    de la más reciente a la más antigua.
    """
    uid = get_authenticated_uid(request)
 
    recomendaciones = list_recommendations(uid, limit_value=limite)
 
    return {
        "uid": uid,
        "total": len(recomendaciones),
        "recomendaciones": recomendaciones,
    }
 
 
@router.get("/recommendations/history/{recommendation_id}")
def financial_recommendation_detail(recommendation_id: str, request: Request):
    """Retorna una recomendación almacenada específica."""
    uid = get_authenticated_uid(request)
 
    try:
        return get_recommendation(uid, recommendation_id)
    except RecommendationStorageError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
 
 
@router.delete("/recommendations/history/{recommendation_id}")
def financial_recommendation_delete(recommendation_id: str, request: Request):
    """Elimina una recomendación almacenada del usuario."""
    uid = get_authenticated_uid(request)
 
    try:
        return delete_recommendation(uid, recommendation_id)
    except RecommendationStorageError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error