import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './app/AuthProvider';
import { UIProvider } from './shared/context/UIProvider';
import { ThemeWrapper } from './shared/components/layout/ThemeWrapper';

const LoginPage = lazy(() =>
  import('./features/auth/routes/LoginPage').then((module) => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./features/auth/routes/RegisterPage').then((module) => ({ default: module.RegisterPage }))
);
const VerifyPage = lazy(() =>
  import('./features/auth/routes/VerifyPage').then((module) => ({ default: module.VerifyPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./features/auth/routes/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./features/auth/routes/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
);
const InviteLandingPage = lazy(() =>
  import('./features/workspaces/routes/InviteLandingPage').then((module) => ({ default: module.InviteLandingPage }))
);
const AccountantHubPage = lazy(() =>
  import('./features/accountant/routes/AccountantHubPage').then((module) => ({ default: module.AccountantHubPage }))
);
const InviteInboxPage = lazy(() =>
  import('./features/accountant/routes/InviteInboxPage').then((module) => ({ default: module.InviteInboxPage }))
);
const ApprovalInboxPage = lazy(() =>
  import('./features/accountant/routes/ApprovalInboxPage').then((module) => ({ default: module.ApprovalInboxPage }))
);
const WorkspaceGuard = lazy(() =>
  import('./shared/components/guards/WorkspaceGuard').then((module) => ({ default: module.WorkspaceGuard }))
);
const DashboardPage = lazy(() =>
  import('./features/dashboard/routes/DashboardPage').then((module) => ({ default: module.DashboardPage }))
);
const TransactionHistoryPage = lazy(() =>
  import('./features/transactions/pages/TransactionHistoryPage').then((module) => ({
    default: module.TransactionHistoryPage,
  }))
);
const TeamSettingsPage = lazy(() =>
  import('./features/workspaces/routes/TeamSettingsPage').then((module) => ({ default: module.TeamSettingsPage }))
);
const DocumentsPage = lazy(() =>
  import('./features/workspaces/routes/DocumentsPage').then((module) => ({ default: module.DocumentsPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./features/admin/routes/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage }))
);

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteFallback />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function RouteFallback() {
  return <div className="flex items-center justify-center min-h-screen bg-[#11051f] text-white">Carregando...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeWrapper>
        <UIProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="/invite/:token" element={<InviteLandingPage />} />

              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminDashboardPage />
                  </PrivateRoute>
                }
              />

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
                element={
                  <PrivateRoute>
                    <ApprovalInboxPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/accountant/inbox/:workspaceId"
                element={
                  <PrivateRoute>
                    <ApprovalInboxPage />
                  </PrivateRoute>
                }
              />

              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <WorkspaceGuard />
                  </PrivateRoute>
                }
              >
                <Route path=":workspaceId/dashboard" element={<DashboardPage />} />
                <Route path=":workspaceId/transactions" element={<TransactionHistoryPage />} />
                <Route path=":workspaceId/documents" element={<DocumentsPage />} />
                <Route path=":workspaceId/team" element={<TeamSettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </UIProvider>
      </ThemeWrapper>
    </BrowserRouter>
  );
}
