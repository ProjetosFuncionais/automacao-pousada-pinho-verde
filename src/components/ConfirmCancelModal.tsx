/**
 * Modal de confirmação para cancelamento de reserva.
 * Deixa explícito que o cancelamento mantém o registro histórico para auditoria.
 */
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmCancelModalProps {
  aberto: boolean;
  nomeHospede: string;
  numeroChale: string;
  carregando: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}

export const ConfirmCancelModal: React.FC<ConfirmCancelModalProps> = ({
  aberto,
  nomeHospede,
  numeroChale,
  carregando,
  onConfirmar,
  onFechar,
}) => {
  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cancelar-titulo"
    >
      <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl sm:max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="modal-cancelar-titulo"
                className="text-base font-semibold text-slate-900"
              >
                Confirmar cancelamento da reserva
              </h3>
              <p className="text-xs text-slate-500">
                O registro será mantido no histórico como cancelado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="text-slate-400 hover:text-slate-600 p-2 -m-1 cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200/80">
          <p>
            Você está prestes a cancelar a reserva de{' '}
            <strong className="text-slate-900">{nomeHospede}</strong> referente ao{' '}
            <strong className="text-slate-900">{numeroChale}</strong>.
          </p>
          <p className="text-xs text-slate-500">
            Lembrete da política: reembolso integral apenas para solicitações feitas
            até 14 dias antes da data de check-in.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onFechar}
            disabled={carregando}
            className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            Voltar sem cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={carregando}
            className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            {carregando ? 'Cancelando reserva...' : 'Confirmar Cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
};
