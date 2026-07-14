from typing import Any, Dict, List

MOVEMENT_TYPES = {"ingreso", "gasto", "ahorro", "deuda"}


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def percentage(value: float, base: float) -> float:
    if not base or base <= 0:
        return 0.0

    return round_number((value / base) * 100)


def calculate_totals(movements: List[Dict[str, Any]]) -> Dict[str, float]:
    totals = {
        "ingresos": 0.0,
        "gastos": 0.0,
        "ahorros": 0.0,
        "deudas": 0.0,
    }

    key_by_type = {
        "ingreso": "ingresos",
        "gasto": "gastos",
        "ahorro": "ahorros",
        "deuda": "deudas",
    }

    for movement in movements:
        key = key_by_type.get(movement.get("tipo"))

        if key:
            totals[key] += float(movement.get("monto", 0) or 0)

    return {key: round_number(value) for key, value in totals.items()}


def calculate_expenses_by_category(movements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    categories: Dict[str, Dict[str, Any]] = {}

    for movement in movements:
        if movement.get("tipo") != "gasto":
            continue

        category = movement.get("categoria") or "Sin categoría"

        if category not in categories:
            categories[category] = {
                "categoria": category,
                "total": 0.0,
                "cantidad": 0,
            }

        categories[category]["total"] += float(movement.get("monto", 0) or 0)
        categories[category]["cantidad"] += 1

    total_expenses = sum(item["total"] for item in categories.values())

    return sorted(
        [
            {
                "categoria": item["categoria"],
                "total": round_number(item["total"]),
                "cantidad": item["cantidad"],
                "porcentajeSobreGastos": percentage(item["total"], total_expenses),
            }
            for item in categories.values()
        ],
        key=lambda item: item["total"],
        reverse=True,
    )


def calculate_financial_metrics(
    movements: List[Dict[str, Any]],
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
) -> Dict[str, Any]:
    totals = calculate_totals(movements)

    total_expenses = totals["gastos"] + totals["ahorros"] + totals["deudas"]
    balance_operativo = totals["ingresos"] - totals["gastos"]
    flujo_neto = totals["ingresos"] - total_expenses

    expenses_by_category = calculate_expenses_by_category(movements)
    main_category = expenses_by_category[0] if expenses_by_category else None

    alerts = []

    if totals["ingresos"] == 0 and totals["gastos"] > 0:
        alerts.append("Hay gastos registrados, pero no hay ingresos en el período.")

    if flujo_neto < 0:
        alerts.append("El flujo neto es negativo: los egresos superan los ingresos.")

    if percentage(totals["gastos"], totals["ingresos"]) > 80:
        alerts.append("Los gastos representan más del 80% de los ingresos.")

    if percentage(totals["ahorros"], totals["ingresos"]) < 10:
        alerts.append("El ahorro registrado es menor al 10% de los ingresos.")

    if percentage(totals["deudas"], totals["ingresos"]) > 30:
        alerts.append("Las deudas representan más del 30% de los ingresos.")

    return {
        "periodo": {
            "fechaInicio": fecha_inicio,
            "fechaFin": fecha_fin,
        },
        "resumenGeneral": {
            "totalMovimientos": len(movements),
            "totalIngresos": totals["ingresos"],
            "totalGastos": totals["gastos"],
            "totalAhorros": totals["ahorros"],
            "totalDeudas": totals["deudas"],
            "totalEgresos": round_number(total_expenses),
            "balanceOperativo": round_number(balance_operativo),
            "flujoNeto": round_number(flujo_neto),
        },
        "indicadores": {
            "porcentajeGastosSobreIngresos": percentage(totals["gastos"], totals["ingresos"]),
            "porcentajeAhorroSobreIngresos": percentage(totals["ahorros"], totals["ingresos"]),
            "porcentajeDeudasSobreIngresos": percentage(totals["deudas"], totals["ingresos"]),
        },
        "categorias": {
            "gastosPorCategoria": expenses_by_category,
            "categoriaMayorGasto": main_category,
        },
        "alertas": alerts,
    }