import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Tipos
import type { Transaction, AIInsightForTransaction } from '../../../src/features/transactions/types';

// Componente a ser testado
import { TransactionAccordionItem } from '../../../src/features/transactions/components/TransactionAccordionItem';

// ── Mocks das dependências ──
vi.mock('../../../src/shared/hooks/useCapabilities', () => ({
  useCapabilities: vi.fn(),
}));

vi.mock('../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

import { useCapabilities } from '../../../src/shared/hooks/useCapabilities';
import { useWorkspaceStore } from '../../../src/shared/stores/useWorkspaceStore';

describe('TransactionAccordionItem & AI Insights Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock default returns
    (useCapabilities as any).mockReturnValue({
      canEdit: true,
      activeRole: 'OWNER',
    });

    (useWorkspaceStore as any).mockImplementation((selector: any) =>
      selector({ activeMembership: null })
    );
  });

  afterEach(() => {
    cleanup();
  });

  const makeInsight = (overrides?: Partial<AIInsightForTransaction>): AIInsightForTransaction => ({
    id: 'insight-001',
    transactionId: 'tx-001',
    severity: 'WARNING',
    code: 'TEST',
    message: 'Mensagem do Insight',
    reason: 'Motivo detalhado',
    confidence: 0.9,
    dismissed: false,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  });

  const makeTransaction = (overrides?: Partial<Transaction>): Transaction => ({
    id: 'tx-001',
    description: 'Transação Teste',
    amount: 100,
    date: '2026-05-01',
    type: 'EXPENSE',
    isPaid: true,
    status: 'COMPLETED',
    accountId: 1,
    categoryId: 1,
    workspaceId: 1,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  });

  // T01
  it('T01 — transação com aiInsight ativo mostra o badge ao expandir', () => {
    const tx = makeTransaction({ aiInsights: [makeInsight()] });
    render(<TransactionAccordionItem transaction={tx} />);

    // Expande o accordion
    const shortView = screen.getByText('Transação Teste');
    fireEvent.click(shortView);

    // O badge deve estar visível
    expect(screen.getByTestId('ai-insight-badge')).toBeInTheDocument();
    expect(screen.getByText('Mensagem do Insight')).toBeInTheDocument();
  });

  // T02
  it('T02 — transação sem insight não mostra badge ao expandir', () => {
    const tx = makeTransaction({ aiInsights: [] });
    render(<TransactionAccordionItem transaction={tx} />);

    // Expande o accordion
    const shortView = screen.getByText('Transação Teste');
    fireEvent.click(shortView);

    // O badge não deve estar presente
    expect(screen.queryByTestId('ai-insight-badge')).not.toBeInTheDocument();
  });

  // T03
  it('T03 — dismiss com sucesso chama callback e permite tratar a ocultação', async () => {
    const mockOnDismiss = vi.fn().mockResolvedValue(undefined);
    const tx = makeTransaction({ aiInsights: [makeInsight()] });

    render(
      <TransactionAccordionItem
        transaction={tx}
        onDismissInsight={mockOnDismiss}
      />
    );

    // Expande
    fireEvent.click(screen.getByText('Transação Teste'));

    // Clica em Ignorar
    const dismissBtn = screen.getByRole('button', { name: /ignorar/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith('insight-001');
    });
    // O TransactionHistoryPage invalidará a query e fará o refetch, ocultando o badge.
    // O Accordion apenas despacha o onDismissInsight, garantindo a integração.
  });

  // T04
  it('T04 — dismiss com falha mantém o alerta e mostra fallback seguro', async () => {
    let rejectPromise: (reason?: any) => void;
    const mockOnDismiss = vi.fn().mockReturnValue(new Promise<void>((_, reject) => {
      rejectPromise = reject;
    }));

    const tx = makeTransaction({ aiInsights: [makeInsight()] });

    render(
      <TransactionAccordionItem
        transaction={tx}
        onDismissInsight={mockOnDismiss}
      />
    );

    // Expande
    fireEvent.click(screen.getByText('Transação Teste'));

    // Clica em Ignorar
    const dismissBtn = screen.getByRole('button', { name: /ignorar/i });
    fireEvent.click(dismissBtn);

    // Rejeita a promessa de dismiss
    await act(async () => {
      rejectPromise!(new Error('API falhou'));
    });

    await waitFor(() => {
      // Mensagem de fallback aparece
      expect(screen.getByText(/não foi possível ignorar/i)).toBeInTheDocument();
    });
    // O badge continua visível
    expect(screen.getByTestId('ai-insight-badge')).toBeInTheDocument();
  });

  // T05
  it('T05 — VIEWER não vê o botão de dismiss', () => {
    (useCapabilities as any).mockReturnValue({
      canEdit: false,
      activeRole: 'VIEWER',
    });

    const tx = makeTransaction({ aiInsights: [makeInsight()] });
    render(<TransactionAccordionItem transaction={tx} />);

    // Expande
    fireEvent.click(screen.getByText('Transação Teste'));

    // O badge existe, mas o botão ignorar não
    expect(screen.getByTestId('ai-insight-badge')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ignorar/i })).not.toBeInTheDocument();
  });
});
