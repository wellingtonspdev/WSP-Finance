import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkspaces } from '../api/getWorkspaces';
import type { Workspace } from '../types'; // MUDANÇA: import type
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
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // Busca workspaces apenas se estiver autenticado
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
    enabled: isAuthenticated,
    staleTime: Infinity, // Workspaces mudam pouco
  });

  // Efeito de Inicialização e Seleção Automática
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) {
      // Tenta recuperar do storage ou pega o primeiro
      const storedId = localStorage.getItem('wsp_active_workspace');
      const found = workspaces.find(w => w.id === Number(storedId));
      
      const target = found || workspaces[0];
      
      // Define o workspace inicial
      setActiveWorkspace(target);
      
      // Sync Header Inicial
      api.defaults.headers.common['x-workspace-id'] = target.id.toString();
    }
  }, [workspaces, activeWorkspace]);

  // Função de Troca de Contexto (Hard Reset)
  const switchWorkspace = (workspaceId: number) => {
    const target = workspaces.find(w => w.id === workspaceId);
    if (!target) return;

    // 1. Atualiza Estado Local
    setActiveWorkspace(target);
    localStorage.setItem('wsp_active_workspace', workspaceId.toString());

    // 2. Sync Header (Axios)
    api.defaults.headers.common['x-workspace-id'] = workspaceId.toString();

    // 3. Hard Reset do Cache (Segurança e Consistência)
    // Remove todas as queries cacheadas para garantir que dados da "Empresa A"
    // não apareçam na "Empresa B"
    queryClient.removeQueries(); 
    
    // 4. Refetch (Opcional, pois os componentes farão mount novamente)
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