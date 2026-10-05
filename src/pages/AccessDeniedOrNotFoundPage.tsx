import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Compass, ArrowLeft } from 'lucide-react';

interface AccessDeniedOrNotFoundPageProps {
  tipo?: 'acesso_negado' | 'nao_encontrado';
  mensagemCustomizada?: string;
}

export const AccessDeniedOrNotFoundPage: React.FC<
  AccessDeniedOrNotFoundPageProps
> = ({ tipo = 'nao_encontrado', mensagemCustomizada }) => {
  const isAcessoNegado = tipo === 'acesso_negado';

  return (
    <div className="min-h-[65vh] flex items-center justify-center sm:px-4 py-8 sm:py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
          {isAcessoNegado ? (
            <ShieldAlert className="w-6 h-6 text-red-600" />
          ) : (
            <Compass className="w-6 h-6 text-emerald-800" />
          )}
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500">
            {isAcessoNegado ? 'Código HTTP 403 · Acesso Restrito' : 'Código HTTP 404 · Página Não Encontrada'}
          </p>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {isAcessoNegado
              ? 'Acesso Negado ao Recurso'
              : 'Página ou Reserva Não Encontrada'}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {mensagemCustomizada ||
              (isAcessoNegado
                ? 'Seu perfil de colaborador não possui permissão ativa para visualizar este conteúdo. Contate a administração da Pousada Pinho Verde.'
                : 'O endereço acessado ou o identificador da reserva informado não existe em nossa base de dados.')}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 text-sm sm:text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir para o Dashboard</span>
          </Link>
          <Link
            to="/reservas"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 text-sm sm:text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Consultar Reservas
          </Link>
        </div>
      </div>
    </div>
  );
};
