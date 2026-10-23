import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, UserPlus, X } from 'lucide-react';
import { ApiClientError, apiService } from '../services/api';
import { PerfilUsuario, Profile } from '../types/reserva';
import { useAuth } from '../hooks/useAuth';

const TAMANHO_MINIMO_SENHA = 8;

function gerarSenha(): string {
  // Sem letras parecidas (l, I, O, 0) para facilitar ditar ou copiar.
  const caracteres = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const valores = new Uint32Array(12);
  crypto.getRandomValues(valores);
  return Array.from(valores, (v) => caracteres[v % caracteres.length]).join('');
}

const campoClasse =
  'w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700';

const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  admin: 'Admin',
  recepcao: 'Recepção',
};

export const EquipePage: React.FC = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [novo, setNovo] = useState({ nome_completo: '', email: '', perfil: 'recepcao' as PerfilUsuario, senha: '' });
  const [errosNovo, setErrosNovo] = useState<Record<string, string>>({});
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  const [senhaPara, setSenhaPara] = useState<Profile | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setCarregando(true);
      setUsuarios(await apiService.listarUsuarios());
      setErro(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar a equipe.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrosNovo({});
    try {
      setSalvandoNovo(true);
      const criado = await apiService.criarUsuario({ ...novo, email: novo.email.trim() });
      setAviso(
        `Cadastro de ${criado.nome_completo} feito. Passe para a pessoa o e-mail ${criado.email} e a senha ${novo.senha}. Ela pode trocar a senha depois, em "Senha".`
      );
      setNovo({ nome_completo: '', email: '', perfil: 'recepcao', senha: '' });
      setFormAberto(false);
      await carregar();
    } catch (err) {
      if (err instanceof ApiClientError && Object.keys(err.campos).length) {
        setErrosNovo(err.campos);
      } else {
        setErrosNovo({ geral: err instanceof Error ? err.message : 'Não foi possível cadastrar.' });
      }
    } finally {
      setSalvandoNovo(false);
    }
  };

  const alterarAcesso = async (u: Profile, dados: { ativo?: boolean; perfil?: PerfilUsuario }) => {
    try {
      setOcupadoId(u.id);
      setErro(null);
      const atualizado = await apiService.atualizarUsuario(u.id, dados);
      setUsuarios((lista) => lista.map((x) => (x.id === u.id ? atualizado : x)));
      if (dados.ativo !== undefined) {
        setAviso(dados.ativo ? `${u.nome_completo} pode acessar o sistema de novo.` : `${u.nome_completo} não consegue mais entrar no sistema.`);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível alterar o acesso.');
    } finally {
      setOcupadoId(null);
    }
  };

  const redefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senhaPara) return;
    try {
      setOcupadoId(senhaPara.id);
      setErroSenha(null);
      await apiService.redefinirSenhaUsuario(senhaPara.id, novaSenha);
      setAviso(`Senha de ${senhaPara.nome_completo} redefinida para ${novaSenha}. Passe a senha nova para a pessoa.`);
      setSenhaPara(null);
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setOcupadoId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">Somente para administradores</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900">Equipe</h1>
        </div>
        {!formAberto && (
          <button
            type="button"
            onClick={() => {
              setFormAberto(true);
              setErrosNovo({});
              setNovo((n) => ({ ...n, senha: gerarSenha() }));
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar pessoa</span>
          </button>
        )}
      </div>

      {aviso && (
        <div role="status" className="flex items-start justify-between gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
          <span className="select-all">{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} className="text-emerald-700 hover:text-emerald-950 p-1 -m-1 cursor-pointer" aria-label="Fechar aviso">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {erro && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {erro}
        </div>
      )}

      {formAberto && (
        <form onSubmit={criar} noValidate className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Nova pessoa na equipe</h2>
              <p className="text-xs text-slate-500">Recepção cuida das reservas. Admin também gerencia a equipe.</p>
            </div>
            <button type="button" onClick={() => setFormAberto(false)} className="text-slate-400 hover:text-slate-600 p-2 -m-1 cursor-pointer" aria-label="Fechar formulário">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="novo_nome" className="block text-xs font-semibold text-slate-700 mb-1.5">Nome</label>
              <input id="novo_nome" value={novo.nome_completo} onChange={(e) => setNovo({ ...novo, nome_completo: e.target.value })} className={campoClasse} autoComplete="off" />
              {errosNovo.nome_completo && <p className="mt-1 text-xs text-red-600">{errosNovo.nome_completo}</p>}
            </div>
            <div>
              <label htmlFor="novo_email" className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail</label>
              <input id="novo_email" type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} className={campoClasse} autoComplete="off" />
              {errosNovo.email && <p className="mt-1 text-xs text-red-600">{errosNovo.email}</p>}
            </div>
            <div>
              <label htmlFor="novo_perfil" className="block text-xs font-semibold text-slate-700 mb-1.5">Perfil</label>
              <select id="novo_perfil" value={novo.perfil} onChange={(e) => setNovo({ ...novo, perfil: e.target.value as PerfilUsuario })} className={`${campoClasse} bg-white`}>
                <option value="recepcao">Recepção</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="novo_senha" className="text-xs font-semibold text-slate-700">Senha inicial</label>
                <button type="button" onClick={() => setNovo({ ...novo, senha: gerarSenha() })} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer">
                  Gerar outra
                </button>
              </div>
              <input id="novo_senha" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} className={`${campoClasse} tabular-nums`} autoComplete="off" />
              {errosNovo.senha ? (
                <p className="mt-1 text-xs text-red-600">{errosNovo.senha}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Mínimo de {TAMANHO_MINIMO_SENHA} caracteres. Anote antes de salvar.</p>
              )}
            </div>
          </div>

          {errosNovo.geral && <p role="alert" className="text-xs font-medium text-red-700">{errosNovo.geral}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setFormAberto(false)} className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={salvandoNovo} className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer disabled:opacity-60">
              {salvandoNovo ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {carregando ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {usuarios.map((u) => {
              const souEu = u.id === user?.id;
              return (
                <li key={u.id} className={`p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 ${u.ativo ? '' : 'bg-slate-50'}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {u.nome_completo}
                      {souEu && <span className="ml-2 text-xs font-normal text-slate-500">(você)</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {u.email} · {u.ativo ? 'Ativo' : 'Sem acesso'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`perfil_${u.id}`}>Perfil de {u.nome_completo}</label>
                    <select
                      id={`perfil_${u.id}`}
                      value={u.perfil}
                      disabled={souEu || ocupadoId === u.id}
                      onChange={(e) => alterarAcesso(u, { perfil: e.target.value as PerfilUsuario })}
                      className="px-2.5 py-2 sm:py-1.5 text-xs border border-slate-300 rounded-md bg-white disabled:opacity-60"
                    >
                      {(Object.keys(ROTULO_PERFIL) as PerfilUsuario[]).map((p) => (
                        <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setSenhaPara(u);
                        setNovaSenha(gerarSenha());
                        setErroSenha(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Redefinir senha
                    </button>
                    {!souEu && (
                      <button
                        type="button"
                        disabled={ocupadoId === u.id}
                        onClick={() => alterarAcesso(u, { ativo: !u.ativo })}
                        className={`px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md cursor-pointer disabled:opacity-60 ${
                          u.ativo ? 'text-red-700 hover:bg-red-50' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {u.ativo ? 'Tirar acesso' : 'Devolver acesso'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {senhaPara && (
        <div className="fixed inset-0 z-50 m-0 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs sm:p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-redefinir">
          <form onSubmit={redefinirSenha} className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl sm:max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
            <div>
              <h3 id="titulo-redefinir" className="text-base font-semibold text-slate-900">Redefinir senha</h3>
              <p className="text-xs text-slate-500">{senhaPara.nome_completo} · {senhaPara.email}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="nova_senha_usuario" className="text-xs font-semibold text-slate-700">Senha nova</label>
                <button type="button" onClick={() => setNovaSenha(gerarSenha())} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer">
                  Gerar outra
                </button>
              </div>
              <input id="nova_senha_usuario" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} className={`${campoClasse} tabular-nums`} autoComplete="off" />
              <p className="mt-1 text-xs text-slate-500">A senha antiga para de funcionar na hora. Anote a nova antes de salvar.</p>
            </div>
            {erroSenha && <p role="alert" className="text-xs font-medium text-red-700">{erroSenha}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button type="button" onClick={() => setSenhaPara(null)} className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer">
                Voltar
              </button>
              <button type="submit" disabled={novaSenha.length < TAMANHO_MINIMO_SENHA || ocupadoId === senhaPara.id} className="px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer disabled:opacity-50">
                Salvar senha nova
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
