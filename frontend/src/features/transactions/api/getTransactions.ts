import { api } from '../../../shared/lib/axios';
import type { Transaction, TransactionFilters } from '../types';

export interface PaginatedTransactions {
    data: Transaction[];
    nextCursor: string | null;
    hasMore: boolean;
}

export const getTransactions = async (
    filters?: TransactionFilters & { cursor?: string; limit?: number },
    signal?: AbortSignal
): Promise<PaginatedTransactions> => {
    // Axios will automatically inject the active workspace ID into the headers
    const response = await api.get('/transactions', { params: filters, signal });
    return response.data;
};
