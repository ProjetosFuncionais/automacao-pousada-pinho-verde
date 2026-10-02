/**
 * Tela 3: Lista de Reservas com busca por nome, CPF, telefone, chalé ou código,
 * filtro por status, visualização de detalhes, emissão de voucher e cancelamento.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  CheckCircle2,
  Eye,
  FileText,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import { Reserva, StatusReserva } from '../types/reserva';
import {
  formatarDataBR,
  formatarMoedaBRL,
  obterCodigoCurtoReserva,
} from '../utils/formatters';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';

export const ReservasListPage: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [busca, setBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<StatusReserva | 'todas'>('todas');
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const [reservaParaCancelar, setReservaParaCancelar] = useState<Reserva | null>(
    null
  );
  const [cancelando, setCancelando] = useState<boolean>(false);

  const carregarReservas = useCallback(async () => {
    try {
      setCarregando(true);
      const lista = await apiService.listarReservas({
        busca,
        status: statusFiltro,
      });
      setReservas(lista);
      setErro(null);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a lista de reservas.'
      );
    } finally {
      setCarregando(false);
    }
  }, [busca, statusFiltro]);

  useEffect(() => {
    carregarReservas();
  }, [carregarReservas]);

  const handleConfirmarCancelamento = async () => {
    if (!reservaParaCancelar) return;
    try {
      setCancelando(true);
      await apiService.cancelarReserva(reservaParaCancelar.id);
      setMensagemSucesso(
        `A reserva de ${reservaParaCancelar.nome_completo} foi marcada como cancelada e preservada no histórico.`
      );
      setReservaParaCancelar(null);
      await carregarReservas();
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Erro ao cancelar a reserva selecionada.'
      );
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            Consulta e Histórico Completo · Pousada Pinho Verde
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">
            Lista de Reservas
          </h1>
        </div>
        <Link
          to="/reservas/nova"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>Nova Reserva</span>
        </Link>
      </div>

      {/* Mensagens de feedback */}
      {mensagemSucesso && (
        <div
          role="status"
          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium"
        >
          <span>{mensagemSucesso}</span>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          {erro}
        </div>
      )}

      {/* Barra de Busca e Filtro de Status (Segmented Control Interativo) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome do hóspede, CPF, WhatsApp, chalé ou código (ex: PPV-9B1DEB4D)..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50/70 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controle Segmentado de Status */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {(
            [
              { valor: 'todas', rotulo: 'Todas' },
              { valor: 'confirmada', rotulo: 'Confirmadas' },
              { valor: 'cancelada', rotulo: 'Canceladas' },
            ] as const
          ).map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setStatusFiltro(item.valor)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                statusFiltro === item.valor
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {carregando ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-11 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : reservas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800">
              Nenhuma reserva encontrada para os filtros informados.
            </p>
            <p className="text-xs text-slate-500">
              Tente limpar o termo de busca ou cadastre uma nova reserva.
            </p>
            {busca || statusFiltro !== 'todas' ? (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setStatusFiltro('todas');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">Código</th>
                  <th className="py-3 px-4">Hóspede · CPF · WhatsApp</th>
                  <th className="py-3 px-4">Chalé · Ocupação</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4 text-right">Total / Pago</th>
                  <th className="py-3 px-4 text-right">Saldo a Receber</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-sm">
                {reservas.map((reserva) => (
                  <tr
                    key={reserva.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono tabular-nums text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {obterCodigoCurtoReserva(reserva.id)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {reserva.nome_completo}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {reserva.cpf} · {reserva.whatsapp}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800">{reserva.numero_chale}</div>
                      <div className="text-xs text-slate-500">
                        {reserva.quantidade_pessoas}{' '}
                        {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      <div>In: {formatarDataBR(reserva.data_checkin)}</div>
                      <div className="text-slate-500">
                        Out: {formatarDataBR(reserva.data_checkout)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="text-slate-900">
                        {formatarMoedaBRL(reserva.valor_total_hospedagem)}
                      </div>
                      <div className="text-xs text-emerald-700">
                        Pago: {formatarMoedaBRL(reserva.valor_total_pago)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatarMoedaBRL(reserva.valor_total_receber)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {reserva.status === 'confirmada' ? (
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
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2.5">
                        <Link
                          to={`/reservas/${reserva.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          title="Ver detalhes completos"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalhes</span>
                        </Link>
                        <Link
                          to={`/reservas/${reserva.id}/voucher`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          title="Visualizar e imprimir voucher"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Voucher</span>
                        </Link>
                        {reserva.status === 'confirmada' && (
                          <button
                            type="button"
                            onClick={() => setReservaParaCancelar(reserva)}
                            className="px-2.5 py-1.5 text-xs font-medium text-red-700 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmCancelModal
        aberto={Boolean(reservaParaCancelar)}
        nomeHospede={reservaParaCancelar?.nome_completo || ''}
        numeroChale={reservaParaCancelar?.numero_chale || ''}
        carregando={cancelando}
        onConfirmar={handleConfirmarCancelamento}
        onFechar={() => setReservaParaCancelar(null)}
      />
    </div>
  );
};
