// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { AccountantHubPage } from '../../src/features/accountant/routes/AccountantHubPage';
import { api } from '../../src/shared/lib/axios';
import { useWorkspaceStore } from '../../src/shared/stores/useWorkspaceStore';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('../../src/shared/lib/axios', () => ({
  api: { patch: vi.fn(), get: vi.fn() },
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

// NÃO mockamos CertificateAlertBadge — queremos testar a integração real

// ── Fixtures ───────────────────────────────────────────────────────────────────

function buildPayload(certExpires: { ws3?: string | null; ws5?: string | null } = {}) {
  return {
    id: 1,
    name: 'Contador Teste',
    email: 'contador@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [
      { id: 3, name: 'Empresa Alpha', type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
      { id: 5, name: 'Empresa Beta',  type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
    ],
    dashboardCache: [
      {
        id: 101, userId: 1, workspaceId: 3,
        pendingMovements: 2, missingAttachments: 0, cashRiskAlert: false,
        totalBalance: '50000.00', updatedAt: '2026-04-20T12:00:00Z',
        certificateExpiresAt: certExpires.ws3 ?? null,
      },
      {
        id: 102, userId: 1, workspaceId: 5,
        pendingMovements: 0, missingAttachments: 0, cashRiskAlert: false,
        totalBalance: '30000.00', updatedAt: '2026-04-20T12:00:00Z',
        certificateExpiresAt: certExpires.ws5 ?? null,
      },
    ],
  };
}

async function renderHub(certExpires: { ws3?: string | null; ws5?: string | null } = {}) {
  localStorage.setItem('wsp_refresh_token', 'test-token');

  vi.mocked(api.patch).mockResolvedValue({
    data: { token: 'tk', refreshToken: 'rt' },
  } as never);

  vi.mocked(api.get).mockResolvedValue({
    data: buildPayload(certExpires),
  } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AccountantHubPage />
      </AuthProvider>
    </MemoryRouter>
  );

  // Aguarda o Hub renderizar ambos os clientes (desktop + mobile = 2 cada)
  await waitFor(() => {
    expect(screen.getAllByText('Empresa Alpha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Empresa Beta').length).toBeGreaterThanOrEqual(1);
  });
}

// ── Testes ──────────────────────────────────────────────────────────────────────

describe('AccountantHubPage — integração do CertificateAlertBadge', () => {
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

  it('renderiza CertificateAlertBadge com status "Válido" quando certificado tem mais de 30 dias', async () => {
    const future = new Date(Date.now() + 60 * 86_400_000).toISOString();
    await renderHub({ ws3: future, ws5: null });

    const badges = screen.getAllByRole('status');
    const validBadge = badges.find(b => b.textContent?.match(/válido/i));
    expect(validBadge).toBeTruthy();
    expect(validBadge!.className).toMatch(/emerald/);
  });

  it('renderiza CertificateAlertBadge com alerta quando certificado expira em ≤ 30 dias', async () => {
    const soon = new Date(Date.now() + 10 * 86_400_000).toISOString();
    await renderHub({ ws3: soon });

    const badges = screen.getAllByRole('status');
    const warningBadge = badges.find(b => b.textContent?.match(/expira em/i));
    expect(warningBadge).toBeTruthy();
    expect(warningBadge!.className).toMatch(/amber/);
  });

  it('renderiza CertificateAlertBadge com "Expirado" quando certificado já venceu', async () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
    await renderHub({ ws3: past });

    const badges = screen.getAllByRole('status');
    const expiredBadge = badges.find(b => b.textContent?.match(/expirado/i));
    expect(expiredBadge).toBeTruthy();
    expect(expiredBadge!.className).toMatch(/red/);
  });

  it('renderiza badge "Não enviado" quando certificateExpiresAt é null', async () => {
    await renderHub({ ws3: null, ws5: null });

    const badges = screen.getAllByRole('status');
    const missingBadges = badges.filter(b => b.textContent?.match(/não enviado/i));
    expect(missingBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('preserva HealthStatusBadge mesmo com certificado presente', async () => {
    const future = new Date(Date.now() + 60 * 86_400_000).toISOString();
    await renderHub({ ws3: future, ws5: future });

    // O HealthStatusBadge mocado renderiza data-testid="health-badge"
    const healthBadges = screen.getAllByTestId('health-badge');
    expect(healthBadges.length).toBeGreaterThanOrEqual(2);
  });
});
