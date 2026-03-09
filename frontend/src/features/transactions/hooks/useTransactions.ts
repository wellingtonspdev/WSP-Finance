import { useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getTransactions } from '../api/getTransactions';
import type { TransactionFilters } from '../types';
import { queryKeys } from '../../../config/queryKeys';

export const useTransactions = (filters?: TransactionFilters) => {
    const { workspaceId } = useParams<{ workspaceId: string }>();

    return useInfiniteQuery({
        // Segmentação Implícita: A key sempre força cache distinto por cliente
        queryKey: [...queryKeys.transactions.all(workspaceId || 'null'), filters],
        // TanStack Data-fetching c/ AbortSignal nativo: ao invalidar, interrompe rede.
        queryFn: ({ signal, pageParam }) =>
            getTransactions({ ...filters, cursor: pageParam, limit: 20 }, signal),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
        enabled: !!workspaceId,
        staleTime: 1000 * 60 * 5, // 5 min de freshness local
    });
};
