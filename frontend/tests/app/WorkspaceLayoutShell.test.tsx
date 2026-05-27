// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '../../src/features/dashboard/routes/DashboardPage';
import { TransactionHistoryPage } from '../../src/features/transactions/pages/TransactionHistoryPage';
import { DocumentsPage } from '../../src/features/workspaces/routes/DocumentsPage';
import { TeamSettingsPage } from '../../src/features/workspaces/routes/TeamSettingsPage';
import { AnalysisPage } from '../../src/features/ai-insights/pages/AnalysisPage';
import { UIProvider } from '../../src/shared/context/UIProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/shared/lib/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../src/app/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'User' } }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/features/workspaces/context/useWorkspace', () => ({
  useWorkspace: () => ({ workspaces: [], activeWorkspace: null }),
}));

vi.mock('../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(() => ({
    activeMembership: { id: 'wks-123', role: 'OWNER', type: 'BUSINESS' },
  })),
}));

vi.mock('../../src/features/transactions/hooks/useTransactions', () => ({
  useTransactions: () => ({
    data: { pages: [{ data: [] }] },
    isLoading: false,
    isError: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock('../../src/features/ai-insights/api/useAIInsights', () => ({
  useAIInsights: () => ({
    data: { data: [], summary: { activeCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, dismissedCount: 0 } },
    isLoading: false,
    isError: false,
  }),
}));

const renderWithProviders = (initialRoute: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/:workspaceId/dashboard" element={<DashboardPage />} />
            <Route path="/:workspaceId/transactions" element={<TransactionHistoryPage />} />
            <Route path="/:workspaceId/documents" element={<DocumentsPage />} />
            <Route path="/:workspaceId/team" element={<TeamSettingsPage />} />
            <Route path="/:workspaceId/analises" element={<AnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  );
};

const getSidebar = (container: HTMLElement): HTMLElement => {
  const sidebar = container.querySelector('aside');
  expect(sidebar).toBeInTheDocument();
  return sidebar as HTMLElement;
};

const hasTextInside = (root: HTMLElement, text: string): boolean =>
  screen.getAllByText(text).some((element) => root.contains(element));

beforeEach(() => {
  localStorage.removeItem('wsp_sidebar_collapsed');
});

describe('Workspace Layout Shell (real route page shape)', () => {
  describe('Sidebar Content & Navigation', () => {
    it('renders Sidebar from the routed page and preserves workspace navigation items', () => {
      const { container } = renderWithProviders('/wks-123/dashboard');
      const sidebar = getSidebar(container);

      expect(hasTextInside(sidebar, 'Dashboard')).toBe(true);
      expect(hasTextInside(sidebar, 'Extrato')).toBe(true);
      expect(hasTextInside(sidebar, 'Documentos')).toBe(true);
      expect(hasTextInside(sidebar, 'Equipe')).toBe(true);
      expect(hasTextInside(sidebar, 'Análises')).toBe(true);
      expect(hasTextInside(sidebar, 'Nova Transação')).toBe(true);
    });

    it('shows Dashboard as active on /dashboard', () => {
      const { container } = renderWithProviders('/wks-123/dashboard');
      const sidebar = getSidebar(container);
      const button = Array.from(sidebar.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes('Dashboard')
      );

      expect(button).toHaveClass('bg-white/10');
    });

    it('shows Extrato as active on /transactions', () => {
      const { container } = renderWithProviders('/wks-123/transactions');
      const sidebar = getSidebar(container);
      const button = Array.from(sidebar.querySelectorAll('button')).find((candidate) =>
        candidate.textContent?.includes('Extrato')
      );

      expect(button).toHaveClass('bg-white/10');
    });
  });

  describe('Sidebar Collapse Behavior', () => {
    it('has a toggle button with aria-label and aria-expanded', () => {
      renderWithProviders('/wks-123/dashboard');
      const toggleButton = screen.getAllByLabelText(/recolher menu lateral/i)[0];

      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses and expands the sidebar when toggle button is clicked', () => {
      renderWithProviders('/wks-123/dashboard');
      const toggleButton = screen.getAllByLabelText(/recolher menu lateral/i)[0];

      fireEvent.click(toggleButton);

      const expandButton = screen.getAllByLabelText(/expandir menu lateral/i)[0];
      expect(expandButton).toBeInTheDocument();
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(expandButton);
      expect(screen.getAllByLabelText(/recolher menu lateral/i)[0]).toBeInTheDocument();
    });
  });
});
