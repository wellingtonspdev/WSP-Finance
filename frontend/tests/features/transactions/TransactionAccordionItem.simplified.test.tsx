import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Transaction } from '../../../src/features/transactions/types';
import { TransactionAccordionItem } from '../../../src/features/transactions/components/TransactionAccordionItem';

vi.mock('../../../src/shared/hooks/useCapabilities', () => ({
  useCapabilities: vi.fn(() => ({ canEdit: true, activeRole: 'OWNER' })),
}));

vi.mock('../../../src/shared/stores/useWorkspaceStore', () => ({
  useWorkspaceStore: vi.fn((selector: any) => selector({ activeMembership: null })),
}));

describe('TransactionAccordionItem simplificado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const transaction: Transaction = {
    id: 'tx-001',
    description: 'Venda marketplace sem imposto',
    amount: 900,
    date: '2026-05-31',
    type: 'INCOME',
    isPaid: true,
    status: 'COMPLETED',
    accountId: 1,
    categoryId: 1,
    workspaceId: 3,
    category: { name: 'Vendas', icon: 'shopping-bag', color: '#22c55e' },
    grossAmount: 1000,
    marketplaceFee: 80,
    shippingCost: 20,
    productCost: 300,
    taxAmount: null as unknown as number,
    netValue: null as unknown as number,
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z',
  };

  it('nao destaca conta na linha principal', () => {
    render(<TransactionAccordionItem transaction={transaction} />);

    expect(screen.getByText('Categoria: Vendas')).toBeInTheDocument();
    expect(screen.getByText(/31 de mai\. de 2026/i)).toBeInTheDocument();
    expect(screen.queryByText(/Conta:/i)).not.toBeInTheDocument();
  });

  it('nao mostra imposto nem total liquido quando valores estao nulos', () => {
    render(<TransactionAccordionItem transaction={transaction} defaultExpanded />);

    expect(screen.queryByText(/Imposto Calculado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Líquido/i)).not.toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});
