/**
 * Tela 2: Dashboard com resumo operacional, indicadores financeiros e reservas recentes.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Reserva } from '../types/reserva';
import {
  formatarDataBR,
  formatarMoedaBRL,
  obterCodigoCurtoReserva,
} from '../utils/formatters';
import { ReservaCard } from '../components/ReservaCard';

export const DashboardPage: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        setCarregando(true);
        const dados = await apiService.listarReservas();
        if (ativo) {
          setReservas(dados);
          setErro(null);
        }
      } catch (err) {
        if (ativo) {
          setErro(
            err instanceof Error
              ? err.message
              : 'Falha ao carregar o painel de reservas.'
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const resumo = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.status === 'confirmada');
    const canceladas = reservas.filter((r) => r.status === 'cancelada');

    const totalHospedagem = confirmadas.reduce(
      (acc, r) => acc + Number(r.valor_total_hospedagem || 0),
      0
    );
    const totalPago = confirmadas.reduce(
      (acc, r) => acc + Number(r.valor_total_pago || 0),
      0
    );
    const totalReceber = confirmadas.reduce(
      (acc, r) => acc + Number(r.valor_total_receber || 0),
      0
    );
    const totalHospedes = confirmadas.reduce(
      (acc, r) => acc + Number(r.quantidade_pessoas || 0),
      0
    );

    return {
      qtdConfirmadas: confirmadas.length,
      qtdCanceladas: canceladas.length,
      totalHospedagem,
      totalPago,
      totalReceber,
      totalHospedes,
    };
  }, [reservas]);

  const reservasRecentes = useMemo(() => reservas.slice(0, 5), [reservas]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            Visão Consolidada da Recepção
            <span className="hidden sm:inline"> · Pousada Pinho Verde</span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
            Resumo Operacional e Reservas
          </h1>
        </div>
        {/* Em telas menores estas ações ficam na barra de navegação inferior */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/reservas"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar Reserva</span>
          </Link>
          <Link
            to="/reservas/nova"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Reserva</span>
          </Link>
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {erro}
        </div>
      )}

      {/* Grade de Indicadores (Números Tabulares, Elevação Única) */}
      <section aria-label="Indicadores Financeiros e de Ocupação">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Reservas Confirmadas
            </p>
            <p className="font-mono tabular-nums text-base sm:text-2xl font-semibold text-slate-900 break-words">
              {carregando ? '—' : resumo.qtdConfirmadas}
            </p>
            <p className="text-xs text-slate-500">
              {resumo.totalHospedes} hóspedes previstos · {resumo.qtdCanceladas}{' '}
              cancelada(s)
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Total em Hospedagens Ativas
            </p>
            <p className="font-mono tabular-nums text-base sm:text-2xl font-semibold text-slate-900 break-words">
              {carregando ? '—' : formatarMoedaBRL(resumo.totalHospedagem)}
            </p>
            <p className="hidden sm:block text-xs text-slate-500">
              Soma bruta das reservas confirmadas
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Total Já Recebido (Sinais/Quitados)
            </p>
            <p className="font-mono tabular-nums text-base sm:text-2xl font-semibold text-emerald-800 break-words">
              {carregando ? '—' : formatarMoedaBRL(resumo.totalPago)}
            </p>
            <p className="hidden sm:block text-xs text-slate-500">
              Política padrão: 50% no ato da reserva
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-500">
              Saldo Pendente no Check-in
            </p>
            <p className="font-mono tabular-nums text-base sm:text-2xl font-semibold text-amber-700 break-words">
              {carregando ? '—' : formatarMoedaBRL(resumo.totalReceber)}
            </p>
            <p className="hidden sm:block text-xs text-slate-500">
              Calculado automaticamente pelo sistema
            </p>
          </div>
        </div>
      </section>

      {/* Tabela de Reservas Recentes */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Reservas Recentes
            </h2>
            <p className="hidden sm:block text-xs text-slate-500">
              Últimos registros cadastrados pela recepção da pousada
            </p>
          </div>
          <Link
            to="/reservas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 whitespace-nowrap"
          >
            <span>Ver todas ({reservas.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {carregando ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : reservasRecentes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              Nenhuma reserva cadastrada até o momento.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cadastre a primeira reserva de chalé para calcular o saldo automaticamente e emitir o voucher oficial.
            </p>
            <Link
              to="/reservas/nova"
              className="inline-flex items-center gap-2 px-4 py-3 sm:py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeira Reserva</span>
            </Link>
          </div>
        ) : (
          <>
          {/* Cartões em celular e tablet */}
          <div className="lg:hidden p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/60">
            {reservasRecentes.map((r) => (
              <ReservaCard key={r.id} reserva={r} />
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Código · Hóspede</th>
                  <th className="py-3 px-4">Chalé · Pessoas</th>
                  <th className="py-3 px-4">Check-in / Check-out</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-right">Saldo a Receber</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-sm">
                {reservasRecentes.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-900">
                        {r.nome_completo}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {obterCodigoCurtoReserva(r.id)} · CPF {r.cpf}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{r.numero_chale}</div>
                      <div className="text-xs text-slate-500">
                        {r.quantidade_pessoas}{' '}
                        {r.quantidade_pessoas === 1 ? 'hóspede' : 'hóspedes'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatarDataBR(r.data_checkin)} →{' '}
                      {formatarDataBR(r.data_checkout)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {formatarMoedaBRL(r.valor_total_hospedagem)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatarMoedaBRL(r.valor_total_receber)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.status === 'confirmada' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Confirmada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Cancelada</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-3">
                        <Link
                          to={`/reservas/${r.id}`}
                          className="text-xs font-medium text-slate-700 hover:text-slate-900 underline-offset-4 hover:underline"
                        >
                          Detalhes
                        </Link>
                        <Link
                          to={`/reservas/${r.id}/voucher`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Voucher</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
};
