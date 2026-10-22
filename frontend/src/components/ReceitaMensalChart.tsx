import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Reserva } from '../types/reserva';
import { formatarMoedaBRL } from '../utils/formatters';

// Cores validadas para daltonismo (protan/deutan) e contraste no fundo branco.
const COR_RECEBIDO = '#047857';
const COR_A_RECEBER = '#d97706';
const COR_GRADE = '#e2e8f0';

const QTD_MESES = 6;
const ALTURA = 240;
const MARGEM = { topo: 24, direita: 8, base: 28, esquerda: 68 };
const LARGURA_MAX_COLUNA = 24;
const RAIO = 4;
const ESPACO = 2;

interface DadosMes {
  chave: string;
  rotulo: string;
  rotuloCompleto: string;
  recebido: number;
  aReceber: number;
  quantidade: number;
}

const formatoMesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const formatoMesLongo = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const LARGURA_TOOLTIP = 176;

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarEixo(valor: number): string {
  if (valor === 0) return 'R$ 0';
  if (valor >= 1000) {
    const mil = valor / 1000;
    return `R$ ${mil.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${valor.toLocaleString('pt-BR')}`;
}

// Escala com degraus redondos (1, 2 ou 5 × 10^n), com até 4 divisões.
function calcularEscala(maximo: number): { topo: number; passo: number } {
  if (maximo <= 0) return { topo: 4000, passo: 1000 };
  const passoBruto = maximo / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(passoBruto)));
  const fator = [1, 2, 5, 10].find((f) => f * magnitude >= passoBruto) ?? 10;
  const passo = fator * magnitude;
  return { topo: Math.ceil(maximo / passo) * passo, passo };
}

function montarMeses(reservas: Reserva[]): DadosMes[] {
  const hoje = new Date();
  const meses: DadosMes[] = [];

  for (let i = 0; i < QTD_MESES; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const curto = formatoMesCurto.format(data).replace('.', '');
    const mostrarAno = i === 0 || data.getMonth() === 0;
    meses.push({
      chave,
      rotulo: mostrarAno ? `${curto}/${String(data.getFullYear()).slice(2)}` : curto,
      rotuloCompleto: formatoMesLongo.format(data),
      recebido: 0,
      aReceber: 0,
      quantidade: 0,
    });
  }

  const porChave = new Map(meses.map((m) => [m.chave, m]));
  for (const r of reservas) {
    if (r.status !== 'confirmada') continue;
    const mes = porChave.get(r.data_checkin.slice(0, 7));
    if (!mes) continue;
    mes.recebido += Number(r.valor_total_pago || 0);
    mes.aReceber += Number(r.valor_total_receber || 0);
    mes.quantidade += 1;
  }

  return meses;
}

// Retângulo com cantos arredondados só no topo (a base fica reta, apoiada no eixo).
function caminhoTopoArredondado(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RAIO, h, w / 2);
  return [
    `M${x},${y + h}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h}`,
    'Z',
  ].join(' ');
}

export const ReceitaMensalChart: React.FC<{
  reservas: Reserva[];
  carregando: boolean;
}> = ({ reservas, carregando }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [ativo, setAtivo] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([entrada]) => {
      setLargura(Math.max(280, Math.floor(entrada.contentRect.width)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const meses = useMemo(() => montarMeses(reservas), [reservas]);
  const maiorTotal = Math.max(...meses.map((m) => m.recebido + m.aReceber), 0);
  const { topo: topoEscala, passo } = calcularEscala(maiorTotal);
  const semDados = !carregando && maiorTotal === 0;
  const indiceMaior = maiorTotal > 0
    ? meses.findIndex((m) => m.recebido + m.aReceber === maiorTotal)
    : -1;

  const areaLargura = largura - MARGEM.esquerda - MARGEM.direita;
  const areaAltura = ALTURA - MARGEM.topo - MARGEM.base;
  const faixa = areaLargura / meses.length;
  const larguraColuna = Math.min(LARGURA_MAX_COLUNA, faixa * 0.5);
  const escalaY = (v: number) => areaAltura - (v / topoEscala) * areaAltura;
  const marcas = Array.from(
    { length: Math.round(topoEscala / passo) + 1 },
    (_, k) => k * passo
  );

  const mesAtivo = ativo !== null ? meses[ativo] : null;
  // A caixa fica ao lado da coluna (à direita; à esquerda perto da borda).
  const centroColuna =
    ativo !== null ? MARGEM.esquerda + faixa * ativo + faixa / 2 : 0;
  const cabeADireita =
    centroColuna + larguraColuna / 2 + 12 + LARGURA_TOOLTIP <= largura;
  const xTooltip = cabeADireita
    ? centroColuna + larguraColuna / 2 + 12
    : centroColuna - larguraColuna / 2 - 12 - LARGURA_TOOLTIP;

  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Faturamento por mês de check-in
          </h2>
          <p className="text-xs text-slate-500">
            Reservas confirmadas, de {meses[0].rotuloCompleto} a{' '}
            {meses[meses.length - 1].rotuloCompleto}
          </p>
        </div>
        <ul className="flex items-center gap-4 text-xs text-slate-600" aria-label="Legenda">
          <li className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_RECEBIDO }} />
            Recebido
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_A_RECEBER }} />
            A receber
          </li>
        </ul>
      </div>

      <div className="px-2 sm:px-4">
      <div
        ref={containerRef}
        className={`relative transition-opacity ${carregando ? 'opacity-40' : ''}`}
        onPointerLeave={() => setAtivo(null)}
      >
        <svg
          width={largura}
          height={ALTURA}
          className="block max-w-full"
          role="img"
          aria-label={`Gráfico de colunas: valor recebido e a receber por mês de check-in, ${meses[0].rotuloCompleto} a ${meses[meses.length - 1].rotuloCompleto}.`}
        >
          <g transform={`translate(${MARGEM.esquerda},${MARGEM.topo})`}>
            {marcas.map((v) => (
              <g key={v} transform={`translate(0,${escalaY(v)})`}>
                <line x1={0} x2={areaLargura} stroke={COR_GRADE} strokeWidth={1} />
                <text
                  x={-8}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-slate-500 tabular-nums"
                  fontSize={11}
                >
                  {formatarEixo(v)}
                </text>
              </g>
            ))}

            {meses.map((m, i) => {
              const x = faixa * i + (faixa - larguraColuna) / 2;
              const hRecebido = (m.recebido / topoEscala) * areaAltura;
              const hReceber = (m.aReceber / topoEscala) * areaAltura;
              const temReceber = hReceber > 0;
              const temRecebido = hRecebido > 0;
              const yRecebido = areaAltura - hRecebido;
              const yReceber = yRecebido - (temRecebido && temReceber ? ESPACO : 0) - hReceber;
              const destacado = ativo === i;

              return (
                <g key={m.chave} opacity={ativo !== null && !destacado ? 0.55 : 1}>
                  {temRecebido &&
                    (temReceber ? (
                      <rect x={x} y={yRecebido} width={larguraColuna} height={hRecebido} fill={COR_RECEBIDO} />
                    ) : (
                      <path d={caminhoTopoArredondado(x, yRecebido, larguraColuna, hRecebido)} fill={COR_RECEBIDO} />
                    ))}
                  {temReceber && (
                    <path d={caminhoTopoArredondado(x, yReceber, larguraColuna, hReceber)} fill={COR_A_RECEBER} />
                  )}

                  {i === indiceMaior && ativo === null && (
                    <text
                      x={x + larguraColuna / 2}
                      y={(temReceber ? yReceber : yRecebido) - 6}
                      textAnchor="middle"
                      className="fill-slate-700 font-semibold"
                      fontSize={11}
                    >
                      {formatarEixo(m.recebido + m.aReceber)}
                    </text>
                  )}

                  <text
                    x={faixa * i + faixa / 2}
                    y={areaAltura + 18}
                    textAnchor="middle"
                    className={destacado ? 'fill-slate-900 font-medium' : 'fill-slate-500'}
                    fontSize={11}
                  >
                    {m.rotulo}
                  </text>

                  {/* Área de toque: a faixa inteira do mês, maior que a coluna. */}
                  <rect
                    x={faixa * i}
                    y={0}
                    width={faixa}
                    height={areaAltura}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${m.rotuloCompleto}: total ${formatarMoedaBRL(m.recebido + m.aReceber)}, recebido ${formatarMoedaBRL(m.recebido)}, a receber ${formatarMoedaBRL(m.aReceber)}`}
                    onPointerEnter={() => setAtivo(i)}
                    onPointerMove={() => setAtivo(i)}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo(null)}
                    style={{ outline: 'none', cursor: 'default' }}
                  />
                </g>
              );
            })}

            <line x1={0} x2={areaLargura} y1={areaAltura} y2={areaAltura} stroke="#cbd5e1" strokeWidth={1} />
          </g>
        </svg>

        {semDados && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-500 bg-white/90 px-3 py-1.5 rounded">
              Nenhuma reserva confirmada com check-in nesse período.
            </p>
          </div>
        )}

        {mesAtivo && (
          <div
            className="absolute top-2 z-10 pointer-events-none rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm text-xs"
            style={{ width: LARGURA_TOOLTIP, left: Math.max(0, xTooltip) }}
          >
            <p className="text-slate-500">{primeiraMaiuscula(mesAtivo.rotuloCompleto)}</p>
            <p className="text-sm font-semibold text-slate-900">
              {formatarMoedaBRL(mesAtivo.recebido + mesAtivo.aReceber)}
            </p>
            <div className="mt-1.5 space-y-1">
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-0.5 rounded" style={{ background: COR_RECEBIDO }} />
                  Recebido
                </span>
                <span className="tabular-nums font-medium text-slate-800">
                  {formatarMoedaBRL(mesAtivo.recebido)}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="w-2.5 h-0.5 rounded" style={{ background: COR_A_RECEBER }} />
                  A receber
                </span>
                <span className="tabular-nums font-medium text-slate-800">
                  {formatarMoedaBRL(mesAtivo.aReceber)}
                </span>
              </p>
            </div>
            <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-slate-500">
              {mesAtivo.quantidade} {mesAtivo.quantidade === 1 ? 'reserva' : 'reservas'}
            </p>
          </div>
        )}
      </div>
      </div>

      <details className="px-4 sm:px-6 pb-4 pt-1 group">
        <summary className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer select-none w-fit">
          Ver em tabela
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Mês</th>
                <th className="py-2 px-4 font-medium text-right">Reservas</th>
                <th className="py-2 px-4 font-medium text-right">Recebido</th>
                <th className="py-2 px-4 font-medium text-right">A receber</th>
                <th className="py-2 pl-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {meses.map((m) => (
                <tr key={m.chave}>
                  <td className="py-2 pr-4">{primeiraMaiuscula(m.rotuloCompleto)}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{m.quantidade}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatarMoedaBRL(m.recebido)}</td>
                  <td className="py-2 px-4 text-right tabular-nums">{formatarMoedaBRL(m.aReceber)}</td>
                  <td className="py-2 pl-4 text-right tabular-nums font-medium text-slate-900">
                    {formatarMoedaBRL(m.recebido + m.aReceber)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
};
