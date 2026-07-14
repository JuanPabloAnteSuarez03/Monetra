import os
from groq import Groq
import json
import re

EXTRACT_INVOICE_PROMPT = """
Eres un asistente especializado en análisis de facturas y comprobantes de pago.

A continuación recibirás el texto extraído de una factura o comprobante mediante OCR.
Tu tarea es identificar y estructurar la información relevante.

Texto del documento:
{text}

Extrae la siguiente información y responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{{
    "monto_total": <número decimal o null si no se encuentra>,
    "moneda": <"COP", "USD", "EUR" u otra moneda identificada, o null>,
    "fecha": <"YYYY-MM-DD" si se puede inferir, o null>,
    "descripcion": <descripción breve del gasto o comercio, o null>,
    "proveedor": <nombre del comercio o empresa emisora, o null>,
    "numero_factura": <número de factura/comprobante, o null>,
    "impuesto": <monto del impuesto/IVA como número, o null>,
    "categoria": <una de: "Comida", "Transporte", "Diversión", "Salud", "Compras" — elige la más apropiada según el tipo de negocio o servicio>,
    "confianza": <"alta", "media" o "baja" según la calidad del texto reconocido>,
    "notas": <observaciones relevantes o advertencias, o null>
}}

Reglas para elegir la categoría:
- "Transporte": tiquetes de bus, metro, taxi, Uber, aerolíneas, peajes, gasolina, parqueadero
- "Comida": restaurantes, cafeterías, domicilios de comida. TAMBIÉN cuando los 
  ítems comprados son alimentos: carnes, verduras, frutas, lácteos, granos, 
  bebidas, productos de panadería — aunque el comercio sea un supermercado.
- "Compras": supermercados o tiendas SOLO cuando los ítems son bienes no 
  alimenticios: ropa, electrodomésticos, juguetes, artículos del hogar, 
  aseo personal, papelería, etc.
- "Diversión": cines, conciertos, parques de diversiones, streaming, videojuegos, hobbies
- "Salud": farmacias, clínicas, consultas médicas, ópticas, gimnasios

IMPORTANTE: Analiza primero los ítems del detalle de la factura para elegir 
la categoría. El nombre del comercio es secundario. Si los ítems son 
alimentos → "Comida". Si los ítems son bienes de consumo → "Compras".

Reglas generales:
- Si el texto es ilegible o no corresponde a una factura, devuelve confianza "baja" y null en los campos.
- Para montos, devuelve solo el número sin símbolos ni puntos de miles (ej: 150000.00).
- Si hay múltiples montos, usa el total final.
- Para la categoría, si no puedes determinarlo con certeza, omite el campo (null).
"""


async def analyze_invoice_text(ocr_text: str) -> dict:
    if not ocr_text or not ocr_text.strip():
        return {"success": False, "data": None, "error": "No hay texto para analizar"}

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    try:
        prompt = EXTRACT_INVOICE_PROMPT.format(text=ocr_text[:4000])

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=512,
        )

        raw_text = response.choices[0].message.content.strip()

        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        invoice_data = json.loads(raw_text)

        return {"success": True, "data": invoice_data, "error": None}

    except json.JSONDecodeError:
        return {"success": False, "data": None, "error": "No se pudo interpretar la respuesta del análisis"}
    except Exception as e:
        return {
            "success": False,
            "data": None,
            "error": f"Error al analizar el documento: {str(e)}"
        }
    
class GeminiServiceError(Exception):
    pass


async def generate_content_with_gemini(
    prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 1500,
) -> dict:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_output_tokens,
        )

        raw_text = response.choices[0].message.content.strip()
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed = json.loads(raw_text)

        return {
            "modelo": "llama-3.1-8b-instant",
            "json": parsed,
        }

    except json.JSONDecodeError as e:
        raise GeminiServiceError(
            f"No se pudo parsear la respuesta del LLM: {e}"
        ) from e
    except Exception as e:
        raise GeminiServiceError(f"Error al llamar al LLM: {e}") from e
