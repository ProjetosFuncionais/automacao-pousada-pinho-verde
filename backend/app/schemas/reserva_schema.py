from typing import Any
from decimal import Decimal
from app.utils.errors import APIError
from app.utils.validators import (
    calcular_saldo_receber,
    formatar_cpf,
    formatar_whatsapp,
    parse_data_iso,
    parse_decimal_monetario,
    validar_cpf,
    validar_whatsapp,
)


def validar_payload_reserva(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise APIError(
            erro="requisicao_invalida",
            mensagem="O corpo da requisição deve ser um objeto JSON válido.",
            status_code=400,
        )

    erros_campos: dict[str, str] = {}

    nome_completo = str(payload.get("nome_completo") or "").strip()
    if len(nome_completo) < 3:
        erros_campos["nome_completo"] = (
            "Informe o nome completo do hóspede (mínimo de 3 caracteres)."
        )
    elif len(nome_completo) > 150:
        erros_campos["nome_completo"] = (
            "O nome completo não pode ultrapassar 150 caracteres."
        )

    cpf_bruto = str(payload.get("cpf") or "").strip()
    if not cpf_bruto:
        erros_campos["cpf"] = "O CPF do hóspede é obrigatório."
    elif not validar_cpf(cpf_bruto):
        erros_campos["cpf"] = "Informe um CPF válido (ex: 000.000.000-00)."

    whatsapp_bruto = str(payload.get("whatsapp") or "").strip()
    if not whatsapp_bruto:
        erros_campos["whatsapp"] = "O número de WhatsApp é obrigatório."
    elif not validar_whatsapp(whatsapp_bruto):
        erros_campos["whatsapp"] = (
            "Informe um telefone/WhatsApp válido com DDD (10 ou 11 dígitos)."
        )

    endereco = str(payload.get("endereco") or "").strip()
    if len(endereco) < 5:
        erros_campos["endereco"] = (
            "Informe o endereço completo do hóspede (mínimo de 5 caracteres)."
        )

    numero_chale = str(payload.get("numero_chale") or "").strip()
    if not numero_chale:
        erros_campos["numero_chale"] = "Informe o número ou identificação do chalé."
    elif len(numero_chale) > 50:
        erros_campos["numero_chale"] = (
            "A identificação do chalé deve ter no máximo 50 caracteres."
        )

    qtd_bruta = payload.get("quantidade_pessoas")
    quantidade_pessoas: int | None = None
    if isinstance(qtd_bruta, bool) or qtd_bruta is None or str(qtd_bruta).strip() == "":
        erros_campos["quantidade_pessoas"] = "Informe a quantidade de hóspedes."
    else:
        try:
            quantidade_pessoas = int(qtd_bruta)
            if quantidade_pessoas <= 0:
                erros_campos["quantidade_pessoas"] = (
                    "A quantidade de pessoas deve ser maior que zero."
                )
        except (ValueError, TypeError):
            erros_campos["quantidade_pessoas"] = (
                "A quantidade de pessoas deve ser um número inteiro válido."
            )

    data_checkin = parse_data_iso(payload.get("data_checkin"))
    data_checkout = parse_data_iso(payload.get("data_checkout"))

    if not data_checkin:
        erros_campos["data_checkin"] = (
            "Informe uma data de check-in válida no formato AAAA-MM-DD."
        )
    if not data_checkout:
        erros_campos["data_checkout"] = (
            "Informe uma data de check-out válida no formato AAAA-MM-DD."
        )

    if data_checkin and data_checkout and data_checkout <= data_checkin:
        erros_campos["data_checkout"] = (
            "A data de check-out deve ser posterior à data de check-in."
        )

    valor_hospedagem = parse_decimal_monetario(payload.get("valor_total_hospedagem"))
    valor_pago = parse_decimal_monetario(payload.get("valor_total_pago", 0))

    if valor_hospedagem is None:
        erros_campos["valor_total_hospedagem"] = (
            "Informe um valor total de hospedagem válido."
        )
    elif valor_hospedagem < Decimal("0.00"):
        erros_campos["valor_total_hospedagem"] = (
            "O valor total da hospedagem não pode ser negativo."
        )

    if valor_pago is None:
        erros_campos["valor_total_pago"] = "Informe um valor total pago válido."
    elif valor_pago < Decimal("0.00"):
        erros_campos["valor_total_pago"] = "O valor pago não pode ser negativo."

    if (
        valor_hospedagem is not None
        and valor_pago is not None
        and valor_hospedagem >= Decimal("0.00")
        and valor_pago >= Decimal("0.00")
        and valor_pago > valor_hospedagem
    ):
        erros_campos["valor_total_pago"] = (
            "O valor pago não pode ser maior que o valor total da hospedagem."
        )

    descricao_bruta = payload.get("descricao")
    descricao = (
        str(descricao_bruta).strip() if descricao_bruta is not None else None
    )

    if erros_campos:
        raise APIError(
            erro="erro_validacao",
            mensagem="Existem campos inválidos nos dados enviados.",
            status_code=422,
            campos=erros_campos,
        )

    assert valor_hospedagem is not None
    assert valor_pago is not None
    assert data_checkin is not None
    assert data_checkout is not None
    assert quantidade_pessoas is not None

    saldo_calculado = calcular_saldo_receber(valor_hospedagem, valor_pago)

    return {
        "nome_completo": nome_completo,
        "cpf": formatar_cpf(cpf_bruto),
        "whatsapp": formatar_whatsapp(whatsapp_bruto),
        "endereco": endereco,
        "numero_chale": numero_chale,
        "quantidade_pessoas": quantidade_pessoas,
        "data_checkin": data_checkin.isoformat(),
        "data_checkout": data_checkout.isoformat(),
        "valor_total_hospedagem": float(valor_hospedagem),
        "valor_total_pago": float(valor_pago),
        "valor_total_receber_calculado": float(saldo_calculado),
        "descricao": descricao if descricao else None,
    }
