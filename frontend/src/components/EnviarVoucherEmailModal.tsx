import React, { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { ApiClientError, apiService } from '../services/api';

interface EnviarVoucherEmailModalProps {
  aberto: boolean;
  reservaId: string;
  nomeHospede: string;
  emailSalvo: string | null;
  onEnviado: (email: string, mensagem: string) => void;
  onFechar: () => void;
}

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const EnviarVoucherEmailModal: React.FC<EnviarVoucherEmailModalProps> = ({
  aberto,
  reservaId,
  nomeHospede,
  emailSalvo,
  onEnviado,
  onFechar,
}) => {
  const [email, setEmail] = useState(emailSalvo || '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setEmail(emailSalvo || '');
      setErro(null);
    }
  }, [aberto, emailSalvo]);

  if (!aberto) return null;

  const emailLimpo = email.trim();
  const valido = EMAIL_VALIDO.test(emailLimpo);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) {
      setErro('Informe um e-mail válido (ex: nome@gmail.com).');
      return;
    }
    try {
      setEnviando(true);
      setErro(null);
      const resultado = await apiService.enviarVoucherPorEmail(reservaId, emailLimpo);
      onEnviado(resultado.email, resultado.mensagem);
    } catch (err) {
      if (err instanceof ApiClientError && err.campos.email) {
        setErro(err.campos.email);
      } else {
        setErro(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 m-0 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-email-titulo"
    >
      <form
        onSubmit={enviar}
        noValidate
        className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl sm:max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-email-titulo" className="text-base font-semibold text-slate-900">
                Enviar voucher por e-mail
              </h3>
              <p className="text-xs text-slate-500">Para {nomeHospede}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            className="text-slate-400 hover:text-slate-600 p-2 -m-1 cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email_voucher" className="block text-xs font-semibold text-slate-700">
            E-mail do hóspede
          </label>
          <input
            id="email_voucher"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            autoFocus
            placeholder="nome@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
          />
          <p className="text-xs text-slate-500">
            O e-mail fica salvo na reserva para os próximos envios.
          </p>
        </div>

        {erro && (
          <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {erro}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onFechar}
            disabled={enviando}
            className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
          >
            <Mail className="w-4 h-4" />
            {enviando ? 'Enviando...' : 'Enviar voucher'}
          </button>
        </div>
      </form>
    </div>
  );
};
