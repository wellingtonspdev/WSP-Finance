import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateTransaction } from '../../../src/features/transactions/hooks/useCreateTransaction';
import { createTransaction } from '../../../src/features/transactions/api/createTransaction';
import { useWorkspaceStore } from '../../../src/shared/stores/useWorkspaceStore';

vi.mock('../../../src/features/transactions/api/createTransaction', () => ({
  createTransaction: vi.fn(),
}));

describe('useCreateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createTransaction).mockResolvedValue({ id: 'tx-001' } as any);
    useWorkspaceStore.setState({
      activeWorkspaceId: 3,
      activeMembership: null,
      memberships: [],
      isLoadingMetadata: false,
      isForbidden: false,
    });
  });

  it('invalida extrato, contas e metricas do dashboard do workspace ativo', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/3/dashboard']}>
          <Routes>
            <Route path="/:workspaceId/dashboard" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    result.current.mutate({
      description: 'Venda teste',
      amount: 100,
      date: '2026-06-02',
      type: 'INCOME',
      categoryId: 1,
      isPaid: true,
    });

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['transactions'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['accounts'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard-metrics', '3'] });
      expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ['dashboard-metrics', '3'] });
    });
  });
});
