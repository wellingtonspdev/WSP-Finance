import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Membership {
    id: number;
    name: string;
    type: 'PERSONAL' | 'BUSINESS';
    role: 'OWNER' | 'VIEWER' | 'ACCOUNTANT';
    closedUntil: string | null; // ISO date string do período fiscal fechado
    cnai?: string;
}

interface WorkspaceState {
    activeWorkspaceId: number | null;
    activeMembership: Membership | null;
    memberships: Membership[];
    isLoadingMetadata: boolean;
    setMemberships: (memberships: Membership[]) => void;
    setActiveWorkspaceId: (id: number | null) => void;
    setIsLoadingMetadata: (loading: boolean) => void;
    isForbidden: boolean;
    setForbidden: (status: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set: any, get: any) => ({
            activeWorkspaceId: null as number | null,
            activeMembership: null as Membership | null,
            memberships: [] as Membership[],
            isLoadingMetadata: false as boolean,
            isForbidden: false as boolean,

            setMemberships: (memberships: Membership[]) => {
                set({ memberships });
            },

            setActiveWorkspaceId: (id: number | null) => {
                const { memberships } = get();
                // Fallback: Se não achar a membership, deixa null por enquanto (o Guard/API validará)
                const membership = memberships.find((m: Membership) => m.id === id) || null;
                set({ activeWorkspaceId: id, activeMembership: membership, isForbidden: false });
            },

            setIsLoadingMetadata: (loading: boolean) => {
                set({ isLoadingMetadata: loading });
            },

            setForbidden: (status: boolean) => {
                set({ isForbidden: status });
            },
        }),
        {
            name: 'wsp-workspace-storage', // Nome da chave no localStorage
            // Persistimos apenas o activeWorkspaceId para que saibamos o último contexto ao acessar raiz '/'
            partialize: (state: any) => ({ activeWorkspaceId: state.activeWorkspaceId }),
        }
    )
);
