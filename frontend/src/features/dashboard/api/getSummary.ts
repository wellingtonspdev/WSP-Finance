import { api } from '../../../shared/lib/axios';

export interface DashboardSummary {
  balance: { total: number };
  flow: { income: number; expense: number };
  metrics: { breakEvenPoint: number };
}

export async function getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  const response = await api.get('/dashboard/summary', { signal });
  return response.data;
}