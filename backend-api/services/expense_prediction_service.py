import math
from datetime import datetime
from typing import Any, Dict, List

from services.financial_history_service import collect_financial_history

MODEL_NAME = "modelo_predictivo_gastos_backend"
MODEL_VERSION = "1.0"


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def average(values: List[float]) -> float:
    if not values:
        return 0.0

    return round_number(sum(values) / len(values))


def std_dev(values: List[float]) -> float:
    if not values:
        return 0.0

    avg = average(values)
    variance = sum((value - avg) ** 2 for value in values) / len(values)

    return round_number(math.sqrt(variance))


def weighted_recent_average(values: List[float], limit: int = 3) -> float:
    if not values:
        return 0.0

    latest = values[-limit:]
    total_weight = 0
    weighted_sum = 0

    for index, value in enumerate(latest):
        weight = index + 1
        total_weight += weight
        weighted_sum += value * weight

    return round_number(weighted_sum / total_weight) if total_weight else 0.0


def linear_regression(values: List[float]) -> Dict[str, Any]:
    n = len(values)

    if n < 2:
        return {
            "pendiente": 0,
            "intercepto": values[0] if values else 0,
            "r2": 0,
        }

    x_values = list(range(n))
    sum_x = sum(x_values)
    sum_y = sum(values)
    sum_xy = sum(x * y for x, y in zip(x_values, values))
    sum_x2 = sum(x**2 for x in x_values)

    denominator = n * sum_x2 - sum_x**2

    slope = 0 if denominator == 0 else (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n

    avg_y = sum_y / n
    ss_total = sum((y - avg_y) ** 2 for y in values)
    ss_residue = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(x_values, values))

    r2 = 1 if ss_total == 0 else 1 - (ss_residue / ss_total)

    return {
        "pendiente": round_number(slope),
        "intercepto": round_number(intercept),
        "r2": round_number(max(0, min(1, r2)), 4),
    }


def describe_trend(slope: float, historical_average: float) -> Dict[str, Any]:
    if historical_average <= 0:
        return {
            "tendencia": "insuficiente",
            "variacionMensual": 0,
            "descripcion": "No hay promedio histórico suficiente.",
        }

    monthly_variation = round_number((slope / historical_average) * 100)

    if monthly_variation > 8:
        return {
            "tendencia": "aumento",
            "variacionMensual": monthly_variation,
            "descripcion": f"Los gastos muestran una tendencia de aumento aproximada de {monthly_variation}% mensual.",
        }

    if monthly_variation < -8:
        return {
            "tendencia": "disminucion",
            "variacionMensual": monthly_variation,
            "descripcion": f"Los gastos muestran una tendencia de disminución aproximada de {abs(monthly_variation)}% mensual.",
        }

    return {
        "tendencia": "estable",
        "variacionMensual": monthly_variation,
        "descripcion": "Los gastos se mantienen relativamente estables.",
    }


def calculate_confidence(
    total_months: int,
    total_movements: int,
    coefficient_variation: float,
    r2: float,
) -> Dict[str, Any]:
    score = 35

    if total_months >= 6:
        score += 25
    elif total_months >= 3:
        score += 15
    elif total_months > 0:
        score += 5

    if total_movements >= 30:
        score += 20
    elif total_movements >= 10:
        score += 12
    elif total_movements > 0:
        score += 5

    if coefficient_variation <= 20:
        score += 20
    elif coefficient_variation <= 40:
        score += 12
    elif coefficient_variation <= 60:
        score += 5
    else:
        score -= 5

    if r2 >= 0.6:
        score += 10
    elif r2 >= 0.3:
        score += 5

    score = max(0, min(100, round(score)))

    if score >= 75:
        return {
            "nivel": "alta",
            "puntaje": score,
            "descripcion": "La predicción tiene buena base histórica.",
        }

    if score >= 50:
        return {
            "nivel": "media",
            "puntaje": score,
            "descripcion": "La predicción es útil, pero debe revisarse con cautela.",
        }

    return {
        "nivel": "baja",
        "puntaje": score,
        "descripcion": "La predicción requiere más historial financiero.",
    }


def month_key_to_date(month_key: str) -> datetime:
    return datetime.strptime(month_key, "%Y-%m")


def next_month_key(base_month: str, offset: int) -> str:
    base_date = month_key_to_date(base_month)
    month = base_date.month + offset
    year = base_date.year

    while month > 12:
        month -= 12
        year += 1

    return f"{year}-{month:02d}"


def calculate_category_estimations(
    frequent_categories: List[Dict[str, Any]],
    estimated_expense: float,
) -> List[Dict[str, Any]]:
    total_categories = sum(float(item.get("total", 0) or 0) for item in frequent_categories)

    if total_categories <= 0:
        return []

    result = []

    for category in frequent_categories[:5]:
        percentage = round_number((float(category["total"]) / total_categories) * 100)

        result.append(
            {
                "categoria": category["categoria"],
                "porcentajeHistorico": percentage,
                "gastoEstimado": round_number((estimated_expense * percentage) / 100),
            }
        )

    return result


def calculate_expense_prediction(
    financial_history: Dict[str, Any],
    prediction_months: int = 3,
) -> Dict[str, Any]:
    monthly_history = financial_history.get("historialMensual", [])

    monthly_expenses = [
        float(item.get("gastos", 0) or 0)
        for item in monthly_history
        if item.get("mes") and item.get("mes") != "sin-fecha"
    ]

    if not monthly_expenses:
        return {
            "exito": False,
            "estado": "datos_insuficientes",
            "modelo": {
                "nombre": MODEL_NAME,
                "version": MODEL_VERSION,
            },
            "periodoHistorico": financial_history.get("periodo"),
            "horizontePrediccion": {
                "mesesPrediccion": prediction_months,
            },
            "prediccionesMensuales": [],
            "prediccionTotal": {
                "gastoEstimado": 0,
                "rangoMinimo": 0,
                "rangoMaximo": 0,
            },
            "confianza": {
                "nivel": "baja",
                "puntaje": 0,
                "descripcion": "No hay historial suficiente.",
            },
            "advertencias": [
                "No hay historial financiero suficiente para generar predicciones.",
                "Las predicciones son aproximaciones basadas en datos históricos.",
            ],
        }

    historical_average = average(monthly_expenses)
    recent_average = weighted_recent_average(monthly_expenses)
    deviation = std_dev(monthly_expenses)

    coefficient_variation = (
        round_number((deviation / historical_average) * 100)
        if historical_average > 0
        else 0
    )

    regression = linear_regression(monthly_expenses)

    trend = describe_trend(regression["pendiente"], historical_average)

    last_month = monthly_history[-1]["mes"]
    predictions = []

    for index in range(1, prediction_months + 1):
        month = next_month_key(last_month, index)
        future_index = len(monthly_expenses) + index - 1

        trend_estimation = regression["intercepto"] + regression["pendiente"] * future_index

        if len(monthly_expenses) >= 2:
            combined = trend_estimation * 0.5 + recent_average * 0.3 + historical_average * 0.2
        else:
            combined = historical_average

        estimated_expense = max(0, min(combined, historical_average * 2.2 if historical_average else combined))
        estimated_expense = round_number(estimated_expense)

        margin = max(estimated_expense * 0.12, deviation * 0.7)

        predictions.append(
            {
                "mes": month,
                "nombreMes": month,
                "gastoEstimado": estimated_expense,
                "rangoMinimo": round_number(max(0, estimated_expense - margin)),
                "rangoMaximo": round_number(estimated_expense + margin),
                "margenErrorEstimado": round_number(margin),
                "categoriasEstimadas": calculate_category_estimations(
                    financial_history.get("categoriasFrecuentes", []),
                    estimated_expense,
                ),
                "explicacion": "Estimación basada en promedio histórico, promedio reciente y tendencia mensual.",
            }
        )

    total_estimated = round_number(sum(item["gastoEstimado"] for item in predictions))
    total_min = round_number(sum(item["rangoMinimo"] for item in predictions))
    total_max = round_number(sum(item["rangoMaximo"] for item in predictions))

    confidence = calculate_confidence(
        total_months=len(monthly_expenses),
        total_movements=financial_history.get("totalMovimientosRecopilados", 0),
        coefficient_variation=coefficient_variation,
        r2=regression["r2"],
    )

    return {
        "exito": True,
        "estado": "generada",
        "modelo": {
            "nombre": MODEL_NAME,
            "version": MODEL_VERSION,
            "metodo": "Promedio histórico, promedio ponderado reciente y tendencia lineal simple.",
        },
        "periodoHistorico": financial_history.get("periodo"),
        "horizontePrediccion": {
            "mesesPrediccion": prediction_months,
        },
        "resumenHistorico": {
            "totalMesesAnalizados": len(monthly_expenses),
            "totalMovimientosAnalizados": financial_history.get("totalMovimientosRecopilados", 0),
            "gastoPromedioMensual": historical_average,
            "gastoPromedioReciente": recent_average,
            "desviacionEstandar": deviation,
            "coeficienteVariacion": coefficient_variation,
        },
        "tendenciaDetectada": {
            **trend,
            "pendienteMensual": regression["pendiente"],
            "r2": regression["r2"],
        },
        "prediccionesMensuales": predictions,
        "prediccionTotal": {
            "gastoEstimado": total_estimated,
            "rangoMinimo": total_min,
            "rangoMaximo": total_max,
        },
        "confianza": confidence,
        "advertencias": [
            "Las predicciones son aproximaciones basadas en datos históricos.",
            "Los resultados pueden cambiar cuando se registren nuevos movimientos.",
            *financial_history.get("advertencias", []),
        ],
    }


def generate_user_expense_prediction(
    uid: str,
    history_months: int = 6,
    prediction_months: int = 3,
) -> Dict[str, Any]:
    history = collect_financial_history(uid, meses=history_months)

    return calculate_expense_prediction(history, prediction_months)