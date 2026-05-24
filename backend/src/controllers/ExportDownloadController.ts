import { Request, Response } from 'express';
import { ExportArchiveService } from '../services/ExportArchiveService';
import { S3StorageProvider } from '../providers/S3StorageProvider';

export class ExportDownloadController {
  private service: ExportArchiveService;

  constructor() {
    this.service = new ExportArchiveService(new S3StorageProvider());
  }

  async download(req: Request, res: Response) {
    // 1. Extract params and validate UUID format
    const archiveId = req.params.archiveId;

    // UUID regex validation (basic format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!archiveId || !uuidRegex.test(archiveId)) {
      return res.status(400).json({ message: 'O ID do arquivo deve ser um UUID válido.' });
    }

    // 2. Extract workspaceId from req (injected by WorkspaceRouteParamGuard and/or WorkspaceMiddleware)
    // The route param is already double-checked by the Guard, but we do a defensive check anyway.
    const routeWorkspaceId = Number(req.params.workspaceId);
    const injectedWorkspaceId = req.workspaceId;

    if (!routeWorkspaceId || routeWorkspaceId !== injectedWorkspaceId) {
      return res.status(403).json({ message: 'Conflito de autorização do Workspace.' });
    }

    // 3. Delegate to service layer
    const result = await this.service.getDownloadUrl(archiveId, routeWorkspaceId);

    // 4. Return safe payload (Service guarantees no bucket/objectKey/raw errors leak)
    return res.status(200).json({
      url: result.url,
      expiresInSeconds: result.expiresInSeconds,
      fileName: result.fileName,
      contentType: result.contentType,
    });
  }
}
