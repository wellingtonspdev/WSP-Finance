import { useQuery } from '@tanstack/react-query';
import { getSummary } from '../api/getSummary';
import { getRecentTransactions } from '../api/getRecentTransactions';
import { useWorkspace } from '../../workspaces/context/WorkspaceProvider';

export function useDashboard() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const summary = useQuery({
    queryKey: ['dashboard-summary', workspaceId],
    queryFn: getSummary,
    enabled: !!workspaceId,
  });

  const transactions = useQuery({
    queryKey: ['recent-transactions', workspaceId],
    queryFn: getRecentTransactions,
    enabled: !!workspaceId,
  });

  return {
    isLoading: summary.isLoading || transactions.isLoading,
    summary: summary.data,
    transactions: transactions.data,
    error: summary.error || transactions.error,
  };
}