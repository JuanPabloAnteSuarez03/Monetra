from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

logger = logging.getLogger("ai_monitoring")

# Almacenamiento en memoria (se reinicia con cada despliegue del servidor)
_monitoring_records: List[Dict[str, Any]] = []
_MAX_RECORDS = 1000  # evita que crezca indefinidamente en memoria


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def register_ai_request(
    uid: str,
    tipo: str,
    modelo: str,
    generado_por_llm: bool,
    tiempo_respuesta_ms: int,
    estado: str,
    advertencias: Optional[List[str]] = None,
) -> None:
    """
    Registra la solicitud en memoria y en logs.
    NO escribe en Firestore para evitar saturar la cuota gratuita.
    Es silencioso — nunca interrumpe el flujo principal si falla.
    """
    try:
        record = {
            "uid": uid,
            "tipo": tipo,
            "modelo": modelo,
            "generadoPorLLM": generado_por_llm,
            "tiempoRespuestaMs": tiempo_respuesta_ms,
            "estado": estado,
            "advertencias": advertencias or [],
            "fecha": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "creadoEn": now_iso(),
        }

        _monitoring_records.append(record)

        # Mantener solo los últimos N registros en memoria
        if len(_monitoring_records) > _MAX_RECORDS:
            _monitoring_records.pop(0)

        logger.info(
            f"AI request | uid={uid} tipo={tipo} modelo={modelo} "
            f"llm={generado_por_llm} tiempo={tiempo_respuesta_ms}ms estado={estado}"
        )

    except Exception:
        pass


def get_monitoring_stats(
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None,
    limit_value: int = 500,
) -> Dict[str, Any]:
    """
    Calcula métricas a partir de los registros en memoria.
    Se reinician cada vez que el servidor se reinicia.
    """
    records = list(_monitoring_records)[-limit_value:]

    if fecha_inicio:
        records = [r for r in records if r.get("fecha", "") >= fecha_inicio]
    if fecha_fin:
        records = [r for r in records if r.get("fecha", "") <= fecha_fin]

    total = len(records)
    por_tipo: Dict[str, int] = {}
    por_modelo: Dict[str, int] = {}
    por_estado: Dict[str, int] = {}
    por_dia: Dict[str, int] = {}
    tiempos: List[int] = []
    llm_count = 0

    for record in records:
        tipo = record.get("tipo", "desconocido")
        modelo = record.get("modelo", "desconocido")
        estado = record.get("estado", "desconocido")
        fecha = record.get("fecha", "sin-fecha")
        tiempo = record.get("tiempoRespuestaMs", 0)

        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
        por_modelo[modelo] = por_modelo.get(modelo, 0) + 1
        por_estado[estado] = por_estado.get(estado, 0) + 1
        por_dia[fecha] = por_dia.get(fecha, 0) + 1

        if tiempo:
            tiempos.append(tiempo)
        if record.get("generadoPorLLM"):
            llm_count += 1

    promedio_ms = round(sum(tiempos) / len(tiempos)) if tiempos else 0
    max_ms = max(tiempos) if tiempos else 0

    promedio_diario = total / max(len(por_dia), 1)
    dias_anomalos = [
        {"fecha": fecha, "solicitudes": count}
        for fecha, count in por_dia.items()
        if count > promedio_diario * 2 and promedio_diario > 0
    ]

    return {
        "periodo": {"fechaInicio": fecha_inicio, "fechaFin": fecha_fin},
        "totalSolicitudes": total,
        "solicitudesLLM": llm_count,
        "solicitudesRespaldoLocal": total - llm_count,
        "porcentajeUsoLLM": round((llm_count / total) * 100, 2) if total else 0,
        "tiempoRespuestaMs": {"promedio": promedio_ms, "maximo": max_ms},
        "porTipo": por_tipo,
        "porModelo": por_modelo,
        "porEstado": por_estado,
        "porDia": dict(sorted(por_dia.items())),
        "alertas": {
            "diasConConsumoAnormal": dias_anomalos,
            "hayIncremento": len(dias_anomalos) > 0,
        },
        "nota": "Métricas en memoria, se reinician al reiniciar el servidor.",
        "generadoEn": now_iso(),
    }
