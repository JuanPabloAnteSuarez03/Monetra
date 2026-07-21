from collections import defaultdict
from typing import Any, Dict, List

from services.financial_indicators_service import calculate_financial_indicators
from services.financial_metrics_service import calculate_financial_metrics
from services.financial_history_service import collect_financial_history
from services.movements_service import list_movements


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def group_by_type(movements: List[Dict[str, Any]]) -> Dict[str, Any]:
    result = {
        "ingreso": {"cantidad": 0, "total": 0},
        "gasto": {"cantidad": 0, "total": 0},
        "ahorro": {"cantidad": 0, "total": 0},
        "deuda": {"cantidad": 0, "total": 0},
    }

    for movement in movements:
        tipo = movement.get("tipo")

        if tipo not in result:
            continue

        result[tipo]["cantidad"] += 1
        result[tipo]["total"] += float(movement.get("monto", 0) or 0)

    for tipo in result:
        result[tipo]["total"] = round_number(result[tipo]["total"])

    return result


def group_by_day(movements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = defaultdict(
        lambda: {
            "fecha": "",
            "ingresos": 0,
            "gastos": 0,
            "ahorros": 0,
            "deudas": 0,
            "totalMovimientos": 0,
        }
    )

    key_by_type = {
        "ingreso": "ingresos",
        "gasto": "gastos",
        "ahorro": "ahorros",
        "deuda": "deudas",
    }

    for movement in movements:
        fecha = movement.get("fecha") or "sin-fecha"
        item = result[fecha]
        item["fecha"] = fecha
        item["totalMovimientos"] += 1

        key = key_by_type.get(movement.get("tipo"))

        if key:
            item[key] += float(movement.get("monto", 0) or 0)

    return sorted(
        [
            {
                **item,
                "ingresos": round_number(item["ingresos"]),
                "gastos": round_number(item["gastos"]),
                "ahorros": round_number(item["ahorros"]),
                "deudas": round_number(item["deudas"]),
            }
            for item in result.values()
        ],
        key=lambda item: item["fecha"],
    )


def generate_financial_report(
    uid: str,
    fecha_inicio: str,
    fecha_fin: str,
) -> Dict[str, Any]:
    movements = list_movements(
        uid,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        limit_value=2000,
    )

    metrics = calculate_financial_metrics(movements, fecha_inicio, fecha_fin)
    indicators = calculate_financial_indicators(movements, fecha_inicio, fecha_fin)

    return {
        "uid": uid,
        "periodo": {
            "fechaInicio": fecha_inicio,
            "fechaFin": fecha_fin,
        },
        "totalMovimientos": len(movements),
        "totales": metrics["resumenGeneral"],
        "metricas": metrics,
        "indicadoresFinancieros": indicators,
        "porTipo": group_by_type(movements),
        "porCategoria": metrics["categorias"]["gastosPorCategoria"],
        "porDia": group_by_day(movements),
        "movimientos": movements,
    }


def generate_summary_after_deletion(uid: str) -> Dict[str, Any]:
    """
    Genera un resumen financiero actualizado justo después de eliminar
    un movimiento. Usa los últimos 6 meses como ventana de historial.
    Sirve para que el frontend refresque el dashboard sin llamadas extra.
    """
    history = collect_financial_history(uid, meses=6)

    return {
        "historialActualizado": True,
        "resumenGeneral": history["resumenGeneral"],
        "promediosMensuales": history["promediosMensuales"],
        "totalMovimientosActuales": history["totalMovimientosRecopilados"],
        "historialMensual": history["historialMensual"],
    }