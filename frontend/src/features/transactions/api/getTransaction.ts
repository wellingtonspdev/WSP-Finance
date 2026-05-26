import { api } from '../../../shared/lib/axios';
import type { Transaction } from '../types';

export const getTransaction = async (
    id: string,
    signal?: AbortSignal
): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}`, { signal });
    return response.data;
};
