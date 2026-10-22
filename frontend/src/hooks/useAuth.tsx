import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ApiClientError,
  apiService,
  EVENTO_SESSAO_EXPIRADA,
  obterTokenSalvo,
  salvarToken,
} from '../services/api';
import { Profile } from '../types/reserva';

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function inicializarSessao() {
      try {
        if (obterTokenSalvo()) {
          const profile = await apiService.getMe();
          if (mounted) setUser(profile);
        }
      } catch {
        salvarToken(null);
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
    try {
      const profile = await apiService.login(email.trim().toLowerCase(), password);
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
  };

  const signOut = async (): Promise<void> => {
    salvarToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
