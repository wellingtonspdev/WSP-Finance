import { api } from '../../../shared/lib/axios';
import type { Workspace } from '../types'; // MUDANÇA: import type

export async function getWorkspaces(): Promise<Workspace[]> {
  const response = await api.get('/workspaces');
  return response.data;
}