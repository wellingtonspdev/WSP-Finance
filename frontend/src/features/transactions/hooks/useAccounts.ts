import { useQuery } from '@tanstack/react-query';
import { getAccounts } from '../api/getAccounts';

export const useAccounts = () => {
    return useQuery({
        queryKey: ['accounts'],
        queryFn: getAccounts,
    });
};
