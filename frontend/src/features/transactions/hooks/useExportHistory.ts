import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getExportDownloadUrl, listExportHistory } from '../api/exportDominio';

export const EXPORT_HISTORY_FORBIDDEN_MESSAGE = 'Voce nao tem permissao para ver exportacoes deste workspace.';

export function useExportHistory(workspaceId: string | undefined, enabled: boolean) {
    const query = useQuery({
        queryKey: ['export-history', workspaceId || 'null'],
        queryFn: ({ signal }) => listExportHistory(workspaceId!, signal),
        enabled: enabled && !!workspaceId,
        staleTime: 1000 * 60 * 5,
    });

    const errorMessage = isAxiosError(query.error) && query.error.response?.status === 403
        ? EXPORT_HISTORY_FORBIDDEN_MESSAGE
        : query.error
            ? 'Nao foi possivel carregar o historico de exportacoes.'
            : null;

    const downloadArchive = async (archiveId: string) => {
        if (!workspaceId) return;

        const result = await getExportDownloadUrl(workspaceId, archiveId);
        window.location.assign(result.url);
    };

    return {
        items: query.data?.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
        errorMessage,
        refetch: query.refetch,
        downloadArchive,
    };
}
