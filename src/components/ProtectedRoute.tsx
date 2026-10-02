/**
 * Componente de proteção de rotas.
 * Garante que apenas usuários autenticados e com perfil ativo acessem o sistema.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AccessDeniedOrNotFoundPage } from '../pages/AccessDeniedOrNotFoundPage';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.ativo) {
    return <AccessDeniedOrNotFoundPage tipo="acesso_negado" />;
  }

  return <>{children}</>;
};
