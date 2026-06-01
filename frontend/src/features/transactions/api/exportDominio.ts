import { api } from '../../../shared/lib/axios';
import type {
    ExportDownloadResponse,
    ExportHistoryResponse,
    ExportValidatePayload,
    ExportValidateResponse
} from '../types/export';

export const validateDominioExport = async (
    payload: ExportValidatePayload,
    signal?: AbortSignal
): Promise<ExportValidateResponse> => {
    const response = await api.post('/export/validate', payload, { signal });
    return response.data;
};

export const generateDominioExport = async (
    payload: ExportValidatePayload,
    signal?: AbortSignal
): Promise<{ blob: Blob; fileName: string }> => {
    const response = await api.post('/export/generate', payload, {
        signal,
        responseType: 'blob', // crucial for downloading binary data/text without corruption
    });

    // Attempt to extract filename from Content-Disposition header
    let fileName = `wsp-dominio-${payload.startDate}_${payload.endDate}.txt`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, '');
        }
    }

    return {
        blob: response.data,
        fileName,
    };
};

export const listExportHistory = async (
    workspaceId: string | number,
    signal?: AbortSignal
): Promise<ExportHistoryResponse> => {
    const response = await api.get(`/workspaces/${workspaceId}/exports`, { signal });
    return response.data;
};

export const getExportDownloadUrl = async (
    workspaceId: string | number,
    archiveId: string,
    signal?: AbortSignal
): Promise<ExportDownloadResponse> => {
    const response = await api.get(`/workspaces/${workspaceId}/exports/${archiveId}/download`, { signal });
    return response.data;
};
