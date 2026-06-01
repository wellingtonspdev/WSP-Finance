import { Request, Response } from 'express';
import { ExportArchiveService } from '../services/ExportArchiveService';
import { getExportStorageProvider } from '../providers/exportStorageProviderFactory';

export class ExportHistoryController {
  private service: ExportArchiveService;

  constructor() {
    this.service = new ExportArchiveService(getExportStorageProvider());
  }

  async list(req: Request, res: Response) {
    const routeWorkspaceId = Number(req.params.workspaceId);
    const injectedWorkspaceId = req.workspaceId;

    if (!Number.isInteger(routeWorkspaceId) || routeWorkspaceId <= 0) {
      return res.status(400).json({ message: 'O ID do workspace deve ser um numero valido.' });
    }

    if (!routeWorkspaceId || routeWorkspaceId !== injectedWorkspaceId) {
      return res.status(403).json({ message: 'Conflito de autorizacao do Workspace.' });
    }

    const data = await this.service.listByWorkspace(routeWorkspaceId);

    return res.status(200).json({ data });
  }
}
