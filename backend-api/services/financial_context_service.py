import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

MOVEMENT_TYPES = {"ingreso", "gasto", "ahorro", "deuda"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def clean_text(value: Any, limit: int = 140) -> str:
    text = str(value or "")

    text = re.sub(
        r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
        "[correo_oculto]",
        text,
        flags=re.I,
    )

    text = re.sub(
        r"\b(?:\+?\d[\d\s().-]{7,}\d)\b",
        "[telefono_oculto]",
        text,
    )

    text = re.sub(r"\s+", " ", text).strip()

    return text if len(text) <= limit else f"{text[:limit]}..."


def normalize_movement(movement: Any) -> Optional[Dict[str, Any]]:
    data = movement.model_dump() if hasattr(movement, "model_dump") else dict(movement or {})

    tipo = data.get("tipo")
    monto = round_number(data.get("monto"))

    if tipo not in MOVEMENT_TYPES or monto <= 0:
        return None

    return {
        "tipo": tipo,
        "monto": monto,
        "categoria": clean_text(data.get("categoria") or "Sin categoría", 80),
        "fecha": data.get("fecha"),
        "descripcion": clean_text(data.get("descripcion") or "", 100),
        "origen": data.get("origen") or "manual",
    }


def limit_list(items: List[Any], limit: int = 10) -> List[Any]:
    return list(items or [])[:limit]


def calculate_summary(movements: List[Dict[str, Any]]) -> Dict[str, Any]:
    totals = {
        "totalIngresos": 0.0,
        "totalGastos": 0.0,
        "totalAhorros": 0.0,
        "totalDeudas": 0.0,
    }

    key_by_type = {
        "ingreso": "totalIngresos",
        "gasto": "totalGastos",
        "ahorro": "totalAhorros",
        "deuda": "totalDeudas",
    }

    for movement in movements:
        key = key_by_type.get(movement["tipo"])

        if key:
            totals[key] += movement["monto"]

    total_egresos = (
        totals["totalGastos"]
        + totals["totalAhorros"]
        + totals["totalDeudas"]
    )

    flujo_neto = totals["totalIngresos"] - total_egresos

    ingresos = totals["totalIngresos"]

    return {
        "totalMovimientos": len(movements),
        "totalIngresos": round_number(totals["totalIngresos"]),
        "totalGastos": round_number(totals["totalGastos"]),
        "totalAhorros": round_number(totals["totalAhorros"]),
        "totalDeudas": round_number(totals["totalDeudas"]),
        "flujoNeto": round_number(flujo_neto),
        "porcentajeGastosSobreIngresos": round_number(
            (totals["totalGastos"] / ingresos) * 100
        )
        if ingresos
        else 0,
        "porcentajeAhorroSobreIngresos": round_number(
            (totals["totalAhorros"] / ingresos) * 100
        )
        if ingresos
        else 0,
        "porcentajeDeudasSobreIngresos": round_number(
            (totals["totalDeudas"] / ingresos) * 100
        )
        if ingresos
        else 0,
    }


def calculate_categories(movements: List[Dict[str, Any]]) -> Dict[str, Any]:
    categories: Dict[str, Dict[str, Any]] = {}

    for movement in movements:
        if movement["tipo"] != "gasto":
            continue

        category = movement.get("categoria") or "Sin categoría"

        categories.setdefault(
            category,
            {
                "categoria": category,
                "total": 0.0,
                "cantidad": 0,
            },
        )

        categories[category]["total"] += movement["monto"]
        categories[category]["cantidad"] += 1

    total_gastos = sum(item["total"] for item in categories.values())

    gastos_por_categoria = sorted(
        [
            {
                "categoria": item["categoria"],
                "total": round_number(item["total"]),
                "cantidad": item["cantidad"],
                "porcentajeSobreGastos": round_number(
                    (item["total"] / total_gastos) * 100
                )
                if total_gastos
                else 0,
            }
            for item in categories.values()
        ],
        key=lambda item: item["total"],
        reverse=True,
    )

    return {
        "categoriaPrincipalGasto": gastos_por_categoria[0]
        if gastos_por_categoria
        else None,
        "gastosPorCategoria": gastos_por_categoria,
    }


def detect_findings(
    summary: Dict[str, Any],
    categories: Dict[str, Any],
) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []

    if summary["totalMovimientos"] == 0:
        return [
            {
                "titulo": "Sin movimientos registrados",
                "descripcion": "No hay movimientos suficientes para generar un análisis detallado.",
                "nivel": "advertencia",
                "categoria": "general",
                "valor": 0,
            }
        ]

    if summary["porcentajeGastosSobreIngresos"] > 80:
        findings.append(
            {
                "titulo": "Gastos elevados",
                "descripcion": f"Los gastos representan el {summary['porcentajeGastosSobreIngresos']}% de los ingresos.",
                "nivel": "riesgo",
                "categoria": "gastos",
                "valor": summary["porcentajeGastosSobreIngresos"],
            }
        )
    elif summary["porcentajeGastosSobreIngresos"] > 60:
        findings.append(
            {
                "titulo": "Gastos moderados",
                "descripcion": f"Los gastos representan el {summary['porcentajeGastosSobreIngresos']}% de los ingresos.",
                "nivel": "advertencia",
                "categoria": "gastos",
                "valor": summary["porcentajeGastosSobreIngresos"],
            }
        )

    if summary["porcentajeAhorroSobreIngresos"] < 10:
        findings.append(
            {
                "titulo": "Ahorro bajo",
                "descripcion": f"El ahorro representa el {summary['porcentajeAhorroSobreIngresos']}% de los ingresos.",
                "nivel": "advertencia",
                "categoria": "ahorro",
                "valor": summary["porcentajeAhorroSobreIngresos"],
            }
        )

    if summary["porcentajeDeudasSobreIngresos"] > 30:
        findings.append(
            {
                "titulo": "Deudas altas",
                "descripcion": f"Las deudas representan el {summary['porcentajeDeudasSobreIngresos']}% de los ingresos.",
                "nivel": "riesgo",
                "categoria": "deudas",
                "valor": summary["porcentajeDeudasSobreIngresos"],
            }
        )

    if summary["flujoNeto"] < 0:
        findings.append(
            {
                "titulo": "Flujo neto negativo",
                "descripcion": "Los egresos superan los ingresos del período.",
                "nivel": "riesgo",
                "categoria": "flujo",
                "valor": summary["flujoNeto"],
            }
        )

    category = categories.get("categoriaPrincipalGasto")

    if category:
        findings.append(
            {
                "titulo": "Categoría con mayor gasto",
                "descripcion": f"{category['categoria']} concentra el {category['porcentajeSobreGastos']}% de los gastos.",
                "nivel": "informativo",
                "categoria": "gastos",
                "valor": category["total"],
            }
        )

    return findings


def detect_priorities(findings: List[Dict[str, Any]]) -> List[str]:
    priorities = []
    text = " ".join(finding.get("titulo", "").lower() for finding in findings)

    if "gasto" in text:
        priorities.append("control_gastos")

    if "ahorro bajo" in text:
        priorities.append("fortalecer_ahorro")

    if "deudas" in text:
        priorities.append("control_deudas")

    if "flujo neto negativo" in text:
        priorities.append("mejorar_flujo_neto")

    return list(dict.fromkeys(priorities))


def evaluate_context_quality(
    summary: Dict[str, Any],
    movements: List[Dict[str, Any]],
) -> Dict[str, Any]:
    warnings = []

    if summary["totalMovimientos"] == 0:
        warnings.append("No hay movimientos registrados en el período analizado.")

    if summary["totalMovimientos"] > 0 and not movements:
        warnings.append("Existen movimientos, pero no pudieron procesarse correctamente.")

    if summary["totalIngresos"] == 0:
        warnings.append(
            "No hay ingresos registrados; algunos porcentajes pueden ser limitados."
        )

    if summary["totalGastos"] == 0:
        warnings.append(
            "No hay gastos registrados; el análisis de consumo puede ser limitado."
        )

    return {
        "datosSuficientes": summary["totalMovimientos"] > 0
        and len(movements) > 0,
        "totalAdvertencias": len(warnings),
        "advertencias": warnings,
    }


def build_financial_context(
    movements: List[Any],
    periodo: Optional[Dict[str, Any]] = None,
    estimaciones_futuras: Optional[Dict[str, Any]] = None,
    caso_uso: str = "general",
    limite_movimientos: int = 20,
) -> Dict[str, Any]:
    processed_movements = [
        item
        for item in (normalize_movement(movement) for movement in movements)
        if item
    ]

    summary = calculate_summary(processed_movements)
    categories = calculate_categories(processed_movements)
    findings = detect_findings(summary, categories)
    priorities = detect_priorities(findings)
    quality = evaluate_context_quality(summary, processed_movements)

    recent = sorted(
        processed_movements,
        key=lambda item: item.get("fecha") or "",
        reverse=True,
    )

    by_amount = sorted(
        processed_movements,
        key=lambda item: item.get("monto") or 0,
        reverse=True,
    )

    return {
        "version": "1.0",
        "casoUso": caso_uso,
        "privacidad": {
            "identificadoresUsuarioIncluidos": False,
            "idsDocumentosIncluidos": False,
            "datosContactoIncluidos": False,
            "descripcion": "El contexto fue procesado para excluir UID, IDs técnicos y datos de contacto.",
        },
        "periodo": periodo,
        "calidadContexto": quality,
        "resumenFinanciero": summary,
        "perfilFinanciero": {
            "nivel": "Sin datos"
            if summary["totalMovimientos"] == 0
            else "Analizado",
            "estado": "neutral"
            if summary["totalMovimientos"] == 0
            else "informativo",
            "descripcion": "Perfil calculado a partir de los movimientos recibidos.",
        },
        "hallazgos": findings,
        "prioridadesDetectadas": priorities,
        "categorias": {
            "categoriaPrincipalGasto": categories["categoriaPrincipalGasto"],
            "gastosPorCategoria": limit_list(categories["gastosPorCategoria"], 10),
        },
        "movimientos": {
            "totalProcesados": len(processed_movements),
            "totalEnviados": min(len(processed_movements), limite_movimientos),
            "muestra": limit_list(processed_movements, limite_movimientos),
            "recientes": limit_list(recent, 10),
            "mayorValor": limit_list(by_amount, 10),
        },
        "predicciones": estimaciones_futuras,
        "instruccionesParaLLM": [
            "Usar únicamente la información incluida en este contexto.",
            "No inventar movimientos, ingresos, gastos, deudas ni ahorros.",
            "No solicitar información personal adicional.",
            "No recomendar productos financieros específicos.",
            "Responder en lenguaje claro y comprensible.",
        ],
        "generadoEn": now_iso(),
    }