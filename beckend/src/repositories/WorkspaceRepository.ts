import { prisma } from '../lib/prisma';
import { Prisma, Workspace } from '@prisma/client';

export class WorkspaceRepository {
  async create(data: Prisma.WorkspaceCreateInput): Promise<Workspace> {
    return await prisma.workspace.create({ data });
  }

  async findManyByUserId(userId: number): Promise<Workspace[]> {
    return await prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        // Não trazemos contas/transações para manter performance
      }
    });
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Workspace | null> {
    return await prisma.workspace.findFirst({
      where: { id, userId }
    });
  }

  async update(id: number, data: Prisma.WorkspaceUpdateInput): Promise<Workspace> {
    return await prisma.workspace.update({
      where: { id },
      data
    });
  }
}