import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

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
    // Validação de Pertencimento via Tabela de Membros
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId: workspaceId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access to this workspace is denied' });
    }

    // Injeção de Contexto
    req.workspaceId = workspaceId;
    // Opcional: Injetar a role também se quiser usar no controller
    // (req as any).userRole = membership.role;

    return next();
  } catch (err) {
    console.error('Workspace Middleware Error:', err);
    return res.status(500).json({ message: 'Internal server error validating workspace' });
  }
}