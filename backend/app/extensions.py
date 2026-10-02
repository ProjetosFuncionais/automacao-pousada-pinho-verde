"""
Inicialização e gerenciamento seguro dos clientes Supabase no backend Flask.
"""
from typing import Optional
from supabase import Client, create_client
from app.config import Config

_supabase_admin_client: Optional[Client] = None
_supabase_auth_client: Optional[Client] = None


def get_supabase_admin() -> Client:
    """
    Retorna o cliente Supabase configurado com a SUPABASE_SERVICE_ROLE_KEY.
    Utilizado exclusivamente no backend para operações nas tabelas profiles e reservas.
    """
    global _supabase_admin_client
    if _supabase_admin_client is None:
        Config.validate()
        _supabase_admin_client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_admin_client


def get_supabase_auth() -> Client:
    """
    Retorna o cliente Supabase configurado com a SUPABASE_ANON_KEY
    para verificação de tokens JWT enviados pelo frontend.
    """
    global _supabase_auth_client
    if _supabase_auth_client is None:
        Config.validate()
        _supabase_auth_client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_ANON_KEY,
        )
    return _supabase_auth_client
