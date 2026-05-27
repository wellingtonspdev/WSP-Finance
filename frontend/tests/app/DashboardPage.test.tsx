// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DashboardPage } from '../../src/features/dashboard/routes/DashboardPage';
import { api } from '../../src/shared/lib/axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/app/AuthProvider';
import { UIProvider } from '../../src/shared/context/UIProvider';

vi.mock('../../src/shared/lib/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'João' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/features/workspaces/context/useWorkspace', () => ({
  useWorkspace: () => ({
    workspaces: [{ id: 'biz-123', name: 'Empresa', type: 'BUSINESS' }],
    activeWorkspace: { id: 'biz-123', name: 'Empresa', type: 'BUSINESS' },
    setActiveWorkspace: vi.fn(),
  }),
}));

vi.mock('../../src/shared/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ canEdit: true, canViewAuditBanner: false }),
}));



const mockSummaryZero = {
  balance: { total: 0 },
  flow: { income: 0, expense: 0 },
  metrics: { breakEvenPoint: 0 },
};

const mockTransactions = {
  data: [],
  nextCursor: null,
  hasMore: false,
};

function renderDashboard(workspaceId = 'biz-123') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[`/${workspaceId}/dashboard`]}>
            <Routes>
              <Route path="/:workspaceId/dashboard" element={<DashboardPage />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

describe('DashboardPage - Phase 2 Transição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1: Dashboard renderiza skeleton/loading quando summary ainda não chegou', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {})); // Never resolves

    renderDashboard();

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
    const fallbackZeros = screen.queryAllByText(/0,00/i);
    expect(fallbackZeros).toHaveLength(0); // Não deve mostrar 0,00 enquanto carrega
  });

  it('T2: Dashboard renderiza R$ 0,00 somente quando a API respondeu zero real', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/dashboard/summary') return { data: mockSummaryZero };
      if (url === '/transactions') return { data: mockTransactions };
      return { data: {} };
    });

    renderDashboard();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
      expect(screen.queryAllByText(/0/).length).toBeGreaterThan(0);
    });
  });

  it('T3: Dashboard renderiza erro/retry quando summary falha e não mascara como zero', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/dashboard/summary') throw new Error('Failed');
      return { data: mockTransactions };
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar resumo/i)).toBeInTheDocument();
      // Não deve mascarar o erro com saldo 0
      const fallbackZeros = screen.queryAllByText(/0/);
      expect(fallbackZeros).toHaveLength(0);
    });
  });
});
