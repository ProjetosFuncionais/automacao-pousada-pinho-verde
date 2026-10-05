from typing import Any, Optional
from decimal import Decimal
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva_schema import validar_payload_reserva
from app.utils.errors import APIError
from app.utils.validators import calcular_saldo_receber, parse_decimal_monetario, validar_uuid


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
