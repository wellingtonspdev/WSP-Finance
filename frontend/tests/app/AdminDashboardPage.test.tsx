// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDashboardPage } from '../../src/features/admin/routes/AdminDashboardPage';
import { api } from '../../src/shared/lib/axios';

vi.mock('../../src/shared/lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockLogout = vi.fn();
vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => ({
    user: { name: 'Admin User' },
    logout: mockLogout,
  }),
}));

const mockMetrics = {
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
};

const mockPiiData = {
  ...mockMetrics,
  name: 'Wellington PII',
  email: 'wellington@pii.com',
  cpf: '123.456.789-00',
  cnpj: '12.345.678/0001-90',
  amount: 99999.99,
  description: 'Secret Transaction',
  attachmentUrl: 'https://secret.com/file.pdf',
  users: [{ id: 1, name: 'Secret User' }],
  transactions: [{ id: 1, value: 100 }],
};

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T6: Quando API retorna 200 com PlatformMetrics, renderiza cards com métricas', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // totalUsers
      expect(screen.getByText('20')).toBeInTheDocument(); // totalWorkspaces
      expect(screen.getByText('2')).toBeInTheDocument(); // totalAdmins
      expect(screen.getByText('5000')).toBeInTheDocument(); // totalTransactions
      expect(screen.getByText('45')).toBeInTheDocument(); // pendingMovements
      expect(screen.getByText('5')).toBeInTheDocument(); // pendingInvites
    });
  });

  it('T7: Quando API retorna 200, generatedAt é validado de forma estável', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Validate that some form of "Atualizado em" or date is present
      const generatedAtElement = screen.getByTestId('generated-at');
      expect(generatedAtElement).toBeInTheDocument();
      expect(generatedAtElement.textContent).not.toBe('');
      // Check if it's a valid date formatting (it should have numbers and maybe some separator)
      expect(generatedAtElement.textContent).toMatch(/\d{2}/);
    });
  });

  it('T8: Quando página monta, estado de loading é exibido', async () => {
    // Retorna uma promise que nao resolve imediatamente para vermos o loading
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-loading')).toBeInTheDocument();
  });

  it('T9: Quando API retorna 500, renderiza mensagem de erro genérico', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 500 } });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Ocorreu um erro ao carregar as métricas/i)).toBeInTheDocument();
    });
  });

  it('T10: Quando API retorna 403, renderiza mensagem amigável de acesso negado', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({ response: { status: 403 } });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Acesso negado/i)).toBeInTheDocument();
    });
  });

  it('T11: Dado mock de API retornando campos extras (PII), provar que PII NÃO aparecem no DOM', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockPiiData });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toContain('Wellington PII');
    expect(bodyText).not.toContain('wellington@pii.com');
    expect(bodyText).not.toContain('123.456.789-00');
    expect(bodyText).not.toContain('12.345.678/0001-90');
    expect(bodyText).not.toContain('99999.99');
    expect(bodyText).not.toContain('Secret Transaction');
    expect(bodyText).not.toContain('https://secret.com/file.pdf');
    expect(bodyText).not.toContain('Secret User');
  });

  it('T15: Confirmar que a chamada GET /admin/metrics não depende nem envia x-workspace-id no header', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/metrics');
      const callArgs = vi.mocked(api.get).mock.calls[0];
      expect(callArgs[0]).toBe('/admin/metrics');
      if (callArgs[1]) {
        expect(callArgs[1].headers?.['x-workspace-id']).toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Refresh Button Tests (Follow-up UX)
  // ═══════════════════════════════════════════════════════════════

  it('T16: Renderiza botão "Atualizar métricas" após carregamento inicial', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-refresh-btn')).toBeInTheDocument();
      expect(screen.getByTestId('admin-refresh-btn')).toHaveTextContent('Atualizar métricas');
    });
  });

  it('T17: Clique no botão chama novamente GET /admin/metrics e atualiza cards', async () => {
    const updatedMetrics = {
      platform: { totalUsers: 200, totalWorkspaces: 30, totalAdmins: 3 },
      activity: { totalTransactions: 7000, pendingMovements: 10, pendingInvites: 2 },
      generatedAt: '2026-05-04T14:00:00Z',
    };

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockResolvedValueOnce({ data: updatedMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    // Espera carregamento inicial
    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-refresh-btn'));

    // Verifica que a API foi chamada 2x e os novos valores aparecem
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('7000')).toBeInTheDocument();
    });
  });

  it('T18: Botão fica desabilitado e mostra "Atualizando..." durante refresh', async () => {
    let resolveRefresh!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => { resolveRefresh = resolve; });

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockImplementationOnce(() => pendingPromise as any);

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-refresh-btn'));

    // Botão deve estar desabilitado e com texto de loading
    const btn = screen.getByTestId('admin-refresh-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Atualizando...');

    // Resolve para limpar
    resolveRefresh({ data: mockMetrics });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('T19: Refresh atualiza generatedAt', async () => {
    const updatedMetrics = {
      ...mockMetrics,
      generatedAt: '2026-05-04T18:30:00Z',
    };

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockResolvedValueOnce({ data: updatedMetrics });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('generated-at')).toBeInTheDocument());
    const initialTimestamp = screen.getByTestId('generated-at').textContent;

    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-refresh-btn'));

    await waitFor(() => {
      const updatedTimestamp = screen.getByTestId('generated-at').textContent;
      expect(updatedTimestamp).not.toBe(initialTimestamp);
    });
  });

  it('T20: Erro 500 no refresh exibe mensagem amigável e preserva dados anteriores', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockRejectedValueOnce({ response: { status: 500 } });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-refresh-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-refresh-error')).toBeInTheDocument();
    });

    // Dados anteriores preservados
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5000')).toBeInTheDocument();
  });

  it('T21: Erro 403 no refresh exibe mensagem de acesso negado', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockRejectedValueOnce({ response: { status: 403 } });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('150')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('admin-refresh-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('admin-refresh-error')).toBeInTheDocument();
      expect(screen.getByTestId('admin-refresh-error').textContent).toMatch(/Acesso negado/i);
    });
  });
});
