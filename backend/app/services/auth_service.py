from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from werkzeug.security import check_password_hash, generate_password_hash
from app.config import Config
from app.repositories.profile_repository import ProfileRepository
from app.repositories.tentativa_login_repository import TentativaLoginRepository
from app.utils.errors import APIError

ALGORITMO_JWT = "HS256"
TAMANHO_MINIMO_SENHA = 8

# Bloqueio temporário contra quem tenta adivinhar senhas.
JANELA_BLOQUEIO_MINUTOS = 15
MAX_FALHAS_POR_EMAIL = 5
MAX_FALHAS_POR_IP = 30

_ERRO_CREDENCIAIS = APIError(
    erro="credenciais_invalidas",
    mensagem="E-mail ou senha inválidos. Verifique suas credenciais.",
    status_code=401,
)

# Hash fixo usado quando o e-mail não existe, para a resposta levar o mesmo
# tempo e não revelar quais e-mails estão cadastrados.
_hash_ficticio: str | None = None


def _obter_hash_ficticio() -> str:
    global _hash_ficticio
    if _hash_ficticio is None:
        _hash_ficticio = generate_password_hash("senha-ficticia-para-comparacao")
    return _hash_ficticio


class AuthService:

    @staticmethod
    def gerar_hash_senha(senha: str) -> str:
        if not isinstance(senha, str) or len(senha) < TAMANHO_MINIMO_SENHA:
            raise ValueError(
                f"A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres."
            )
        return generate_password_hash(senha)

    @staticmethod
    def gerar_token(usuario_id: str, email: str) -> str:
        Config.validate()
        agora = datetime.now(timezone.utc)
        payload = {
            "sub": usuario_id,
            "email": email,
            "iat": agora,
            "exp": agora + timedelta(hours=Config.JWT_EXPIRES_HOURS),
        }
        return jwt.encode(payload, Config.JWT_SECRET, algorithm=ALGORITMO_JWT)

    @staticmethod
    def verificar_token(token: str) -> dict[str, Any]:
        try:
            Config.validate()
            payload = jwt.decode(
                token,
                Config.JWT_SECRET,
                algorithms=[ALGORITMO_JWT],
                options={"require": ["sub", "exp"]},
            )
        except jwt.ExpiredSignatureError as exc:
            raise APIError(
                erro="nao_autenticado",
                mensagem="Sua sessão expirou. Faça login novamente.",
                status_code=401,
            ) from exc
        except (jwt.InvalidTokenError, RuntimeError) as exc:
            raise APIError(
                erro="nao_autenticado",
                mensagem="Sessão inválida ou expirada. Faça login novamente.",
                status_code=401,
            ) from exc

        return {"id": str(payload["sub"]), "email": payload.get("email", "")}

    @classmethod
    def autenticar(cls, payload: Any, ip: str | None = None) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise APIError(
                erro="requisicao_invalida",
                mensagem="Envie e-mail e senha em formato JSON.",
                status_code=400,
            )

        email = payload.get("email")
        senha = payload.get("password")
        if not isinstance(email, str) or not email.strip() or not isinstance(senha, str) or not senha:
            raise APIError(
                erro="erro_validacao",
                mensagem="Informe e-mail e senha.",
                status_code=422,
            )

        falhas_email, falhas_ip = TentativaLoginRepository.contar_falhas_recentes(
            email, ip, JANELA_BLOQUEIO_MINUTOS
        )
        if falhas_email >= MAX_FALHAS_POR_EMAIL or falhas_ip >= MAX_FALHAS_POR_IP:
            raise APIError(
                erro="muitas_tentativas",
                mensagem=(
                    "Muitas tentativas de login sem sucesso. "
                    f"Aguarde {JANELA_BLOQUEIO_MINUTOS} minutos e tente novamente."
                ),
                status_code=429,
            )

        usuario = ProfileRepository.buscar_para_login(email)
        hash_salvo = (usuario or {}).get("senha_hash") or _obter_hash_ficticio()
        senha_confere = check_password_hash(hash_salvo, senha)

        if not usuario or not usuario.get("senha_hash") or not senha_confere:
            TentativaLoginRepository.registrar_falha(email, ip)
            raise _ERRO_CREDENCIAIS

        TentativaLoginRepository.limpar(email)

        if not usuario.get("ativo", False):
            raise APIError(
                erro="usuario_inativo",
                mensagem="Seu perfil de acesso está inativo. Contate a administração da pousada.",
                status_code=403,
            )

        token = cls.gerar_token(usuario["id"], usuario["email"])
        return {
            "token": token,
            "expira_em_horas": Config.JWT_EXPIRES_HOURS,
            "usuario": {
                "id": usuario["id"],
                "email": usuario["email"],
                "nome_completo": usuario["nome_completo"],
                "perfil": usuario["perfil"],
                "ativo": usuario["ativo"],
            },
        }
