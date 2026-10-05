import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, FileText, XCircle } from 'lucide-react';
import { Reserva } from '../types/reserva';
import {
  formatarDataBR,
  formatarMoedaBRL,
  obterCodigoCurtoReserva,
} from '../utils/formatters';

interface ReservaCardProps {
  reserva: Reserva;
  onCancelar?: (reserva: Reserva) => void;
}

export const ReservaCard: React.FC<ReservaCardProps> = ({
  reserva,
  onCancelar,
}) => {
  const podeCancelar = Boolean(onCancelar) && reserva.status === 'confirmada';

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 break-words">
            {reserva.nome_completo}
          </h3>
          <p className="font-mono tabular-nums text-xs text-slate-500">
            {obterCodigoCurtoReserva(reserva.id)}
          </p>
        </div>
        {reserva.status === 'confirmada' ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Confirmada</span>
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-xs font-medium text-red-700">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Cancelada</span>
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-slate-500">Chalé</dt>
          <dd className="text-slate-800">
            {reserva.numero_chale} · {reserva.quantidade_pessoas}{' '}
            {reserva.quantidade_pessoas === 1 ? 'pessoa' : 'pessoas'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Check-in</dt>
          <dd className="font-mono tabular-nums text-slate-800">
            {formatarDataBR(reserva.data_checkin)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Check-out</dt>
          <dd className="font-mono tabular-nums text-slate-800">
            {formatarDataBR(reserva.data_checkout)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total · Pago</dt>
          <dd className="font-mono tabular-nums text-slate-800">
            {formatarMoedaBRL(reserva.valor_total_hospedagem)}
          </dd>
          <dd className="font-mono tabular-nums text-xs text-emerald-700">
            Pago: {formatarMoedaBRL(reserva.valor_total_pago)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Saldo a receber</dt>
          <dd className="font-mono tabular-nums text-base font-semibold text-slate-900">
            {formatarMoedaBRL(reserva.valor_total_receber)}
          </dd>
        </div>
      </dl>

      <div className="flex items-stretch gap-2 pt-1">
        <Link
          to={`/reservas/${reserva.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-slate-700 bg-slate-100 active:bg-slate-200 rounded-lg"
        >
          <Eye className="w-4 h-4" />
          <span>Detalhes</span>
        </Link>
        <Link
          to={`/reservas/${reserva.id}/voucher`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 text-sm font-semibold text-emerald-800 bg-emerald-50 active:bg-emerald-100 rounded-lg"
        >
          <FileText className="w-4 h-4" />
          <span>Voucher</span>
        </Link>
        {podeCancelar && (
          <button
            type="button"
            onClick={() => onCancelar?.(reserva)}
            className="inline-flex items-center justify-center h-11 px-3 text-sm font-medium text-red-700 active:bg-red-50 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>
    </article>
  );
};
