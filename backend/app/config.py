"""
Configurações centralizadas da aplicação Flask.
Carrega variáveis de ambiente usando python-dotenv sem expor segredos em logs.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuração base da aplicação."""

    FLASK_ENV: str = os.getenv("FLASK_ENV", "development")
    TESTING: bool = FLASK_ENV == "testing"
    PORT: int = int(os.getenv("PORT", "5000"))

    # Origens permitidas para CORS
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173"
        ).split(",")
        if origin.strip()
    ]

    # Credenciais Supabase (Service Role restrita ao servidor)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    @classmethod
    def validate(cls) -> None:
        """Valida a presença das variáveis obrigatórias fora do modo de teste."""
        if cls.TESTING:
            return
        missing = []
        if not cls.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not cls.SUPABASE_ANON_KEY:
            missing.append("SUPABASE_ANON_KEY")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise RuntimeError(
                f"Variáveis de ambiente obrigatórias ausentes no backend: {', '.join(missing)}"
            )
