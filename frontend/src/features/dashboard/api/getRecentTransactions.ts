import { api } from '../../../shared/lib/axios';

export interface Transaction {
  id: string;
  description: string;
  amount: string; // Vem como string do backend (Decimal)
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: { name: string; icon?: string };
}

export async function getRecentTransactions(): Promise<Transaction[]> {
  // Limitando a 5 para o dashboard
  const response = await api.get('/transactions?limit=5');
  return response.data;
}