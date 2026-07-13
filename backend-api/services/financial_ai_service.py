import time
from datetime import datetime, timezone
from typing import Any, Dict, List

from schemas.financial_ai_schemas import FinancialAIRequest
from services.financial_context_service import build_financial_context
from services.gemini_service import GeminiServiceError, generate_content_with_gemini
from services.prompts_service import (
    build_financial_analysis_prompt,
    build_predictions_prompt,
    build_recommendations_prompt,
    validate_prompt,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_request_estimations(request: FinancialAIRequest) -> Dict[str, Any] | None:
    if not request.estimacionesFuturas:
        return None

    return request.estimacionesFuturas.model_dump()


def build_context_from_request(
    request: FinancialAIRequest,
    use_case: str,
) -> Dict[str, Any]:
    return build_financial_context(
        movements=request.movimientos,
        periodo=request.periodo,
        estimaciones_futuras=get_request_estimations(request),
        caso_uso=use_case,
        limite_movimientos=request.limiteMovimientos,
    )


def build_base_response(
    *,
    estado: str,
    mensaje: str,
    generado_por_llm: bool,
    modelo: str,
    data: Dict[str, Any],
    advertencias: List[str],
    tiempo_respuesta_ms: int,
) -> Dict[str, Any]:
    return {
        "exito": True,
        "estado": estado,
        "mensaje": mensaje,
        "generadoPorLLM": generado_por_llm,
        "modelo": modelo,
        "data": data,
        "advertencias": advertencias,
        "tiempoRespuestaMs": tiempo_respuesta_ms,
        "generadoEn": now_iso(),
    }


def local_analysis(context: Dict[str, Any], error: Exception | None = None) -> Dict[str, Any]:
    summary = context.get("resumenFinanciero", {})
    quality = context.get("calidadContexto", {})
    findings = context.get("hallazgos", [])

    total_movements = summary.get("totalMovimientos", 0)

    if total_movements == 0:
        return {
            "resumenEjecutivo": "No hay movimientos suficientes para generar un análisis financiero completo.",
            "patronesDetectados": [
                {
                    "titulo": "Información insuficiente",
                    "descripcion": "No se encontraron movimientos financieros en el período analizado.",
                    "categoria": "general",
                    "nivel": "advertencia",
                    "evidencia": "Total de movimientos: 0",
                }
            ],
            "conclusiones": [
                "El análisis es limitado por falta de historial financiero.",
                "Registrar movimientos permitirá obtener conclusiones más útiles.",
            ],
            "oportunidadesMejora": [
                "Registrar ingresos, gastos, ahorros y deudas de forma constante.",
                "Clasificar los movimientos por categoría.",
            ],
            "advertencias": quality.get("advertencias", []),
            "mensajeFinal": "Registra más movimientos para recibir análisis más completos.",
            "fuente": "analisis_local",
            "errorOriginal": str(error) if error else None,
        }

    patrones = [
        {
            "titulo": item.get("titulo", "Hallazgo financiero"),
            "descripcion": item.get("descripcion", ""),
            "categoria": item.get("categoria", "general"),
            "nivel": item.get("nivel", "informativo"),
            "evidencia": str(item.get("valor", "")),
        }
        for item in findings[:6]
    ]

    conclusiones = []

    if summary.get("flujoNeto", 0) < 0:
        conclusiones.append("El flujo neto es negativo: los egresos superan los ingresos.")
    else:
        conclusiones.append("El flujo neto no presenta un valor negativo en el período.")

    if summary.get("porcentajeGastosSobreIngresos", 0) > 80:
        conclusiones.append("Los gastos representan una proporción alta frente a los ingresos.")

    if summary.get("porcentajeAhorroSobreIngresos", 0) < 10:
        conclusiones.append("El ahorro registrado es bajo frente a los ingresos.")

    return {
        "resumenEjecutivo": (
            f"Se analizaron {total_movements} movimientos financieros. "
            f"Los gastos representan el {summary.get('porcentajeGastosSobreIngresos', 0)}% "
            f"de los ingresos y el flujo neto es {summary.get('flujoNeto', 0)}."
        ),
        "patronesDetectados": patrones,
        "conclusiones": conclusiones,
        "oportunidadesMejora": [
            "Revisar las categorías con mayor gasto.",
            "Mantener el registro constante de movimientos.",
            "Usar el análisis como apoyo para planificar mejor los gastos.",
        ],
        "advertencias": [
            "Este análisis es aproximado y depende de la información registrada.",
            *quality.get("advertencias", []),
        ],
        "mensajeFinal": "Usa este análisis como guía para mejorar tu organización financiera.",
        "fuente": "analisis_local",
        "errorOriginal": str(error) if error else None,
    }


def local_recommendations(context: Dict[str, Any], error: Exception | None = None) -> Dict[str, Any]:
    summary = context.get("resumenFinanciero", {})
    quality = context.get("calidadContexto", {})
    priorities = context.get("prioridadesDetectadas", [])
    category = context.get("categorias", {}).get("categoriaPrincipalGasto")

    recommendations = []

    if not quality.get("datosSuficientes"):
        recommendations.append(
            {
                "tipo": "general",
                "prioridad": "media",
                "titulo": "Registrar más movimientos financieros",
                "descripcion": "No hay datos suficientes para generar recomendaciones detalladas.",
                "accionSugerida": "Registra ingresos, gastos, ahorros y deudas durante varios días.",
                "motivo": "El análisis necesita historial financiero para detectar patrones.",
                "beneficioEsperado": "Mejorar la calidad de las recomendaciones futuras.",
                "metricaRelacionada": {
                    "nombre": "Total de movimientos",
                    "valor": summary.get("totalMovimientos", 0),
                },
                "etiquetas": ["datos_insuficientes", "historial"],
            }
        )

    if "control_gastos" in priorities or summary.get("porcentajeGastosSobreIngresos", 0) > 60:
        recommendations.append(
            {
                "tipo": "control_gastos",
                "prioridad": "alta"
                if summary.get("porcentajeGastosSobreIngresos", 0) > 80
                else "media",
                "titulo": "Revisar el nivel de gastos",
                "descripcion": (
                    f"Los gastos representan el "
                    f"{summary.get('porcentajeGastosSobreIngresos', 0)}% "
                    f"de los ingresos."
                ),
                "accionSugerida": "Define un límite de gasto semanal y revisa categorías que puedan reducirse.",
                "motivo": "Un porcentaje alto de gastos puede afectar el ahorro.",
                "beneficioEsperado": "Mejor control del dinero disponible.",
                "metricaRelacionada": {
                    "nombre": "Gastos sobre ingresos",
                    "valor": f"{summary.get('porcentajeGastosSobreIngresos', 0)}%",
                },
                "etiquetas": ["gastos", "control"],
            }
        )

    if category:
        recommendations.append(
            {
                "tipo": "control_gastos",
                "prioridad": "media",
                "titulo": f"Controlar gastos en {category.get('categoria')}",
                "descripcion": (
                    f"La categoría {category.get('categoria')} concentra "
                    f"una parte importante de los gastos."
                ),
                "accionSugerida": "Define un presupuesto máximo para esta categoría.",
                "motivo": "Controlar la categoría principal puede mejorar el presupuesto.",
                "beneficioEsperado": "Reducir el impacto del mayor gasto.",
                "metricaRelacionada": {
                    "nombre": "Categoría principal de gasto",
                    "valor": category.get("categoria"),
                },
                "etiquetas": ["categoria", "gasto"],
            }
        )

    if "fortalecer_ahorro" in priorities or summary.get("porcentajeAhorroSobreIngresos", 0) < 10:
        recommendations.append(
            {
                "tipo": "ahorro",
                "prioridad": "alta",
                "titulo": "Fortalecer el hábito de ahorro",
                "descripcion": (
                    f"El ahorro representa el "
                    f"{summary.get('porcentajeAhorroSobreIngresos', 0)}% "
                    f"de los ingresos."
                ),
                "accionSugerida": "Separa un porcentaje fijo de cada ingreso antes de gastar.",
                "motivo": "El ahorro bajo dificulta cumplir metas financieras.",
                "beneficioEsperado": "Crear un hábito de ahorro más constante.",
                "metricaRelacionada": {
                    "nombre": "Ahorro sobre ingresos",
                    "valor": f"{summary.get('porcentajeAhorroSobreIngresos', 0)}%",
                },
                "etiquetas": ["ahorro", "habito"],
            }
        )

    if not recommendations:
        recommendations.append(
            {
                "tipo": "habitos",
                "prioridad": "baja",
                "titulo": "Mantener el registro financiero constante",
                "descripcion": "No se detectaron alertas fuertes en el período.",
                "accionSugerida": "Continúa registrando tus movimientos para mantener los análisis actualizados.",
                "motivo": "Un historial completo mejora la calidad de los reportes.",
                "beneficioEsperado": "Mejor toma de decisiones financieras.",
                "metricaRelacionada": {
                    "nombre": "Total de movimientos",
                    "valor": summary.get("totalMovimientos", 0),
                },
                "etiquetas": ["habitos", "registro"],
            }
        )

    return {
        "resumenGeneral": "Se generaron recomendaciones automáticas con base en la información disponible.",
        "recomendaciones": recommendations[:5],
        "mensajeFinal": "Aplica las recomendaciones paso a paso para mejorar tu organización financiera.",
        "fuente": "recomendaciones_locales",
        "errorOriginal": str(error) if error else None,
    }


def local_predictions(context: Dict[str, Any], error: Exception | None = None) -> Dict[str, Any]:
    predictions = context.get("predicciones") or {}
    quality = context.get("calidadContexto", {})

    monthly = predictions.get("estimacionesMensuales") or []
    total = predictions.get("estimacionTotal") or {}
    confidence = predictions.get("confianza") or {}

    if not monthly:
        return {
            "resumenPredictivo": "No hay datos suficientes para generar predicciones financieras detalladas.",
            "horizonteAnalizado": "Sin horizonte disponible.",
            "predicciones": [],
            "escenarios": {
                "optimista": "No disponible por falta de datos.",
                "probable": "No disponible por falta de datos.",
                "preventivo": "Registra más movimientos para obtener predicciones útiles.",
            },
            "conclusiones": [
                "La predicción es limitada por falta de historial.",
                "Las estimaciones mejorarán al registrar más movimientos.",
            ],
            "accionesSugeridas": [
                "Registrar gastos de forma constante.",
                "Clasificar movimientos por categoría.",
            ],
            "advertencias": quality.get("advertencias", []),
            "mensajeFinal": "Registra más información para obtener predicciones más útiles.",
            "fuente": "prediccion_local",
            "errorOriginal": str(error) if error else None,
        }

    normalized = [
        {
            "periodo": item.get("nombreMes") or item.get("mes"),
            "gastoEstimado": item.get("estimacionProbable", 0),
            "rangoMinimo": item.get("estimacionMinima", 0),
            "rangoMaximo": item.get("estimacionMaxima", 0),
            "interpretacion": (
                f"Para {item.get('nombreMes') or item.get('mes')}, "
                f"el gasto probable estimado es {item.get('estimacionProbable', 0)}."
            ),
            "nivelConfianza": confidence.get("nivel", "media"),
            "categoriaPrincipalEsperada": "Sin datos",
            "advertencia": "Predicción aproximada basada en historial financiero.",
        }
        for item in monthly[:6]
    ]

    return {
        "resumenPredictivo": (
            f"El gasto futuro probable estimado es "
            f"{total.get('estimacionProbable', 0)}."
        ),
        "horizonteAnalizado": str(predictions.get("horizontePrediccion") or {}),
        "predicciones": normalized,
        "escenarios": {
            "optimista": f"El gasto podría acercarse a {total.get('estimacionMinima', 0)}.",
            "probable": f"El escenario probable estima {total.get('estimacionProbable', 0)}.",
            "preventivo": f"El gasto podría llegar a {total.get('estimacionMaxima', 0)}.",
        },
        "conclusiones": [
            "Las predicciones son aproximaciones basadas en datos históricos.",
            "Los resultados pueden cambiar al registrar nuevos movimientos.",
        ],
        "accionesSugeridas": [
            "Usar el rango máximo como referencia preventiva.",
            "Revisar categorías con mayor gasto esperado.",
        ],
        "advertencias": [
            "Las predicciones son aproximaciones.",
            *predictions.get("advertencias", []),
            *quality.get("advertencias", []),
        ],
        "mensajeFinal": "Usa esta predicción como guía para planificar, no como valor exacto.",
        "fuente": "prediccion_local",
        "errorOriginal": str(error) if error else None,
    }


async def generate_financial_analysis(request: FinancialAIRequest) -> Dict[str, Any]:
    start = time.time()
    context = build_context_from_request(request, "analisis_financiero")
    quality = context.get("calidadContexto", {})

    if not quality.get("datosSuficientes"):
        data = local_analysis(context)
        return build_base_response(
            estado="sin_datos",
            mensaje="No hay datos suficientes para generar análisis con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="analisis_local",
            data=data,
            advertencias=quality.get("advertencias", []),
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )

    try:
        prompt = build_financial_analysis_prompt(context)
        validate_prompt(prompt)

        response = await generate_content_with_gemini(
            prompt=prompt,
            temperature=0.3,
            max_output_tokens=1500,
        )

        return build_base_response(
            estado="generado",
            mensaje="Análisis financiero generado correctamente.",
            generado_por_llm=True,
            modelo=response["modelo"],
            data=response["json"],
            advertencias=quality.get("advertencias", []),
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )
    except Exception as error:
        if not request.permitirRespaldoLocal:
            raise

        data = local_analysis(context, error)

        return build_base_response(
            estado="generado_con_respaldo",
            mensaje="No fue posible generar análisis con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="analisis_local",
            data=data,
            advertencias=[
                *quality.get("advertencias", []),
                str(error),
            ],
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )


async def generate_recommendations(request: FinancialAIRequest) -> Dict[str, Any]:
    start = time.time()
    context = build_context_from_request(request, "recomendaciones_financieras")
    quality = context.get("calidadContexto", {})

    if not quality.get("datosSuficientes"):
        data = local_recommendations(context)

        return build_base_response(
            estado="sin_datos",
            mensaje="No hay datos suficientes para recomendaciones con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="recomendaciones_locales",
            data=data,
            advertencias=quality.get("advertencias", []),
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )

    try:
        prompt = build_recommendations_prompt(context)
        validate_prompt(prompt)

        response = await generate_content_with_gemini(
            prompt=prompt,
            temperature=0.4,
            max_output_tokens=1600,
        )

        return build_base_response(
            estado="generado",
            mensaje="Recomendaciones generadas correctamente.",
            generado_por_llm=True,
            modelo=response["modelo"],
            data=response["json"],
            advertencias=quality.get("advertencias", []),
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )
    except Exception as error:
        if not request.permitirRespaldoLocal:
            raise

        data = local_recommendations(context, error)

        return build_base_response(
            estado="generado_con_respaldo",
            mensaje="No fue posible generar recomendaciones con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="recomendaciones_locales",
            data=data,
            advertencias=[
                *quality.get("advertencias", []),
                str(error),
            ],
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )


async def generate_predictions(request: FinancialAIRequest) -> Dict[str, Any]:
    start = time.time()
    context = build_context_from_request(request, "predicciones_financieras")
    quality = context.get("calidadContexto", {})
    predictions = context.get("predicciones") or {}

    if not predictions or not predictions.get("estimacionesMensuales"):
        data = local_predictions(context)

        return build_base_response(
            estado="sin_datos",
            mensaje="No hay estimaciones suficientes para predicciones con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="prediccion_local",
            data=data,
            advertencias=quality.get("advertencias", []),
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )

    try:
        prompt = build_predictions_prompt(context)
        validate_prompt(prompt)

        response = await generate_content_with_gemini(
            prompt=prompt,
            temperature=0.3,
            max_output_tokens=1600,
        )

        return build_base_response(
            estado="generado",
            mensaje="Predicciones financieras generadas correctamente.",
            generado_por_llm=True,
            modelo=response["modelo"],
            data=response["json"],
            advertencias=[
                *quality.get("advertencias", []),
                *predictions.get("advertencias", []),
            ],
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )
    except Exception as error:
        if not request.permitirRespaldoLocal:
            raise

        data = local_predictions(context, error)

        return build_base_response(
            estado="generado_con_respaldo",
            mensaje="No fue posible generar predicciones con IA. Se generó respaldo local.",
            generado_por_llm=False,
            modelo="prediccion_local",
            data=data,
            advertencias=[
                *quality.get("advertencias", []),
                *predictions.get("advertencias", []),
                str(error),
            ],
            tiempo_respuesta_ms=int((time.time() - start) * 1000),
        )