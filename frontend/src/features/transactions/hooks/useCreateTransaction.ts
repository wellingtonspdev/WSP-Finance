import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTransaction } from '../api/createTransaction';
import type { CreateTransactionDTO } from '../types';
import { queryKeys } from '../../../config/queryKeys';
import { useWorkspaceStore } from '../../../shared/stores/useWorkspaceStore';

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();
    const activeWorkspaceId = useWorkspaceStore(state => state.activeWorkspaceId);

    return useMutation({
        mutationFn: (data: CreateTransactionDTO) => createTransaction(data),
        onSuccess: async () => {
            // Invalidate both transactions list and dashboard summary
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            if (activeWorkspaceId) {
                const dashboardQueryKey = queryKeys.dashboard.metrics(activeWorkspaceId);
                queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
                await queryClient.refetchQueries({ queryKey: dashboardQueryKey });
            }
        }
    });
};
