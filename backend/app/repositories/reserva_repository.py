from typing import Any, Optional
from psycopg import sql
from app.extensions import get_db
from app.utils.db import serializar_linha


class ReservaRepository:

    COLUMNS = (
        "id, nome_completo, cpf, whatsapp, endereco, numero_chale, "
        "quantidade_pessoas, data_checkin, data_checkout, "
        "valor_total_hospedagem, valor_total_pago, valor_total_receber, "
        "descricao, status, criado_por, created_at, updated_at"
    )

    # Colunas que a API pode gravar. valor_total_receber é calculado pelo banco.
    COLUNAS_GRAVAVEIS = (
        "nome_completo", "cpf", "whatsapp", "endereco", "numero_chale",
        "quantidade_pessoas", "data_checkin", "data_checkout",
        "valor_total_hospedagem", "valor_total_pago", "descricao",
        "status", "criado_por",
    )

    @classmethod
    def listar(
        cls,
        busca: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        consulta = f"SELECT {cls.COLUMNS} FROM reservas"
        parametros: tuple[Any, ...] = ()
        if status in ("confirmada", "cancelada"):
            consulta += " WHERE status = %s"
            parametros = (status,)
        consulta += " ORDER BY created_at DESC"

        linhas = get_db().execute(consulta, parametros).fetchall()
        registros: list[dict[str, Any]] = [serializar_linha(l) for l in linhas]

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
        linha = (
            get_db()
            .execute(
                f"SELECT {cls.COLUMNS} FROM reservas WHERE id = %s LIMIT 1",
                (reserva_id,),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def _filtrar_colunas(cls, dados: dict[str, Any]) -> dict[str, Any]:
        return {k: v for k, v in dados.items() if k in cls.COLUNAS_GRAVAVEIS}

    @classmethod
    def criar(cls, dados_insercao: dict[str, Any]) -> dict[str, Any]:
        dados = cls._filtrar_colunas(dados_insercao)
        consulta = sql.SQL(
            "INSERT INTO reservas ({colunas}) VALUES ({valores}) RETURNING {retorno}"
        ).format(
            colunas=sql.SQL(", ").join(sql.Identifier(c) for c in dados),
            valores=sql.SQL(", ").join(sql.Placeholder() for _ in dados),
            retorno=sql.SQL(cls.COLUMNS),
        )
        linha = get_db().execute(consulta, tuple(dados.values())).fetchone()
        return serializar_linha(linha)

    @classmethod
    def atualizar(cls, reserva_id: str, dados_atualizacao: dict[str, Any]) -> dict[str, Any]:
        dados = {
            k: v
            for k, v in cls._filtrar_colunas(dados_atualizacao).items()
            if k != "criado_por"
        }
        consulta = sql.SQL(
            "UPDATE reservas SET {campos} WHERE id = %s RETURNING {retorno}"
        ).format(
            campos=sql.SQL(", ").join(
                sql.SQL("{} = %s").format(sql.Identifier(c)) for c in dados
            ),
            retorno=sql.SQL(cls.COLUMNS),
        )
        linha = (
            get_db()
            .execute(consulta, (*dados.values(), reserva_id))
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def atualizar_status(cls, reserva_id: str, novo_status: str) -> dict[str, Any]:
        linha = (
            get_db()
            .execute(
                f"UPDATE reservas SET status = %s WHERE id = %s RETURNING {cls.COLUMNS}",
                (novo_status, reserva_id),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def buscar_conflito(
        cls,
        numero_chale: str,
        data_checkin: str,
        data_checkout: str,
        ignorar_id: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        """Reserva confirmada no mesmo chalé com período sobreposto.

        O dia do check-out pode ser o check-in de outra reserva.
        """
        linha = (
            get_db()
            .execute(
                """
                SELECT id, nome_completo, numero_chale, data_checkin, data_checkout
                FROM reservas
                WHERE status = 'confirmada'
                  AND lower(trim(numero_chale)) = lower(trim(%s))
                  AND data_checkin < %s
                  AND data_checkout > %s
                  AND (%s::uuid IS NULL OR id <> %s::uuid)
                ORDER BY data_checkin
                LIMIT 1
                """,
                (numero_chale, data_checkout, data_checkin, ignorar_id, ignorar_id),
            )
            .fetchone()
        )
        return serializar_linha(linha)

    @classmethod
    def somar_pagamento(cls, reserva_id: str, valor: float) -> Optional[dict[str, Any]]:
        """Soma o valor ao já pago, sem passar do total. None se não couber."""
        linha = (
            get_db()
            .execute(
                f"""
                UPDATE reservas
                SET valor_total_pago = valor_total_pago + %s
                WHERE id = %s
                  AND status = 'confirmada'
                  AND valor_total_pago + %s <= valor_total_hospedagem
                RETURNING {cls.COLUMNS}
                """,
                (valor, reserva_id, valor),
            )
            .fetchone()
        )
        return serializar_linha(linha)
