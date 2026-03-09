import { useState, useCallback } from 'react';
import { api } from '../../../shared/lib/axios';

export interface WorkspaceMember {
    userId: number;
    workspaceId: number;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'ACCOUNTANT';
    user: {
        id: number;
        name: string;
        email: string;
        type: string;
    };
}

export interface SentInvite {
    id: string;
    email: string;
    role: string;
    status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'REJECTED';
    expiresAt: string;
    createdAt: string;
    inviter: { name: string };
}

export function useTeamSettings(workspaceId: number | string) {
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const listMembers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
            setMembers(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao listar membros');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const listSentInvites = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get<SentInvite[]>(`/workspaces/${workspaceId}/invites`);
            setSentInvites(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao listar convites');
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const removeMember = useCallback(async (targetUserId: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await api.delete(`/workspaces/${workspaceId}/members/${targetUserId}`);
            setMembers(prev => prev.filter(m => m.userId !== targetUserId));
            setSuccessMsg('Membro removido com sucesso');
            return true;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao remover membro');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    const sendInvite = useCallback(async (email: string, role: string = 'ACCOUNTANT'): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            await api.post(`/workspaces/${workspaceId}/invites`, { email, role });
            setSuccessMsg(`Convite enviado para ${email}`);
            await listSentInvites(); // Refresh
            return true;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao enviar convite');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, listSentInvites]);

    return {
        members,
        sentInvites,
        isLoading,
        error,
        successMsg,
        listMembers,
        listSentInvites,
        removeMember,
        sendInvite,
        clearMessages: () => { setError(null); setSuccessMsg(null); }
    };
}
