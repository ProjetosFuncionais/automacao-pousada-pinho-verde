from flask import Blueprint, g, jsonify
from app.middleware.auth_middleware import require_auth

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.get("/me")
@require_auth
def get_me():
    return jsonify(g.current_user), 200
