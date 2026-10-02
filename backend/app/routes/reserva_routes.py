"""
Rotas protegidas para gerenciamento de reservas e emissão de vouchers.
"""
from flask import Blueprint, g, jsonify, request
from app.middleware.auth_middleware import require_auth
from app.services.reserva_service import ReservaService
from app.services.voucher_service import VoucherService

reserva_bp = Blueprint("reservas", __name__, url_prefix="/api/reservas")


@reserva_bp.get("")
@require_auth
def listar_reservas():
    """Lista reservas com suporte a parâmetros ?busca= e ?status=."""
    busca = request.args.get("busca")
    status = request.args.get("status")
    reservas = ReservaService.listar_reservas(busca=busca, status=status)
    return jsonify(reservas), 200


@reserva_bp.get("/<string:reserva_id>")
@require_auth
def obter_reserva(reserva_id: str):
    """Retorna os detalhes de uma reserva específica."""
    reserva = ReservaService.obter_reserva_por_id(reserva_id)
    return jsonify(reserva), 200


@reserva_bp.post("")
@require_auth
def criar_reserva():
    """Cadastra uma nova reserva associada ao colaborador autenticado."""
    payload = request.get_json(silent=True)
    usuario_id = g.current_user["id"]
    nova_reserva = ReservaService.criar_reserva(payload=payload, usuario_id=usuario_id)
    return jsonify(nova_reserva), 201


@reserva_bp.put("/<string:reserva_id>")
@require_auth
def atualizar_reserva(reserva_id: str):
    """Atualiza os dados de uma reserva existente."""
    payload = request.get_json(silent=True)
    reserva_atualizada = ReservaService.atualizar_reserva(
        reserva_id=reserva_id, payload=payload
    )
    return jsonify(reserva_atualizada), 200


@reserva_bp.patch("/<string:reserva_id>/cancelar")
@require_auth
def cancelar_reserva(reserva_id: str):
    """Cancela uma reserva sem excluir seu registro do histórico."""
    reserva_cancelada = ReservaService.cancelar_reserva(reserva_id=reserva_id)
    return jsonify(reserva_cancelada), 200


@reserva_bp.get("/<string:reserva_id>/voucher")
@require_auth
def obter_voucher_reserva(reserva_id: str):
    """Gera os dados completos do voucher para uma reserva salva."""
    emitido_por = g.current_user.get("nome_completo", "Recepção Pousada Pinho Verde")
    voucher = VoucherService.gerar_voucher(
        reserva_id=reserva_id, emitido_por_nome=emitido_por
    )
    return jsonify(voucher), 200
