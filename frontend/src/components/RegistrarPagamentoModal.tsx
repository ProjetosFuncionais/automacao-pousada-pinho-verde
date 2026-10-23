import React, { useEffect, useState } from 'react';
import { Banknote, X } from 'lucide-react';
import { formatarInputMoeda, formatarMoedaBRL } from '../utils/formatters';

interface RegistrarPagamentoModalProps {
  aberto: boolean;
  saldo: number;
  carregando: boolean;
  erro: string | null;
  onConfirmar: (valor: number) => void;
  onFechar: () => void;
}

export const RegistrarPagamentoModal: React.FC<RegistrarPagamentoModalProps> = ({
  aberto,
  saldo,
  carregando,
  erro,
  onConfirmar,
  onFechar,
}) => {
  const [texto, setTexto] = useState(formatarMoedaBRL(saldo));
  const [valor, setValor] = useState(saldo);

  // Toda vez que abre, já sugere o saldo inteiro (o caso mais comum no check-in).
  useEffect(() => {
    if (aberto) {
      setTexto(formatarMoedaBRL(saldo));
      setValor(saldo);
    }
  }, [aberto, saldo]);

  if (!aberto) return null;

  const valorInvalido = valor <= 0 || valor > saldo;
  const restante = Math.max(0, Number((saldo - valor).toFixed(2)));

  return (
    <div
      className="fixed inset-0 z-50 m-0 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pagamento-titulo"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valorInvalido) onConfirmar(valor);
        }}
        className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl sm:max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-pagamento-titulo" className="text-base font-semibold text-slate-900">
                Registrar pagamento
              </h3>
              <p className="text-xs text-slate-500">
                Saldo a receber: {formatarMoedaBRL(saldo)}
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="valor_pagamento" className="text-xs font-semibold text-slate-700">
              Valor recebido agora
            </label>
            <button
              type="button"
              onClick={() => {
                setTexto(formatarMoedaBRL(saldo));
                setValor(saldo);
              }}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              Saldo inteiro
            </button>
          </div>
          <input
            id="valor_pagamento"
            type="text"
            inputMode="numeric"
            autoFocus
            value={texto}
            onChange={(e) => {
              const { textoFormatado, valorNumerico } = formatarInputMoeda(e.target.value);
              setTexto(textoFormatado);
              setValor(valorNumerico);
            }}
            className="w-full px-3.5 py-2.5 text-base tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
          />
          {valor > saldo ? (
            <p className="text-xs text-red-600">O valor passa do saldo a receber.</p>
          ) : (
            <p className="text-xs text-slate-500">
              {restante === 0
                ? 'A reserva fica quitada.'
                : `Depois disso, ainda faltam ${formatarMoedaBRL(restante)}.`}
            </p>
          )}
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
            disabled={carregando}
            className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={carregando || valorInvalido}
            className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {carregando ? 'Registrando...' : `Registrar ${formatarMoedaBRL(valor)}`}
          </button>
        </div>
      </form>
    </div>
  );
};
