import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional


def serializar_valor(valor: Any) -> Any:
    """Converte tipos do Postgres para o mesmo formato JSON que a API já devolvia."""
    if isinstance(valor, uuid.UUID):
        return str(valor)
    if isinstance(valor, datetime):
        return valor.isoformat()
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return float(valor)
    return valor


def serializar_linha(linha: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if linha is None:
        return None
    return {chave: serializar_valor(valor) for chave, valor in linha.items()}
