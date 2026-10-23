from datetime import datetime, timezone
from typing import Any
from app.repositories.reserva_repository import ReservaRepository
from app.schemas.reserva_schema import validar_email_opcional
from app.services.email_service import EmailService
from app.services.reserva_service import ReservaService
from app.services.voucher_email import montar_email_voucher
from app.utils.errors import APIError
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

    @classmethod
    def gerar_voucher(cls, reserva_id: str, emitido_por_nome: str) -> dict[str, Any]:
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

    @classmethod
    def enviar_por_email(cls, reserva_id: str, payload: Any, emitido_por_nome: str) -> dict[str, Any]:
        voucher = cls.gerar_voucher(reserva_id, emitido_por_nome)
        reserva = voucher["reserva"]
        if reserva.get("status") == "cancelada":
            raise APIError(
                erro="conflito_estado",
                mensagem="Não é possível enviar o voucher de uma reserva cancelada.",
                status_code=409,
            )

        informado = (payload or {}).get("email") if isinstance(payload, dict) else None
        email, erro = validar_email_opcional(informado or reserva.get("email"))
        if erro or not email:
            raise APIError(
                erro="erro_validacao",
                mensagem=erro or "Informe o e-mail do hóspede.",
                status_code=422,
                campos={"email": erro or "Informe o e-mail do hóspede."},
            )

        assunto, html, texto = montar_email_voucher(voucher)
        EmailService.enviar(email, assunto, html, texto)
        # Guarda o e-mail na reserva para os próximos envios.
        ReservaRepository.salvar_email(reserva["id"], email)
        return {"mensagem": f"Voucher enviado para {email}.", "email": email}
