from typing import Any
import psycopg
from flask import Flask, g, has_app_context
from psycopg.rows import dict_row
from app.config import Config


def _abrir_conexao() -> psycopg.Connection:
    Config.validate()
    return psycopg.connect(
        Config.DATABASE_URL,
        row_factory=dict_row,
        # Cada comando é gravado na hora; todas as escritas são de um comando só.
        autocommit=True,
        # O pooler do Neon (PgBouncer) não suporta prepared statements.
        prepare_threshold=None,
        connect_timeout=10,
        client_encoding="utf8",
    )


def get_db() -> psycopg.Connection:
    """Uma conexão por requisição, fechada automaticamente no fim dela."""
    if not has_app_context():
        return _abrir_conexao()
    if "db" not in g:
        g.db = _abrir_conexao()
    return g.db


def fechar_db(_exc: Any = None) -> None:
    conexao = g.pop("db", None)
    if conexao is not None:
        conexao.close()


def init_db(app: Flask) -> None:
    app.teardown_appcontext(fechar_db)
