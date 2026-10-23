from unittest.mock import MagicMock, patch
import pytest
from app.config import Config
from app.services.auth_service import AuthService
from app.services.voucher_email import montar_email_voucher

USUARIO_ID = "11111111-2222-3333-4444-555555555555"
RESERVA_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
PERFIL = {"id": USUARIO_ID, "email": "recepcao@pousada.com", "nome_completo": "Helena", "perfil": "recepcao", "ativo": True}
REPO_RESERVA = "app.repositories.reserva_repository.ReservaRepository"


def _reserva(**extra) -> dict:
    base = {
        "id": RESERVA_ID, "nome_completo": "Mariana Costa", "cpf": "529.982.247-25",
        "whatsapp": "(35) 99123-4567", "email": None, "endereco": "Rua A, 1",
        "numero_chale": "Chalé 06", "quantidade_pessoas": 2,
        "data_checkin": "2026-11-20", "data_checkout": "2026-11-23",
        "valor_total_hospedagem": 1800.0, "valor_total_pago": 900.0, "valor_total_receber": 900.0,
        "descricao": None, "status": "confirmada",
    }
    return {**base, **extra}


@pytest.fixture()
def cabecalho():
    return {"Authorization": f"Bearer {AuthService.gerar_token(USUARIO_ID, PERFIL['email'])}"}


@pytest.fixture(autouse=True)
def perfil_sem_banco():
    with patch("app.repositories.profile_repository.ProfileRepository.buscar_por_id", return_value=PERFIL):
        yield


@pytest.fixture()
def smtp_configurado(monkeypatch):
    for nome, valor in {
        "SMTP_HOST": "smtp.exemplo.com", "SMTP_PORT": 587, "SMTP_USUARIO": "pousada@exemplo.com",
        "SMTP_SENHA": "senha", "EMAIL_REMETENTE": "pousada@exemplo.com",
    }.items():
        monkeypatch.setattr(Config, nome, valor)
    servidor = MagicMock()
    with patch("app.services.email_service.smtplib.SMTP") as smtp:
        smtp.return_value.__enter__.return_value = servidor
        yield servidor


def test_envia_voucher_e_guarda_o_email(client, cabecalho, smtp_configurado):
    with (
        patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()),
        patch(f"{REPO_RESERVA}.salvar_email") as salvar,
    ):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/voucher/email", json={"email": "Mariana@Gmail.com "}, headers=cabecalho)

    assert resp.status_code == 200
    assert resp.get_json()["email"] == "mariana@gmail.com"
    mensagem = smtp_configurado.send_message.call_args.args[0]
    assert mensagem["To"] == "mariana@gmail.com"
    assert "PPV-9B1DEB4D" in mensagem["Subject"]
    smtp_configurado.starttls.assert_called_once()
    smtp_configurado.login.assert_called_once_with("pousada@exemplo.com", "senha")
    salvar.assert_called_once_with(RESERVA_ID, "mariana@gmail.com")


def test_usa_email_ja_salvo_na_reserva(client, cabecalho, smtp_configurado):
    with (
        patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva(email="salvo@gmail.com")),
        patch(f"{REPO_RESERVA}.salvar_email"),
    ):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/voucher/email", json={}, headers=cabecalho)
    assert resp.status_code == 200
    assert smtp_configurado.send_message.call_args.args[0]["To"] == "salvo@gmail.com"


@pytest.mark.parametrize("email", ["", "sem-arroba", "a@b"])
def test_email_invalido_e_recusado(client, cabecalho, smtp_configurado, email):
    with patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/voucher/email", json={"email": email}, headers=cabecalho)
    assert resp.status_code == 422
    smtp_configurado.send_message.assert_not_called()


def test_reserva_cancelada_nao_envia(client, cabecalho, smtp_configurado):
    with patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva(status="cancelada")):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/voucher/email", json={"email": "a@gmail.com"}, headers=cabecalho)
    assert resp.status_code == 409


def test_sem_configuracao_avisa_claramente(client, cabecalho, monkeypatch):
    monkeypatch.setattr(Config, "SMTP_HOST", "")
    with patch(f"{REPO_RESERVA}.buscar_por_id", return_value=_reserva()):
        resp = client.post(f"/api/reservas/{RESERVA_ID}/voucher/email", json={"email": "a@gmail.com"}, headers=cabecalho)
    assert resp.status_code == 503
    assert resp.get_json()["erro"] == "email_nao_configurado"


def test_conteudo_do_email_escapa_texto_do_hospede():
    voucher = {
        "codigo_voucher": "PPV-1", "politicas": ["Check-in às 15h."],
        "reserva": {**_reserva(nome_completo="<script>x</script> Silva", descricao="<b>oi</b>"), "quantidade_diarias": 3},
    }
    assunto, html, texto = montar_email_voucher(voucher)
    assert "<script>" not in html and "&lt;script&gt;" in html
    assert "<b>oi</b>" not in html
    assert "R$ 900,00" in html and "R$ 1.800,00" in texto
    assert "20/11/2026" in texto


def test_email_invalido_no_cadastro_da_reserva(client, cabecalho, payload_reserva_valida):
    resp = client.post("/api/reservas", json={**payload_reserva_valida, "email": "errado"}, headers=cabecalho)
    assert resp.status_code == 422
    assert "email" in resp.get_json()["campos"]
