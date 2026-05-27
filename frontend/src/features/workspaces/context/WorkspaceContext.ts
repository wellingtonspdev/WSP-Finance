import { createContext } from 'react';
import type { Workspace } from '../types';

export interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: number) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
