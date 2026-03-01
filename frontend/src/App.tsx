import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './app/AuthProvider';
import { LoginPage } from './features/auth/routes/LoginPage';
import { RegisterPage } from './features/auth/routes/RegisterPage';
import { VerifyPage } from './features/auth/routes/VerifyPage';
import { ForgotPasswordPage } from './features/auth/routes/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/routes/ResetPasswordPage';
import { DashboardPage } from './features/dashboard/routes/DashboardPage';
import { TransactionHistoryPage } from './features/transactions/pages/TransactionHistoryPage';

import { UIProvider } from './shared/context/UIProvider';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-[#11051f] text-white">Carregando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Rotas Protegidas */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <PrivateRoute>
                <TransactionHistoryPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </UIProvider>
    </BrowserRouter>
  );
}