// @vitest-environment jsdom
import { StrictMode, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/app/AuthProvider';
import { AccountantHubPage } from '../../src/features/accountant/routes/AccountantHubPage';
import { api, setApiToken } from '../../src/shared/lib/axios';
import { useWorkspaceStore } from '../../src/shared/stores/useWorkspaceStore';

vi.mock('../../src/shared/lib/axios', () => ({
  api: {
    patch: vi.fn(),
    get: vi.fn(),
  },
  setApiToken: vi.fn(),
}));

vi.mock('../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../src/features/accountant/components/ActivityFeed', () => ({
  ActivityFeed: () => <div data-testid="activity-feed" />,
}));

vi.mock('../../src/features/accountant/components/AccountantMobileHeader', () => ({
  AccountantMobileHeader: () => <div data-testid="accountant-mobile-header" />,
}));

vi.mock('../../src/features/accountant/components/InviteClientModal', () => ({
  InviteClientModal: () => null,
}));

vi.mock('../../src/features/accountant/components/HealthStatusBadge', () => ({
  HealthStatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag) => {
        return ({ children, ...props }: Record<string, unknown>) =>
          createElement(tag as string, props, children);
      },
    }
  );

  return { motion };
});

describe('AuthProvider restore session integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      activeMembership: null,
      memberships: [],
      isLoadingMetadata: false,
      isForbidden: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('hydrates refresh -> /auth/me -> provider -> hub with the same accountant summary used on direct reload', async () => {
    localStorage.setItem('wsp_refresh_token', 'seed-refresh-token');

    vi.mocked(api.patch).mockResolvedValue({
      data: { token: 'token-restored', refreshToken: 'refresh-restored' },
    } as never);

    vi.mocked(api.get).mockResolvedValue({
      data: buildAccountantMePayload(),
    } as never);

    render(
      <MemoryRouter>
        <AuthProvider>
          <AccountantHubPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'seed-refresh-token' });
    });

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/auth/me');
    });

    await waitFor(() => {
      expect(useWorkspaceStore.getState().memberships).toHaveLength(2);
    });

    const normalizedText = () => document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    await waitFor(() => {
      expect(normalizedText()).toMatch(/Clientes Ativos\s*2/);
      expect(normalizedText()).toMatch(/Documentos Pendentes\s*20/);
    });

    expect(JSON.parse(localStorage.getItem('wsp_dashboard_cache') || '[]')).toHaveLength(2);
    expect(vi.mocked(setApiToken)).toHaveBeenCalledWith('token-restored');
  });

  it('dedupes restore calls under StrictMode and keeps the same hydrated accountant state', async () => {
    localStorage.setItem('wsp_refresh_token', 'seed-refresh-token');

    vi.mocked(api.patch).mockResolvedValue({
      data: { token: 'token-restored', refreshToken: 'refresh-restored' },
    } as never);

    vi.mocked(api.get).mockResolvedValue({
      data: buildAccountantMePayload(),
    } as never);

    render(
      <StrictMode>
        <MemoryRouter>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </MemoryRouter>
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-probe').textContent).toContain('auditoria@wsp.finance');
    });

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('auth-probe').textContent).toContain('cache:2');
  });

  it('removes stale dashboard cache from storage when /auth/me returns no dashboardCache', async () => {
    localStorage.setItem('wsp_refresh_token', 'seed-refresh-token');
    localStorage.setItem('wsp_dashboard_cache', JSON.stringify([{ workspaceId: 999, pendingMovements: 99 }]));

    vi.mocked(api.patch).mockResolvedValue({
      data: { token: 'token-restored', refreshToken: 'refresh-restored' },
    } as never);

    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: 1,
        name: 'Wellington Contador',
        email: 'auditoria@wsp.finance',
        type: 'ACCOUNTANT',
        memberships: buildAccountantMePayload().memberships,
      },
    } as never);

    render(
      <MemoryRouter>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-probe').textContent).toContain('auditoria@wsp.finance');
    });

    expect(localStorage.getItem('wsp_dashboard_cache')).toBeNull();
    expect(screen.getByTestId('auth-probe').textContent).toContain('cache:null');
  });
});

function AuthProbe() {
  const { user, dashboardCache } = useAuth();

  return (
    <div data-testid="auth-probe">
      {user?.email ?? 'no-user'}|cache:{dashboardCache ? dashboardCache.length : 'null'}
    </div>
  );
}

function buildAccountantMePayload() {
  return {
    id: 1,
    name: 'Wellington Contador',
    email: 'auditoria@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [
      {
        id: 3,
        name: 'Joao Business',
        type: 'BUSINESS' as const,
        role: 'ACCOUNTANT' as const,
        closedUntil: null,
      },
      {
        id: 5,
        name: 'Maria Tech',
        type: 'BUSINESS' as const,
        role: 'ACCOUNTANT' as const,
        closedUntil: null,
      },
    ],
    dashboardCache: [
      {
        id: 101,
        userId: 1,
        workspaceId: 3,
        pendingMovements: 12,
        missingAttachments: 3,
        cashRiskAlert: false,
        totalBalance: '126022.8852',
        updatedAt: '2026-04-20T12:00:00.000Z',
      },
      {
        id: 102,
        userId: 1,
        workspaceId: 5,
        pendingMovements: 5,
        missingAttachments: 0,
        cashRiskAlert: true,
        totalBalance: '-80938.2903',
        updatedAt: '2026-04-20T12:01:00.000Z',
      },
    ],
  };
}
