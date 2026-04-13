import { api } from '../../../shared/lib/axios';
import type { CreateTransactionDTO, Transaction } from '../types';

export const createTransaction = async (data: CreateTransactionDTO): Promise<Transaction> => {
    const response = await api.post('/transactions', data);
    return response.data;
};
