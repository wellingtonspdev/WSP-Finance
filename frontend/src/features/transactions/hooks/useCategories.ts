import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getCategories } from '../api/getCategories';

export const useCategories = () => {
    const { workspaceId } = useParams<{ workspaceId: string }>();

    return useQuery({
        queryKey: ['categories', workspaceId],
        queryFn: getCategories,
        enabled: !!workspaceId,
    });
};
