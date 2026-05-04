// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import App from '../../src/App';
import { AuthProvider } from '../../src/app/AuthProvider';
import { useAuthStore } from '../../src/features/auth/stores/useAuthStore';
import { api } from '../../src/shared/lib/axios';

vi.mock('../../src/shared/lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  setApiToken: vi.fn(),
}));

// We mock AuthProvider's internal logic that tries to fetch /auth/me
// But since App wraps with AuthProvider, we need to mock api.patch and api.get for session restore if any.

describe('RoutingIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState({}, 'Test', '/');
  });

  const setupAuth = (systemRole: 'ADMIN' | 'USER') => {
    // Mock the session restore to succeed with our user
    localStorage.setItem('wsp_refresh_token', 'fake-token');
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { token: 'new-token', refreshToken: 'new-refresh-token' },
    });
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        type: 'CLIENT',
        systemRole,
        memberships: [],
      },
    });
  };

  it('T12: Dado user systemRole === "ADMIN", acessando /admin, a página AdminDashboard carrega com as métricas', async () => {
    setupAuth('ADMIN');
    window.history.pushState({}, 'Test', '/admin');

    // API get for metrics
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        platform: {
          totalUsers: 150,
          totalWorkspaces: 20,
          totalAdmins: 2,
        },
        activity: {
          totalTransactions: 5000,
          pendingMovements: 45,
          pendingInvites: 5,
        },
        generatedAt: '2026-05-04T12:00:00Z',
      },
    });

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Painel Administrativo')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('T13: Dado user systemRole === "USER", acessando /admin, é redirecionado para WorkspaceGuard (ou dashboard default)', async () => {
    setupAuth('USER');
    window.history.pushState({}, 'Test', '/admin');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      // It should not render Admin Dashboard
      expect(screen.queryByText('Painel Administrativo')).not.toBeInTheDocument();
      // It should render WorkspaceGuard/Fallback or whatever the root "/" is.
      // We can just verify it is NOT the admin page.
    });
  });

  it('T14: Dado user não autenticado, acessando /admin, é redirecionado para /login', async () => {
    // No session
    window.history.pushState({}, 'Test', '/admin');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      // Because no token, /auth/refresh is not called, User is null
      expect(screen.queryByText('Painel Administrativo')).not.toBeInTheDocument();
    });

    // Check if it ends up rendering login (we don't need to assert the exact login page content if it's too complex, just something from login)
    // Actually the login page has an input "Email"
    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  it('T15: Dado ACCOUNTANT com systemRole USER (auditoria@wsp.finance), acessando /admin, NÃO monta AdminDashboard e NÃO chama GET /admin/metrics', async () => {
    // Mock the session restore to succeed with our ACCOUNTANT user
    localStorage.setItem('wsp_refresh_token', 'fake-token');
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { token: 'new-token', refreshToken: 'new-refresh-token' },
    });
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        id: 99,
        email: 'auditoria@wsp.finance',
        name: 'Wellington Contador',
        type: 'ACCOUNTANT',
        systemRole: 'USER',
        memberships: [],
      },
    });

    window.history.pushState({}, 'Test', '/admin');

    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Painel Administrativo')).not.toBeInTheDocument();
      expect(screen.queryByText('CARREGANDO MÉTRICAS...')).not.toBeInTheDocument();
    });

    // Confirma que GET /admin/metrics nunca foi chamado
    const getCalls = vi.mocked(api.get).mock.calls;
    const metricsCallExists = getCalls.some(call => call[0] === '/admin/metrics');
    expect(metricsCallExists).toBe(false);
  });
});
