import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadService } from '../../src/services/UploadService';
import { prisma } from '../../src/lib/prisma';
import { S3StorageProvider } from '../../src/providers/S3StorageProvider';

// Mock dependentes
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        transaction: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock('../../src/providers/S3StorageProvider', () => {
    return {
        S3StorageProvider: vi.fn().mockImplementation(function () {
            return {
                generateUploadUrl: vi.fn().mockResolvedValue({ uploadUrl: 'http://upload.com', publicUrl: 'http://public.com' }),
                deleteFile: vi.fn().mockResolvedValue(undefined),
                getSignedDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: 'http://signed-url.com' }),
            };
        }),
    };
});

// Mock da engine asíncrona pra conseguirmos rastrear "fire and forget"
const mockLogAsync = vi.fn();
vi.mock('../../src/services/AuditLogService', () => ({
    AuditLogService: {
        logAsync: (...args: any[]) => mockLogAsync(...args)
    }
}));

describe('UploadService - Phase C Governance', () => {
    let uploadService: UploadService;

    beforeEach(() => {
        vi.clearAllMocks();
        uploadService = new UploadService();
    });

    it('deve disparar auditoria ATTACHMENT_VIEW assincronamente', async () => {
        // Transação perfeitamente válida com anexo
        (prisma.transaction.findFirst as any).mockResolvedValue({
            attachmentUrl: 'bucket-prefix/invoice-hash.pdf',
        });

        const transactionId = 'uuid-transacao-123';
        const workspaceId = 99;
        const userId = 10;

        await uploadService.getAttachmentSignedUrl(transactionId, workspaceId, userId);

        // O Mock do Prisma deve ter sido chamado pra checar a transação
        expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
            where: { id: transactionId, workspaceId },
            select: { attachmentUrl: true }
        });

        // Verificação de Governança: O log foi emitido corretamete sem travar a promise principal?
        expect(mockLogAsync).toHaveBeenCalledTimes(1);
        expect(mockLogAsync).toHaveBeenCalledWith({
            userId: 10,
            workspaceId: 99,
            action: 'ATTACHMENT_VIEW',
            entity: 'Transaction',
            entityId: transactionId,
            newState: { attachmentUrl: 'bucket-prefix/invoice-hash.pdf' }
        });
    });

    it('NAO deve emitir log de auditoria se a transacao nao existir ou o usuario nao tiver acesso', async () => {
        // Ameaça / Transação Nula
        (prisma.transaction.findFirst as any).mockResolvedValue(null);

        await expect(
            uploadService.getAttachmentSignedUrl('uuid-123', 99, 10)
        ).rejects.toThrow('Transação não encontrada ou você não tem acesso a ela.');

        // Governança: Se rejeitou acesso, não contabiliza como visualização (não vaza existência)
        expect(mockLogAsync).not.toHaveBeenCalled();
    });
});
