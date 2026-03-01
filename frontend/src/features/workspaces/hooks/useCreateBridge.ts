import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeBridgeTransfer } from '../api/executeBridgeTransfer';


export const useCreateBridge = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: executeBridgeTransfer,
        onSuccess: () => {
            // Invalidating globally since this touches 2 distinct workspaces
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
};
