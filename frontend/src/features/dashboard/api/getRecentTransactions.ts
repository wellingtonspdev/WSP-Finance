import { api } from '../../../shared/lib/axios';

export interface Transaction {
  id: string;
  description: string;
  amount: string; // Vem como string do backend (Decimal)
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: { name: string; icon?: string };
  attachmentUrl?: string;
}

export async function getRecentTransactions(signal?: AbortSignal): Promise<Transaction[]> {
  // Limitando a 5 para o dashboard
  const response = await api.get('/transactions', { params: { limit: 5 }, signal });
  // O backend agora retorna { data, nextCursor, hasMore }
  return response.data.data;
}