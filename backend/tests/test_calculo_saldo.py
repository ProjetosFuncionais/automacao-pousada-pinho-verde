from decimal import Decimal
import pytest
from app.schemas.reserva_schema import validar_payload_reserva
from app.utils.errors import APIError
from app.utils.validators import calcular_saldo_receber


def test_calculo_saldo_metade_paga():
    total = Decimal("2400.00")
    pago = Decimal("1200.00")
    saldo = calcular_saldo_receber(total, pago)
    assert saldo == Decimal("1200.00")


def test_calculo_saldo_quitado():
    total = Decimal("1550.50")
    pago = Decimal("1550.50")
    saldo = calcular_saldo_receber(total, pago)
    assert saldo == Decimal("0.00")


def test_schema_ignora_saldo_enviado_manualmente(payload_reserva_valida):
    payload_adulterado = {
        **payload_reserva_valida,
        "valor_total_receber": 0.00,
    }
    resultado = validar_payload_reserva(payload_adulterado)
    assert resultado["valor_total_receber_calculado"] == 900.00


def test_rejeita_valor_pago_maior_que_total(payload_reserva_valida):
    payload = {
        **payload_reserva_valida,
        "valor_total_hospedagem": 1000.00,
        "valor_total_pago": 1200.00,
    }
    with pytest.raises(APIError) as exc_info:
        validar_payload_reserva(payload)

    assert exc_info.value.status_code == 422
    assert "valor_total_pago" in exc_info.value.campos


def test_rejeita_valores_financeiros_negativos(payload_reserva_valida):
    payload = {
        **payload_reserva_valida,
        "valor_total_hospedagem": -500.00,
        "valor_total_pago": -100.00,
    }
    with pytest.raises(APIError) as exc_info:
        validar_payload_reserva(payload)

    assert exc_info.value.status_code == 422
    assert "valor_total_hospedagem" in exc_info.value.campos
    assert "valor_total_pago" in exc_info.value.campos
