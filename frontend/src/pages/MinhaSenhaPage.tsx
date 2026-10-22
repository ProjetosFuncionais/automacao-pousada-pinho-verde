import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ApiClientError, apiService } from '../services/api';

const TAMANHO_MINIMO_SENHA = 8;

const campoClasse =
  'w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700';

export const MinhaSenhaPage: React.FC = () => {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSucesso(false);
    const locais: Record<string, string> = {};
    if (nova.length < TAMANHO_MINIMO_SENHA) locais.senha_nova = `Use pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
    if (nova !== confirmacao) locais.confirmacao = 'As senhas não são iguais.';
    setErros(locais);
    if (Object.keys(locais).length) return;

    try {
      setSalvando(true);
      await apiService.alterarMinhaSenha(atual, nova);
      setAtual('');
      setNova('');
      setConfirmacao('');
      setSucesso(true);
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.campos).length) {
        setErros(err.campos);
      } else {
        setErros({ geral: err instanceof Error ? err.message : 'Não foi possível trocar a senha.' });
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">Minha senha</h1>
        <p className="text-xs text-slate-500 mt-1">Troque a senha que você usa para entrar no sistema.</p>
      </div>

      {sucesso && (
        <div role="status" className="flex items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          Senha trocada. Use a nova no próximo login.
        </div>
      )}

      <form onSubmit={salvar} noValidate className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
        <div>
          <label htmlFor="senha_atual" className="block text-xs font-semibold text-slate-700 mb-1.5">Senha atual</label>
          <input id="senha_atual" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} className={campoClasse} />
          {erros.senha_atual && <p className="mt-1 text-xs text-red-600">{erros.senha_atual}</p>}
        </div>
        <div>
          <label htmlFor="senha_nova" className="block text-xs font-semibold text-slate-700 mb-1.5">Senha nova</label>
          <input id="senha_nova" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} className={campoClasse} />
          {erros.senha_nova ? (
            <p className="mt-1 text-xs text-red-600">{erros.senha_nova}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Mínimo de {TAMANHO_MINIMO_SENHA} caracteres.</p>
          )}
        </div>
        <div>
          <label htmlFor="senha_confirmacao" className="block text-xs font-semibold text-slate-700 mb-1.5">Repita a senha nova</label>
          <input id="senha_confirmacao" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campoClasse} />
          {erros.confirmacao && <p className="mt-1 text-xs text-red-600">{erros.confirmacao}</p>}
        </div>
        {erros.geral && <p role="alert" className="text-xs font-medium text-red-700">{erros.geral}</p>}
        <button type="submit" disabled={salvando} className="w-full py-3 sm:py-2.5 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer disabled:opacity-60">
          {salvando ? 'Salvando...' : 'Trocar senha'}
        </button>
      </form>
    </div>
  );
};
