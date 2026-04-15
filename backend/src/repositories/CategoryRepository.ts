import { prisma } from '../lib/prisma';
import { Category, Prisma } from '@prisma/client';

export class CategoryRepository {
  // Cria uma categoria customizada para um Workspace específico
  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return await prisma.category.create({ data });
  }

  // Busca Híbrida: Categorias do Workspace + Categorias Globais (workspaceId = null)
  async findManyByWorkspace(workspaceId: number): Promise<Category[]> {
    return await prisma.category.findMany({
      where: {
        OR: [
          { workspaceId: workspaceId }, // Do usuário
          { workspaceId: null }         // Global do sistema
        ]
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  // Busca uma categoria específica garantindo que pertence ao workspace ou é global
  async findByIdAndWorkspace(id: number, workspaceId: number): Promise<Category | null> { // MUDANÇA: id number
    return await prisma.category.findFirst({
      where: {
        id,
        OR: [
          { workspaceId: workspaceId },
          { workspaceId: null }
        ]
      }
    });
  }

  // Deleta apenas se for do workspace (não permite deletar globais)
  async delete(id: number, workspaceId: number): Promise<void> { // MUDANÇA: id number
    // Primeiro verifica se é customizada
    const category = await prisma.category.findFirst({
      where: {
        id,
        workspaceId // Se workspaceId for null no banco, essa query não retorna, protegendo as globais
      }
    });

    if (!category) {
      throw new Error('Category not found or cannot be deleted');
    }

    await prisma.category.delete({ where: { id } });
  }
}