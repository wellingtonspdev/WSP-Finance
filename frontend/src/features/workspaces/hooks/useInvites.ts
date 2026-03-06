import { useState } from 'react';
import { api } from '../../../shared/lib/axios';

interface CreateInviteData {
    email: string;
    role?: string;
}

interface InviteResponse {
    message: string;
    token: string;
    expiresAt: string;
}

export function useInvites(workspaceId: string | number) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createInvite = async (data: CreateInviteData): Promise<InviteResponse | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post<InviteResponse>(`/workspaces/${workspaceId}/invites`, data);
            return response.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao gerar convite';
            setError(msg);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const revokeInvite = async (inviteId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await api.post(`/workspaces/${workspaceId}/invites/${inviteId}/revoke`);
            return true;
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao revogar convite';
            setError(msg);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const acceptInvite = async (token: string): Promise<{ workspaceId: number; role: string } | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/invites/accept', { token });
            return response.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao aceitar convite (Talvez email mismatch ou token expirado).';
            setError(msg);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createInvite,
        revokeInvite,
        acceptInvite,
        isLoading,
        error,
    };
}
