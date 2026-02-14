import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { WorkspaceRole } from '@prisma/client';

// Hierarquia de permissões: OWNER > EDITOR > VIEWER
const roleHierarchy: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export function RbacMiddleware(requiredRole: WorkspaceRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    // O workspaceId pode vir do header (padrão) ou injetado por outro middleware
    const workspaceIdHeader = req.headers['x-workspace-id'];
    const workspaceId = workspaceIdHeader 
      ? Number(Array.isArray(workspaceIdHeader) ? workspaceIdHeader[0] : workspaceIdHeader)
      : req.workspaceId; // Fallback se já foi injetado

    if (!userId || !workspaceId) {
      return res.status(400).json({ message: 'Contexto de usuário ou workspace inválido para validação de permissão.' });
    }

    try {
      // Busca a relação na tabela pivô
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({ message: 'Acesso negado: Você não é membro deste workspace.' });
      }

      // Validação hierárquica
      const userRoleLevel = roleHierarchy[membership.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ 
          message: `Permissão insuficiente. Necessário: ${requiredRole}, Atual: ${membership.role}` 
        });
      }

      // Injeta a role no request para uso posterior (ex: AuditLog)
      (req as any).userRole = membership.role;

      return next();
    } catch (err) {
      console.error('RBAC Error:', err);
      return res.status(500).json({ message: 'Erro interno ao validar permissões.' });
    }
  };
}