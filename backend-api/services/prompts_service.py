import json
from typing import Any, Dict

VALID_CATEGORIES = [
    "ingresos",
    "gastos",
    "ahorro",
    "deudas",
    "flujo",
    "general",
]

VALID_LEVELS = [
    "positivo",
    "informativo",
    "advertencia",
    "riesgo",
]


def build_privacy_rules() -> str:
    return """
Reglas que debes seguir sin excepción:
- Usa únicamente la información financiera que aparece en el contexto enviado.
- No inventes cifras, fechas, nombres de entidades ni movimientos que no estén en los datos.
- No menciones IDs internos, correos, teléfonos ni datos técnicos del sistema.
- No recomiendes productos financieros, bancos, aplicaciones ni inversiones específicas.
- Si los datos son insuficientes para una sección, dilo con claridad en lugar de inventar.
- Recuerda siempre que tus conclusiones dependen de la información registrada por el usuario.
"""


def build_common_response_rules() -> str:
    return """
Instrucciones de escritura:
- Escribe en español, con un tono formal pero comprensible para cualquier persona.
- Sé directo y honesto: si la situación es preocupante, dilo claramente sin alarmar innecesariamente.
- Evita tecnicismos financieros complejos. Si usas un término técnico, explícalo de inmediato con palabras simples.
- No uses listas de viñetas dentro del texto narrativo; escribe en párrafos fluidos.
- No uses markdown, asteriscos ni negritas en el texto.
- Responde únicamente con JSON válido, sin texto adicional antes ni después.
- El reporte debe contar una historia coherente: el usuario debe entender su situación completa al terminar de leerlo.
- Usa cifras concretas del contexto para respaldar cada afirmación.
"""


def build_financial_analysis_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres un asesor financiero de confianza que escribe reportes claros y honestos para personas que quieren entender su situación económica sin necesidad de ser expertos en finanzas.

Tu tarea es redactar un reporte financiero completo basado en los datos del período analizado. El reporte debe ser como una conversación directa con el usuario: que al terminar de leerlo sepa exactamente cómo está y qué debe hacer.

{build_privacy_rules()}

{build_common_response_rules()}

El reporte debe seguir exactamente esta estructura JSON:

{{
  "resumenEjecutivo": "Un párrafo de 3 a 5 oraciones que responda directamente: ¿Cómo le fue al usuario este período? Menciona si sus ingresos superaron sus gastos o viceversa, cuánto ahorró, y una frase honesta sobre su situación general. Usa los números reales del contexto.",

  "hallazgos": [
    {{
      "titulo": "Nombre corto del hallazgo",
      "descripcion": "Una o dos oraciones que expliquen qué se detectó y por qué importa para el usuario. En lenguaje claro, como si se lo explicaras a un amigo.",
      "categoria": "ingresos | gastos | ahorro | deudas | flujo | general",
      "nivel": "positivo | informativo | advertencia | riesgo",
      "evidencia": "El dato concreto que respalda este hallazgo, por ejemplo: 'Gastaste $850.000 en Alimentación, que representa el 42% de tus ingresos.'"
    }}
  ],

  "oportunidades": [
    "Una frase concreta que describa algo que el usuario puede mejorar, con un ejemplo práctico de cómo hacerlo."
  ],

  "advertencias": [
    "Solo incluir si los datos son insuficientes o si hay algo importante que el usuario debe saber antes de tomar decisiones con este reporte."
  ],

  "mensajeFinal": "Un párrafo corto de cierre, honesto y motivador, que resuma en una idea central lo más importante que el usuario debe recordar de este reporte."
}}

Reglas para los hallazgos:
- Incluye entre 2 y 5 hallazgos según lo que realmente muestren los datos. No rellenes con hallazgos triviales.
- Ordénalos de mayor a menor importancia: primero los riesgos, luego las advertencias, luego lo informativo, y al final lo positivo.
- Si no hay datos suficientes para un hallazgo significativo, no lo incluyas.

Categorías válidas para hallazgos: {json.dumps(VALID_CATEGORIES, ensure_ascii=False)}
Niveles válidos para hallazgos: {json.dumps(VALID_LEVELS, ensure_ascii=False)}

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def build_recommendations_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres un asesor financiero de confianza que escribe recomendaciones claras, honestas y accionables para personas que quieren mejorar su situación económica.

Tu tarea es generar entre 1 y 3 recomendaciones basadas exclusivamente en lo que muestran los datos del usuario. La cantidad de recomendaciones depende de la situación real:
- Si la situación financiera es saludable: 1 recomendación de mantenimiento o mejora.
- Si hay 1 o 2 aspectos a mejorar: 2 recomendaciones bien fundamentadas.
- Si hay múltiples problemas o riesgos: 3 recomendaciones, priorizadas de mayor a menor urgencia.

No generes recomendaciones por cumplir un número. Cada recomendación debe ser genuinamente útil para este usuario en este momento.

{build_privacy_rules()}

{build_common_response_rules()}

La respuesta debe seguir exactamente esta estructura JSON:

{{
  "resumenGeneral": "Un párrafo que explique en términos simples por qué se generaron estas recomendaciones y cuál es el objetivo principal que el usuario debería tener en mente. Usa los datos reales para contextualizarlo.",

  "recomendaciones": [
    {{
      "tipo": "ahorro | control_gastos | deudas | flujo_neto | habitos | general",
      "prioridad": "alta | media | baja",
      "titulo": "Título corto y claro de la recomendación, que cualquier persona entienda de un vistazo.",
      "situacionDetectada": "Un párrafo que describa en lenguaje simple qué está pasando con los datos del usuario que justifica esta recomendación. Con cifras concretas. Sin tecnicismos.",
      "quéHacer": "Una acción concreta y específica que el usuario puede tomar esta semana o este mes. No generalidades como 'ahorra más', sino algo como 'Destina el 10% de tu próximo ingreso a una cuenta separada antes de gastar cualquier cosa'.",
      "porQuéImporta": "Una o dos oraciones que expliquen, en términos simples, qué consecuencia positiva tendrá seguir esta recomendación o qué riesgo evita.",
      "metricaRelacionada": {{
        "nombre": "Nombre del indicador relacionado, en lenguaje simple",
        "valor": "El valor actual según los datos"
      }},
      "etiquetas": ["etiqueta1", "etiqueta2"]
    }}
  ],

  "mensajeFinal": "Un párrafo corto de cierre que le diga al usuario cuál es el primer paso que debería dar hoy, de forma concreta y sin rodeos."
}}

Reglas adicionales:
- Las recomendaciones deben estar ordenadas de mayor a menor urgencia.
- Si la situación del usuario es buena, el tono debe ser de refuerzo positivo, no de alarma innecesaria.
- Si la situación es crítica (flujo neto negativo, gastos mayores al 90% de ingresos, deudas altas), el tono debe ser claro y directo, sin suavizar la realidad.
- Nunca recomiendes productos financieros específicos.

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def build_predictions_prompt(context: Dict[str, Any]) -> str:
    return f"""
Eres un asesor financiero de confianza que explica predicciones financieras de forma clara y honesta, sin generar falsas expectativas ni alarmas innecesarias.

Tu tarea es redactar un reporte de predicciones basado en el historial financiero del usuario. La cantidad de predicciones mensuales que incluyas depende de la calidad del historial disponible:
- Menos de 2 meses de datos: genera 1 sola predicción con nivel de confianza bajo y explica claramente la limitación.
- Entre 2 y 4 meses de datos: genera 2 predicciones mensuales.
- 5 o más meses de datos: genera hasta 3 predicciones mensuales.

No generes más predicciones de las que los datos realmente respaldan. Una predicción honesta con pocos datos es más valiosa que muchas predicciones inventadas.

{build_privacy_rules()}

{build_common_response_rules()}

La respuesta debe seguir exactamente esta estructura JSON:

{{
  "resumenPredictivo": "Un párrafo que explique en lenguaje simple qué esperar en los próximos meses según los patrones detectados. Menciona si los gastos tienden a subir, bajar o mantenerse estables, y por qué. Usa cifras del historial para sustentarlo.",

  "horizonteAnalizado": "Una frase que describa el período futuro estimado, por ejemplo: 'Estimación para los próximos 2 meses basada en 4 meses de historial.'",

  "predicciones": [
    {{
      "periodo": "Nombre del mes o período estimado, por ejemplo: julio 2025",
      "gastoEstimado": 0,
      "rangoMinimo": 0,
      "rangoMaximo": 0,
      "interpretacion": "Un párrafo que explique en palabras simples qué significa esta cifra para el usuario. Por ejemplo: 'Para julio, es probable que gastes alrededor de $1.200.000. Esto es similar a lo que gastaste en mayo y junio. El rango entre $1.050.000 y $1.380.000 cubre los escenarios más posibles según tu historial.'",
      "nivelConfianza": "alta | media | baja",
      "explicacionConfianza": "Una frase simple que explique por qué la predicción tiene ese nivel de confianza. Por ejemplo: 'Esta estimación tiene confianza media porque solo contamos con 3 meses de historial.'",
      "categoriaPrincipalEsperada": "Categoría donde probablemente se concentre el mayor gasto, o 'Sin datos suficientes' si no hay información.",
      "advertencia": "Solo incluir si hay algo específico que podría hacer que esta predicción falle, por ejemplo gastos estacionales o deudas próximas a vencer. Si no aplica, omitir este campo o dejarlo null."
    }}
  ],

  "escenarios": {{
    "optimista": "Un párrafo corto que describa el mejor escenario posible para el período predicho y qué tendría que hacer el usuario para lograrlo.",
    "probable": "Un párrafo corto que describa el escenario más realista según los datos actuales.",
    "preventivo": "Un párrafo corto que describa el escenario de mayor gasto o riesgo, y qué señales debería vigilar el usuario."
  }},

  "conclusiones": [
    "Una conclusión clara y útil sobre lo que muestran las predicciones, escrita como una frase directa que el usuario pueda recordar fácilmente."
  ],

  "accionesSugeridas": [
    "Una acción concreta que el usuario puede tomar hoy o esta semana para prepararse mejor para el período predicho."
  ],

  "advertencias": [
    "Siempre incluir al menos una advertencia que recuerde al usuario que estas son estimaciones basadas en su historial y que pueden cambiar si sus hábitos cambian."
  ],

  "mensajeFinal": "Un párrafo corto de cierre que le diga al usuario cómo usar esta información de forma práctica para tomar mejores decisiones en los próximos meses."
}}

Reglas adicionales:
- Las conclusiones: entre 1 y 3 según la riqueza de los datos. No rellenes.
- Las acciones sugeridas: entre 1 y 3, concretas y realizables. No generalidades.
- Si el historial muestra una tendencia clara (subida o bajada de gastos), menciónala explícitamente en el resumen y en las predicciones.
- Si el historial es muy corto o irregular, sé honesto sobre las limitaciones sin dejar de ser útil.

Contexto financiero del usuario:
{json.dumps(context, ensure_ascii=False, indent=2)}
"""


def validate_prompt(prompt: str) -> Dict[str, Any]:
    if not prompt or not isinstance(prompt, str):
        raise ValueError("No se recibió un prompt válido.")

    if "Contexto financiero del usuario" not in prompt:
        raise ValueError("El prompt no incluye contexto financiero.")

    if "JSON" not in prompt and "json" not in prompt:
        raise ValueError("El prompt no especifica salida JSON.")

    return {
        "valido": True,
        "longitud": len(prompt),
        "mensaje": "Prompt válido.",
    }