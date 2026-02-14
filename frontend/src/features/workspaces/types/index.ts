export interface Workspace {
  id: number;
  name: string;
  type: 'PERSONAL' | 'BUSINESS';
}

export interface CreateWorkspaceDTO {
  name: string;
  type: 'PERSONAL' | 'BUSINESS';
}