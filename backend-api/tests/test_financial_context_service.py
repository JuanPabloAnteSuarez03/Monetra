import pytest
from services.financial_context_service import clean_text, build_financial_context

def test_clean_text_privacy_masks():
    texto_con_email = "Pago realizado por camilo.sistemas@univalle.edu.co en el almacén"
    texto_limpio_email = clean_text(texto_con_email)
    assert "[correo_oculto]" in texto_limpio_email
    assert "univalle.edu.co" not in texto_limpio_email

    text_con_tel = "Llamar al +57 3157778899 para confirmar transferencia"
    texto_limpio_tel = clean_text(text_con_tel)
    assert "[telefono_oculto]" in texto_limpio_tel
    assert "3157778899" not in texto_limpio_tel

def test_clean_text_truncation():
    texto_largo = "A" * 200
    texto_procesado = clean_text(texto_largo)
    assert len(texto_procesado) == 143  # 140 caracteres + "..."
    assert texto_procesado.endswith("...")

def test_build_financial_context_structure():
    from schemas.financial_ai_schemas import FinancialMovement
    
    movimientos = [
        FinancialMovement(tipo="gasto", monto=45000.0, categoria="Alimentación", descripcion="Almuerzo ejecutivo")
    ]
    
    contexto = build_financial_context(
        movements=movimientos,
        periodo={"mes": "Junio"},
        estimaciones_futuras=None,
        caso_uso="general",
        limite_movimientos=10
    )
    
    assert "resumenFinanciero" in contexto
    assert "perfilFinanciero" in contexto
    assert "instruccionesParaLLM" in contexto
    
    # ASERCIÓN CORREGIDA: Buscamos coincidencia parcial usando un ciclo o validando el texto exacto
    instrucciones = contexto["instruccionesParaLLM"]
    assert any("No inventar movimientos" in instruccion for instruccion in instrucciones)