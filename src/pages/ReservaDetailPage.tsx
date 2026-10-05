import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  Ban,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { apiService, ApiClientError } from '../services/api';
import { Reserva } from '../types/reserva';
import {
  calcularQuantidadeDiarias,
  extrairDigitos,
  formatarDataBR,
  formatarDataHoraBR,
  formatarMoedaBRL,
  obterCodigoCurtoReserva,
} from '../utils/formatters';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import { AccessDeniedOrNotFoundPage } from './AccessDeniedOrNotFoundPage';

export const ReservaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [naoEncontrado, setNaoEncontrado] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalCancelarAberto, setModalCancelarAberto] =
    useState<boolean>(false);
  const [cancelando, setCancelando] = useState<boolean>(false);
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let ativo = true;

    async function buscarDetalhes(reservaId: string) {
      try {
        setCarregando(true);
        const dados = await apiService.obterReservaPorId(reservaId);
        if (ativo) {
          setReserva(dados);
          setNaoEncontrado(false);
        }
      } catch (err) {
        if (!ativo) return;
        if (err instanceof ApiClientError && err.status === 404) {
          setNaoEncontrado(true);
        } else {
          setErro(
            err instanceof Error
              ? err.message
              : 'Erro ao carregar detalhes da reserva.'
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    buscarDetalhes(id);
    return () => {
      ativo = false;
    };
  }, [id]);

  const handleConfirmarCancelamento = async () => {
    if (!reserva) return;
    try {
      setCancelando(true);
      const atualizada = await apiService.cancelarReserva(reserva.id);
      setReserva(atualizada);
      setModalCancelarAberto(false);
      setAvisoSucesso(
        'Reserva cancelada com sucesso. O registro foi mantido no histórico para fins de auditoria.'
      );
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : 'Falha ao cancelar a reserva.'
      );
    } finally {
      setCancelando(false);
    }
  };

  if (carregando) {
    return (
      <div className="p-12 text-center space-y-2">
        <div className="w-7 h-7 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-600">Carregando reserva...</p>
      </div>
    );
  }

  if (naoEncontrado || !reserva) {
    return <AccessDeniedOrNotFoundPage tipo="nao_encontrado" />;
  }

  const diarias = calcularQuantidadeDiarias(
    reserva.data_checkin,
    reserva.data_checkout
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="space-y-1.5">
          <Link
            to="/reservas"
            className="inline-flex items-center gap-1.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a lista de reservas</span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 break-words min-w-0">
              {reserva.nome_completo}
            </h1>
            <span className="hidden sm:inline text-slate-400" aria-hidden="true">
              ·
            </span>
            {reserva.status === 'confirmada' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reserva Confirmada</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Reserva Cancelada</span>
              </span>
            )}
          </div>
          <p className="font-mono tabular-nums text-xs text-slate-500">
            Código: {obterCodigoCurtoReserva(reserva.id)}
            <span className="hidden sm:inline">
              {' '}
              · ID UUID: {reserva.id}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5">
          <Link
            to={`/reservas/${reserva.id}/voucher`}
            className="col-span-2 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar / Imprimir Voucher</span>
          </Link>

          {reserva.status === 'confirmada' && (
            <>
              <Link
                to={`/reservas/${reserva.id}/editar`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Link>
              <button
                type="button"
                onClick={() => setModalCancelarAberto(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 sm:py-2 text-sm sm:text-xs font-medium text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancelar Reserva</span>
              </button>
            </>
          )}
        </div>
      </div>

      {avisoSucesso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
          {avisoSucesso}
        </div>
      )}

      {erro && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500">Valor Total da Hospedagem</p>
          <p className="font-mono tabular-nums text-base sm:text-xl font-semibold text-slate-900">
            {formatarMoedaBRL(reserva.valor_total_hospedagem)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500">Valor Total Pago</p>
          <p className="font-mono tabular-nums text-base sm:text-xl font-semibold text-emerald-800">
            {formatarMoedaBRL(reserva.valor_total_pago)}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 space-y-1 min-w-0">
          <p className="text-xs text-slate-500">
            Saldo a Receber no Check-in (Automático)
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-amber-700">
            {formatarMoedaBRL(reserva.valor_total_receber)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500">
              Dados do Hóspede Titular
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Nome Completo</dt>
                <dd className="font-medium text-slate-900">
                  {reserva.nome_completo}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">CPF</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  {reserva.cpf}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">WhatsApp</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  <a
                    href={`https://wa.me/55${extrairDigitos(reserva.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 py-1 text-emerald-800 underline underline-offset-4"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{reserva.whatsapp}</span>
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Endereço Completo</dt>
                <dd className="text-slate-800">{reserva.endereco}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500">
              Dados da Acomodação e Estadia
            </h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Chalé</dt>
                <dd className="font-semibold text-slate-900">
                  {reserva.numero_chale}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Quantidade de Pessoas</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  {reserva.quantidade_pessoas}{' '}
                  {reserva.quantidade_pessoas === 1 ? 'hóspede' : 'hóspedes'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  Período ({diarias} {diarias === 1 ? 'diária' : 'diárias'})
                </dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  <span className="block sm:inline">
                    Check-in: {formatarDataBR(reserva.data_checkin)} (às 15h)
                  </span>
                  <span className="hidden sm:inline"> · </span>
                  <span className="block sm:inline">
                    Check-out: {formatarDataBR(reserva.data_checkout)} (às 12h)
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Observações / Descrição</dt>
                <dd className="text-slate-700">
                  {reserva.descricao || 'Nenhuma observação adicional registrada.'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 bg-slate-50/60 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono tabular-nums">
          <span>Criado em: {formatarDataHoraBR(reserva.created_at)}</span>
          <span>Última atualização: {formatarDataHoraBR(reserva.updated_at)}</span>
        </div>
      </div>

      <ConfirmCancelModal
        aberto={modalCancelarAberto}
        nomeHospede={reserva.nome_completo}
        numeroChale={reserva.numero_chale}
        carregando={cancelando}
        onConfirmar={handleConfirmarCancelamento}
        onFechar={() => setModalCancelarAberto(false)}
      />
    </div>
  );
};
