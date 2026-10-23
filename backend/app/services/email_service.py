import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from flask import current_app, has_app_context
from app.config import Config
from app.utils.errors import APIError


class EmailService:

    @staticmethod
    def enviar(destinatario: str, assunto: str, html: str, texto: str) -> None:
        if not Config.email_configurado():
            raise APIError(
                erro="email_nao_configurado",
                mensagem="O envio de e-mail ainda não foi configurado no servidor.",
                status_code=503,
            )

        mensagem = EmailMessage()
        mensagem["Subject"] = assunto
        mensagem["From"] = formataddr((Config.EMAIL_REMETENTE_NOME, Config.EMAIL_REMETENTE))
        mensagem["To"] = destinatario
        mensagem["Message-ID"] = make_msgid(domain=Config.EMAIL_REMETENTE.split("@")[-1])
        if Config.EMAIL_RESPONDER_PARA:
            mensagem["Reply-To"] = Config.EMAIL_RESPONDER_PARA
        mensagem.set_content(texto)
        mensagem.add_alternative(html, subtype="html")

        contexto = ssl.create_default_context()
        try:
            if Config.SMTP_PORT == 465:
                with smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, context=contexto, timeout=20) as smtp:
                    smtp.login(Config.SMTP_USUARIO, Config.SMTP_SENHA)
                    smtp.send_message(mensagem)
            else:
                with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=20) as smtp:
                    smtp.starttls(context=contexto)
                    smtp.login(Config.SMTP_USUARIO, Config.SMTP_SENHA)
                    smtp.send_message(mensagem)
        except smtplib.SMTPAuthenticationError as exc:
            raise APIError(
                erro="email_falhou",
                mensagem="O servidor de e-mail recusou o usuário ou a senha configurados.",
                status_code=502,
            ) from exc
        except smtplib.SMTPRecipientsRefused as exc:
            raise APIError(
                erro="email_invalido",
                mensagem="O servidor de e-mail recusou esse endereço. Confira o e-mail do hóspede.",
                status_code=422,
                campos={"email": "Endereço recusado pelo servidor de e-mail."},
            ) from exc
        except (smtplib.SMTPException, OSError) as exc:
            if has_app_context():
                current_app.logger.error("Falha ao enviar e-mail: %s", type(exc).__name__)
            raise APIError(
                erro="email_falhou",
                mensagem="Não foi possível enviar o e-mail agora. Tente de novo em instantes.",
                status_code=502,
            ) from exc
