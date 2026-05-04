import { prisma } from '../lib/prisma';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { WorkspaceType, DocumentType } from '@prisma/client';
import { CertificateService } from './CertificateService';
import { AccountantCacheService } from './AccountantCacheService';
import { IStorageProvider } from '../providers/IStorageProvider';
import { S3StorageProvider } from '../providers/S3StorageProvider';

export interface CreateWorkspaceDTO {
  name: string;
  type: WorkspaceType;
  fiscalIdentity?: {
    documentType: DocumentType;
    document: string;
    cnae?: string | null;
  };
  address?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}

export class WorkspaceService {
  private workspaceRepository: WorkspaceRepository;
  private storageProvider: IStorageProvider;
  private cacheService: AccountantCacheService;

  constructor() {
    this.workspaceRepository = new WorkspaceRepository();
    // Injeção de dependência via provider/services (mockáveis nos testes)
    this.storageProvider = new S3StorageProvider();
    this.cacheService = new AccountantCacheService();
  }

  async create(payload: CreateWorkspaceDTO, userId: number) {
    if (!payload.name) throw new Error('Name is required');

    // Linter Fiscal Inteligente: Inferência de Alíquota (Tax Rate)
    // O sistema avalia a string pura do CNAE e enquadra tributariamente (Ex: Simples Nacional vs MEI)
    let inferredTaxRate = 0.00;
    if (payload.type === 'BUSINESS' && payload.fiscalIdentity?.cnae) {
      const cleanCnae = payload.fiscalIdentity.cnae.replace(/\D/g, '');

      // Exemplo A: Desenvolvimento de Software (620...), Advogados (6911...), Engenheiros (7112...)
      // Linter presume o "Anexo III ou V" do Simples Nacional
      if (cleanCnae.startsWith('620') || cleanCnae.startsWith('6911') || cleanCnae.startsWith('7112')) {
        inferredTaxRate = 6.00;
      }
      // Exemplo B: Entregador Independente (5320202 ou semelhante genérico)
      // Linter Fiscal atribui a carga MEI isento / fixa (0%)
      else if (cleanCnae.startsWith('5320')) {
        inferredTaxRate = 0.00;
      }
    }

    // Transação para criar workspace e vincular membro
    const workspace = await prisma.$transaction(async (tx: any) => {
      const ws = await tx.workspace.create({
        data: {
          name: payload.name,
          type: payload.type,
          taxRate: inferredTaxRate,

          // Entradas Fiscais
          ...(payload.fiscalIdentity && {
            documentType: payload.fiscalIdentity.documentType,
            document: payload.fiscalIdentity.document,
            cnae: payload.fiscalIdentity.cnae,
          }),

          // Entradas de Endereço Comercial
          ...(payload.address && {
            zipCode: payload.address.zipCode,
            street: payload.address.street,
            number: payload.address.number,
            complement: payload.address.complement,
            neighborhood: payload.address.neighborhood,
            city: payload.address.city,
            state: payload.address.state,
          })
        }
      });

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: ws.id,
          role: 'OWNER'
        }
      });

      return ws;
    });

    return workspace;
  }

  async list(userId: number) {
    return await this.workspaceRepository.findManyByUserId(userId);
  }

  async update(id: number, name: string, type: WorkspaceType, userId: number) {
    // Validação de segurança: O usuário é dono deste workspace?
    const existingWorkspace = await this.workspaceRepository.findByIdAndUserId(id, userId);

    if (!existingWorkspace) {
      throw new Error('Workspace not found or access denied');
    }

    return await this.workspaceRepository.update(id, {
      name,
      type
    });
  }

  /**
   * Orquestra o upload de um certificado A1.
   */
  async uploadCertificate(
    workspaceId: number,
    userId: number,
    reqWorkspaceId: number,
    fileBuffer: Buffer,
    password: string
  ): Promise<{ workspaceId: number; certificateExpiresAt: Date; expiresInDays: number; alertLevel: string }> {
    // 1 e 2. Validações de Workspace
    if (workspaceId !== reqWorkspaceId) {
      throw new Error('Mismatch: req.workspaceId differs from target workspaceId');
    }

    const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId } });
    if (!workspace) {
      throw new Error('Workspace not found or access denied');
    }

    // 3. Validar se usuário é OWNER (Apenas owner pode fazer upload de certificados sensíveis)
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });

    if (!membership || !['OWNER', 'ACCOUNTANT'].includes(membership.role)) {
      throw new Error('Apenas o OWNER ou ACCOUNTANT pode alterar o certificado do Workspace');
    }

    // 4 e 5. Validar arquivo e extrair a validade
    const { notAfter, expiresInDays, alertLevel } = CertificateService.parseAndExtractValidity(fileBuffer, password);

    let newObjectKey: string;
    if (this.storageProvider.uploadSecureBuffer) {
      newObjectKey = await this.storageProvider.uploadSecureBuffer(fileBuffer, workspaceId, 'CERTIFICATE', 'application/x-pkcs12');
    } else {
      throw new Error('Storage provider does not support secure buffer upload');
    }

    // Opcional: Se já existe um certificado, guarda a key para apagar somente após sucesso total
    const oldCertificateKey = workspace.certificateObjectKey;

    // 8. Persistir no Workspace (Fonte da Verdade)
    try {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          certificateObjectKey: newObjectKey,
          certificateExpiresAt: notAfter
        }
      });
    } catch (err) {
      try {
        await this.storageProvider.deleteFile(newObjectKey);
      } catch (cleanupErr) {
        console.warn(`[WorkspaceService] Falha nÃ£o crÃ­tica ao limpar certificado novo nÃ£o persistido ${newObjectKey}:`, cleanupErr);
      }

      throw err;
    }

    // 9. Atualizar os Caches Impactados (Best effort: Falha não reverte o upload que deu certo)
    // Buscamos todos os contadores deste workspace para atualizar seus respectivos caches
    try {
      const impactedAccountants = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: 'ACCOUNTANT' }
      });

      const refreshPromises = impactedAccountants.map(acc =>
        this.cacheService.refreshCache(acc.userId).catch(err => {
          console.warn(`[WorkspaceService] Falha não crítica ao atualizar cache para o contador ${acc.userId}:`, err);
        })
      );

      await Promise.allSettled(refreshPromises);
    } catch (err) {
      console.warn(`[WorkspaceService] Falha não crítica na orquestração de cache para Workspace ${workspaceId}:`, err);
    }

    // 10. Deletar certificado antigo (Best effort também, ocorre após salvar o novo caso haja)
    if (oldCertificateKey) {
      try {
        await this.storageProvider.deleteFile(oldCertificateKey);
      } catch (err) {
        console.warn(`[WorkspaceService] Falha não crítica ao deletar certificado antigo ${oldCertificateKey}:`, err);
      }
    }

    // 11. Retornar payload esperado
    return {
      workspaceId,
      certificateExpiresAt: notAfter,
      expiresInDays,
      alertLevel
    };
  }
}
