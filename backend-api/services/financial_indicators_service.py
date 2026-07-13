from typing import Any, Dict, List

from services.financial_metrics_service import calculate_financial_metrics


def format_cop(value: float) -> str:
    return f"${value:,.0f} COP".replace(",", ".")


def create_indicator(
    *,
    id: str,
    title: str,
    value: Any,
    numeric_value: float,
    type: str,
    status: str,
    description: str,
) -> Dict[str, Any]:
    return {
        "id": id,
        "titulo": title,
        "valor": value,
        "valorNumerico": numeric_value,
        "tipo": type,
        "estado": status,
        "descripcion": description,
    }


def status_for_expenses(percentage: float) -> str:
    if percentage > 80:
        return "riesgo"

    if percentage > 60:
        return "advertencia"

    return "positivo"


def status_for_savings(percentage: float) -> str:
    if percentage >= 20:
        return "positivo"

    if percentage >= 10:
        return "neutral"

    return "advertencia"


def status_for_debt(percentage: float) -> str:
    if percentage > 30:
        return "riesgo"

    if percentage > 15:
        return "advertencia"

    return "positivo"


def calculate_financial_indicators(
    movements: List[Dict[str, Any]],
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
) -> Dict[str, Any]:
    metrics = calculate_financial_metrics(movements, fecha_inicio, fecha_fin)
    summary = metrics["resumenGeneral"]
    indicators = metrics["indicadores"]

    main_indicators = [
        create_indicator(
            id="total-ingresos",
            title="Ingresos",
            value=format_cop(summary["totalIngresos"]),
            numeric_value=summary["totalIngresos"],
            type="moneda",
            status="positivo" if summary["totalIngresos"] > 0 else "neutral",
            description="Total de ingresos registrados en el período.",
        ),
        create_indicator(
            id="total-gastos",
            title="Gastos",
            value=format_cop(summary["totalGastos"]),
            numeric_value=summary["totalGastos"],
            type="moneda",
            status=status_for_expenses(indicators["porcentajeGastosSobreIngresos"]),
            description="Total de gastos registrados en el período.",
        ),
        create_indicator(
            id="total-ahorros",
            title="Ahorros",
            value=format_cop(summary["totalAhorros"]),
            numeric_value=summary["totalAhorros"],
            type="moneda",
            status=status_for_savings(indicators["porcentajeAhorroSobreIngresos"]),
            description="Total destinado al ahorro durante el período.",
        ),
        create_indicator(
            id="total-deudas",
            title="Deudas",
            value=format_cop(summary["totalDeudas"]),
            numeric_value=summary["totalDeudas"],
            type="moneda",
            status=status_for_debt(indicators["porcentajeDeudasSobreIngresos"]),
            description="Total relacionado con deudas.",
        ),
    ]

    balance_indicators = [
        create_indicator(
            id="balance-operativo",
            title="Balance operativo",
            value=format_cop(summary["balanceOperativo"]),
            numeric_value=summary["balanceOperativo"],
            type="moneda",
            status="positivo" if summary["balanceOperativo"] >= 0 else "riesgo",
            description="Diferencia entre ingresos y gastos.",
        ),
        create_indicator(
            id="flujo-neto",
            title="Flujo neto",
            value=format_cop(summary["flujoNeto"]),
            numeric_value=summary["flujoNeto"],
            type="moneda",
            status="positivo" if summary["flujoNeto"] >= 0 else "riesgo",
            description="Resultado después de restar egresos a los ingresos.",
        ),
    ]

    percentage_indicators = [
        create_indicator(
            id="porcentaje-gastos",
            title="Gastos sobre ingresos",
            value=f"{indicators['porcentajeGastosSobreIngresos']}%",
            numeric_value=indicators["porcentajeGastosSobreIngresos"],
            type="porcentaje",
            status=status_for_expenses(indicators["porcentajeGastosSobreIngresos"]),
            description="Porcentaje de ingresos destinado a gastos.",
        ),
        create_indicator(
            id="porcentaje-ahorro",
            title="Ahorro sobre ingresos",
            value=f"{indicators['porcentajeAhorroSobreIngresos']}%",
            numeric_value=indicators["porcentajeAhorroSobreIngresos"],
            type="porcentaje",
            status=status_for_savings(indicators["porcentajeAhorroSobreIngresos"]),
            description="Porcentaje de ingresos destinado al ahorro.",
        ),
        create_indicator(
            id="porcentaje-deudas",
            title="Deudas sobre ingresos",
            value=f"{indicators['porcentajeDeudasSobreIngresos']}%",
            numeric_value=indicators["porcentajeDeudasSobreIngresos"],
            type="porcentaje",
            status=status_for_debt(indicators["porcentajeDeudasSobreIngresos"]),
            description="Porcentaje de ingresos relacionado con deudas.",
        ),
    ]

    return {
        "periodo": metrics["periodo"],
        "indicadoresPrincipales": main_indicators,
        "indicadoresBalance": balance_indicators,
        "indicadoresPorcentuales": percentage_indicators,
        "categorias": metrics["categorias"],
        "alertas": metrics["alertas"],
        "resumen": summary,
    }