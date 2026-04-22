import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceService } from '../../src/services/WorkspaceService';
import { CertificateService } from '../../src/services/CertificateService';
import { AccountantCacheService } from '../../src/services/AccountantCacheService';
import { sysPrisma, prisma } from '../../src/lib/prisma';
import { IStorageProvider } from '../../src/providers/IStorageProvider';

// Mock dependencies
vi.mock('../../src/lib/prisma', () => ({
  sysPrisma: {
    workspace: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findFirst: vi.fn(),
    }
  },
  prisma: {
    workspace: { findFirst: vi.fn(), update: vi.fn() },
    workspaceMember: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn((cb) => cb({ workspace: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() }, workspaceMember: { create: vi.fn(), findFirst: vi.fn() } }))
  }
}));

vi.mock('../../src/services/CertificateService', () => ({
  CertificateService: {
    parseAndExtractValidity: vi.fn(),
  }
}));

vi.mock('../../src/services/AccountantCacheService', () => ({
  AccountantCacheService: vi.fn().mockImplementation(() => ({
    refreshCache: vi.fn(),
  }))
}));

// Create a Dummy Storage Provider
class MockStorageProvider implements IStorageProvider {
  async generateUploadUrl() { return { uploadUrl: '', publicUrl: '' }; }
  async deleteFile() {}
  async getSignedDownloadUrl() { return { downloadUrl: '' }; }
  async uploadSecureBuffer() { return 'mocked-key'; }
}

describe('WorkspaceService - uploadCertificate', () => {
  let workspaceService: WorkspaceService;
  let mockStorageProvider: MockStorageProvider;
  let mockCacheService: any;
  const mockDate = new Date('2026-10-10T00:00:00.000Z');

  beforeEach(() => {
    vi.resetAllMocks();
    mockStorageProvider = new MockStorageProvider();
    vi.spyOn(mockStorageProvider, 'uploadSecureBuffer').mockResolvedValue('vault/new-cert-key.pfx');
    vi.spyOn(mockStorageProvider, 'deleteFile').mockResolvedValue();

    workspaceService = new WorkspaceService();
    mockCacheService = { refreshCache: vi.fn() };
    (workspaceService as any).storageProvider = mockStorageProvider;
    (workspaceService as any).cacheService = mockCacheService;
    
    // Default mocks for safe operation tests
    (prisma.workspaceMember.findMany as any).mockResolvedValue([{ userId: 55 }]);
  });

  const validBuffer = Buffer.from('mock');
  const validPassword = '123';

  it('1. rejeita workspaceId inválido', async () => {
    // Simulando que o workspace não foi encontrado
    (prisma.workspace.findFirst as any).mockResolvedValue(null);

    await expect(workspaceService.uploadCertificate(999, 1, 999, validBuffer, validPassword))
      .rejects.toThrow('Workspace not found or access denied');
  });

  it('2. rejeita mismatch entre workspaceId alvo e req.workspaceId', async () => {
    await expect(workspaceService.uploadCertificate(1, 1, 2, validBuffer, validPassword))
      .rejects.toThrow('Mismatch: req.workspaceId differs from target workspaceId');
  });

  it('3. rejeita usuário sem OWNER no workspace-alvo', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1 });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'ADMIN' });
    
    await expect(workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword))
      .rejects.toThrow('Apenas o OWNER pode alterar o certificado do Workspace');
  });

  it('4. chama CertificateService para extrair validade e 5. persiste certificateObjectKey e certificateExpiresAt', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1, certificateObjectKey: null });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'OWNER' });
    (prisma.workspace.update as any).mockResolvedValue({ id: 1, certificateExpiresAt: mockDate });

    vi.spyOn(CertificateService, 'parseAndExtractValidity').mockReturnValue({
      notAfter: mockDate,
      alertLevel: 'ok',
      expiresInDays: 100
    });
    mockCacheService.refreshCache.mockResolvedValue({ ok: true, workspacesProcessed: 1, errors: [] });
    // Simulate one impacted accountant
    (prisma.workspaceMember.findMany as any).mockResolvedValue([{ userId: 10 }]);

    const result = await workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword);

    expect(CertificateService.parseAndExtractValidity).toHaveBeenCalledWith(validBuffer, validPassword);
    expect(mockStorageProvider.uploadSecureBuffer).toHaveBeenCalledWith(validBuffer, 1, 'CERTIFICATE', 'application/x-pkcs12');
    
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        certificateObjectKey: 'vault/new-cert-key.pfx',
        certificateExpiresAt: mockDate
      }
    });

    expect(result.workspaceId).toBe(1);
    expect(result.certificateExpiresAt).toBe(mockDate);
    expect(result.expiresInDays).toBe(100);
    expect(result.alertLevel).toBe('ok');
  });

  it('6. não apaga o certificado antigo se a etapa do novo upload falhar', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1, certificateObjectKey: 'old-cert-key.pfx' });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'OWNER' });

    vi.spyOn(CertificateService, 'parseAndExtractValidity').mockReturnValue({
      notAfter: mockDate, alertLevel: 'ok', expiresInDays: 100
    });

    vi.spyOn(mockStorageProvider, 'uploadSecureBuffer').mockRejectedValue(new Error('S3 Error'));

    await expect(workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword))
      .rejects.toThrow('S3 Error');

    expect(mockStorageProvider.deleteFile).not.toHaveBeenCalled(); // Não excluiu o antigo
    expect(prisma.workspace.update).not.toHaveBeenCalled(); // Não persistiu o novo
  });

  it('7. faz cleanup do novo objeto se a persistência falhar e preserva o certificado antigo', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1, certificateObjectKey: 'old-cert-key.pfx' });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'OWNER' });
    (prisma.workspace.update as any).mockRejectedValue(new Error('DB Error'));

    vi.spyOn(CertificateService, 'parseAndExtractValidity').mockReturnValue({
      notAfter: mockDate, alertLevel: 'ok', expiresInDays: 100
    });

    await expect(workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword))
      .rejects.toThrow('DB Error');

    expect(mockStorageProvider.uploadSecureBuffer).toHaveBeenCalledWith(validBuffer, 1, 'CERTIFICATE', 'application/x-pkcs12');
    expect(mockStorageProvider.deleteFile).toHaveBeenCalledTimes(1);
    expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith('vault/new-cert-key.pfx');
    expect(mockStorageProvider.deleteFile).not.toHaveBeenCalledWith('old-cert-key.pfx');
  });

  it('8. só deleta o certificado antigo depois do sucesso do novo fluxo', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1, certificateObjectKey: 'old-cert-key.pfx' });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'OWNER' });
    (prisma.workspace.update as any).mockResolvedValue({});
    mockCacheService.refreshCache.mockResolvedValue({ ok: true, workspacesProcessed: 1, errors: [] });

    vi.spyOn(CertificateService, 'parseAndExtractValidity').mockReturnValue({
      notAfter: mockDate, alertLevel: 'ok', expiresInDays: 100
    });

    await workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword);

    expect(mockStorageProvider.uploadSecureBuffer).toHaveBeenCalled();
    expect(prisma.workspace.update).toHaveBeenCalled();
    expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith('old-cert-key.pfx'); // Excluiu o antigo APÓS persistir o novo
  });

  it('9. dispara refresh dos caches impactados e 10. continua sendo sucesso se refresh falhar', async () => {
    (prisma.workspace.findFirst as any).mockResolvedValue({ id: 1, certificateObjectKey: null });
    (prisma.workspaceMember.findFirst as any).mockResolvedValue({ role: 'OWNER' });
    (prisma.workspace.update as any).mockResolvedValue({});
    
    vi.spyOn(CertificateService, 'parseAndExtractValidity').mockReturnValue({
      notAfter: mockDate, alertLevel: 'ok', expiresInDays: 100
    });

    // Simulando falha no refresh do cache (rejeição)
    mockCacheService.refreshCache.mockRejectedValue(new Error('Redis Down'));
    // Simulando que existem 2 contadores no workspace
    (prisma.workspaceMember.findMany as any).mockResolvedValue([{ userId: 20 }, { userId: 21 }]);

    const result = await workspaceService.uploadCertificate(1, 1, 1, validBuffer, validPassword);

    // O upload deve terminar com sucesso, apesar da falha do cache (que é assíncrona/best-effort)
    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 1, role: 'ACCOUNTANT' }
    });
    expect(mockCacheService.refreshCache).toHaveBeenCalledWith(20);
    expect(mockCacheService.refreshCache).toHaveBeenCalledWith(21);
    expect(result.alertLevel).toBe('ok');
    expect(result.workspaceId).toBe(1);
    expect(result.certificateExpiresAt).toBe(mockDate);
    expect(result.expiresInDays).toBe(100);
  });

});
