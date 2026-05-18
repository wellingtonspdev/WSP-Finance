// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/app/AuthProvider';
import { AccountantHubPage } from '../../src/features/accountant/routes/AccountantHubPage';
import { api } from '../../src/shared/lib/axios';
import { useWorkspaceStore } from '../../src/shared/stores/useWorkspaceStore';

vi.mock('../../src/shared/lib/axios', () => ({
  api: { patch: vi.fn(), get: vi.fn(), post: vi.fn() },
  setApiToken: vi.fn(),
}));

vi.mock('../../src/shared/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  CertificateAlertBadge: () => <span data-testid="certificate-badge">Certificado</span>,
}));

vi.mock('../../src/features/accountant/components/RecentActivitiesDrawer', () => ({
  RecentActivitiesDrawer: () => null,
}));

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, tag) => {
        return ({ children, ...props }: Record<string, unknown>) =>
          createElement(tag as string, props, children);
      },
    },
  );
  return { motion };
});

const LONG_CLIENT_NAME = 'Empresa de Consultoria e Assessoria Financeira Internacional do Brasil Ltda ME';

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
    certificateExpiresAt: '2026-07-01T00:00:00.000Z',
  },
];

function buildPayload(clientName = 'Empresa Alpha') {
  return {
    id: 1,
    name: 'Contador Teste',
    email: 'contador@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [
      { id: 3, name: clientName, type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
    ],
    dashboardCache: baseDashboardCache,
  };
}

async function renderHub(clientName?: string) {
  localStorage.setItem('wsp_refresh_token', 'test-token');

  vi.mocked(api.patch).mockResolvedValue({
    data: { token: 'tk', refreshToken: 'rt' },
  } as never);

  vi.mocked(api.get).mockResolvedValue({
    data: buildPayload(clientName),
  } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AccountantHubPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  const nameToWait = clientName || 'Empresa Alpha';
  const shortName = nameToWait.substring(0, 10);

  await waitFor(() => {
    // Use a substring to handle truncation
    expect(screen.getAllByText((content) => content.includes(shortName)).length).toBeGreaterThanOrEqual(1);
  });
}

describe('AccountantHubPage - Mobile Cards Layout', () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

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

  // T01 — Renderiza card mobile com cliente/status/certificado/ações
  it('T01 - renders mobile card with client name, status, certificate, and actions', async () => {
    await renderHub();

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    const card = within(mobileCard);

    // Client name is present
    expect(card.getByText('Empresa Alpha')).toBeInTheDocument();

    // Status badge is present (mobile uses inline status, not HealthStatusBadge)
    expect(card.getByText('Pendente')).toBeInTheDocument();

    // Certificate badge is present
    expect(card.getByTestId('certificate-badge')).toBeInTheDocument();

    // Action buttons are present
    expect(card.getByRole('button', { name: /inbox/i })).toBeInTheDocument();
    expect(card.getByRole('button', { name: /documentos/i })).toBeInTheDocument();
    expect(card.getByRole('button', { name: /acessar workspace/i })).toBeInTheDocument();
  });

  // T02 — Mobile wrapper permanece md:hidden
  it('T02 - mobile wrapper has md:hidden class', async () => {
    await renderHub();

    const mobileWrapper = screen.getByTestId('accountant-mobile-card').closest('[class*="md:hidden"]');
    expect(mobileWrapper).not.toBeNull();
  });

  // T03 — Tabela desktop permanece hidden md:block
  it('T03 - desktop table keeps hidden md:block classes', async () => {
    await renderHub();

    const desktopTable = screen.getByRole('table');
    const tableContainer = desktopTable.closest('[class*="hidden"]');
    expect(tableContainer).not.toBeNull();
    expect(tableContainer?.className).toContain('md:block');
  });

  // T04 — Raiz do card mobile usa layout vertical (flex-col)
  it('T04 - mobile card root uses vertical layout (flex-col)', async () => {
    await renderHub();

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    expect(mobileCard.className).toContain('flex-col');
    expect(mobileCard.className).not.toMatch(/\bjustify-between\b/);
  });

  // T05 — Bloco textual suporta truncamento (min-w-0, truncate)
  it('T05 - text block supports truncation with min-w-0 and truncate', async () => {
    await renderHub();

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    const card = within(mobileCard);

    // The name element should have truncate class
    const nameEl = card.getByText('Empresa Alpha');
    expect(nameEl.className).toContain('truncate');

    // The text wrapper should have min-w-0
    const textWrapper = nameEl.closest('[class*="min-w-0"]');
    expect(textWrapper).not.toBeNull();
  });

  // T06 — Certificado fica em linha própria
  it('T06 - certificate is in its own row, separate from actions', async () => {
    await renderHub();

    const certContainer = screen.getByTestId('accountant-mobile-certificate');
    const actionsContainer = screen.getByTestId('accountant-mobile-actions');

    // Certificate and actions should be siblings (not nested in each other)
    expect(certContainer.contains(actionsContainer)).toBe(false);
    expect(actionsContainer.contains(certContainer)).toBe(false);
  });

  // T07 — Ações ficam em container próprio e seguro (w-full, grid)
  it('T07 - actions container has w-full and grid layout', async () => {
    await renderHub();

    const actionsContainer = screen.getByTestId('accountant-mobile-actions');
    expect(actionsContainer.className).toContain('w-full');
    expect(actionsContainer.className).toMatch(/grid/);
  });

  // T08 — Botões Inbox, Documentos e Acessar continuam presentes
  it('T08 - Inbox, Docs, and Acessar buttons remain present', async () => {
    await renderHub();

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    const card = within(mobileCard);

    expect(card.getByRole('button', { name: /inbox/i })).toBeInTheDocument();
    expect(card.getByRole('button', { name: /documentos/i })).toBeInTheDocument();
    expect(card.getByRole('button', { name: /acessar workspace/i })).toBeInTheDocument();
  });

  // T09 — Botões icon-only têm nome acessível
  it('T09 - icon-only buttons have accessible names via aria-label', async () => {
    await renderHub();

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    const card = within(mobileCard);

    const inboxBtn = card.getByRole('button', { name: /abrir inbox de aprova/i });
    expect(inboxBtn).toHaveAttribute('aria-label');

    const docsBtn = card.getByRole('button', { name: /gerenciar documentos/i });
    expect(docsBtn).toHaveAttribute('aria-label');

    const accessBtn = card.getByRole('button', { name: /acessar workspace/i });
    expect(accessBtn).toHaveAttribute('aria-label');
  });

  // T10 — Nome longo continua truncando
  it('T10 - long client name still truncates', async () => {
    await renderHub(LONG_CLIENT_NAME);

    const mobileCard = screen.getByTestId('accountant-mobile-card');
    const card = within(mobileCard);

    // Find the h4 element inside the mobile card
    const heading = card.getByRole('heading', { level: 4 });
    expect(heading.className).toContain('truncate');
    expect(heading.className).toMatch(/max-w/);
  });
});
