import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getAccounts } from '../api/getAccounts';

export const useAccounts = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();

    return useQuery({
        queryKey: ['accounts', workspaceId],
        queryFn: getAccounts,
        enabled: !!workspaceId,
    });
};
