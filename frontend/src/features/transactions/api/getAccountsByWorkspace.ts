import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';
import type { Account } from './getAccounts';

export const getAccountsByWorkspaceId = async (workspaceId: number | null): Promise<Account[]> => {
    if (!workspaceId) return [];
    // We send the explicit workspace ID in the headers just for this request to override the `axios.defaults`
    const response = await api.get('/accounts', {
        headers: { 'x-workspace-id': workspaceId.toString() }
    });
    return response.data;
};

export const useAccountsByWorkspace = (workspaceId: number | null) => {
    return useQuery({
        queryKey: ['accounts', workspaceId],
        queryFn: () => getAccountsByWorkspaceId(workspaceId),
        enabled: !!workspaceId,
    });
};
