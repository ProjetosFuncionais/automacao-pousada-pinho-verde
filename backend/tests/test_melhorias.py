from unittest.mock import patch
import pytest
from werkzeug.security import generate_password_hash
from app.services.auth_service import AuthService

ADMIN_ID = "11111111-2222-3333-4444-555555555555"
RECEPCAO_ID = "22222222-3333-4444-5555-666666666666"
RESERVA_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
PERFIS = {
    ADMIN_ID: {"id": ADMIN_ID, "email": "admin@pousada.com", "nome_completo": "Admin", "perfil": "admin", "ativo": True},
    RECEPCAO_ID: {"id": RECEPCAO_ID, "email": "recepcao@pousada.com", "nome_completo": "Recepção", "perfil": "recepcao", "ativo": True},
}
REPO_PERFIL = "app.repositories.profile_repository.ProfileRepository"
REPO_RESERVA = "app.repositories.reserva_repository.ReservaRepository"


@pytest.fixture(autouse=True)
def perfis_sem_banco():
    with patch(f"{REPO_PERFIL}.buscar_por_id", side_effect=lambda i: PERFIS.get(i)):
        yield


def _cabecalho(user_id: str) -> dict:
    return {"Authorization": f"Bearer {AuthService.gerar_token(user_id, PERFIS[user_id]['email'])}"}


def _reserva(**extra) -> dict:
    base = {
        "id": RESERVA_ID, "nome_completo": "Mariana", "status": "confirmada",
        "valor_total_hospedagem": 1000.0, "valor_total_pago": 500.0, "valor_total_receber": 500.0,
        "numero_chale": "Chalé 01", "data_checkin": "2026-11-20", "data_checkout": "2026-11-23",
    }
    return {**base, **extra}


# Reserva duplicada

def test_reserva_em_chale_ocupado_e_recusada(client, payload_reserva_valida):
    conflito = {"id": RESERVA_ID, "nome_completo": "Mariana", "numero_chale": "Chalé 01",
                "data_checkin": "2026-11-21", "data_checkout": "2026-11-24"}
    with (
        patch(f"{REPO_RESERVA}.buscar_conflito", return_value=conflito),
        patch(f"{REPO_RESERVA}.criar") as criar,
    ):
        resp = client.post("/api/reservas", json=payload_reserva_valida, headers=_cabecalho(RECEPCAO_ID))

    assert resp.status_code == 409
    dados = resp.get_json()
    assert dados["erro"] == "chale_indisponivel"
    assert "21/11/2026 a 24/11/2026" in dados["mensagem"]
    assert "numero_chale" in dados["campos"]
    criar.assert_not_called()


def test_reserva_em_chale_livre_e_criada(client, payload_reserva_valida):
    with (
        patch(f"{REPO_RESERVA}.buscar_conflito", return_value=None),
        patch(f"{REPO_RESERVA}.criar", return_value=_reserva()),
    ):
        resp = client.post("/api/reservas", json=payload_reserva_valida, headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 201


def test_edicao_ignora_a_propria_reserva_na_checagem(client, payload_reserva_valida):
    with (
        patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()),
        patch(f"{REPO_RESERVA}.buscar_conflito", return_value=None) as conflito,
        patch(f"{REPO_RESERVA}.atualizar", return_value=_reserva()),
    ):
        resp = client.put(f"/api/reservas/{RESERVA_ID}", json=payload_reserva_valida, headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 200
    assert conflito.call_args.args[3] == RESERVA_ID


# Pagamentos

def test_registrar_pagamento_soma_ao_valor_pago(client):
    with (
        patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()),
        patch(f"{REPO_RESERVA}.somar_pagamento", return_value=_reserva(valor_total_pago=1000.0)) as somar,
    ):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/pagamentos", json={"valor": 500}, headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 200
    assert resp.get_json()["valor_total_receber"] == 0.0
    assert somar.call_args.args == (RESERVA_ID, 500.0)


@pytest.mark.parametrize("valor", [0, -10, 500.01, "abc", None])
def test_pagamento_invalido_e_recusado(client, valor):
    with (
        patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()),
        patch(f"{REPO_RESERVA}.somar_pagamento") as somar,
    ):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/pagamentos", json={"valor": valor}, headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 422
    somar.assert_not_called()


def test_pagamento_em_reserva_cancelada_e_recusado(client):
    with patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva(status="cancelada")):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/pagamentos", json={"valor": 100}, headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 409


# Usuários

def test_recepcao_nao_acessa_gestao_de_usuarios(client):
    resp = client.get("/api/usuarios", headers=_cabecalho(RECEPCAO_ID))
    assert resp.status_code == 403


def test_admin_lista_usuarios(client):
    with patch(f"{REPO_PERFIL}.listar", return_value=list(PERFIS.values())):
        resp = client.get("/api/usuarios", headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 200
    assert len(resp.get_json()) == 2


def test_admin_cria_usuario(client):
    novo = {"email": "nova@pousada.com", "nome_completo": "Nova Pessoa", "perfil": "recepcao", "senha": "senha-forte-1"}
    with (
        patch(f"{REPO_PERFIL}.buscar_para_login", return_value=None),
        patch(f"{REPO_PERFIL}.criar", return_value={**novo, "id": "x", "ativo": True}) as criar,
    ):
        resp = client.post("/api/usuarios", json=novo, headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 201
    hash_gravado = criar.call_args.args[3]
    assert hash_gravado != "senha-forte-1"


def test_criar_usuario_com_dados_invalidos(client):
    resp = client.post("/api/usuarios", json={"email": "x", "nome_completo": "A", "senha": "123"}, headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 422
    assert set(resp.get_json()["campos"]) >= {"email", "nome_completo", "senha"}


def test_criar_usuario_com_email_repetido(client):
    with patch(f"{REPO_PERFIL}.buscar_para_login", return_value=PERFIS[RECEPCAO_ID]):
        resp = client.post(
            "/api/usuarios",
            json={"email": "recepcao@pousada.com", "nome_completo": "Outra", "senha": "senha-forte-1"},
            headers=_cabecalho(ADMIN_ID),
        )
    assert resp.status_code == 409


def test_admin_nao_desativa_a_propria_conta(client):
    resp = client.patch(f"/api/usuarios/{ADMIN_ID}", json={"ativo": False}, headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 409


def test_admin_desativa_recepcao(client):
    with patch(f"{REPO_PERFIL}.atualizar_acesso", return_value={**PERFIS[RECEPCAO_ID], "ativo": False}) as atualizar:
        resp = client.patch(f"/api/usuarios/{RECEPCAO_ID}", json={"ativo": False}, headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 200
    assert atualizar.call_args.kwargs == {"ativo": False, "perfil": None}


def test_admin_redefine_senha(client):
    with patch(f"{REPO_PERFIL}.atualizar_senha_por_id") as atualizar:
        resp = client.put(f"/api/usuarios/{RECEPCAO_ID}/senha", json={"senha": "nova-senha-123"}, headers=_cabecalho(ADMIN_ID))
    assert resp.status_code == 200
    assert atualizar.call_args.args[0] == RECEPCAO_ID


def test_trocar_propria_senha_exige_senha_atual(client):
    with (
        patch(f"{REPO_PERFIL}.buscar_hash_por_id", return_value=generate_password_hash("senha-atual-1")),
        patch(f"{REPO_PERFIL}.atualizar_senha_por_id") as atualizar,
    ):
        errada = client.put("/api/me/senha", json={"senha_atual": "errada", "senha_nova": "nova-senha-123"}, headers=_cabecalho(RECEPCAO_ID))
        certa = client.put("/api/me/senha", json={"senha_atual": "senha-atual-1", "senha_nova": "nova-senha-123"}, headers=_cabecalho(RECEPCAO_ID))
    assert errada.status_code == 422
    assert certa.status_code == 200
    assert atualizar.call_count == 1
