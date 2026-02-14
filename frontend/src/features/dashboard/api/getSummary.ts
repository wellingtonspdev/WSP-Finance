import { api } from '../../../shared/lib/axios';

export interface DashboardSummary {
  balance: { total: number };
  flow: { income: number; expense: number };
  metrics: { breakEvenPoint: number };
}

export async function getSummary(): Promise<DashboardSummary> {
  const response = await api.get('/dashboard/summary');
  return response.data;
}