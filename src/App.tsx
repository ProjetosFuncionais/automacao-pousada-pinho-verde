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
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reservas" element={<ReservasListPage />} />
            <Route path="/reservas/nova" element={<ReservaFormPage />} />
            <Route path="/reservas/:id/editar" element={<ReservaFormPage />} />
            <Route path="/reservas/:id" element={<ReservaDetailPage />} />
            <Route path="/reservas/:id/voucher" element={<VoucherPage />} />
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
