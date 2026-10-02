/**
 * Tela 1: Login de Colaboradores da Pousada Pinho Verde.
 * Utiliza React Hook Form + Zod e autentica via Supabase Auth.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Lock, Mail, Trees } from 'lucide-react';
import { loginSchema, LoginFormValues } from '../schemas/reservaSchema';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { signIn, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (dados: LoginFormValues) => {
    setErroLogin(null);
    try {
      await signIn(dados.email, dados.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const mensagem =
        err instanceof Error
          ? err.message
          : 'Não foi possível autenticar. Verifique suas credenciais.';
      setErroLogin(mensagem);
    }
  };

  const preencherCredencialDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'senha123', { shouldValidate: true });
    setErroLogin(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAF9]">
      {/* Coluna Institucional */}
      <div className="lg:w-5/12 bg-[#0F291E] text-white p-8 lg:p-14 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <Trees className="w-7 h-7 text-emerald-400" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Pousada Pinho Verde
          </span>
        </div>

        <div className="my-12 lg:my-0 space-y-4 max-w-md">
          <p className="text-xs font-medium text-emerald-300/90">
            Serra da Mantiqueira · Portal Interno de Colaboradores
          </p>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold leading-tight text-white">
            Sistema de Vouchers e Gestão de Reservas
          </h1>
          <p className="text-sm text-emerald-100/80 leading-relaxed">
            Controle centralizado de reservas de chalés, cálculo automático de
            saldo financeiro e emissão padronizada de vouchers de hospedagem.
          </p>
        </div>

        <div className="text-xs text-emerald-200/70 space-y-1 border-t border-emerald-900 pt-6">
          <p>Horários oficiais: Check-in às 15h · Check-out às 12h</p>
          <p>Acesso exclusivo para recepção e administração autorizada.</p>
        </div>
      </div>

      {/* Coluna do Formulário de Autenticação */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Acesso ao Sistema
            </h2>
            <p className="text-sm text-slate-600">
              Entre com suas credenciais do Supabase Auth para gerenciar as reservas.
            </p>
          </div>

          {erroLogin && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{erroLogin}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                E-mail do Colaborador
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="recepcao@pousadapinhoverde.com.br"
                  {...register('email')}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>

          {isDemoMode && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <p className="text-xs font-medium text-slate-600">
                Contas fictícias para desenvolvimento e validação de perfis:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    preencherCredencialDemo('recepcao@pousadapinhoverde.com.br')
                  }
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Perfil Recepção
                </button>
                <button
                  type="button"
                  onClick={() =>
                    preencherCredencialDemo('admin@pousadapinhoverde.com.br')
                  }
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Perfil Admin
                </button>
                <button
                  type="button"
                  onClick={() =>
                    preencherCredencialDemo('inativo@pousadapinhoverde.com.br')
                  }
                  className="px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  Testar Inativo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
