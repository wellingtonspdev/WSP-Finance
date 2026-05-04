// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDashboardPage } from '../../src/features/admin/routes/AdminDashboardPage';
import { api } from '../../src/shared/lib/axios';

vi.mock('../../src/shared/lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => ({
    user: { name: 'Admin User' },
  }),
}));

const mockMetrics = {
  totalUsers: 150,
  totalWorkspaces: 20,
  totalAdmins: 2,
  totalTransactions: 5000,
  pendingMovements: 45,
  pendingInvites: 5,
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
      // No config passed to get() since we don't want to pass custom headers manually here.
      // The Axios interceptor logic handles removing x-workspace-id for /admin in actual runtime.
      const callArgs = vi.mocked(api.get).mock.calls[0];
      // Assert that we called the correct endpoint without any weird query params or manual headers
      expect(callArgs[0]).toBe('/admin/metrics');
      if (callArgs[1]) {
        expect(callArgs[1].headers?.['x-workspace-id']).toBeUndefined();
      }
    });
  });
});
