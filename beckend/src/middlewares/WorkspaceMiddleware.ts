import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { tenantContext } from '../lib/tenantContext';

export async function WorkspaceMiddleware(req: Request, res: Response, next: NextFunction) {
  const workspaceIdHeader = req.headers['x-workspace-id'];

  if (!workspaceIdHeader) {
    return res.status(400).json({ message: 'Workspace ID header (x-workspace-id) is required' });
  }

  const workspaceIdString = Array.isArray(workspaceIdHeader) ? workspaceIdHeader[0] : workspaceIdHeader;
  const workspaceId = Number(workspaceIdString);

  if (isNaN(workspaceId)) {
    return res.status(400).json({ message: 'Workspace ID must be a number' });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User authentication required for workspace access' });
  }

  try {
    // Validação de Pertencimento via Tabela de Membros com Trava de Isolamento
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId: workspaceId,
        },
      },
      include: {
        workspace: {
          select: {
            type: true,
          }
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access to this workspace is denied' });
    }

    // Trava de Isolamento: Contadores nunca podem acessar contas pessoais (CPF)
    if (membership.role === 'ACCOUNTANT' && membership.workspace.type === 'PERSONAL') {
      console.warn(`[ZERO TRUST BLOCK] User ${req.user.id} (ACCOUNTANT) tried to access PERSONAL workspace ${workspaceId}`);
      return res.status(403).json({ message: 'Accountants cannot access personal workspaces.' });
    }

    // Injeção de Contexto
    req.workspaceId = workspaceId;
    // Opcional: Injetar a role também se quiser usar no controller
    // (req as any).userRole = membership.role;

    // Executa o restante da cadeia dentro do contexto isolado
    return tenantContext.run({ currentWorkspaceId: workspaceId }, () => {
      next();
    });
  } catch (err) {
    console.error('Workspace Middleware Error:', err);
    return res.status(500).json({ message: 'Internal server error validating workspace' });
  }
}