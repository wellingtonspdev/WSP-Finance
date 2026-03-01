import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTransaction } from '../api/createTransaction';
import type { CreateTransactionDTO } from '../types';

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTransactionDTO) => createTransaction(data),
        onSuccess: () => {
            // Invalidate both transactions list and dashboard summary
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
        }
    });
};
