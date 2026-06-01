import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

const financialMutationRoles = new Set<WorkspaceRole>(['OWNER', 'EDITOR']);

export function FinancialMutationRbacMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const workspaceId = req.workspaceId;

    if (!userId || !workspaceId) {
      return res.status(400).json({ message: 'Contexto de usuario ou workspace invalido para mutacao financeira.' });
    }

    try {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
        select: { role: true },
      });

      if (!membership) {
        return res.status(403).json({ message: 'Acesso negado: voce nao e membro deste workspace.' });
      }

      if (!financialMutationRoles.has(membership.role)) {
        return res.status(403).json({ message: 'Permissao insuficiente para mutacao financeira.' });
      }

      (req as any).userRole = membership.role;
      return next();
    } catch (err) {
      console.error('Financial mutation RBAC error:', err);
      return res.status(500).json({ message: 'Erro interno ao validar permissao financeira.' });
    }
  };
}
