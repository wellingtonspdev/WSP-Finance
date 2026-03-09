import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Workspace } from '../types';
import { api } from '../../../shared/lib/axios';
import { useAuth } from '../../../app/AuthProvider';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: number) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({} as WorkspaceContextType);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // const queryClient = useQueryClient(); // Removido por não ser mais necessário
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // PACT V3: Varrendo memberships direto do Payload de Autenticação (Zero Request)
  const workspaces = user?.memberships || [];
  const isLoading = false; // Como é local, não há loading async

  // Efeito de Inicialização e Seleção Automática
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      // Tenta recuperar do storage ou pega o primeiro
      const storedId = localStorage.getItem('wsp_active_workspace');
      const found = workspaces.find((w: any) => w.id === Number(storedId));

      const target = found || workspaces[0];

      // Define o workspace inicial
      setActiveWorkspace(target);

      // Sync Header Inicial
      api.defaults.headers.common['x-workspace-id'] = target.id.toString();
    }
  }, [workspaces, activeWorkspace]);

  // Função de Troca de Contexto (Hard Reset)
  const switchWorkspace = (workspaceId: number) => {
    const target = workspaces.find((w: any) => w.id === workspaceId);
    if (!target) return;

    // 1. Atualiza Estado Local
    setActiveWorkspace(target);
    localStorage.setItem('wsp_active_workspace', workspaceId.toString());

    // 2. Sync Header (Axios)
    api.defaults.headers.common['x-workspace-id'] = workspaceId.toString();

    // 3. O React Query já segmenta os dados por [workspaceId] em queryKeys.ts
    // Não precisamos de removeQueries() aqui, o que evita destruir fetches ativos.
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

export const useWorkspace = () => useContext(WorkspaceContext);