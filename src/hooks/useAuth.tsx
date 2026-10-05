import React, { createContext, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import {
  apiService,
  obterSessaoDemoLocal,
  salvarSessaoDemoLocal,
} from '../services/api';
import { Profile } from '../types/reserva';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CONTAS_DEMO_POUSADA: Record<string, Profile> = {
  'recepcao@pousadapinhoverde.com.br': {
    id: '22222222-3333-4444-5555-666666666666',
    email: 'recepcao@pousadapinhoverde.com.br',
    nome_completo: 'Helena Martins (Recepção)',
    perfil: 'recepcao',
    ativo: true,
  },
  'admin@pousadapinhoverde.com.br': {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'admin@pousadapinhoverde.com.br',
    nome_completo: 'Gabriel Pinheiro (Administração)',
    perfil: 'admin',
    ativo: true,
  },
  'inativo@pousadapinhoverde.com.br': {
    id: '99999999-8888-7777-6666-555555555555',
    email: 'inativo@pousadapinhoverde.com.br',
    nome_completo: 'Colaborador Desligado',
    perfil: 'recepcao',
    ativo: false,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function inicializarSessao() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const profile = await apiService.getMe();
            if (mounted) setUser(profile);
          }
        } else {
          let demoUser = obterSessaoDemoLocal();
          if (!demoUser) {
            demoUser = CONTAS_DEMO_POUSADA['admin@pousadapinhoverde.com.br'];
            salvarSessaoDemoLocal(demoUser);
          }
          if (mounted && demoUser.ativo) {
            setUser(demoUser);
          }
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    inicializarSessao();

    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!session) {
            setUser(null);
            return;
          }
          try {
            const profile = await apiService.getMe();
            setUser(profile);
          } catch {
            setUser(null);
          }
        }
      );

      return () => {
        mounted = false;
        listener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const emailLimpo = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password,
      });

      if (error) {
        throw new Error('E-mail ou senha inválidos. Verifique suas credenciais.');
      }

      const profile = await apiService.getMe();
      if (!profile.ativo) {
        await supabase.auth.signOut();
        throw new Error(
          'Seu perfil de colaborador está inativo. Contate a administração da pousada.'
        );
      }

      setUser(profile);
      return;
    }

    if (password.length < 6) {
      throw new Error('A senha deve possuir no mínimo 6 caracteres.');
    }

    const conta = CONTAS_DEMO_POUSADA[emailLimpo] || {
      id: '11111111-2222-3333-4444-555555555555',
      email: emailLimpo,
      nome_completo: emailLimpo.includes('admin')
        ? 'Gabriel Pinheiro (Administração)'
        : 'Helena Martins (Recepção)',
      perfil: emailLimpo.includes('admin') ? 'admin' : 'recepcao',
      ativo: !emailLimpo.includes('inativo'),
    };

    if (!conta.ativo) {
      salvarSessaoDemoLocal(null);
      setUser(null);
      throw new Error(
        'Seu perfil de acesso está inativo (403 Forbidden). Contate a administração da pousada.'
      );
    }

    salvarSessaoDemoLocal(conta);
    setUser(conta);
  };

  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    salvarSessaoDemoLocal(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode: !isSupabaseConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return ctx;
}
