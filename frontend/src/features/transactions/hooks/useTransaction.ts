import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getTransaction } from '../api/getTransaction';
import { queryKeys } from '../../../config/queryKeys';

export const useTransaction = (transactionId: string | null) => {
    const { workspaceId } = useParams<{ workspaceId: string }>();

    return useQuery({
        queryKey: [...queryKeys.transactions.all(workspaceId || 'null'), 'detail', transactionId],
        queryFn: ({ signal }) => getTransaction(transactionId!, signal),
        enabled: !!workspaceId && !!transactionId,
        staleTime: 1000 * 60 * 5, // 5 min
    });
};
