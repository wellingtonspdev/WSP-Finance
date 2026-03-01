import { api } from '../../../shared/lib/axios';
import type { Transaction, TransactionFilters } from '../types';

export const getTransactions = async (filters?: TransactionFilters): Promise<Transaction[]> => {
    // Axios will automatically inject the active workspace ID into the headers
    const response = await api.get('/transactions', { params: filters });
    return response.data;
};
