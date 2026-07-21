from typing import Any, Dict, List

from services.expense_prediction_service import generate_user_expense_prediction


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def calculate_variation(value: float, reference: float) -> float:
    if reference <= 0:
        return 0.0

    return round_number(((value - reference) / reference) * 100)


def classify_variation(variation: float) -> str:
    if variation > 15:
        return "aumento_alto"

    if variation > 5:
        return "aumento_moderado"

    if variation < -15:
        return "disminucion_alta"

    if variation < -5:
        return "disminucion_moderada"

    return "estable"


def normalize_monthly_estimation(
    prediction: Dict[str, Any],
    historical_average: float,
) -> Dict[str, Any]:
    probable = round_number(prediction.get("gastoEstimado"))
    minimum = round_number(prediction.get("rangoMinimo"))
    maximum = round_number(prediction.get("rangoMaximo"))

    variation = calculate_variation(probable, historical_average)

    return {
        "mes": prediction.get("mes"),
        "nombreMes": prediction.get("nombreMes"),
        "estimacionMinima": minimum,
        "estimacionProbable": probable,
        "estimacionMaxima": maximum,
        "margenErrorEstimado": round_number(prediction.get("margenErrorEstimado")),
        "variacionVsPromedioHistorico": variation,
        "estadoComparativo": classify_variation(variation),
        "categoriasEstimadas": prediction.get("categoriasEstimadas", []),
        "explicacion": prediction.get(
            "explicacion",
            "Estimación calculada con base en el historial financiero.",
        ),
    }


def calculate_total_estimation(monthly_estimations: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_min = round_number(sum(item["estimacionMinima"] for item in monthly_estimations))
    total_probable = round_number(sum(item["estimacionProbable"] for item in monthly_estimations))
    total_max = round_number(sum(item["estimacionMaxima"] for item in monthly_estimations))

    count = len(monthly_estimations) or 1

    return {
        "estimacionMinima": total_min,
        "estimacionProbable": total_probable,
        "estimacionMaxima": total_max,
        "promedioMensualEstimado": round_number(total_probable / count),
    }


def calculate_category_totals(monthly_estimations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    totals: Dict[str, Dict[str, Any]] = {}

    for estimation in monthly_estimations:
        for category in estimation.get("categoriasEstimadas", []):
            name = category.get("categoria", "Sin categoría")

            if name not in totals:
                totals[name] = {
                    "categoria": name,
                    "gastoEstimado": 0,
                    "mesesEstimados": 0,
                }

            totals[name]["gastoEstimado"] += float(category.get("gastoEstimado", 0) or 0)
            totals[name]["mesesEstimados"] += 1

    total_estimated = sum(item["gastoEstimado"] for item in totals.values())

    return sorted(
        [
            {
                "categoria": item["categoria"],
                "gastoEstimado": round_number(item["gastoEstimado"]),
                "porcentajeSobreTotalEstimado": round_number(
                    (item["gastoEstimado"] / total_estimated) * 100
                )
                if total_estimated
                else 0,
                "mesesEstimados": item["mesesEstimados"],
            }
            for item in totals.values()
        ],
        key=lambda item: item["gastoEstimado"],
        reverse=True,
    )


def calculate_future_estimates(prediction: Dict[str, Any]) -> Dict[str, Any]:
    if not prediction.get("exito") or not prediction.get("prediccionesMensuales"):
        return {
            "exito": False,
            "estado": "datos_insuficientes",
            "periodoHistorico": prediction.get("periodoHistorico"),
            "horizontePrediccion": prediction.get("horizontePrediccion"),
            "estimacionesMensuales": [],
            "estimacionTotal": {
                "estimacionMinima": 0,
                "estimacionProbable": 0,
                "estimacionMaxima": 0,
                "promedioMensualEstimado": 0,
            },
            "categoriasEstimadasTotales": [],
            "tendenciaEstimaciones": {
                "tendencia": "insuficiente",
                "variacionPorcentual": 0,
                "descripcion": "No hay datos suficientes para calcular estimaciones futuras.",
            },
            "confianza": prediction.get("confianza"),
            "mensajesInterpretacion": [
                "No hay historial suficiente para calcular estimaciones futuras.",
            ],
            "advertencias": prediction.get("advertencias", []),
        }

    historical_average = prediction.get("resumenHistorico", {}).get("gastoPromedioMensual", 0)

    monthly_estimations = [
        normalize_monthly_estimation(item, historical_average)
        for item in prediction["prediccionesMensuales"]
    ]

    total_estimation = calculate_total_estimation(monthly_estimations)
    category_totals = calculate_category_totals(monthly_estimations)

    messages = [
        f"El gasto futuro probable estimado es de {total_estimation['estimacionProbable']}.",
        f"El rango estimado se encuentra entre {total_estimation['estimacionMinima']} y {total_estimation['estimacionMaxima']}.",
        "Estas estimaciones son aproximaciones basadas en el historial financiero registrado.",
    ]

    return {
        "exito": True,
        "estado": "calculada",
        "modeloReferencia": prediction.get("modelo"),
        "periodoHistorico": prediction.get("periodoHistorico"),
        "horizontePrediccion": prediction.get("horizontePrediccion"),
        "resumenHistorico": prediction.get("resumenHistorico"),
        "estimacionesMensuales": monthly_estimations,
        "estimacionTotal": total_estimation,
        "categoriasEstimadasTotales": category_totals,
        "tendenciaEstimaciones": prediction.get("tendenciaDetectada"),
        "confianza": prediction.get("confianza"),
        "mensajesInterpretacion": messages,
        "advertencias": prediction.get("advertencias", []),
    }


def generate_user_future_estimates(
    uid: str,
    history_months: int = 6,
    prediction_months: int = 3,
) -> Dict[str, Any]:
    prediction = generate_user_expense_prediction(
        uid,
        history_months=history_months,
        prediction_months=prediction_months,
    )

    return calculate_future_estimates(prediction)