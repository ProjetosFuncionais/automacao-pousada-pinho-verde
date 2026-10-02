/**
 * Roteamento principal do Sistema de Vouchers e Gestão de Reservas da Pousada Pinho Verde.
 * Inclui as 7 telas obrigatórias especificadas:
 * 1. Login (/login)
 * 2. Dashboard (/dashboard)
 * 3. Lista de reservas com busca (/reservas)
 * 4. Cadastro e Edição de reserva (/reservas/nova e /reservas/:id/editar)
 * 5. Detalhes da reserva (/reservas/:id)
 * 6. Visualização e impressão do voucher (/reservas/:id/voucher)
 * 7. Página de acesso negado ou não encontrado (/acesso-negado e *)
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReservasListPage } from './pages/ReservasListPage';
import { ReservaFormPage } from './pages/ReservaFormPage';
import { ReservaDetailPage } from './pages/ReservaDetailPage';
import { VoucherPage } from './pages/VoucherPage';
import { AccessDeniedOrNotFoundPage } from './pages/AccessDeniedOrNotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Tela de Login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rotas Protegidas pelo Supabase Auth + Profile Ativo */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* 2. Dashboard com resumo e reservas recentes */}
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* 3. Lista de reservas com busca */}
            <Route path="/reservas" element={<ReservasListPage />} />
            {/* 4. Cadastro e Edição de reserva */}
            <Route path="/reservas/nova" element={<ReservaFormPage />} />
            <Route path="/reservas/:id/editar" element={<ReservaFormPage />} />
            {/* 5. Detalhes da reserva */}
            <Route path="/reservas/:id" element={<ReservaDetailPage />} />
            {/* 6. Visualização e impressão do voucher */}
            <Route path="/reservas/:id/voucher" element={<VoucherPage />} />
            {/* 7. Página de acesso negado ou não encontrado */}
            <Route
              path="/acesso-negado"
              element={<AccessDeniedOrNotFoundPage tipo="acesso_negado" />}
            />
            <Route
              path="*"
              element={<AccessDeniedOrNotFoundPage tipo="nao_encontrado" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
