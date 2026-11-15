import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';
import { Reserva } from '../types/reserva';
import { formatarDataBR, formatarMoedaBRL, hojeLocalIso } from '../utils/formatters';
import { LISTA_CHALES, numeroDoChale } from '../utils/chales';

const LARGURA_COLUNA_NOME = 112;
const ALTURA_LINHA = 44;
const ALTURA_BARRA = 30;
// Largura mínima de cada dia; se sobrar espaço na tela, as colunas esticam.
const PERIODOS = [
  { dias: 14, largura: 56, rotulo: '2 semanas' },
  { dias: 31, largura: 40, rotulo: '1 mês' },
] as const;

// Mesmas cores do gráfico do painel (validadas para daltonismo).
const COR_QUITADA = '#047857';
const COR_COM_SALDO = '#d97706';

const formatoDiaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function diferencaDias(de: string, ate: string): number {
  return Math.round(
    (new Date(`${ate}T12:00:00`).getTime() - new Date(`${de}T12:00:00`).getTime()) / 86400000
  );
}

function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface BarraReserva {
  reserva: Reserva;
  inicio: number; // em dias, a partir do primeiro dia visível (pode ter meio dia)
  duracao: number;
  faixa: number; // linha interna, quando duas reservas se sobrepõem no mesmo chalé
  cortadaInicio: boolean;
  cortadaFim: boolean;
}

interface LinhaMapa {
  chave: string;
  rotulo: string;
  barras: BarraReserva[];
  faixas: number;
}

export const MapaReservasPage: React.FC = () => {
  const navigate = useNavigate();
  const hoje = hojeLocalIso();
  const [inicio, setInicio] = useState(() => somarDias(hoje, -2));
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const { dias: totalDias, largura: larguraMinimaDia } = PERIODOS[periodoIdx];
  const areaRef = useRef<HTMLDivElement>(null);
  const [larguraArea, setLarguraArea] = useState(0);

  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([e]) => setLarguraArea(e.contentRect.width));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const larguraDia = Math.max(
    larguraMinimaDia,
    Math.floor((larguraArea - LARGURA_COLUNA_NOME) / totalDias)
  );
  const fim = somarDias(inicio, totalDias); // primeiro dia fora da tela

  useEffect(() => {
    let ativo = true;
    apiService
      .listarReservas({ status: 'confirmada' })
      .then((dados) => {
        if (ativo) {
          setReservas(dados);
          setErro(null);
        }
      })
      .catch((err) => {
        if (ativo) setErro(err instanceof Error ? err.message : 'Não foi possível carregar o mapa.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const dias = useMemo(
    () => Array.from({ length: totalDias }, (_, i) => somarDias(inicio, i)),
    [inicio, totalDias]
  );

  const linhas = useMemo<LinhaMapa[]>(() => {
    const porChale = new Map<string, Reserva[]>();
    const semChale: Reserva[] = [];
    for (const r of reservas) {
      // Só as que aparecem no período visível.
      if (r.data_checkout <= inicio || r.data_checkin >= fim) continue;
      const numero = numeroDoChale(r.numero_chale);
      if (numero === null) {
        semChale.push(r);
      } else {
        const chave = String(numero);
        porChale.set(chave, [...(porChale.get(chave) || []), r]);
      }
    }

    const montarBarras = (lista: Reserva[]): { barras: BarraReserva[]; faixas: number } => {
      const ordenadas = [...lista].sort((a, b) => a.data_checkin.localeCompare(b.data_checkin));
      const fimDaFaixa: string[] = [];
      const barras = ordenadas.map((r) => {
        let faixa = fimDaFaixa.findIndex((f) => f <= r.data_checkin);
        if (faixa === -1) faixa = fimDaFaixa.length;
        fimDaFaixa[faixa] = r.data_checkout;
        // A estadia vai da tarde do check-in até a manhã do check-out:
        // a barra começa no meio do dia de entrada e termina no meio do dia de saída.
        const inicioBruto = diferencaDias(inicio, r.data_checkin) + 0.5;
        const fimBruto = diferencaDias(inicio, r.data_checkout) + 0.5;
        const ini = Math.max(0, inicioBruto);
        const fimVisivel = Math.min(totalDias, fimBruto);
        return {
          reserva: r,
          inicio: ini,
          duracao: Math.max(0.5, fimVisivel - ini),
          faixa,
          cortadaInicio: inicioBruto < 0,
          cortadaFim: fimBruto > totalDias,
        };
      });
      return { barras, faixas: Math.max(1, fimDaFaixa.length) };
    };

    const resultado: LinhaMapa[] = LISTA_CHALES.map((rotulo, i) => ({
      chave: String(i + 1),
      rotulo,
      ...montarBarras(porChale.get(String(i + 1)) || []),
    }));
    if (semChale.length) {
      resultado.push({ chave: 'outros', rotulo: 'Outros', ...montarBarras(semChale) });
    }
    return resultado;
  }, [reservas, inicio, fim, totalDias]);

  const ocupadosHoje = useMemo(
    () =>
      new Set(
        reservas
          .filter((r) => r.data_checkin <= hoje && r.data_checkout > hoje)
          .map((r) => numeroDoChale(r.numero_chale))
          .filter((n) => n !== null)
      ).size,
    [reservas, hoje]
  );

  const meses = useMemo(() => {
    const grupos: { rotulo: string; dias: number }[] = [];
    for (const d of dias) {
      const rotulo = primeiraMaiuscula(formatoMes.format(new Date(`${d}T12:00:00`)));
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.rotulo === rotulo) ultimo.dias += 1;
      else grupos.push({ rotulo, dias: 1 });
    }
    return grupos;
  }, [dias]);

  const larguraGrade = totalDias * larguraDia;
  const indiceHoje = dias.indexOf(hoje);

  const novaReserva = (chale: string, data: string) => {
    const params = new URLSearchParams({ chale, checkin: data });
    navigate(`/reservas/nova?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            {carregando ? 'Carregando…' : `Hoje: ${ocupadosHoje} de ${LISTA_CHALES.length} chalés ocupados`}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">Mapa de reservas</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white">
            <button
              type="button"
              onClick={() => setInicio(somarDias(inicio, -7))}
              className="p-2.5 sm:p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setInicio(somarDias(hoje, -2))}
              className="px-3 py-2 text-xs font-medium text-slate-700 border-x border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setInicio(somarDias(inicio, 7))}
              className="p-2.5 sm:p-2 text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {PERIODOS.map((p, i) => (
              <button
                key={p.dias}
                type="button"
                onClick={() => setPeriodoIdx(i)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  periodoIdx === i ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="ir_para_data">Ir para a data</label>
          <input
            id="ir_para_data"
            type="date"
            value={inicio}
            onChange={(e) => e.target.value && setInicio(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white tabular-nums"
          />
        </div>
      </div>

      {erro && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {erro}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COR_QUITADA }} /> Quitada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COR_COM_SALDO }} /> Com saldo a receber
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-300" /> Hoje
        </span>
        <span className="text-slate-500">Clique num espaço vazio para criar uma reserva.</span>
      </div>

      <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-opacity ${carregando ? 'opacity-50' : ''}`}>
        <div ref={areaRef} className="overflow-x-auto">
          <div style={{ width: LARGURA_COLUNA_NOME + larguraGrade }} className="relative">
            {/* Cabeçalho: meses e dias */}
            <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
              <div
                className="sticky left-0 z-30 bg-white border-r border-slate-200 flex items-end px-3 pb-2 text-xs font-semibold text-slate-600"
                style={{ width: LARGURA_COLUNA_NOME, minWidth: LARGURA_COLUNA_NOME }}
              >
                Acomodação
              </div>
              <div style={{ width: larguraGrade }}>
                <div className="flex border-b border-slate-100">
                  {meses.map((m, i) => (
                    <div
                      key={`${m.rotulo}-${i}`}
                      className="px-2 py-1.5 text-xs font-medium text-slate-700 truncate border-r border-slate-100"
                      style={{ width: m.dias * larguraDia }}
                    >
                      {m.rotulo}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {dias.map((d) => {
                    const data = new Date(`${d}T12:00:00`);
                    const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
                    const eHoje = d === hoje;
                    return (
                      <div
                        key={d}
                        className={`text-center py-1.5 border-r border-slate-100 ${eHoje ? 'bg-emerald-50' : fimDeSemana ? 'bg-slate-50' : ''}`}
                        style={{ width: larguraDia }}
                      >
                        <div className="text-[10px] uppercase text-slate-500">
                          {formatoDiaSemana.format(data).replace('.', '').slice(0, 3)}
                        </div>
                        <div className={`text-xs tabular-nums ${eHoje ? 'font-bold text-emerald-800' : 'font-medium text-slate-800'}`}>
                          {data.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Linhas dos chalés */}
            {linhas.map((linha) => {
              const altura = Math.max(ALTURA_LINHA, linha.faixas * (ALTURA_BARRA + 6) + 8);
              return (
                <div key={linha.chave} className="flex border-b border-slate-100 last:border-b-0">
                  <div
                    className="sticky left-0 z-10 bg-white border-r border-slate-200 flex items-center px-3 text-sm font-medium text-slate-800"
                    style={{ width: LARGURA_COLUNA_NOME, minWidth: LARGURA_COLUNA_NOME, height: altura }}
                  >
                    {linha.rotulo}
                  </div>
                  <div className="relative" style={{ width: larguraGrade, height: altura }}>
                    {/* Células do dia: fundo e clique para nova reserva */}
                    <div className="absolute inset-0 flex">
                      {dias.map((d) => {
                        const diaSemana = new Date(`${d}T12:00:00`).getDay();
                        const fimDeSemana = diaSemana === 0 || diaSemana === 6;
                        const podeCriar = linha.chave !== 'outros';
                        return (
                          <button
                            key={d}
                            type="button"
                            tabIndex={-1}
                            disabled={!podeCriar}
                            onClick={() => podeCriar && novaReserva(linha.rotulo, d)}
                            title={podeCriar ? `Nova reserva: ${linha.rotulo}, entrada em ${formatarDataBR(d)}` : undefined}
                            className={`h-full border-r border-slate-100 ${
                              d === hoje ? 'bg-emerald-50/70' : fimDeSemana ? 'bg-slate-50/70' : ''
                            } ${podeCriar ? 'hover:bg-emerald-50 cursor-pointer' : 'cursor-default'}`}
                            style={{ width: larguraDia }}
                            aria-hidden="true"
                          />
                        );
                      })}
                    </div>

                    {/* Barras das reservas */}
                    {linha.barras.map(({ reserva: r, inicio: ini, duracao, faixa, cortadaInicio, cortadaFim }) => {
                      const quitada = r.valor_total_receber <= 0;
                      const titulo = `${r.nome_completo} · ${r.numero_chale} · ${formatarDataBR(r.data_checkin)} a ${formatarDataBR(r.data_checkout)} · ${
                        quitada ? 'quitada' : `falta ${formatarMoedaBRL(r.valor_total_receber)}`
                      }`;
                      return (
                        <Link
                          key={r.id}
                          to={`/reservas/${r.id}`}
                          title={titulo}
                          aria-label={titulo}
                          className="absolute z-[5] flex items-center px-2 text-xs font-medium text-white shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-900 overflow-hidden"
                          style={{
                            left: ini * larguraDia + 1,
                            width: duracao * larguraDia - 2,
                            top: 4 + faixa * (ALTURA_BARRA + 6) + (altura - linha.faixas * (ALTURA_BARRA + 6) - 2) / 2,
                            height: ALTURA_BARRA,
                            background: quitada ? COR_QUITADA : COR_COM_SALDO,
                            borderTopLeftRadius: cortadaInicio ? 0 : 6,
                            borderBottomLeftRadius: cortadaInicio ? 0 : 6,
                            borderTopRightRadius: cortadaFim ? 0 : 6,
                            borderBottomRightRadius: cortadaFim ? 0 : 6,
                          }}
                        >
                          <span className="truncate">{r.nome_completo}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Linha vertical marcando hoje */}
            {indiceHoje >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-emerald-600/60 pointer-events-none z-[4]"
                style={{ left: LARGURA_COLUNA_NOME + (indiceHoje + 0.5) * larguraDia }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          to="/reservas/nova"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg"
        >
          <CalendarPlus className="w-4 h-4" />
          Nova reserva
        </Link>
      </div>
    </div>
  );
};
