import { CategoryRepository } from '../repositories/CategoryRepository';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  async create(name: string, icon: string, color: string, workspaceId: number) {
    // Validação básica
    if (!name) throw new Error('Name is required');

    const category = await this.categoryRepository.create({
      name,
      icon,
      color,
      workspace: { connect: { id: workspaceId } }
    });

    return category;
  }

  async list(workspaceId: number) {
    const categories = await this.categoryRepository.findManyByWorkspace(workspaceId);

    // Mapeia para adicionar flag 'isGlobal' para o Frontend saber se pode editar
    return categories.map(cat => ({
      ...cat,
      isGlobal: cat.workspaceId === null
    }));
  }

  async delete(id: number, workspaceId: number) { // MUDANÇA: number
    await this.categoryRepository.delete(id, workspaceId);
  }
}