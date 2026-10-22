import re
from typing import Any
from werkzeug.security import check_password_hash
from app.repositories.profile_repository import ProfileRepository
from app.services.auth_service import TAMANHO_MINIMO_SENHA, AuthService
from app.utils.errors import APIError
from app.utils.validators import validar_uuid

PERFIS_VALIDOS = ("admin", "recepcao")
_EMAIL_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _erro_validacao(campos: dict[str, str]) -> APIError:
    return APIError(
        erro="erro_validacao",
        mensagem="Existem campos inválidos nos dados enviados.",
        status_code=422,
        campos=campos,
    )


def _validar_senha(senha: Any, campo: str = "senha") -> str:
    if not isinstance(senha, str) or len(senha) < TAMANHO_MINIMO_SENHA:
        raise _erro_validacao(
            {campo: f"A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres."}
        )
    return senha


def _obter_usuario(user_id: str) -> dict[str, Any]:
    usuario = ProfileRepository.buscar_por_id(user_id) if validar_uuid(user_id) else None
    if not usuario:
        raise APIError(
            erro="nao_encontrado",
            mensagem="Usuário não encontrado.",
            status_code=404,
        )
    return usuario


class UsuarioService:

    @staticmethod
    def listar() -> list[dict[str, Any]]:
        return ProfileRepository.listar()

    @staticmethod
    def criar(payload: Any) -> dict[str, Any]:
        dados = payload if isinstance(payload, dict) else {}
        email = str(dados.get("email") or "").strip().lower()
        nome = str(dados.get("nome_completo") or "").strip()
        perfil = dados.get("perfil") or "recepcao"

        campos: dict[str, str] = {}
        if not _EMAIL_VALIDO.match(email):
            campos["email"] = "Informe um e-mail válido."
        if len(nome) < 3:
            campos["nome_completo"] = "Informe o nome (mínimo de 3 caracteres)."
        if perfil not in PERFIS_VALIDOS:
            campos["perfil"] = "Escolha admin ou recepção."
        senha = dados.get("senha")
        if not isinstance(senha, str) or len(senha) < TAMANHO_MINIMO_SENHA:
            campos["senha"] = f"A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres."
        if campos:
            raise _erro_validacao(campos)

        if ProfileRepository.buscar_para_login(email):
            raise APIError(
                erro="email_em_uso",
                mensagem="Já existe um usuário com esse e-mail.",
                status_code=409,
                campos={"email": "Já existe um usuário com esse e-mail."},
            )

        return ProfileRepository.criar(email, nome, perfil, AuthService.gerar_hash_senha(senha))

    @staticmethod
    def atualizar_acesso(user_id: str, payload: Any, usuario_atual_id: str) -> dict[str, Any]:
        usuario = _obter_usuario(user_id)
        dados = payload if isinstance(payload, dict) else {}
        ativo = dados.get("ativo")
        perfil = dados.get("perfil")

        if ativo is not None and not isinstance(ativo, bool):
            raise _erro_validacao({"ativo": "Valor inválido."})
        if perfil is not None and perfil not in PERFIS_VALIDOS:
            raise _erro_validacao({"perfil": "Escolha admin ou recepção."})

        perde_admin = usuario["perfil"] == "admin" and usuario["ativo"] and (
            ativo is False or perfil == "recepcao"
        )
        if perde_admin and user_id == usuario_atual_id:
            raise APIError(
                erro="operacao_nao_permitida",
                mensagem="Você não pode desativar nem tirar o acesso de admin da sua própria conta.",
                status_code=409,
            )
        if perde_admin and ProfileRepository.contar_admins_ativos() <= 1:
            raise APIError(
                erro="operacao_nao_permitida",
                mensagem="O sistema precisa ter pelo menos um admin ativo.",
                status_code=409,
            )

        return ProfileRepository.atualizar_acesso(user_id, ativo=ativo, perfil=perfil)

    @staticmethod
    def redefinir_senha(user_id: str, payload: Any) -> None:
        _obter_usuario(user_id)
        senha = _validar_senha((payload or {}).get("senha") if isinstance(payload, dict) else None)
        ProfileRepository.atualizar_senha_por_id(user_id, AuthService.gerar_hash_senha(senha))

    @staticmethod
    def alterar_propria_senha(user_id: str, payload: Any) -> None:
        dados = payload if isinstance(payload, dict) else {}
        senha_atual = dados.get("senha_atual")
        hash_salvo = ProfileRepository.buscar_hash_por_id(user_id)
        if (
            not isinstance(senha_atual, str)
            or not hash_salvo
            or not check_password_hash(hash_salvo, senha_atual)
        ):
            raise _erro_validacao({"senha_atual": "A senha atual está incorreta."})
        nova = _validar_senha(dados.get("senha_nova"), campo="senha_nova")
        if nova == senha_atual:
            raise _erro_validacao({"senha_nova": "A nova senha precisa ser diferente da atual."})
        ProfileRepository.atualizar_senha_por_id(user_id, AuthService.gerar_hash_senha(nova))
