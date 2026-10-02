"""
Rotas relacionadas à sessão e perfil do colaborador autenticado.
"""
from flask import Blueprint, g, jsonify
from app.middleware.auth_middleware import require_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.get("/me")
@require_auth
def get_me():
    """Retorna os dados do usuário autenticado e seu profile ativo."""
    return jsonify(g.current_user), 200
