"""
Repositório de acesso à tabela public.reservas no Supabase PostgreSQL.
Operações são realizadas pelo backend Flask usando SUPABASE_SERVICE_ROLE_KEY.
"""
from typing import Any, Optional
from app.extensions import get_supabase_admin


class ReservaRepository:
    """Encapsula consultas e persistência na tabela public.reservas."""

    TABLE_NAME = "reservas"
    COLUMNS = (
        "id, nome_completo, cpf, whatsapp, endereco, numero_chale, "
        "quantidade_pessoas, data_checkin, data_checkout, "
        "valor_total_hospedagem, valor_total_pago, valor_total_receber, "
        "descricao, status, criado_por, created_at, updated_at"
    )

    @classmethod
    def listar(
        cls,
        busca: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Lista reservas ordenadas por data de criação decrescente.
        Permite filtrar por status e termo de busca (nome, CPF, WhatsApp, chalé ou código).
        """
        client = get_supabase_admin()
        query = (
            client.table(cls.TABLE_NAME)
            .select(cls.COLUMNS)
            .order("created_at", desc=True)
        )

        if status in ("confirmada", "cancelada"):
            query = query.eq("status", status)

        response = query.execute()
        registros: list[dict[str, Any]] = response.data or []

        if busca and busca.strip():
            termo = busca.strip().lower()
            termo_digitos = "".join(ch for ch in termo if ch.isdigit())
            filtrados: list[dict[str, Any]] = []
            for item in registros:
                id_str = str(item.get("id", "")).lower()
                nome_str = str(item.get("nome_completo", "")).lower()
                cpf_str = str(item.get("cpf", "")).lower()
                cpf_digitos = "".join(ch for ch in cpf_str if ch.isdigit())
                whats_str = str(item.get("whatsapp", "")).lower()
                whats_digitos = "".join(ch for ch in whats_str if ch.isdigit())
                chale_str = str(item.get("numero_chale", "")).lower()

                match_texto = (
                    termo in id_str
                    or termo in nome_str
                    or termo in cpf_str
                    or termo in whats_str
                    or termo in chale_str
                )
                match_digitos = bool(
                    termo_digitos
                    and (
                        termo_digitos in cpf_digitos
                        or termo_digitos in whats_digitos
                    )
                )
                if match_texto or match_digitos:
                    filtrados.append(item)
            return filtrados

        return registros

    @classmethod
    def buscar_por_id(cls, reserva_id: str) -> Optional[dict[str, Any]]:
        """Busca uma reserva pelo seu UUID."""
        client = get_supabase_admin()
        response = (
            client.table(cls.TABLE_NAME)
            .select(cls.COLUMNS)
            .eq("id", reserva_id)
            .limit(1)
            .execute()
        )
        dados = response.data or []
        return dados[0] if dados else None

    @classmethod
    def criar(cls, dados_insercao: dict[str, Any]) -> dict[str, Any]:
        """
        Insere uma nova reserva no banco de dados.
        Remove valor_total_receber do dicionário de inserção pois a coluna é GENERATED ALWAYS no PostgreSQL.
        """
        payload_db = {
            k: v
            for k, v in dados_insercao.items()
            if k not in ("valor_total_receber", "valor_total_receber_calculado")
        }
        client = get_supabase_admin()
        response = client.table(cls.TABLE_NAME).insert(payload_db).execute()
        criados = response.data or []
        return criados[0]

    @classmethod
    def atualizar(cls, reserva_id: str, dados_atualizacao: dict[str, Any]) -> dict[str, Any]:
        """
        Atualiza os dados de uma reserva existente.
        Não envia valor_total_receber pois o PostgreSQL recalcula automaticamente.
        """
        payload_db = {
            k: v
            for k, v in dados_atualizacao.items()
            if k
            not in (
                "id",
                "criado_por",
                "created_at",
                "valor_total_receber",
                "valor_total_receber_calculado",
            )
        }
        client = get_supabase_admin()
        response = (
            client.table(cls.TABLE_NAME)
            .update(payload_db)
            .eq("id", reserva_id)
            .execute()
        )
        atualizados = response.data or []
        return atualizados[0]

    @classmethod
    def atualizar_status(cls, reserva_id: str, novo_status: str) -> dict[str, Any]:
        """Atualiza exclusivamente o status da reserva (ex.: para 'cancelada')."""
        client = get_supabase_admin()
        response = (
            client.table(cls.TABLE_NAME)
            .update({"status": novo_status})
            .eq("id", reserva_id)
            .execute()
        )
        atualizados = response.data or []
        return atualizados[0]
