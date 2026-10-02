"""
Repositório de acesso à tabela public.profiles no Supabase PostgreSQL.
"""
from typing import Any, Optional
from app.extensions import get_supabase_admin


class ProfileRepository:
    """Encapsula consultas à tabela public.profiles."""

    TABLE_NAME = "profiles"

    @classmethod
    def buscar_por_id(cls, user_id: str) -> Optional[dict[str, Any]]:
        """Busca o perfil funcional do colaborador pelo UUID do Supabase Auth."""
        client = get_supabase_admin()
        response = (
            client.table(cls.TABLE_NAME)
            .select("id, nome_completo, perfil, ativo, created_at")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        dados = response.data or []
        return dados[0] if dados else None
