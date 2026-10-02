"""
Padronização de erros e exceções HTTP da API Flask.
Todas as respostas de erro seguem o formato:
{
  "erro": "codigo_do_erro",
  "mensagem": "Mensagem compreensível",
  "campos": {}
}
"""
from typing import Any, Optional
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    """Exceção de domínio e aplicação com código HTTP e dicionário de campos."""

    def __init__(
        self,
        erro: str,
        mensagem: str,
        status_code: int = 400,
        campos: Optional[dict[str, str]] = None,
    ) -> None:
        super().__init__(mensagem)
        self.erro = erro
        self.mensagem = mensagem
        self.status_code = status_code
        self.campos = campos or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "erro": self.erro,
            "mensagem": self.mensagem,
            "campos": self.campos,
        }


def register_error_handlers(app: Flask) -> None:
    """Registra os handlers globais para garantir respostas JSON padronizadas."""

    @app.errorhandler(APIError)
    def handle_api_error(exc: APIError):
        return jsonify(exc.to_dict()), exc.status_code

    @app.errorhandler(400)
    def handle_bad_request(_exc):
        return (
            jsonify(
                {
                    "erro": "requisicao_invalida",
                    "mensagem": "A requisição enviada é inválida ou malformada.",
                    "campos": {},
                }
            ),
            400,
        )

    @app.errorhandler(404)
    def handle_not_found(_exc):
        return (
            jsonify(
                {
                    "erro": "nao_encontrado",
                    "mensagem": "O recurso solicitado não foi encontrado.",
                    "campos": {},
                }
            ),
            404,
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(_exc):
        return (
            jsonify(
                {
                    "erro": "metodo_nao_permitido",
                    "mensagem": "Método HTTP não permitido para esta rota.",
                    "campos": {},
                }
            ),
            405,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(exc: Exception):
        if isinstance(exc, HTTPException):
            return (
                jsonify(
                    {
                        "erro": "erro_http",
                        "mensagem": exc.description or "Erro no processamento HTTP.",
                        "campos": {},
                    }
                ),
                exc.code or 500,
            )

        # Log seguro sem jamais incluir tokens ou segredos
        app.logger.error("Erro interno inesperado na API: %s", type(exc).__name__)
        return (
            jsonify(
                {
                    "erro": "erro_interno",
                    "mensagem": "Ocorreu um erro interno no servidor. Tente novamente em instantes.",
                    "campos": {},
                }
            ),
            500,
        )
