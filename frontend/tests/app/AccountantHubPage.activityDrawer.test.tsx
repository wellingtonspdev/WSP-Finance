// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    },
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
];

function buildPayload() {
  return {
    id: 1,
    name: 'Contador Teste',
    email: 'contador@wsp.finance',
    type: 'ACCOUNTANT' as const,
    memberships: [
      { id: 3, name: 'Empresa Alpha', type: 'BUSINESS' as const, role: 'ACCOUNTANT' as const, closedUntil: null },
    ],
    dashboardCache: baseDashboardCache,
  };
}

async function renderHub() {
  localStorage.setItem('wsp_refresh_token', 'test-token');

  vi.mocked(api.patch).mockResolvedValue({
    data: { token: 'tk', refreshToken: 'rt' },
  } as never);

  vi.mocked(api.get).mockResolvedValue({
    data: buildPayload(),
  } as never);

  render(
    <MemoryRouter>
      <AuthProvider>
        <AccountantHubPage />
      </AuthProvider>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getAllByText('Empresa Alpha').length).toBeGreaterThanOrEqual(1);
  });
}

describe('AccountantHubPage - Activity Drawer', () => {
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

  // T01 — Renderiza botão "Atividades Recentes"
  it('renders the "Atividades Recentes" button with a badge count', async () => {
    await renderHub();

    const btn = screen.getByRole('button', { name: /atividades recentes/i });
    expect(btn).toBeInTheDocument();

    // Badge shows the mock event count (4 events)
    expect(btn.textContent).toContain('4');
  });

  // T02 — Drawer não aparece inicialmente
  it('does not render the drawer dialog initially', async () => {
    await renderHub();

    expect(screen.queryByRole('dialog', { name: /atividades recentes/i })).not.toBeInTheDocument();
  });

  // T03 — Clicar no botão abre drawer
  it('opens the drawer when the button is clicked', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));

    expect(screen.getByRole('dialog', { name: /atividades recentes/i })).toBeInTheDocument();
  });

  // T04 — Drawer exibe atividades atuais
  it('shows current activity events inside the drawer', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));

    expect(screen.getByText(/Malha fina evitada/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech Solutions/i)).toBeInTheDocument();
    expect(screen.getByText(/Agência Criativa/i)).toBeInTheDocument();
    expect(screen.getByText(/Conciliação OFX finalizada/i)).toBeInTheDocument();
  });

  // T05 — Fechar pelo botão X
  it('closes the drawer when the X button is clicked', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));
    expect(screen.getByRole('dialog', { name: /atividades recentes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fechar atividades recentes/i }));

    expect(screen.queryByRole('dialog', { name: /atividades recentes/i })).not.toBeInTheDocument();
  });

  // T06 — Fechar por Escape
  it('closes the drawer when Escape is pressed', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));
    expect(screen.getByRole('dialog', { name: /atividades recentes/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /atividades recentes/i })).not.toBeInTheDocument();
  });

  // T07 — Fechar por backdrop
  it('closes the drawer when the backdrop is clicked', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));
    expect(screen.getByRole('dialog', { name: /atividades recentes/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('activities-backdrop'));

    expect(screen.queryByRole('dialog', { name: /atividades recentes/i })).not.toBeInTheDocument();
  });

  // T08 — Lista mantém scroll interno
  it('has an internally scrollable container for activities', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));

    const scrollContainer = screen.getByTestId('activities-scroll-container');
    expect(scrollContainer.className).toContain('overflow-y-auto');
  });

  // T09 — Acessibilidade básica
  it('drawer has correct accessibility attributes', async () => {
    await renderHub();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));

    const dialog = screen.getByRole('dialog', { name: /atividades recentes/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Atividades Recentes');

    const closeBtn = screen.getByRole('button', { name: /fechar atividades recentes/i });
    expect(closeBtn).toHaveAttribute('aria-label', 'Fechar atividades recentes');
  });

  // T10 — Torre de Comando preservada
  it('preserves "Torre de Comando" after opening and closing the drawer', async () => {
    await renderHub();

    expect(screen.getByText('Torre de Comando')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));
    expect(screen.getByText('Torre de Comando')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /fechar atividades recentes/i }));
    expect(screen.getByText('Torre de Comando')).toBeInTheDocument();
  });

  // T11 — Não cria nova chamada de API para atividades
  it('does not trigger a new API call when opening the drawer', async () => {
    await renderHub();

    // Clear call counts after initial render
    vi.mocked(api.get).mockClear();
    vi.mocked(api.post).mockClear();

    fireEvent.click(screen.getByRole('button', { name: /atividades recentes/i }));

    // Wait a tick to catch any async API calls
    await new Promise(r => setTimeout(r, 50));

    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});
