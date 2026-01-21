import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { WorkspaceType } from '@prisma/client';

export class WorkspaceService {
  private workspaceRepository: WorkspaceRepository;

  constructor() {
    this.workspaceRepository = new WorkspaceRepository();
  }

  async create(name: string, type: WorkspaceType, userId: number) {
    if (!name) throw new Error('Name is required');

    const workspace = await this.workspaceRepository.create({
      name,
      type,
      user: { connect: { id: userId } } // Vínculo automático
    });

    return workspace;
  }

  async list(userId: number) {
    return await this.workspaceRepository.findManyByUserId(userId);
  }

  async update(id: number, name: string, type: WorkspaceType, userId: number) {
    // Validação de segurança: O usuário é dono deste workspace?
    const existingWorkspace = await this.workspaceRepository.findByIdAndUserId(id, userId);
    
    if (!existingWorkspace) {
      throw new Error('Workspace not found or access denied');
    }

    return await this.workspaceRepository.update(id, {
      name,
      type
    });
  }
}