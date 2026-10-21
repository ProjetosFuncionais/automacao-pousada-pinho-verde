import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiClientError,
  apiService,
  EVENTO_SESSAO_EXPIRADA,
  isDemoMode,
  obterSessaoDemoLocal,
  obterTokenSalvo,
  salvarSessaoDemoLocal,
  salvarToken,
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
        if (!isDemoMode) {
          if (obterTokenSalvo()) {
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
        if (!isDemoMode) salvarToken(null);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    inicializarSessao();

    // Token expirado ou inválido em qualquer chamada à API: volta para o login.
    const aoExpirarSessao = () => {
      if (mounted) setUser(null);
    };
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);

    return () => {
      mounted = false;
      window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirarSessao);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const emailLimpo = email.trim().toLowerCase();

    if (!isDemoMode) {
      try {
        const profile = await apiService.login(emailLimpo, password);
        setUser(profile);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          throw new Error('E-mail ou senha inválidos. Verifique suas credenciais.');
        }
        if (err instanceof ApiClientError) {
          throw new Error(err.message);
        }
        throw new Error(
          'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'
        );
      }
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
    salvarToken(null);
    salvarSessaoDemoLocal(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
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
