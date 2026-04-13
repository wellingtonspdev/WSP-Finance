import { useState, useCallback } from 'react';
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

export interface ReceivedInvite {
    id: string;
    email: string;
    role: string;
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'REJECTED';
    token: string;
    expiresAt: string;
    createdAt: string;
    workspace: { id: number; name: string; type: string };
    inviter: { name: string };
}

export function useInvites(workspaceId?: string | number) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invites, setInvites] = useState<ReceivedInvite[]>([]);

    const pendingCount = invites.filter(i => i.status === 'PENDING').length;

    const listReceived = useCallback(async (): Promise<ReceivedInvite[]> => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get<ReceivedInvite[]>('/invites/received');
            setInvites(response.data);
            return response.data;
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao buscar convites';
            setError(msg);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

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

    const rejectInvite = async (inviteId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            await api.post(`/invites/${inviteId}/reject`);
            // Atualiza localmente
            setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'REJECTED' as const } : i));
            return true;
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Erro ao rejeitar convite';
            setError(msg);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        invites,
        pendingCount,
        listReceived,
        createInvite,
        revokeInvite,
        acceptInvite,
        rejectInvite,
        isLoading,
        error,
    };
}
