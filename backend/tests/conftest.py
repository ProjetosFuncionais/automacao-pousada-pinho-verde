import pytest
from app import create_app


@pytest.fixture()
def app():
    flask_app = create_app(testing=True)
    yield flask_app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def payload_reserva_valida():
    return {
        "nome_completo": "Carlos Eduardo Nogueira",
        "cpf": "529.982.247-25",
        "whatsapp": "(35) 99123-4567",
        "endereco": "Av. das Araucárias, 150, Centro, Monte Verde - MG",
        "numero_chale": "Chalé 01 - Pinheiro Imperial",
        "quantidade_pessoas": 2,
        "data_checkin": "2026-11-20",
        "data_checkout": "2026-11-23",
        "valor_total_hospedagem": 1800.00,
        "valor_total_pago": 900.00,
        "descricao": "Hóspede solicitou lenha extra para a lareira.",
    }
