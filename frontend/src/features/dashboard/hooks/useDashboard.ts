import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getSummary } from '../api/getSummary';
import { getRecentTransactions } from '../api/getRecentTransactions';
import { queryKeys } from '../../../config/queryKeys';

export function useDashboard() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const summary = useQuery({
    queryKey: queryKeys.dashboard.metrics(workspaceId || 'null'),
    queryFn: ({ signal }) => getSummary(signal),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const transactions = useQuery({
    // Factory aproveitando o namespace de transações
    queryKey: [...queryKeys.transactions.all(workspaceId || 'null'), 'recent'],
    queryFn: ({ signal }) => getRecentTransactions(signal),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  return {
    isLoading: summary.isLoading || transactions.isLoading,
    summary: summary.data,
    transactions: transactions.data,
    error: summary.error || transactions.error,
  };
}