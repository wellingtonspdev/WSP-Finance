import { api } from '../shared/lib/axios';
import axios from 'axios';

interface PresignedResponse {
    uploadUrl: string;
    publicUrl: string;
    headers?: Record<string, string>;
}

export async function requestCloudflareUpload(
    file: File,
    workspaceId: number,
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal
): Promise<{ publicUrl: string; size: number }> {

    // 1. Pede Autorização/Presigned URL ao Backend Central (UploadService)
    const { data } = await api.post<PresignedResponse>('/uploads/presigned', {
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size, // V3.8 Cota de Peso Real
        workspaceId,
        folderType: 'RECEIPT' // Padrão guiado pelo modal de transações
    }, { signal: abortSignal });

    const { uploadUrl, publicUrl, headers } = data;

    // 2. Dispara o Bypass: Client direto pro Bucket R2
    // Utilizamos a instância REST pura do Axios porque o interceptor `api` injetaria Bearer Tokens globais
    await axios.put(uploadUrl, file, {
        headers: {
            'Content-Type': file.type,
            // Injeta as Criptografias SSE-C (Se o backend detectou mime-type PKCS12)
            ...headers
        },
        timeout: 60000,
        signal: abortSignal, // Conduite de Vida/Morte
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });

    // 3. Retorna puramente o Object Key e Peso Empírico da Compressão
    return { publicUrl, size: file.size };
}
