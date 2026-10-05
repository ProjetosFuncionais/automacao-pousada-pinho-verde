from unittest.mock import patch


def test_health_check_publico(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    dados = resp.get_json()
    assert dados["status"] == "ok"


def test_bloqueia_requisicao_sem_token(client):
    resp = client.get("/api/reservas")
    assert resp.status_code == 401
    dados = resp.get_json()
    assert dados["erro"] == "nao_autenticado"


def test_bloqueia_usuario_com_profile_inativo(client):
    with (
        patch(
            "app.middleware.auth_middleware.verificar_token_supabase",
            return_value={
                "id": "11111111-2222-3333-4444-555555555555",
                "email": "exfuncionario@pousadapinhoverde.com.br",
            },
        ),
        patch(
            "app.repositories.profile_repository.ProfileRepository.buscar_por_id",
            return_value={
                "id": "11111111-2222-3333-4444-555555555555",
                "nome_completo": "Funcionário Inativo",
                "perfil": "recepcao",
                "ativo": False,
            },
        ),
    ):
        resp = client.get(
            "/api/me",
            headers={"Authorization": "Bearer token_valido_exemplo"},
        )
        assert resp.status_code == 403
        dados = resp.get_json()
        assert dados["erro"] == "usuario_inativo"


def test_libera_usuario_autenticado_com_profile_ativo(client):
    with (
        patch(
            "app.middleware.auth_middleware.verificar_token_supabase",
            return_value={
                "id": "11111111-2222-3333-4444-555555555555",
                "email": "recepcao@pousadapinhoverde.com.br",
            },
        ),
        patch(
            "app.repositories.profile_repository.ProfileRepository.buscar_por_id",
            return_value={
                "id": "11111111-2222-3333-4444-555555555555",
                "nome_completo": "Helena Martins",
                "perfil": "admin",
                "ativo": True,
            },
        ),
    ):
        resp = client.get(
            "/api/me",
            headers={"Authorization": "Bearer token_valido_exemplo"},
        )
        assert resp.status_code == 200
        dados = resp.get_json()
        assert dados["nome_completo"] == "Helena Martins"
        assert dados["perfil"] == "admin"
        assert dados["ativo"] is True
