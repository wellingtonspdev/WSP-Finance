import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadService } from '../../src/services/UploadService';

// Mocks Profundos
vi.mock('../../src/providers/S3StorageProvider', () => {
    return {
        S3StorageProvider: class {
            generateUploadUrl = vi.fn().mockResolvedValue({
                uploadUrl: 'https://fake-s3-upload-url.com',
                publicUrl: 'workspaces/1/receipt/2026-02/file.pdf',
            });
            deleteFile = vi.fn().mockResolvedValue(true);
            getSignedDownloadUrl = vi.fn().mockResolvedValue({
                downloadUrl: 'https://fake-s3-download-url.com?expiresIn=300',
                headers: { 'x-amz-server-side-encryption-customer-algorithm': 'AES256' }
            });
        },
    };
});

vi.mock('../../src/lib/prisma', () => {
    return {
        prisma: {
            transaction: {
                aggregate: vi.fn().mockResolvedValue({ _sum: { attachmentSize: 500 * 1024 * 1024 } }), // 500MB usados
                findFirst: vi.fn().mockResolvedValue({ attachmentUrl: 'workspaces/1/receipt/file.pdf' })
            },
            auditLog: {
                create: vi.fn().mockResolvedValue(true)
            },
            $executeRaw: vi.fn().mockResolvedValue([])
        }
    };
});

describe('UploadService Core & Security', () => {
    let uploadService: UploadService;

    beforeEach(() => {
        vi.clearAllMocks();
        uploadService = new UploadService();
    });

    describe('Cota de Storage (V3.8 Engine)', () => {
        it('deve aprovar upload se houver cota livre (500MB usados + 10MB arquivo)', async () => {
            const result = await uploadService.requestUpload('test.pdf', 'application/pdf', 1, 'RECEIPT', 10 * 1024 * 1024);
            expect(result).toHaveProperty('uploadUrl');
            expect(result).toHaveProperty('publicUrl');
        });

        it('deve estourar erro 402 se o upload extrapolar 1GB', async () => {
            const { prisma } = await import('../../src/lib/prisma');
            // Forçar cota cheia no mock
            (prisma.transaction.aggregate as any).mockResolvedValueOnce({ _sum: { attachmentSize: 1000 * 1024 * 1024 } }); // 1000MB

            await expect(
                uploadService.requestUpload('gigante.pdf', 'application/pdf', 1, 'RECEIPT', 100 * 1024 * 1024) // +100MB
            ).rejects.toThrow('Cota de 1GB excedida');
        });
    });

    describe('Enforcement MIME Types e SSE-C', () => {
        it('deve rejeitar subida de PDF para o bucket AVATAR', async () => {
            await expect(
                uploadService.requestUpload('avatar.pdf', 'application/pdf', 1, 'AVATAR', 1024)
            ).rejects.toThrow('Apenas imagens são permitidas para Avatares.');
        });

        it('deve aceitar subida do tipo Vault/Certificate somente em Extensões de Certificados Reais', async () => {
            await expect(
                uploadService.requestUpload('cert.png', 'image/png', 1, 'CERTIFICATE', 1024)
            ).rejects.toThrow('Certificados precisam ser do tipo .p12, .pfx ou .pem');
        });
    });

    describe('Visualização Segura (Get Object TTL e Posse do Workspace)', () => {
        it('deve gerar URL de visualização caso o Workspace possua a transação atrelada', async () => {
            const result = await uploadService.getAttachmentSignedUrl('tx-123', 1);
            expect(result.downloadUrl).toContain('expiresIn=300');
            expect(result.headers).toHaveProperty('x-amz-server-side-encryption-customer-algorithm');
        });

        it('deve lançar erro se um Workspace Invasor tentar acessar transação de outro tenant', async () => {
            const { prisma } = await import('../../src/lib/prisma');
            // Mockando resposta vazia simulando a cláusula WHERE `workspaceId`
            (prisma.transaction.findFirst as any).mockResolvedValueOnce(null);

            await expect(
                uploadService.getAttachmentSignedUrl('tx-alheia', 999) // Invasão
            ).rejects.toThrow('Transação não encontrada ou você não tem acesso a ela.');
        });
    });
});
