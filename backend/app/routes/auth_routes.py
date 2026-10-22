from flask import Blueprint, g, jsonify, request
from app.middleware.auth_middleware import require_auth
from app.services.auth_service import AuthService
from app.services.usuario_service import UsuarioService

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


def _ip_cliente() -> str | None:
    # Na Vercel o IP real do visitante vem no primeiro item de X-Forwarded-For.
    encaminhado = request.headers.get("X-Forwarded-For", "")
    ip = encaminhado.split(",")[0].strip() or request.remote_addr
    return ip[:64] if ip else None


@auth_bp.post("/auth/login")
def login():
    resultado = AuthService.autenticar(request.get_json(silent=True), ip=_ip_cliente())
    return jsonify(resultado), 200


@auth_bp.get("/me")
@require_auth
def get_me():
    return jsonify(g.current_user), 200


@auth_bp.put("/me/senha")
@require_auth
def alterar_minha_senha():
    UsuarioService.alterar_propria_senha(g.current_user["id"], request.get_json(silent=True))
    return jsonify({"mensagem": "Senha alterada."}), 200
