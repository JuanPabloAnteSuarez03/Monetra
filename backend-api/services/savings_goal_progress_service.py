
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from services.savings_goals_service import (
    SavingsGoalServiceError,
    get_goal,
    list_goals,
)

# Utilidades de cálculo

def round_number(value: Any, decimals: int = 2) -> float:
    try:
        return round(float(value or 0), decimals)
    except (TypeError, ValueError):
        return 0.0


def calculate_percentage(current: float, target: float) -> float:
    
    if target <= 0:
        return 0.0

    percentage = (current / target) * 100

    return round_number(min(percentage, 100.0))


def calculate_remaining(current: float, target: float) -> float:
    
    remaining = target - current

    return round_number(max(remaining, 0.0))


def calculate_days_remaining(fecha_estimada: Optional[str]) -> Optional[int]:
   
    if not fecha_estimada:
        return None

    try:
        target_date = datetime.strptime(fecha_estimada, "%Y-%m-%d").date()
        delta = (target_date - date.today()).days
        return max(delta, 0)
    except ValueError:
        return None


def classify_progress_status(percentage: float) -> Dict[str, str]:
    
    if percentage >= 100:
        return {
            "nivel": "completada",
            "etiqueta": "¡Meta alcanzada!",
            "color": "verde",
        }

    if percentage >= 75:
        return {
            "nivel": "avanzado",
            "etiqueta": "Casi llegas",
            "color": "azul",
        }

    if percentage >= 25:
        return {
            "nivel": "en_progreso",
            "etiqueta": "En progreso",
            "color": "amarillo",
        }

    if percentage > 0:
        return {
            "nivel": "inicio",
            "etiqueta": "Recién empezando",
            "color": "gris",
        }

    return {
        "nivel": "sin_inicio",
        "etiqueta": "Sin abonos aún",
        "color": "gris",
    }


def estimate_on_track(
    current: float,
    target: float,
    days_remaining: Optional[int],
    created_at: Optional[str],
) -> Dict[str, Any]:
    
    if days_remaining is None or target <= 0:
        return {
            "estimacion": "sin_datos",
            "descripcion": "No hay suficiente información para estimar el ritmo.",
            "ahorroNecesarioPorDia": None,
        }

    # Monto diario necesario para llegar a tiempo desde hoy
    monto_restante = calculate_remaining(current, target)

    if days_remaining == 0:
        if current >= target:
            return {
                "estimacion": "alcanzada",
                "descripcion": "La meta fue alcanzada.",
                "ahorroNecesarioPorDia": 0,
            }
        return {
            "estimacion": "vencida",
            "descripcion": "La fecha estimada ya pasó sin alcanzar la meta.",
            "ahorroNecesarioPorDia": None,
        }

    ahorro_necesario_por_dia = round_number(monto_restante / days_remaining)

    # Intenta calcular el ritmo actual si tenemos la fecha de creación
    ritmo_actual_por_dia = None

    if created_at:
        try:
            created_date = datetime.strptime(created_at[:10], "%Y-%m-%d").date()
            dias_transcurridos = (date.today() - created_date).days

            if dias_transcurridos > 0 and current > 0:
                ritmo_actual_por_dia = round_number(current / dias_transcurridos)
        except ValueError:
            pass

    if ritmo_actual_por_dia is not None:
        if ritmo_actual_por_dia >= ahorro_necesario_por_dia:
            estimacion = "en_camino"
            descripcion = (
                f"Con tu ritmo actual de ahorro vas en camino de alcanzar la meta a tiempo."
            )
        else:
            estimacion = "en_riesgo"
            descripcion = (
                f"Tu ritmo actual puede no ser suficiente para alcanzar la meta a tiempo. "
                f"Necesitas ahorrar al menos {ahorro_necesario_por_dia:,.0f} COP por día."
            )
    else:
        estimacion = "sin_historial"
        descripcion = (
            f"Necesitas ahorrar al menos {ahorro_necesario_por_dia:,.0f} COP "
            f"por día para alcanzar tu meta a tiempo."
        )

    return {
        "estimacion": estimacion,
        "descripcion": descripcion,
        "ahorroNecesarioPorDia": ahorro_necesario_por_dia,
        "ritmoActualPorDia": ritmo_actual_por_dia,
    }



# Función principal de cálculo

def calculate_goal_progress(goal: Dict[str, Any]) -> Dict[str, Any]:
    
    monto_objetivo = float(goal.get("montoObjetivo") or 0)
    monto_actual = float(goal.get("montoActual") or 0)
    fecha_estimada = goal.get("fechaEstimada")
    estado = goal.get("estado", "activa")

    porcentaje = calculate_percentage(monto_actual, monto_objetivo)
    monto_restante = calculate_remaining(monto_actual, monto_objetivo)
    dias_restantes = calculate_days_remaining(fecha_estimada)
    indicador_visual = classify_progress_status(porcentaje)

    # Si la meta ya está marcada como completada o cancelada,
    # no calculamos estimación de ritmo
    if estado in ("completada", "cancelada"):
        en_camino = {
            "estimacion": estado,
            "descripcion": f"Esta meta está marcada como {estado}.",
            "ahorroNecesarioPorDia": None,
            "ritmoActualPorDia": None,
        }
    else:
        en_camino = estimate_on_track(
            current=monto_actual,
            target=monto_objetivo,
            days_remaining=dias_restantes,
            created_at=goal.get("creadoEn"),
        )

    return {
        # Identidad de la meta
        "id": goal.get("id"),
        "nombre": goal.get("nombre"),
        "estado": estado,

        # Montos — criterio HU12: monto acumulado y monto restante
        "montoObjetivo": monto_objetivo,
        "montoActual": monto_actual,
        "montoRestante": monto_restante,

        # Porcentaje — criterio HU12: porcentaje de avance
        "porcentajeAvance": porcentaje,

        # Tiempo
        "fechaEstimada": fecha_estimada,
        "diasRestantes": dias_restantes,

        # Indicadores visuales — criterio HU12
        "indicadorVisual": indicador_visual,

        # Estimación de ritmo
        "enCamino": en_camino,
    }



# Funciones de consulta — conectan con savings_goals_service

def get_goal_progress(uid: str, goal_id: str) -> Dict[str, Any]:
   
    goal = get_goal(uid, goal_id)
    progress = calculate_goal_progress(goal)

    return {
        "exito": True,
        "progreso": progress,
    }


def get_all_goals_progress(uid: str, solo_activas: bool = False) -> Dict[str, Any]:
    
    goals = list_goals(uid, solo_activas=solo_activas)

    if not goals:
        return {
            "exito": True,
            "totalMetas": 0,
            "resumen": {
                "metasActivas": 0,
                "metasCompletadas": 0,
                "metasCanceladas": 0,
                "promedioAvanceGeneral": 0,
            },
            "progresos": [],
        }

    progresos = [calculate_goal_progress(goal) for goal in goals]

    # Resumen general
    activas = [p for p in progresos if p["estado"] == "activa"]
    completadas = [p for p in progresos if p["estado"] == "completada"]
    canceladas = [p for p in progresos if p["estado"] == "cancelada"]

    promedio_avance = round_number(
        sum(p["porcentajeAvance"] for p in progresos) / len(progresos)
    )

    return {
        "exito": True,
        "totalMetas": len(progresos),
        "resumen": {
            "metasActivas": len(activas),
            "metasCompletadas": len(completadas),
            "metasCanceladas": len(canceladas),
            "promedioAvanceGeneral": promedio_avance,
        },
        "progresos": progresos,
    }