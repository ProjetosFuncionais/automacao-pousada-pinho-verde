import os
from dotenv import load_dotenv

load_dotenv()


class Config:

    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    TESTING: bool = FLASK_ENV == "testing"
    PORT: int = int(os.getenv("PORT", "5000"))

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
