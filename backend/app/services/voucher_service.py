"""
Serviço responsável pela geração estruturada do Voucher oficial da Pousada Pinho Verde.
Garante que o voucher somente seja emitido para reservas já salvas e inclui
todas as políticas obrigatórias da pousada.
"""
from datetime import datetime, timezone
from typing import Any
from app.services.reserva_service import ReservaService
from app.utils.validators import parse_data_iso

POLITICAS_POUSADA_PINHO_VERDE: list[str] = [
    "Reembolso integral para cancelamento solicitado até 14 dias antes do check-in.",
    "Fora do prazo ou em caso de não comparecimento, não haverá reembolso nem crédito.",
    "Check-in às 15h.",
    "Check-out às 12h.",
    "Permanência após o horário poderá gerar taxa adicional.",
    "Não são permitidos animais de estimação.",
    "Não é permitido fumar nas dependências e acomodações.",
    "Pagamento de 50% na reserva.",
    "Restante pago no check-in por PIX, dinheiro ou cartão de crédito em até duas vezes.",
]


class VoucherService:
    """Gera o payload completo do voucher para exibição e impressão."""

    @classmethod
    def gerar_voucher(cls, reserva_id: str, emitido_por_nome: str) -> dict[str, Any]:
        """
        Busca a reserva persistida pelo ID, calcula a quantidade de diárias
        e retorna os dados consolidados do voucher.
        """
        reserva = ReservaService.obter_reserva_por_id(reserva_id)

        dt_checkin = parse_data_iso(reserva["data_checkin"])
        dt_checkout = parse_data_iso(reserva["data_checkout"])
        quantidade_diarias = (
            (dt_checkout - dt_checkin).days
            if dt_checkin and dt_checkout and dt_checkout > dt_checkin
            else 1
        )

        codigo_curto = str(reserva["id"]).split("-")[0].upper()

        return {
            "codigo_voucher": f"PPV-{codigo_curto}",
            "emitido_em": datetime.now(timezone.utc).isoformat(),
            "emitido_por": emitido_por_nome,
            "pousada": {
                "nome": "Pousada Pinho Verde",
                "subtitulo": "Vouchers e Gestão de Hospedagem",
                "horario_checkin": "15h00",
                "horario_checkout": "12h00",
            },
            "reserva": {
                **reserva,
                "quantidade_diarias": quantidade_diarias,
            },
            "politicas": POLITICAS_POUSADA_PINHO_VERDE,
        }
