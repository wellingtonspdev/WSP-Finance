import { useState } from 'react';
import { api } from '../../../shared/lib/axios';

interface SignedAttachmentResponse {
    downloadUrl: string;
    headers?: Record<string, string>;
}

export function useAttachment() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getSignedUrl = async (transactionId: string | number): Promise<SignedAttachmentResponse | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const { data } = await api.get<SignedAttachmentResponse>(`/transactions/${transactionId}/attachment`);
            return data;
        } catch (err: any) {
            console.error('Falha ao obter URL assinada:', err);
            if (err.response?.status === 404) {
                setError('Anexo não encontrado ou sem permissão.');
            } else {
                setError('Link expirado ou indisponível.');
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        getSignedUrl,
        isLoading,
        error,
        clearError: () => setError(null)
    };
}
