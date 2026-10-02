"""
Funções puras de validação e formatação utilizadas pelo backend Flask.
"""
import re
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any


def validar_uuid(valor: str) -> bool:
    """Verifica se uma string corresponde a um UUID válido."""
    try:
        uuid.UUID(str(valor))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def extrair_digitos(valor: str) -> str:
    """Remove todos os caracteres não numéricos de uma string."""
    if not isinstance(valor, str):
        return ""
    return re.sub(r"\D", "", valor)


def validar_cpf(cpf: str) -> bool:
    """
    Valida o formato e os dígitos verificadores de um CPF brasileiro.
    Aceita CPF com ou sem máscara (000.000.000-00).
    """
    digitos = extrair_digitos(cpf)
    if len(digitos) != 11:
        return False

    # Rejeita sequências de dígitos repetidos (ex: 111.111.111-11)
    if digitos == digitos[0] * 11:
        return False

    # Cálculo do 1º dígito verificador
    soma_1 = sum(int(digitos[i]) * (10 - i) for i in range(9))
    resto_1 = (soma_1 * 10) % 11
    dv_1 = 0 if resto_1 == 10 else resto_1
    if dv_1 != int(digitos[9]):
        return False

    # Cálculo do 2º dígito verificador
    soma_2 = sum(int(digitos[i]) * (11 - i) for i in range(10))
    resto_2 = (soma_2 * 10) % 11
    dv_2 = 0 if resto_2 == 10 else resto_2
    return dv_2 == int(digitos[10])


def formatar_cpf(cpf: str) -> str:
    """Formata os 11 dígitos do CPF no padrão 000.000.000-00."""
    digitos = extrair_digitos(cpf)
    if len(digitos) != 11:
        return cpf.strip()
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"


def validar_whatsapp(whatsapp: str) -> bool:
    """Valida telefone/WhatsApp brasileiro (10 ou 11 dígitos com DDD)."""
    digitos = extrair_digitos(whatsapp)
    return len(digitos) in (10, 11)


def formatar_whatsapp(whatsapp: str) -> str:
    """Formata telefone/WhatsApp em (00) 00000-0000 ou (00) 0000-0000."""
    digitos = extrair_digitos(whatsapp)
    if len(digitos) == 11:
        return f"({digitos[:2]}) {digitos[2:7]}-{digitos[7:]}"
    if len(digitos) == 10:
        return f"({digitos[:2]}) {digitos[2:6]}-{digitos[6:]}"
    return whatsapp.strip()


def parse_data_iso(valor: Any) -> date | None:
    """Converte string YYYY-MM-DD em objeto datetime.date."""
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return valor
    if not isinstance(valor, str):
        return None
    try:
        return datetime.strptime(valor.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_decimal_monetario(valor: Any) -> Decimal | None:
    """Converte número ou string numérica para Decimal com 2 casas decimais."""
    if valor is None or isinstance(valor, bool):
        return None
    try:
        dec = Decimal(str(valor)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return dec
    except (InvalidOperation, ValueError, TypeError):
        return None


def calcular_saldo_receber(
    valor_total_hospedagem: Decimal, valor_total_pago: Decimal
) -> Decimal:
    """
    Calcula o saldo a receber da reserva:
    Saldo = valor_total_hospedagem - valor_total_pago.
    """
    saldo = (valor_total_hospedagem - valor_total_pago).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return saldo
