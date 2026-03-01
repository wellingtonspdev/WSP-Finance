import { prisma } from '../lib/prisma';
import { Prisma, Workspace } from '@prisma/client';

export class WorkspaceRepository {
  // Método create removido daqui pois a lógica foi movida para o Service (transação)
  // Mas mantemos para compatibilidade se necessário, embora o Service use prisma direto agora.

  async findManyByUserId(userId: number): Promise<Workspace[]> {
    return await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Workspace | null> {
    return await prisma.workspace.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
            role: 'OWNER' // Apenas OWNER pode editar (regra de negócio no repositório ou service?)
            // Vamos deixar flexível aqui e validar role no service/middleware se necessário
            // Mas para update, geralmente só owner.
          }
        }
      }
    });
  }

  async update(id: number, data: Prisma.WorkspaceUpdateInput): Promise<Workspace> {
    return await prisma.workspace.update({
      where: { id },
      data
    });
  }
}