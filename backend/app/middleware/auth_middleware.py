from functools import wraps
from typing import Any, Callable
from flask import g, request
from app.repositories.profile_repository import ProfileRepository
from app.services.auth_service import AuthService
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


def verificar_token(token: str) -> dict[str, Any]:
    return AuthService.verificar_token(token)


def require_auth(f: Callable) -> Callable:

    @wraps(f)
    def decorated(*args: Any, **kwargs: Any):
        auth_header = request.headers.get("Authorization")
        token = extrair_bearer_token(auth_header)
        auth_user = verificar_token(token)

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
            "email": profile.get("email") or auth_user["email"],
            "nome_completo": profile["nome_completo"],
            "perfil": profile["perfil"],
            "ativo": profile["ativo"],
        }
        return f(*args, **kwargs)

    return decorated
