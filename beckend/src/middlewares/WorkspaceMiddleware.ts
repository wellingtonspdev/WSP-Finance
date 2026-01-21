import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function WorkspaceMiddleware(req: Request, res: Response, next: NextFunction) {
  const workspaceIdHeader = req.headers['x-workspace-id'];

  // 1. Validação de presença do Header
  if (!workspaceIdHeader) {
    return res.status(400).json({ message: 'Workspace ID header (x-workspace-id) is required' });
  }

  const workspaceIdString = Array.isArray(workspaceIdHeader) ? workspaceIdHeader[0] : workspaceIdHeader;
  const workspaceId = Number(workspaceIdString);

  if (isNaN(workspaceId)) {
    return res.status(400).json({ message: 'Workspace ID must be a number' });
  }

  // O AuthMiddleware já deve ter rodado antes e injetado o req.user
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'User authentication required for workspace access' });
  }

  try {
    // 2. Validação de Pertencimento (Isolamento)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId, // Agora é number
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(403).json({ message: 'Access to this workspace is denied' });
    }

    // 3. Injeção de Contexto
    req.workspaceId = workspace.id;

    return next();
  } catch (err) {
    console.error('Workspace Middleware Error:', err);
    return res.status(500).json({ message: 'Internal server error validating workspace' });
  }
}