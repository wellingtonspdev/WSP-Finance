import { IStorageProvider } from '../providers/IStorageProvider';
import { S3StorageProvider } from '../providers/S3StorageProvider';
import { randomUUID } from 'crypto';
import CircuitBreaker from 'opossum';
import { prisma } from '../lib/prisma';

export class UploadService {
  private storageProvider: IStorageProvider;
  private breaker: CircuitBreaker;

  constructor() {
    // Injeção de Dependência real - Usando R2 Provider
    this.storageProvider = new S3StorageProvider();

    const breakerOptions = {
      timeout: 3000, // 3 segundos para a Cloudflare entregar a Presigned URL
      errorThresholdPercentage: 50, // Se 50% falhar, abre o circuito
      resetTimeout: 10000 // Tenta fechar de novo em 10 segundos
    };

    // A função assíncrona blindada pelo Opossum
    this.breaker = new CircuitBreaker(
      async (uniqueName: string, contentType: string, folderType: string, fileSize: number) => {
        return await this.storageProvider.generateUploadUrl(uniqueName, contentType, folderType, fileSize);
      },
      breakerOptions
    );

    this.breaker.fallback(() => {
      throw new Error('Serviço de Arquivos Temporariamente Indisponível (Bypass R2 Timeout). Tente novamente mais tarde.');
    });
  }

  async requestUpload(fileName: string, contentType: string, workspaceId: number, folderType: string, fileSize: number) {
    // 1. Verificação de Restrição de Cota On-The-Fly (V3.8 Prisma Engine)
    const quotaResult = await prisma.transaction.aggregate({
      where: { workspaceId },
      _sum: { attachmentSize: true }
    });

    const usedQuota = quotaResult._sum.attachmentSize || 0;
    const GIGABYTE = 1073741824; // 1GB em Bytes
    if (usedQuota + fileSize > GIGABYTE) {
      const error: any = new Error('Cota de 1GB excedida. Efetue limpezas (Clean-Up).');
      error.status = 402; // Payment Required
      throw error;
    }

    // 2. Validação Restrita de Tipo (MIME Type Enforcement - Segurança)
    if (folderType === 'AVATAR') {
      if (!contentType.startsWith('image/')) throw new Error('Apenas imagens são permitidas para Avatares.');
    } else if (folderType === 'CERTIFICATE') {
      if (contentType !== 'application/x-pkcs12' && contentType !== 'application/x-pem-file') {
        throw new Error('Certificados precisam ser do tipo .p12, .pfx ou .pem.');
      }
    } else if (folderType === 'INVOICE' || folderType === 'RECEIPT') {
      if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
        throw new Error('Arquivos devem ser imagens ou PDFs.');
      }
    }

    // 3. Naming Convention de Auditoria (V3.8 Naming)
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const datePrefix = now.toISOString().split('T')[0];
    const shortHash = randomUUID().split('-')[0]; // Hashes de 8 caracteres

    const prefixKey = `${datePrefix}_${folderType}_${shortHash}.${ext}`;

    // Tratamento Direcionado (Soberania do Backend)
    const uniqueName = folderType === 'CERTIFICATE'
      ? `workspaces/${workspaceId}/vault/${prefixKey}`
      : `workspaces/${workspaceId}/${folderType.toLowerCase()}/${yearMonth}/${prefixKey}`;

    // 4. Invocar via Circuit Breaker
    // Se a Cloudflare Cair aqui, o Backend joga erro 503 e não destrói o banco.
    return await this.breaker.fire(uniqueName, contentType, folderType, fileSize) as { uploadUrl: string; publicUrl: string; headers?: Record<string, string> };
  }

  async deleteRemoteFile(url: string) {
    await this.storageProvider.deleteFile(url);
  }

  async getAttachmentSignedUrl(transactionId: string, workspaceId: number): Promise<{ downloadUrl: string; headers?: Record<string, string> }> {
    // 1. Validar posse da transação: O Segurança
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId,
      },
      select: { attachmentUrl: true }
    });

    if (!transaction) {
      throw new Error('Transação não encontrada ou você não tem acesso a ela.');
    }

    if (!transaction.attachmentUrl || transaction.attachmentUrl.trim() === '') {
      throw new Error('Esta transação não possui nenhum anexo.');
    }

    // 2. Gerar URL temporária
    return await this.storageProvider.getSignedDownloadUrl(transaction.attachmentUrl);
  }
}