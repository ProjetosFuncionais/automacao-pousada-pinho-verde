from flask import Blueprint, g, jsonify, request
from app.middleware.auth_middleware import require_admin
from app.services.usuario_service import UsuarioService

usuario_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


@usuario_bp.get("")
@require_admin
def listar_usuarios():
    return jsonify(UsuarioService.listar()), 200


@usuario_bp.post("")
@require_admin
def criar_usuario():
    return jsonify(UsuarioService.criar(request.get_json(silent=True))), 201


@usuario_bp.patch("/<string:user_id>")
@require_admin
def atualizar_usuario(user_id: str):
    usuario = UsuarioService.atualizar_acesso(
        user_id, request.get_json(silent=True), usuario_atual_id=g.current_user["id"]
    )
    return jsonify(usuario), 200


@usuario_bp.put("/<string:user_id>/senha")
@require_admin
def redefinir_senha(user_id: str):
    UsuarioService.redefinir_senha(user_id, request.get_json(silent=True))
    return jsonify({"mensagem": "Senha redefinida."}), 200
