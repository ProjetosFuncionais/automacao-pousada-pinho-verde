import os
from dotenv import load_dotenv

load_dotenv()


class Config:

    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    TESTING: bool = FLASK_ENV == "testing"

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
        ).split(",")
        if origin.strip()
    ]

    # A integração Neon da Vercel cria DATABASE_URL (e também POSTGRES_URL).
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL", "")

    # Segredo usado para assinar os tokens de login. Precisa ser longo e aleatório.
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_EXPIRES_HOURS: int = int(os.getenv("JWT_EXPIRES_HOURS", "12"))

    # Envio de e-mail (SMTP). Funciona com Gmail, Resend, Brevo etc.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USUARIO: str = os.getenv("SMTP_USUARIO", "")
    SMTP_SENHA: str = os.getenv("SMTP_SENHA", "")
    EMAIL_REMETENTE: str = os.getenv("EMAIL_REMETENTE", "") or SMTP_USUARIO
    EMAIL_REMETENTE_NOME: str = os.getenv("EMAIL_REMETENTE_NOME", "Pousada Pinho Verde")
    EMAIL_RESPONDER_PARA: str = os.getenv("EMAIL_RESPONDER_PARA", "")

    @classmethod
    def email_configurado(cls) -> bool:
        return bool(cls.SMTP_HOST and cls.SMTP_USUARIO and cls.SMTP_SENHA and cls.EMAIL_REMETENTE)

    @classmethod
    def validate(cls) -> None:
        if cls.TESTING:
            return
        missing = []
        if not cls.DATABASE_URL:
            missing.append("DATABASE_URL")
        if not cls.JWT_SECRET:
            missing.append("JWT_SECRET")
        if missing:
            raise RuntimeError(
                f"Variáveis de ambiente obrigatórias ausentes no backend: {', '.join(missing)}"
            )
        if len(cls.JWT_SECRET) < 32:
            raise RuntimeError("JWT_SECRET precisa ter pelo menos 32 caracteres.")
