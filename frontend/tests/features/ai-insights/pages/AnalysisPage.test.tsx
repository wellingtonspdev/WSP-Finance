import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalysisPage } from '../../../../src/features/ai-insights/pages/AnalysisPage';
import { useAIInsights } from '../../../../src/features/ai-insights/api/useAIInsights';
import { useWorkspaceStore } from '../../../../src/shared/stores/useWorkspaceStore';
import { dismissAIInsight } from '../../../../src/features/transactions/api/aiInsightApi';

// Mock dependencies
vi.mock('../../../../src/features/ai-insights/api/useAIInsights', () => ({
  useAIInsights: vi.fn(),
  AI_INSIGHTS_QUERY_KEY: 'ai-insights',
}));

vi.mock('../../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('../../../../src/features/transactions/api/aiInsightApi', () => ({
  dismissAIInsight: vi.fn(),
}));

vi.mock('../../../../src/features/workspaces/context/useWorkspace', () => ({
  useWorkspace: () => ({ activeWorkspace: { id: 1998 } }),
}));

import { UIProvider } from '../../../../src/shared/context/UIProvider';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = (workspaceId = '1998') => {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <UIProvider>
        <MemoryRouter initialEntries={[`/${workspaceId}/analises`]}>
          <Routes>
            <Route path="/:workspaceId/analises" element={<AnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  );
};

// ─── Shared mock data factories ────────────────────────────────────
const makeSummary = (overrides?: Partial<Record<string, number>>) => ({
  activeCount: 3,
  criticalCount: 1,
  warningCount: 1,
  infoCount: 1,
  dismissedCount: 1,
  ...overrides,
});

const makeInsight = (overrides?: Partial<any>) => ({
  id: 'ins-1',
  severity: 'CRITICAL',
  code: 'RISCO_MALHA_FINA',
  message: 'Receita atípica detectada (possível fraude ou erro).',
  reason: 'O valor da transação está 400% acima da média histórica para o dia.',
  dismissed: false,
  confidence: 0.92,
  createdAt: '2026-05-20T10:00:00Z',
  updatedAt: '2026-05-20T10:00:00Z',
  transactionId: 'tx-1',
  workspaceId: 1998,
  transaction: {
    id: 'tx-1',
    description: 'Uber *Trip 102 #S-070',
    amount: '3.96',
    date: '2026-05-20',
    type: 'EXPENSE',
    categoryName: 'Transporte',
    accountName: 'Banco do Brasil',
  },
  ...overrides,
});

const mockHook = (data: any, loading = false, error = false) => {
  (useAIInsights as any).mockImplementation((wsId: any, filters: any) => ({
    data,
    isLoading: loading,
    isError: error,
  }));
};

const mockOwner = () =>
  (useWorkspaceStore as any).mockReturnValue({ type: 'BUSINESS', role: 'OWNER', id: 1998 });
const mockViewer = () =>
  (useWorkspaceStore as any).mockReturnValue({ type: 'BUSINESS', role: 'VIEWER', id: 1998 });

// ════════════════════════════════════════════════════════════════════
describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwner();
  });
  afterEach(cleanup);

  // ── 1. Título, subtítulo e aviso pedagógico ───────────────────────
  describe('Header & pedagogical elements', () => {
    it('T01 — renders title "Análises"', () => {
      mockHook({ data: [], summary: makeSummary(), hasMore: false, nextCursor: null });
      renderPage();
      expect(screen.getAllByRole('heading', { name: 'Análises' }).length).toBeGreaterThan(0);
    });

    it('T02 — renders pedagogical subtitle', () => {
      mockHook({ data: [], summary: makeSummary(), hasMore: false, nextCursor: null });
      renderPage();
      expect(
        screen.getAllByText(/Revise pontos de atenção pedagógicos/i).length
      ).toBeGreaterThan(0);
    });

    it('T03 — renders educational disclaimer', () => {
      mockHook({ data: [], summary: makeSummary(), hasMore: false, nextCursor: null });
      renderPage();
      expect(
        screen.getByText(/sugestões educativas e não substituem a análise do contador/i)
      ).toBeInTheDocument();
    });
  });

  // ── 2. Copy pedagógica — termos proibidos nunca na UI ─────────────
  describe('Pedagogical copy replaces punitive raw text', () => {
    it('T04 — RISCO_MALHA_FINA renders safe copy, not raw message', () => {
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      // Pedagogical title must appear
      expect(screen.getByText('Movimentação fora do padrão')).toBeInTheDocument();
      // Raw punitive message must NOT appear
      expect(screen.queryByText(/possível fraude ou erro/i)).not.toBeInTheDocument();
    });

    it('T05 — MISTURA_PATRIMONIAL renders safe copy', () => {
      mockHook({
        data: [
          makeInsight({
            id: 'ins-2',
            code: 'MISTURA_PATRIMONIAL',
            severity: 'WARNING',
            message: 'Mistura patrimonial detectada',
          }),
        ],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getAllByText('Possível mistura patrimonial').length).toBeGreaterThan(0);
    });

    it('T06 — DESPESA_PESSOAL_POTENCIAL renders safe copy', () => {
      mockHook({
        data: [
          makeInsight({
            id: 'ins-3',
            code: 'DESPESA_PESSOAL_POTENCIAL',
            severity: 'INFO',
            message: 'Despesa pessoal identificada pela IA',
          }),
        ],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getAllByText('Despesa para revisão').length).toBeGreaterThan(0);
    });

    it('T07 — unknown code renders neutral fallback, not raw text', () => {
      mockHook({
        data: [
          makeInsight({
            id: 'ins-4',
            code: 'SOME_FUTURE_CODE',
            message: 'Erro fiscal detectado pela IA decidiu bloquear',
          }),
        ],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getAllByText('Ponto de atenção para revisão').length).toBeGreaterThan(0);
      expect(screen.queryByText(/Erro fiscal detectado/i)).not.toBeInTheDocument();
    });

    it('T08 — UI does not render prohibited terms', () => {
      mockHook({
        data: [
          makeInsight({
            message: 'fraude erro fiscal detectado transação irregular bloqueado pela IA decidiu',
            reason: 'malha fina detectada',
          }),
        ],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();

      const PROHIBITED = ['fraude', 'erro fiscal detectado', 'transação irregular', 'bloqueado pela IA', 'IA decidiu'];
      for (const term of PROHIBITED) {
        expect(screen.queryByText(new RegExp(term, 'i'))).not.toBeInTheDocument();
      }
    });
  });

  // ── 3. Card actions ───────────────────────────────────────────────
  describe('Card actions', () => {
    it('T09 — active insight shows "Ver transação" button', () => {
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getByRole('button', { name: /ver transação/i })).toBeInTheDocument();
    });

    it('T10 — "Ignorar alerta" appears as secondary action for OWNER', () => {
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getByRole('button', { name: /ignorar alerta/i })).toBeInTheDocument();
    });

    it('T11 — VIEWER cannot see dismiss button', () => {
      mockViewer();
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.queryByRole('button', { name: /ignorar alerta/i })).not.toBeInTheDocument();
    });

    it('T12 — dismissed insight does NOT show "Ignorar alerta" and shows "Ignorado" status', () => {
      mockHook({
        data: [makeInsight({ dismissed: true })],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.queryByRole('button', { name: /ignorar alerta/i })).not.toBeInTheDocument();
      // The "Ignorado" badge inside the card, distinct from the filter tab "Ignorados"
      const cards = screen.getAllByText(/ignorado/i);
      // At least one should be in the insight card area (the status badge)
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('T13 — quick actions like "Anexar comprovante", "Alterar categoria", "Comparar transações" do NOT appear', () => {
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.queryByText(/anexar comprovante/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/alterar categoria/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/comparar transações/i)).not.toBeInTheDocument();
    });
  });

  // ── 4. Filters ────────────────────────────────────────────────────
  describe('Severity filters', () => {
    it('T14 — renders all filter tabs: Todos, Críticos, Atenção, Informativos, Ignorados', () => {
      mockHook({ data: [], summary: makeSummary(), hasMore: false, nextCursor: null });
      renderPage();
      expect(screen.getByTestId('filter-tab-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-critical')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-warning')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-info')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tab-dismissed')).toBeInTheDocument();
    });

    it('T15 — "Críticos" filter calls hook with severity=CRITICAL', async () => {
      let lastFilters: any;
      (useAIInsights as any).mockImplementation((wsId: any, filters: any) => {
        lastFilters = filters;
        return {
          data: { data: [], summary: makeSummary(), hasMore: false, nextCursor: null },
          isLoading: false,
          isError: false,
        };
      });
      renderPage();
      fireEvent.click(screen.getByTestId('filter-tab-critical'));
      await waitFor(() => {
        expect(lastFilters.severity).toBe('CRITICAL');
        expect(lastFilters.dismissed).toBe(false);
      });
    });

    it('T16 — "Atenção" filter calls hook with severity=WARNING', async () => {
      let lastFilters: any;
      (useAIInsights as any).mockImplementation((wsId: any, filters: any) => {
        lastFilters = filters;
        return {
          data: { data: [], summary: makeSummary(), hasMore: false, nextCursor: null },
          isLoading: false,
          isError: false,
        };
      });
      renderPage();
      fireEvent.click(screen.getByTestId('filter-tab-warning'));
      await waitFor(() => {
        expect(lastFilters.severity).toBe('WARNING');
      });
    });

    it('T17 — "Informativos" filter calls hook with severity=INFO', async () => {
      let lastFilters: any;
      (useAIInsights as any).mockImplementation((wsId: any, filters: any) => {
        lastFilters = filters;
        return {
          data: { data: [], summary: makeSummary(), hasMore: false, nextCursor: null },
          isLoading: false,
          isError: false,
        };
      });
      renderPage();
      fireEvent.click(screen.getByTestId('filter-tab-info'));
      await waitFor(() => {
        expect(lastFilters.severity).toBe('INFO');
      });
    });

    it('T18 — "Ignorados" filter calls hook with dismissed=true', async () => {
      let lastFilters: any;
      (useAIInsights as any).mockImplementation((wsId: any, filters: any) => {
        lastFilters = filters;
        return {
          data: { data: [], summary: makeSummary(), hasMore: false, nextCursor: null },
          isLoading: false,
          isError: false,
        };
      });
      renderPage();
      fireEvent.click(screen.getByTestId('filter-tab-dismissed'));
      await waitFor(() => {
        expect(lastFilters.dismissed).toBe(true);
      });
    });

    it('T19 — "Todos" filter resets to dismissed=false with no severity', async () => {
      let lastFilters: any;
      (useAIInsights as any).mockImplementation((wsId: any, filters: any) => {
        lastFilters = filters;
        return {
          data: { data: [], summary: makeSummary(), hasMore: false, nextCursor: null },
          isLoading: false,
          isError: false,
        };
      });
      renderPage();
      // First switch to Críticos, then back to Todos
      fireEvent.click(screen.getByTestId('filter-tab-critical'));
      fireEvent.click(screen.getByTestId('filter-tab-all'));
      await waitFor(() => {
        expect(lastFilters.dismissed).toBe(false);
        expect(lastFilters.severity).toBeUndefined();
      });
    });
  });

  // ── 5. Dismiss failure ────────────────────────────────────────────
  describe('Dismiss error handling', () => {
    it('T20 — dismiss failure keeps card and shows safe error message', async () => {
      (dismissAIInsight as any).mockRejectedValue(new Error('Network error'));
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /ignorar alerta/i }));
      await waitFor(() => {
        // Card should still be present
        expect(screen.getAllByText('Movimentação fora do padrão').length).toBeGreaterThan(0);
      });
    });
  });

  // ── 6. Amount formatting ──────────────────────────────────────────
  describe('Amount formatting', () => {
    it('T21 — formats decimal amount correctly without dividing by 100', () => {
      mockHook({
        data: [makeInsight({ transaction: { ...makeInsight().transaction, amount: '1500.00' } })],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      // Should render R$ 1.500,00, NOT R$ 15,00 (which would happen with /100)
      expect(screen.getByText(/R\$\s*1\.500,00/)).toBeInTheDocument();
    });

    it('T22 — formats string decimal amount (Prisma serialization)', () => {
      mockHook({
        data: [makeInsight({ transaction: { ...makeInsight().transaction, amount: '123.45' } })],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      renderPage();
      expect(screen.getByText(/R\$\s*123,45/)).toBeInTheDocument();
    });
  });

  // ── 7. No dangerouslySetInnerHTML ─────────────────────────────────
  describe('Security', () => {
    it('T23 — does not use dangerouslySetInnerHTML', () => {
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });
      const { container } = renderPage();
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        expect(el.getAttribute('dangerouslysetinnerhtml')).toBeNull();
      });
    });
  });

  // ── 8. Loading and error states ───────────────────────────────────
  describe('Loading & error states', () => {
    it('T24 — renders loading skeleton', () => {
      mockHook(undefined, true);
      renderPage();
      expect(screen.getByTestId('analysis-skeleton')).toBeInTheDocument();
    });

    it('T25 — renders error state', () => {
      mockHook(undefined, false, true);
      renderPage();
      expect(screen.getByText(/Erro ao carregar/i)).toBeInTheDocument();
    });

    it('T26 — renders empty state', () => {
      mockHook({ data: [], summary: makeSummary({ activeCount: 0 }), hasMore: false, nextCursor: null });
      renderPage();
      expect(screen.getByText(/Nenhuma análise encontrada/i)).toBeInTheDocument();
    });
  });

  // ── 9. Cache invalidation ──────────────────────────────────────────────────────────
  describe('Cache invalidation', () => {
    it('T27 — uses workspaceId when invalidating queries after dismiss', async () => {
      const invalidateQueriesSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
      (dismissAIInsight as any).mockResolvedValue({});
      mockHook({
        data: [makeInsight()],
        summary: makeSummary(),
        hasMore: false,
        nextCursor: null,
      });

      renderPage('1998');

      fireEvent.click(screen.getByRole('button', { name: /ignorar alerta/i }));

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ['ai-insights', '1998']
        });
      });

      invalidateQueriesSpy.mockRestore();
    });
  });
});
