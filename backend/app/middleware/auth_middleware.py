from functools import wraps
from typing import Any, Callable
from flask import g, request
from app.extensions import get_supabase_auth
from app.repositories.profile_repository import ProfileRepository
from app.utils.errors import APIError


def extrair_bearer_token(auth_header: str | None) -> str:
    if not auth_header or not isinstance(auth_header, str):
        raise APIError(
            erro="nao_autenticado",
            mensagem="Cabeçalho de autenticação ausente. Faça login para continuar.",
            status_code=401,
        )

    partes = auth_header.strip().split(" ")
    if len(partes) != 2 or partes[0].lower() != "bearer" or not partes[1].strip():
        raise APIError(
            erro="nao_autenticado",
            mensagem="Formato de token inválido. Utilize 'Authorization: Bearer <TOKEN>'.",
            status_code=401,
        )

    return partes[1].strip()


def verificar_token_supabase(token: str) -> dict[str, Any]:
    try:
        auth_client = get_supabase_auth()
        user_response = auth_client.auth.get_user(token)
        if not user_response or not getattr(user_response, "user", None):
            raise APIError(
                erro="nao_autenticado",
                mensagem="Sessão inválida ou expirada. Faça login novamente.",
                status_code=401,
            )
        user = user_response.user
        return {
            "id": str(user.id),
            "email": getattr(user, "email", ""),
        }
    except APIError:
        raise
    except Exception as exc:
        raise APIError(
            erro="nao_autenticado",
            mensagem="Não foi possível validar sua sessão. Faça login novamente.",
            status_code=401,
        ) from exc


def require_auth(f: Callable) -> Callable:

    @wraps(f)
    def decorated(*args: Any, **kwargs: Any):
        auth_header = request.headers.get("Authorization")
        token = extrair_bearer_token(auth_header)
        auth_user = verificar_token_supabase(token)

        profile = ProfileRepository.buscar_por_id(auth_user["id"])
        if not profile:
            raise APIError(
                erro="perfil_nao_encontrado",
                mensagem="Usuário autenticado não possui perfil cadastrado na pousada.",
                status_code=403,
            )

        if not profile.get("ativo", False):
            raise APIError(
                erro="usuario_inativo",
                mensagem="Seu perfil de acesso está inativo. Contate a administração da pousada.",
                status_code=403,
            )

        g.current_user = {
            "id": auth_user["id"],
            "email": auth_user["email"],
            "nome_completo": profile["nome_completo"],
            "perfil": profile["perfil"],
            "ativo": profile["ativo"],
        }
        return f(*args, **kwargs)

    return decorated
