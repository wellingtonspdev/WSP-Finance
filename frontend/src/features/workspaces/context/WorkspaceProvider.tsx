import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Workspace } from '../types';
import { useAuth } from '../../../app/AuthProvider';
import { WorkspaceContext } from './WorkspaceContext';

const EMPTY_WORKSPACES: Workspace[] = [];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // const queryClient = useQueryClient(); // Removido por nÃ£o ser mais necessÃ¡rio
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // PACT V3: Varrendo memberships direto do Payload de AutenticaÃ§Ã£o (Zero Request)
  const workspaces = useMemo(() => user?.memberships || EMPTY_WORKSPACES, [user?.memberships]);
  const isLoading = false; // Como Ã© local, nÃ£o hÃ¡ loading async

  // Derivação de estado para evitar setState no useEffect
  const activeWorkspace = useMemo(() => {
    if (workspaces.length === 0) {
      return null;
    }

    const selectedId = selectedWorkspace?.id;
    const selectedFromCurrentMemberships = selectedId
      ? workspaces.find((w: Workspace) => w.id === selectedId)
      : null;

    if (selectedFromCurrentMemberships) {
      return selectedFromCurrentMemberships;
    }

    const storedId = localStorage.getItem('wsp_active_workspace');
    const storedFromCurrentMemberships = storedId
      ? workspaces.find((w: Workspace) => w.id === Number(storedId))
      : null;

    return storedFromCurrentMemberships || workspaces[0];
  }, [selectedWorkspace, workspaces]);

  // FunÃ§Ã£o de Troca de Contexto (Hard Reset)
  const switchWorkspace = (workspaceId: number) => {
    const target = workspaces.find((w: Workspace) => w.id === workspaceId);
    if (!target) return;

    // 1. Atualiza Estado Local
    setSelectedWorkspace(target);
    localStorage.setItem('wsp_active_workspace', workspaceId.toString());

    // 2. O React Query jÃ¡ segmenta os dados por [workspaceId] em queryKeys.ts
    // NÃ£o precisamos de removeQueries() aqui, o que evita destruir fetches ativos.
    // queryClient.invalidateQueries();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        switchWorkspace
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
