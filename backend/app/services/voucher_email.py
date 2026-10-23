"""Monta o e-mail do voucher (versão HTML e versão só texto)."""
from html import escape
from typing import Any
from app.utils.validators import formatar_data_br


def _moeda(valor: Any) -> str:
    texto = f"{float(valor or 0):,.2f}"
    return "R$ " + texto.replace(",", "X").replace(".", ",").replace("X", ".")


def _linha(rotulo: str, valor: str) -> str:
    return (
        '<tr>'
        f'<td style="padding:6px 0;color:#64748b;font-size:13px;width:40%">{escape(rotulo)}</td>'
        f'<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">{escape(valor)}</td>'
        '</tr>'
    )


def montar_email_voucher(voucher: dict[str, Any]) -> tuple[str, str, str]:
    """Devolve (assunto, html, texto)."""
    r = voucher["reserva"]
    codigo = voucher["codigo_voucher"]
    primeiro_nome = str(r["nome_completo"]).strip().split(" ")[0]
    diarias = voucher["reserva"]["quantidade_diarias"]
    checkin = formatar_data_br(r["data_checkin"])
    checkout = formatar_data_br(r["data_checkout"])
    saldo = float(r.get("valor_total_receber") or 0)

    assunto = f"Voucher da sua reserva {codigo} · Pousada Pinho Verde"

    linhas_hospedagem = "".join([
        _linha("Código", codigo),
        _linha("Hóspede", r["nome_completo"]),
        _linha("Chalé", r["numero_chale"]),
        _linha("Hóspedes", f"{r['quantidade_pessoas']} {'pessoa' if r['quantidade_pessoas'] == 1 else 'pessoas'}"),
        _linha("Check-in", f"{checkin} a partir das 15h"),
        _linha("Check-out", f"{checkout} até as 12h"),
        _linha("Diárias", str(diarias)),
    ])
    linhas_valores = "".join([
        _linha("Valor total", _moeda(r["valor_total_hospedagem"])),
        _linha("Já pago", _moeda(r["valor_total_pago"])),
        _linha("A pagar no check-in", _moeda(saldo)),
    ])
    politicas = "".join(
        f'<li style="margin:0 0 6px">{escape(p)}</li>' for p in voucher["politicas"]
    )
    observacoes = (
        f'<p style="margin:16px 0 0;font-size:13px;color:#334155"><strong>Observações:</strong> {escape(r["descricao"])}</p>'
        if r.get("descricao") else ""
    )
    aviso_saldo = (
        f'O restante de <strong>{escape(_moeda(saldo))}</strong> é pago no check-in, por PIX, dinheiro ou cartão em até 2x.'
        if saldo > 0 else "Sua hospedagem já está totalmente paga."
    )

    html = f"""<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f1f5f4;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f4;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="background:#0f291e;padding:20px 28px;border-radius:12px 12px 0 0">
  <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Pousada Pinho Verde</p>
  <p style="margin:4px 0 0;color:#a7f3d0;font-size:13px">Voucher de hospedagem · {escape(codigo)}</p>
</td></tr>
<tr><td style="padding:24px 28px">
  <p style="margin:0 0 8px;font-size:16px;color:#0f172a">Olá, {escape(primeiro_nome)}!</p>
  <p style="margin:0 0 20px;font-size:14px;color:#334155">Sua reserva está confirmada. Guarde este e-mail e apresente o código na chegada.</p>
  <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#64748b">HOSPEDAGEM</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0">{linhas_hospedagem}</table>
  {observacoes}
  <p style="margin:20px 0 4px;font-size:12px;font-weight:700;color:#64748b">VALORES</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0">{linhas_valores}</table>
  <p style="margin:12px 0 0;font-size:13px;color:#334155">{aviso_saldo}</p>
  <p style="margin:20px 0 8px;font-size:12px;font-weight:700;color:#64748b">POLÍTICAS DA POUSADA</p>
  <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155">{politicas}</ul>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
  Dúvidas? É só responder este e-mail. Até breve!
</td></tr>
</table>
</td></tr></table>
</body></html>"""

    texto = "\n".join([
        f"Olá, {primeiro_nome}! Sua reserva na Pousada Pinho Verde está confirmada.",
        "",
        f"Código: {codigo}",
        f"Chalé: {r['numero_chale']}",
        f"Hóspedes: {r['quantidade_pessoas']}",
        f"Check-in: {checkin} a partir das 15h",
        f"Check-out: {checkout} até as 12h",
        f"Diárias: {diarias}",
        "",
        f"Valor total: {_moeda(r['valor_total_hospedagem'])}",
        f"Já pago: {_moeda(r['valor_total_pago'])}",
        f"A pagar no check-in: {_moeda(saldo)}",
        "",
        "Políticas da pousada:",
        *[f"- {p}" for p in voucher["politicas"]],
        "",
        "Dúvidas? É só responder este e-mail. Até breve!",
    ])
    return assunto, html, texto
