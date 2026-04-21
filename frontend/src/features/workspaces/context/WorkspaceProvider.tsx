import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Workspace } from '../types';
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
  // const queryClient = useQueryClient(); // Removido por nÃ£o ser mais necessÃ¡rio
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // PACT V3: Varrendo memberships direto do Payload de AutenticaÃ§Ã£o (Zero Request)
  const workspaces = user?.memberships || [];
  const isLoading = false; // Como Ã© local, nÃ£o hÃ¡ loading async

  // Efeito de InicializaÃ§Ã£o e SeleÃ§Ã£o AutomÃ¡tica
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      // Tenta recuperar do storage ou pega o primeiro
      const storedId = localStorage.getItem('wsp_active_workspace');
      const found = workspaces.find((w: any) => w.id === Number(storedId));

      const target = found || workspaces[0];

      // Define o workspace inicial
      setActiveWorkspace(target);
    }
  }, [workspaces, activeWorkspace]);

  // FunÃ§Ã£o de Troca de Contexto (Hard Reset)
  const switchWorkspace = (workspaceId: number) => {
    const target = workspaces.find((w: any) => w.id === workspaceId);
    if (!target) return;

    // 1. Atualiza Estado Local
    setActiveWorkspace(target);
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

export const useWorkspace = () => useContext(WorkspaceContext);
