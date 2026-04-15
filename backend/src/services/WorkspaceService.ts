import { prisma } from '../lib/prisma';
import { WorkspaceRepository } from '../repositories/WorkspaceRepository';
import { WorkspaceType, DocumentType } from '@prisma/client';

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

  constructor() {
    this.workspaceRepository = new WorkspaceRepository();
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
}