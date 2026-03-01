import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';
import type { CreateWorkspaceDTO, Workspace } from '../types';

export function useCreateWorkspace() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateWorkspaceDTO) => {
            const response = await api.post<Workspace>('/workspaces', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        },
    });
}
