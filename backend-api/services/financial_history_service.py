from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional

from services.movements_service import list_movements


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def format_date(date: datetime) -> str:
    return date.date().isoformat()


def get_historical_period(months: int = 6) -> Dict[str, Any]:
    today = datetime.now()

    start_month = today.month - months + 1
    start_year = today.year

    while start_month <= 0:
        start_month += 12
        start_year -= 1

    start = datetime(start_year, start_month, 1)

    if today.month == 12:
        end = datetime(today.year, 12, 31)
    else:
        next_month = datetime(today.year, today.month + 1, 1)
        end = datetime.fromtimestamp(next_month.timestamp() - 86400)

    return {
        "fechaInicio": format_date(start),
        "fechaFin": format_date(end),
        "meses": months,
    }


def get_month_key(date_value: Optional[str]) -> str:
    if not date_value:
        return "sin-fecha"

    return date_value[:7]


def get_month_name(month_key: str) -> str:
    if month_key == "sin-fecha":
        return "Sin fecha"

    try:
        date = datetime.strptime(month_key, "%Y-%m")
        return date.strftime("%B de %Y")
    except Exception:
        return month_key


def summarize_general(movements: List[Dict[str, Any]]) -> Dict[str, Any]:
    totals = {
        "totalIngresos": 0,
        "totalGastos": 0,
        "totalAhorros": 0,
        "totalDeudas": 0,
    }

    key_by_type = {
        "ingreso": "totalIngresos",
        "gasto": "totalGastos",
        "ahorro": "totalAhorros",
        "deuda": "totalDeudas",
    }

    for movement in movements:
        key = key_by_type.get(movement.get("tipo"))

        if key:
            totals[key] += float(movement.get("monto", 0) or 0)

    total_egresos = totals["totalGastos"] + totals["totalAhorros"] + totals["totalDeudas"]

    return {
        "totalMovimientos": len(movements),
        "totalIngresos": round_number(totals["totalIngresos"]),
        "totalGastos": round_number(totals["totalGastos"]),
        "totalAhorros": round_number(totals["totalAhorros"]),
        "totalDeudas": round_number(totals["totalDeudas"]),
        "totalEgresos": round_number(total_egresos),
        "balanceOperativo": round_number(totals["totalIngresos"] - totals["totalGastos"]),
        "flujoNeto": round_number(totals["totalIngresos"] - total_egresos),
    }


def group_by_month(movements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = defaultdict(
        lambda: {
            "mes": "",
            "nombreMes": "",
            "totalMovimientos": 0,
            "ingresos": 0,
            "gastos": 0,
            "ahorros": 0,
            "deudas": 0,
            "categoriasGasto": defaultdict(float),
        }
    )

    key_by_type = {
        "ingreso": "ingresos",
        "gasto": "gastos",
        "ahorro": "ahorros",
        "deuda": "deudas",
    }

    for movement in movements:
        month = get_month_key(movement.get("fecha"))
        item = result[month]
        item["mes"] = month
        item["nombreMes"] = get_month_name(month)
        item["totalMovimientos"] += 1

        key = key_by_type.get(movement.get("tipo"))

        if key:
            item[key] += float(movement.get("monto", 0) or 0)

        if movement.get("tipo") == "gasto":
            item["categoriasGasto"][movement.get("categoria") or "Sin categoría"] += float(
                movement.get("monto", 0) or 0
            )

    monthly = []

    for item in result.values():
        total_egresos = item["gastos"] + item["ahorros"] + item["deudas"]

        monthly.append(
            {
                "mes": item["mes"],
                "nombreMes": item["nombreMes"],
                "totalMovimientos": item["totalMovimientos"],
                "ingresos": round_number(item["ingresos"]),
                "gastos": round_number(item["gastos"]),
                "ahorros": round_number(item["ahorros"]),
                "deudas": round_number(item["deudas"]),
                "balanceOperativo": round_number(item["ingresos"] - item["gastos"]),
                "flujoNeto": round_number(item["ingresos"] - total_egresos),
                "categoriasGasto": sorted(
                    [
                        {
                            "categoria": category,
                            "total": round_number(total),
                        }
                        for category, total in item["categoriasGasto"].items()
                    ],
                    key=lambda category: category["total"],
                    reverse=True,
                ),
            }
        )

    return sorted(monthly, key=lambda item: item["mes"])


def calculate_monthly_averages(monthly_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    count = len(monthly_history) or 1

    return {
        "ingresoPromedioMensual": round_number(
            sum(item["ingresos"] for item in monthly_history) / count
        ),
        "gastoPromedioMensual": round_number(
            sum(item["gastos"] for item in monthly_history) / count
        ),
        "ahorroPromedioMensual": round_number(
            sum(item["ahorros"] for item in monthly_history) / count
        ),
        "deudaPromedioMensual": round_number(
            sum(item["deudas"] for item in monthly_history) / count
        ),
        "flujoNetoPromedioMensual": round_number(
            sum(item["flujoNeto"] for item in monthly_history) / count
        ),
    }


def calculate_expense_trend(monthly_history: List[Dict[str, Any]]) -> Dict[str, Any]:
    if len(monthly_history) < 2:
        return {
            "tendencia": "insuficiente",
            "variacionPorcentual": 0,
            "descripcion": "No hay suficientes meses para calcular tendencia.",
        }

    first = monthly_history[0]["gastos"]
    last = monthly_history[-1]["gastos"]

    if first <= 0:
        return {
            "tendencia": "insuficiente",
            "variacionPorcentual": 0,
            "descripcion": "El primer mes no tiene gastos suficientes para comparar.",
        }

    variation = round_number(((last - first) / first) * 100)

    if variation > 10:
        return {
            "tendencia": "aumento",
            "variacionPorcentual": variation,
            "descripcion": f"Los gastos aumentaron aproximadamente {variation}%.",
        }

    if variation < -10:
        return {
            "tendencia": "disminucion",
            "variacionPorcentual": variation,
            "descripcion": f"Los gastos disminuyeron aproximadamente {abs(variation)}%.",
        }

    return {
        "tendencia": "estable",
        "variacionPorcentual": variation,
        "descripcion": "Los gastos se mantienen relativamente estables.",
    }


def get_frequent_categories(monthly_history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    categories = defaultdict(
        lambda: {
            "categoria": "",
            "total": 0,
            "apariciones": 0,
        }
    )

    for month in monthly_history:
        for category in month["categoriasGasto"]:
            name = category["categoria"]
            categories[name]["categoria"] = name
            categories[name]["total"] += category["total"]
            categories[name]["apariciones"] += 1

    return sorted(
        [
            {
                "categoria": item["categoria"],
                "total": round_number(item["total"]),
                "apariciones": item["apariciones"],
            }
            for item in categories.values()
        ],
        key=lambda item: item["total"],
        reverse=True,
    )


def collect_financial_history(
    uid: str,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    meses: int = 6,
    limite_movimientos: int = 500,
) -> Dict[str, Any]:
    period = (
        {
            "fechaInicio": fecha_inicio,
            "fechaFin": fecha_fin,
            "meses": None,
        }
        if fecha_inicio and fecha_fin
        else get_historical_period(meses)
    )

    movements = list_movements(
        uid,
        fecha_inicio=period["fechaInicio"],
        fecha_fin=period["fechaFin"],
        limit_value=limite_movimientos,
    )

    monthly_history = group_by_month(movements)

    return {
        "uid": uid,
        "periodo": period,
        "resumenGeneral": summarize_general(movements),
        "promediosMensuales": calculate_monthly_averages(monthly_history),
        "tendenciaGastos": calculate_expense_trend(monthly_history),
        "categoriasFrecuentes": get_frequent_categories(monthly_history),
        "historialMensual": monthly_history,
        "movimientos": movements,
        "totalMesesConDatos": len(monthly_history),
        "totalMovimientosRecopilados": len(movements),
        "listoParaPrediccion": len(movements) > 0 and len(monthly_history) >= 1,
        "advertencias": []
        if movements
        else ["No hay historial financiero suficiente para generar predicciones."],
    }