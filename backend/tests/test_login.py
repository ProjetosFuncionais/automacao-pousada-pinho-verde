from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import jwt
import pytest
from werkzeug.security import generate_password_hash
from app.config import Config

USUARIO_ID = "11111111-2222-3333-4444-555555555555"
SENHA = "senha-forte-123"


REPO_TENTATIVAS = "app.repositories.tentativa_login_repository.TentativaLoginRepository"


@pytest.fixture(autouse=True)
def tentativas_sem_banco():
    """Simula a tabela de tentativas de login sem precisar de banco."""
    with (
        patch(f"{REPO_TENTATIVAS}.contar_falhas_recentes", return_value=(0, 0)) as contar,
        patch(f"{REPO_TENTATIVAS}.registrar_falha") as registrar,
        patch(f"{REPO_TENTATIVAS}.limpar") as limpar,
    ):
        yield {"contar": contar, "registrar": registrar, "limpar": limpar}


def _usuario(ativo: bool = True) -> dict:
    return {
        "id": USUARIO_ID,
        "email": "recepcao@pousadapinhoverde.com.br",
        "nome_completo": "Helena Martins",
        "perfil": "recepcao",
        "ativo": ativo,
        "senha_hash": generate_password_hash(SENHA),
    }


def _login(client, email: str, senha: str):
    return client.post("/api/auth/login", json={"email": email, "password": senha})


def test_login_com_senha_correta_devolve_token(client):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(),
    ):
        resp = _login(client, "Recepcao@PousadaPinhoVerde.com.br", SENHA)

    assert resp.status_code == 200
    dados = resp.get_json()
    assert dados["usuario"]["nome_completo"] == "Helena Martins"
    assert "senha_hash" not in dados["usuario"]
    payload = jwt.decode(dados["token"], Config.JWT_SECRET, algorithms=["HS256"])
    assert payload["sub"] == USUARIO_ID


def test_login_com_senha_errada_e_recusado(client):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(),
    ):
        resp = _login(client, "recepcao@pousadapinhoverde.com.br", "senha-errada")

    assert resp.status_code == 401
    assert resp.get_json()["erro"] == "credenciais_invalidas"


def test_login_com_email_inexistente_tem_mesma_mensagem(client):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=None,
    ):
        resp = _login(client, "ninguem@pousadapinhoverde.com.br", SENHA)

    assert resp.status_code == 401
    assert resp.get_json()["erro"] == "credenciais_invalidas"


def test_login_de_usuario_inativo_e_bloqueado(client):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(ativo=False),
    ):
        resp = _login(client, "recepcao@pousadapinhoverde.com.br", SENHA)

    assert resp.status_code == 403
    assert resp.get_json()["erro"] == "usuario_inativo"


def test_login_sem_campos_retorna_422(client):
    resp = client.post("/api/auth/login", json={"email": ""})
    assert resp.status_code == 422


def test_token_valido_libera_rota_protegida(client):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(),
    ):
        token = _login(client, "recepcao@pousadapinhoverde.com.br", SENHA).get_json()["token"]

    perfil = {k: v for k, v in _usuario().items() if k != "senha_hash"}
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_por_id",
        return_value=perfil,
    ):
        resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})

    assert resp.status_code == 200
    assert resp.get_json()["email"] == "recepcao@pousadapinhoverde.com.br"


def test_token_expirado_e_recusado(client):
    agora = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": USUARIO_ID, "iat": agora - timedelta(hours=13), "exp": agora - timedelta(hours=1)},
        Config.JWT_SECRET,
        algorithm="HS256",
    )
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_token_assinado_com_outro_segredo_e_recusado(client):
    token = jwt.encode(
        {"sub": USUARIO_ID, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "outro-segredo-qualquer-com-mais-de-32-caracteres",
        algorithm="HS256",
    )
    resp = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_senha_errada_registra_falha_e_acerto_limpa(client, tentativas_sem_banco):
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(),
    ):
        _login(client, "recepcao@pousadapinhoverde.com.br", "senha-errada")
        assert tentativas_sem_banco["registrar"].call_count == 1
        _login(client, "recepcao@pousadapinhoverde.com.br", SENHA)
        assert tentativas_sem_banco["limpar"].call_count == 1


def test_muitas_falhas_bloqueiam_mesmo_com_senha_certa(client, tentativas_sem_banco):
    tentativas_sem_banco["contar"].return_value = (5, 5)
    with patch(
        "app.repositories.profile_repository.ProfileRepository.buscar_para_login",
        return_value=_usuario(),
    ):
        resp = _login(client, "recepcao@pousadapinhoverde.com.br", SENHA)

    assert resp.status_code == 429
    assert resp.get_json()["erro"] == "muitas_tentativas"


def test_respostas_da_api_tem_cabecalhos_de_seguranca(client):
    resp = client.get("/api/health")
    assert resp.headers["Cache-Control"] == "no-store"
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
