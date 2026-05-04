// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { AccountantHubPage } from '../../src/features/accountant/routes/AccountantHubPage';
import { api } from '../../src/shared/lib/axios';
import { useWorkspaceStore } from '../../src/shared/stores/useWorkspaceStore';

let dateNowSpy: ReturnType<typeof vi.spyOn>;

vi.mock('../../src/shared/lib/axios', () => ({
  api: { patch: vi.fn(), get: vi.fn(), post: vi.fn() },
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
  HealthStatusBadge: ({ label }: { label: string }) => <span data-testid="health-badge">{label}</span>,
}));

vi.mock('../../src/features/accountant/components/CertificateAlertBadge', () => ({
  CertificateAlertBadge: () => <span data-testid="certificate-badge" />,
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

const baseDashboardCache = [
  {
    id: 101,
    userId: 1,
    workspaceId: 3,
    pendingMovements: 2,
    missingAttachments: 0,
    cashRiskAlert: false,
    totalBalance: '50000.00',
    updatedAt: '2026-05-03T11:30:00.000Z',
    certificateExpiresAt: null,
  },
  {
    id: 102,
    userId: 1,
    workspaceId: 5,
    pendingMovements: 0,
    missingAttachments: 0,
    cashRiskAlert: false,
    totalBalance: '30000.00',
    updatedAt: '2026-05-03T11:35:00.000Z',
    certificateExpiresAt: null,
  },
];

function buildPayload(dashboardCache = baseDashboardCache) {
  return {
    id: 1,
    name: 'Contador Teste',
    email: 'contador@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [
      { id: 3, name: 'Empresa Alpha', type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
      { id: 5, name: 'Empresa Beta', type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
    ],
    dashboardCache,
  };
}

async function renderHub(dashboardCache = baseDashboardCache) {
  localStorage.setItem('wsp_refresh_token', 'test-token');

  vi.mocked(api.patch).mockResolvedValue({
    data: { token: 'tk', refreshToken: 'rt' },
  } as never);

  vi.mocked(api.get).mockResolvedValue({
    data: buildPayload(dashboardCache),
  } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AccountantHubPage />
      </AuthProvider>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getAllByText('Empresa Alpha').length).toBeGreaterThanOrEqual(1);
  });
}

describe('AccountantHubPage cache update indicator', () => {
  beforeEach(() => {
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-03T12:00:00.000Z').getTime());
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
    dateNowSpy.mockRestore();
  });

  it('shows a readable relative update badge for fresh cache data', async () => {
    await renderHub();

    expect(screen.getByText('Atualizado há 30 min')).toBeInTheDocument();
    expect(screen.queryByText('Dados desatualizados')).not.toBeInTheDocument();
  });

  it('marks dashboard cache as stale when the oldest updatedAt is older than one hour', async () => {
    await renderHub([
      { ...baseDashboardCache[0], updatedAt: '2026-05-03T10:30:00.000Z' },
      { ...baseDashboardCache[1], updatedAt: '2026-05-03T11:55:00.000Z' },
    ]);

    const staleBadge = screen.getByText('Dados desatualizados');
    expect(staleBadge).toBeInTheDocument();
    expect(staleBadge.className).toContain('red');
  });

  it('forces a cache refresh and replaces dashboardCache in the auth context', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        dashboardCache: [
          { ...baseDashboardCache[0], updatedAt: '2026-05-03T11:59:00.000Z' },
          { ...baseDashboardCache[1], updatedAt: '2026-05-03T11:59:00.000Z' },
        ],
        result: { ok: true, workspacesProcessed: 2, errors: [] },
      },
    } as never);

    await renderHub([
      { ...baseDashboardCache[0], updatedAt: '2026-05-03T10:30:00.000Z' },
      { ...baseDashboardCache[1], updatedAt: '2026-05-03T10:30:00.000Z' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: /forçar atualização/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/accountant/cache/refresh');
      expect(screen.getByText('Atualizado há 1 min')).toBeInTheDocument();
    });
    expect(screen.queryByText('Dados desatualizados')).not.toBeInTheDocument();
  });
});
