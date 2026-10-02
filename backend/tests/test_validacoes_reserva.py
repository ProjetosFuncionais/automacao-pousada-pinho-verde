"""
Testes para validações de datas, quantidade de pessoas, CPF e regras de negócio.
"""
import pytest
from app.schemas.reserva_schema import validar_payload_reserva
from app.utils.errors import APIError


def test_rejeita_checkout_anterior_ou_igual_checkin(payload_reserva_valida):
    """A data de check-out deve ser estritamente posterior à data de check-in."""
    payload_igual = {
        **payload_reserva_valida,
        "data_checkin": "2026-12-10",
        "data_checkout": "2026-12-10",
    }
    with pytest.raises(APIError) as exc_igual:
        validar_payload_reserva(payload_igual)
    assert exc_igual.value.status_code == 422
    assert "data_checkout" in exc_igual.value.campos

    payload_anterior = {
        **payload_reserva_valida,
        "data_checkin": "2026-12-10",
        "data_checkout": "2026-12-08",
    }
    with pytest.raises(APIError) as exc_ant:
        validar_payload_reserva(payload_anterior)
    assert exc_ant.value.status_code == 422
    assert "data_checkout" in exc_ant.value.campos


def test_rejeita_quantidade_pessoas_zero_ou_negativa(payload_reserva_valida):
    """A quantidade de pessoas deve ser maior que zero."""
    for qtd in (0, -2):
        payload = {**payload_reserva_valida, "quantidade_pessoas": qtd}
        with pytest.raises(APIError) as exc_info:
            validar_payload_reserva(payload)
        assert exc_info.value.status_code == 422
        assert "quantidade_pessoas" in exc_info.value.campos


def test_rejeita_cpf_invalido(payload_reserva_valida):
    """Deve rejeitar CPF com dígitos verificadores incorretos ou repetidos."""
    payload = {**payload_reserva_valida, "cpf": "111.111.111-11"}
    with pytest.raises(APIError) as exc_info:
        validar_payload_reserva(payload)
    assert exc_info.value.status_code == 422
    assert "cpf" in exc_info.value.campos
