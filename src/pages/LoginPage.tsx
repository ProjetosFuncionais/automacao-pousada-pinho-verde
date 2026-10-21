import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Lock, Mail, Trees } from 'lucide-react';
import { loginSchema, LoginFormValues } from '../schemas/reservaSchema';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8FAF9]">
      <div className="lg:w-5/12 bg-[#0F291E] text-white px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 lg:p-14 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <Trees className="w-7 h-7 text-emerald-400" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Pousada Pinho Verde
          </span>
        </div>

        <div className="mt-5 lg:mt-0 space-y-2 lg:space-y-4 max-w-md">
          <p className="hidden lg:block text-xs font-medium text-emerald-300/90">
            Serra da Mantiqueira · Acesso da equipe
          </p>
          <h1 className="font-display text-xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-white">
            Reservas e vouchers
          </h1>
          <p className="hidden lg:block text-sm text-emerald-100/80 leading-relaxed">
            Reservas dos chalés, saldo de cada hóspede e vouchers prontos para imprimir.
          </p>
        </div>

        <div className="hidden lg:block text-xs text-emerald-200/70 space-y-1 border-t border-emerald-900 pt-6">
          <p>Horários oficiais: Check-in às 15h · Check-out às 12h</p>
          <p>Acesso restrito à equipe da pousada.</p>
        </div>
      </div>

      <div className="flex-1 flex items-start lg:items-center justify-center p-4 sm:p-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              Entrar
            </h2>
            <p className="text-sm text-slate-600">
              Use seu e-mail e senha da pousada.
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
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="voce@pousadapinhoverde.com.br"
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
              className="w-full py-3 sm:py-2.5 px-4 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Autenticando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
