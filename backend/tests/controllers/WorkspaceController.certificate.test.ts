import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { WorkspaceController } from '../../src/controllers/WorkspaceController';
import { WorkspaceService } from '../../src/services/WorkspaceService';

describe('WorkspaceController - uploadCertificate', () => {
  let controller: WorkspaceController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockStatus: vi.Mock;
  let mockJson: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockStatus = vi.fn().mockReturnThis();
    mockJson = vi.fn().mockReturnThis();

    mockReq = {
      params: { id: '1' },
      user: { id: 1 },
      workspaceId: 1, // set by interceptor
      file: {
        buffer: Buffer.from('cert data'),
        originalname: 'cert.pfx',
        mimetype: 'application/x-pkcs12'
      } as any,
      body: {
        password: 'cert-password'
      }
    };

    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    controller = new WorkspaceController();
    (controller as any).workspaceService = {
      uploadCertificate: vi.fn()
    };
  });

  it('1. valida form-data (buffer do arquivo) e senha', async () => {
    mockReq.file = undefined; // simulando envio sem arquivo

    await controller.uploadCertificate(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Arquivo do certificado (.pfx/.p12) é obrigatório' });

    mockReq.file = { buffer: Buffer.from('cert') } as any;
    mockReq.body = {}; // sem senha

    await controller.uploadCertificate(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Senha do certificado é obrigatória' });
  });

  it('2. extrai params e repassa ao Service na ordem correta (workspaceId, userId, reqWorkspaceId)', async () => {
    const mockUploadResponse = {
      workspaceId: 1,
      certificateExpiresAt: new Date(),
      expiresInDays: 100,
      alertLevel: 'ok'
    };
    
    const serviceInstance = (controller as any).workspaceService;
    serviceInstance.uploadCertificate.mockResolvedValue(mockUploadResponse);

    await controller.uploadCertificate(mockReq as Request, mockRes as Response);

    expect(serviceInstance.uploadCertificate).toHaveBeenCalledWith(
      1, // targetWorkspaceId (params.id)
      1, // userId (req.user.id)
      1, // req.workspaceId
      mockReq.file?.buffer,
      'cert-password'
    );
    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(mockUploadResponse);
  });

  it('2b. REGRESSÃO: com userId ≠ workspaceId, garante que workspaceId vai primeiro', async () => {
    // IDs propositalmente diferentes para detectar inversão
    mockReq.params = { id: '42' };     // workspaceId = 42
    mockReq.user = { id: 7 } as any;   // userId = 7
    (mockReq as any).workspaceId = 42;  // reqWorkspaceId = 42

    const mockUploadResponse = {
      workspaceId: 42,
      certificateExpiresAt: new Date(),
      expiresInDays: 200,
      alertLevel: 'ok'
    };

    const serviceInstance = (controller as any).workspaceService;
    serviceInstance.uploadCertificate.mockResolvedValue(mockUploadResponse);

    await controller.uploadCertificate(mockReq as Request, mockRes as Response);

    expect(serviceInstance.uploadCertificate).toHaveBeenCalledWith(
      42, // workspaceId (params.id) — NÃO userId
      7,  // userId (req.user.id)  — NÃO workspaceId
      42, // reqWorkspaceId
      mockReq.file?.buffer,
      'cert-password'
    );
    expect(mockStatus).toHaveBeenCalledWith(200);
  });

  it('3. mapeia erros de permissão/contexto para 403', async () => {
    const serviceInstance = (controller as any).workspaceService;
    
    serviceInstance.uploadCertificate.mockRejectedValueOnce(new Error('Workspace not found or access denied'));
    
    await controller.uploadCertificate(mockReq as Request, mockRes as Response);
    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Workspace not found or access denied' });
  });

  it('3b. mapeia Mismatch para 403', async () => {
    const serviceInstance = (controller as any).workspaceService;
    
    serviceInstance.uploadCertificate.mockRejectedValueOnce(new Error('Mismatch: req.workspaceId differs from target workspaceId'));
    
    await controller.uploadCertificate(mockReq as Request, mockRes as Response);
    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Mismatch: req.workspaceId differs from target workspaceId' });
  });

  it('4. mapeia erros de certificado para 422', async () => {
    const serviceInstance = (controller as any).workspaceService;
    
    serviceInstance.uploadCertificate.mockRejectedValueOnce(new Error('Senha incorreta ou arquivo PFX/P12 inválido.'));
    
    await controller.uploadCertificate(mockReq as Request, mockRes as Response);
    expect(mockStatus).toHaveBeenCalledWith(422);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Senha incorreta ou arquivo PFX/P12 inválido.' });
  });
});
