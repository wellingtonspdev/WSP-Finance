import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';
import type { CertificateUploadResponse } from '../types';

interface UploadCertificatePayload {
    file: File;
    password: string;
}

/**
 * Envia o certificado A1 (.pfx / .p12) do workspace via multipart/form-data.
 *
 * O Axios detecta automaticamente o FormData e define o header correto —
 * não passamos Content-Type manual para não corromper o boundary.
 *
 * Endpoint: POST /workspaces/:id/certificate-a1
 */
export function useUploadCertificate(workspaceId: number) {
    return useMutation<CertificateUploadResponse, unknown, UploadCertificatePayload>({
        mutationFn: async ({ file, password }) => {
            const form = new FormData();
            form.append('certificate', file);
            form.append('password', password);

            const { data } = await api.post<CertificateUploadResponse>(
                `/workspaces/${workspaceId}/certificate-a1`,
                form
            );

            return data;
        },
    });
}
