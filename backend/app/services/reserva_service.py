from typing import Any, Optional
from decimal import Decimal
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva_schema import validar_payload_reserva
from app.utils.errors import APIError
from app.utils.validators import (
    calcular_saldo_receber,
    formatar_data_br,
    parse_decimal_monetario,
    validar_uuid,
)


class ReservaService:

    @staticmethod
    def _garantir_saldo_consistente(registro: dict[str, Any]) -> dict[str, Any]:
        total = parse_decimal_monetario(registro.get("valor_total_hospedagem", 0)) or Decimal("0.00")
        pago = parse_decimal_monetario(registro.get("valor_total_pago", 0)) or Decimal("0.00")
        saldo = calcular_saldo_receber(total, pago)
        copia = dict(registro)
        copia["valor_total_hospedagem"] = float(total)
        copia["valor_total_pago"] = float(pago)
        copia["valor_total_receber"] = float(saldo)
        return copia

    @staticmethod
    def _garantir_chale_livre(dados: dict[str, Any], ignorar_id: Optional[str] = None) -> None:
        conflito = ReservaRepository.buscar_conflito(
            dados["numero_chale"],
            dados["data_checkin"],
            dados["data_checkout"],
            ignorar_id,
        )
        if not conflito:
            return
        mensagem = (
            f"{conflito['numero_chale']} já está reservado de "
            f"{formatar_data_br(conflito['data_checkin'])} a "
            f"{formatar_data_br(conflito['data_checkout'])} "
            f"para {conflito['nome_completo']}."
        )
        raise APIError(
            erro="chale_indisponivel",
            mensagem=mensagem,
            status_code=409,
            campos={"numero_chale": mensagem},
        )

    @classmethod
    def listar_reservas(
        cls,
        busca: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        registros = ReservaRepository.listar(busca=busca, status=status)
        return [cls._garantir_saldo_consistente(item) for item in registros]

    @classmethod
    def obter_reserva_por_id(cls, reserva_id: str) -> dict[str, Any]:
        if not validar_uuid(reserva_id):
            raise APIError(
                erro="id_invalido",
                mensagem="O identificador da reserva informado não é um UUID válido.",
                status_code=400,
            )

        reserva = ReservaRepository.buscar_por_id(reserva_id)
        if not reserva:
            raise APIError(
                erro="nao_encontrado",
                mensagem="Reserva não encontrada no sistema.",
                status_code=404,
            )

        return cls._garantir_saldo_consistente(reserva)

    @classmethod
    def criar_reserva(cls, payload: Any, usuario_id: str) -> dict[str, Any]:
        dados_validados = validar_payload_reserva(payload)
        cls._garantir_chale_livre(dados_validados)
        dados_para_banco = {
            **dados_validados,
            "status": "confirmada",
            "criado_por": usuario_id,
        }
        criada = ReservaRepository.criar(dados_para_banco)
        return cls._garantir_saldo_consistente(criada)

    @classmethod
    def atualizar_reserva(cls, reserva_id: str, payload: Any) -> dict[str, Any]:
        atual = cls.obter_reserva_por_id(reserva_id)
        if atual.get("status") == "cancelada":
            raise APIError(
                erro="conflito_estado",
                mensagem="Não é permitido editar uma reserva que já foi cancelada.",
                status_code=409,
            )

        dados_validados = validar_payload_reserva(payload)
        cls._garantir_chale_livre(dados_validados, ignorar_id=reserva_id)
        atualizada = ReservaRepository.atualizar(reserva_id, dados_validados)
        return cls._garantir_saldo_consistente(atualizada)

    @classmethod
    def cancelar_reserva(cls, reserva_id: str) -> dict[str, Any]:
        atual = cls.obter_reserva_por_id(reserva_id)
        if atual.get("status") == "cancelada":
            raise APIError(
                erro="conflito_estado",
                mensagem="Esta reserva já se encontra cancelada.",
                status_code=409,
            )

        cancelada = ReservaRepository.atualizar_status(reserva_id, "cancelada")
        return cls._garantir_saldo_consistente(cancelada)

    @classmethod
    def registrar_pagamento(cls, reserva_id: str, payload: Any) -> dict[str, Any]:
        atual = cls.obter_reserva_por_id(reserva_id)
        if atual.get("status") == "cancelada":
            raise APIError(
                erro="conflito_estado",
                mensagem="Não é possível registrar pagamento em uma reserva cancelada.",
                status_code=409,
            )

        valor = parse_decimal_monetario((payload or {}).get("valor")) if isinstance(payload, dict) else None
        saldo = parse_decimal_monetario(atual["valor_total_receber"]) or Decimal("0.00")
        if valor is None or valor <= Decimal("0.00"):
            raise APIError(
                erro="erro_validacao",
                mensagem="Informe um valor de pagamento maior que zero.",
                status_code=422,
                campos={"valor": "Informe um valor maior que zero."},
            )
        if valor > saldo:
            raise APIError(
                erro="erro_validacao",
                mensagem="O pagamento não pode ser maior que o saldo a receber.",
                status_code=422,
                campos={"valor": "O valor passa do saldo a receber."},
            )

        atualizada = ReservaRepository.somar_pagamento(reserva_id, float(valor))
        if not atualizada:
            raise APIError(
                erro="conflito_estado",
                mensagem="A reserva mudou enquanto o pagamento era registrado. Atualize a página.",
                status_code=409,
            )
        return cls._garantir_saldo_consistente(atualizada)
