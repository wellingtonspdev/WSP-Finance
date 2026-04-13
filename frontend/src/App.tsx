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
import { TeamSettingsPage } from './features/workspaces/routes/TeamSettingsPage';
import { WorkspaceGuard } from './shared/components/guards/WorkspaceGuard';
import { ThemeWrapper } from './shared/components/layout/ThemeWrapper';
import { InviteLandingPage } from './features/workspaces/routes/InviteLandingPage';
import { AccountantHubPage } from './features/accountant/routes/AccountantHubPage';
import { InviteInboxPage } from './features/accountant/routes/InviteInboxPage';
import { ApprovalInboxPage } from './features/accountant/routes/ApprovalInboxPage';

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
      <ThemeWrapper>
        <UIProvider>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route path="/invite/:token" element={<InviteLandingPage />} />

            {/* Rota Global do Hub do Contador */}
            <Route
              path="/accountant/hub"
              element={
                <PrivateRoute>
                  <AccountantHubPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/accountant/invites"
              element={
                <PrivateRoute>
                  <InviteInboxPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/accountant/inbox"
              path="/accountant/inbox/:workspaceId"
              element={
                <PrivateRoute>
                  <ApprovalInboxPage />
                </PrivateRoute>
              }
            />

            {/* Rotas Protegidas e Aninhadas sob um Guardião de Contexto (WorkspaceId) */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <WorkspaceGuard />
                </PrivateRoute>
              }
            >
              {/* O próprio WorkspaceGuard fará o Replace(/) para o ID persistido */}
              <Route path=":workspaceId/dashboard" element={<DashboardPage />} />
              <Route path=":workspaceId/transactions" element={<TransactionHistoryPage />} />
              <Route path=":workspaceId/team" element={<TeamSettingsPage />} />
            </Route>
          </Routes>
        </UIProvider>
      </ThemeWrapper>
    </BrowserRouter>
  );
}