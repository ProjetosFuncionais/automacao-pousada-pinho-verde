from typing import Any, Optional
from app.extensions import get_db
from app.utils.db import serializar_linha


class ProfileRepository:

    COLUMNS = "id, email, nome_completo, perfil, ativo, created_at"

    @classmethod
    def buscar_por_id(cls, user_id: str) -> Optional[dict[str, Any]]:
        linha = (
            get_db()
            .execute(
                f"SELECT {cls.COLUMNS} FROM profiles WHERE id = %s LIMIT 1",
                (user_id,),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def buscar_para_login(cls, email: str) -> Optional[dict[str, Any]]:
        """Inclui o hash da senha. Use só na verificação de login."""
        linha = (
            get_db()
            .execute(
                f"SELECT {cls.COLUMNS}, senha_hash FROM profiles "
                "WHERE lower(email) = lower(%s) LIMIT 1",
                (email.strip(),),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def criar(
        cls, email: str, nome_completo: str, perfil: str, senha_hash: str
    ) -> dict[str, Any]:
        linha = (
            get_db()
            .execute(
                "INSERT INTO profiles (email, nome_completo, perfil, senha_hash) "
                f"VALUES (%s, %s, %s, %s) RETURNING {cls.COLUMNS}",
                (email.strip().lower(), nome_completo.strip(), perfil, senha_hash),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def atualizar_senha(cls, email: str, senha_hash: str) -> bool:
        cursor = get_db().execute(
            "UPDATE profiles SET senha_hash = %s WHERE lower(email) = lower(%s)",
            (senha_hash, email.strip()),
        )
        return cursor.rowcount > 0

    @classmethod
    def definir_ativo(cls, email: str, ativo: bool) -> bool:
        cursor = get_db().execute(
            "UPDATE profiles SET ativo = %s WHERE lower(email) = lower(%s)",
            (ativo, email.strip()),
        )
        return cursor.rowcount > 0

    @classmethod
    def listar(cls) -> list[dict[str, Any]]:
        linhas = (
            get_db()
            .execute(f"SELECT {cls.COLUMNS} FROM profiles ORDER BY created_at")
            .fetchall()
        )
        return [serializar_linha(linha) for linha in linhas]
