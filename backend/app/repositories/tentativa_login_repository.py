from typing import Optional
from app.extensions import get_db


class TentativaLoginRepository:

    @classmethod
    def contar_falhas_recentes(
        cls, email: str, ip: Optional[str], minutos: int
    ) -> tuple[int, int]:
        """Devolve (falhas desse e-mail, falhas desse IP) nos últimos `minutos`."""
        linha = (
            get_db()
            .execute(
                """
                SELECT
                    count(*) FILTER (WHERE lower(email) = lower(%s)) AS por_email,
                    count(*) FILTER (WHERE ip = %s) AS por_ip
                FROM tentativas_login
                WHERE criado_em > NOW() - make_interval(mins => %s)
                """,
                (email.strip(), ip, minutos),
            )
            .fetchone()
        )
        return int(linha["por_email"]), int(linha["por_ip"])

    @classmethod
    def registrar_falha(cls, email: str, ip: Optional[str]) -> None:
        db = get_db()
        db.execute(
            "INSERT INTO tentativas_login (email, ip) VALUES (%s, %s)",
            (email.strip().lower()[:255], ip),
        )
        # Faxina: registros com mais de 1 dia não servem para nada.
        db.execute("DELETE FROM tentativas_login WHERE criado_em < NOW() - INTERVAL '1 day'")

    @classmethod
    def limpar(cls, email: str) -> None:
        get_db().execute(
            "DELETE FROM tentativas_login WHERE lower(email) = lower(%s)",
            (email.strip(),),
        )
