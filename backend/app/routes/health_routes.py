from datetime import datetime, timezone
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health_check():
    return (
        jsonify(
            {
                "status": "ok",
                "servico": "API Sistema de Vouchers e Gestão de Reservas - Pousada Pinho Verde",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ),
        200,
    )
