import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const SUPPORTED_TARGET_SYSTEM = 'DOMINIO';
const SUPPORTED_LAYOUT_ID = 'dominio-separated-v1';
const DEFAULT_SOURCE_LABEL = 'WSP';

export interface CreateAccountingExportConfigInput {
  targetSystem: string;
  layoutId: string;
  companyCode?: string | null;
  branchCode?: string | null;
  sourceLabel?: string | null;
  historyCodeRequired?: boolean;
  isActive?: boolean;
}

export class AccountingExportConfigService {
  async create(workspaceId: number, input: CreateAccountingExportConfigInput) {
    const targetSystem = input.targetSystem?.trim();
    if (targetSystem !== SUPPORTED_TARGET_SYSTEM) {
      throw new Error('targetSystem must be DOMINIO');
    }

    const layoutId = input.layoutId?.trim();
    if (layoutId !== SUPPORTED_LAYOUT_ID) {
      throw new Error('layoutId must be dominio-separated-v1');
    }

    const companyCode = input.companyCode?.trim();
    if (!companyCode) {
      throw new Error('companyCode is required');
    }

    const branchCode = input.branchCode?.trim() || null;
    const sourceLabel = input.sourceLabel?.trim() || DEFAULT_SOURCE_LABEL;

    try {
      return await prisma.accountingExportConfig.create({
        data: {
          workspaceId,
          targetSystem,
          layoutId,
          companyCode,
          branchCode,
          sourceLabel,
          historyCodeRequired: input.historyCodeRequired ?? false,
          isActive: input.isActive ?? true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Accounting export config already exists for workspace/layout');
      }

      throw error;
    }
  }

  async getByLayout(workspaceId: number, layoutId: string) {
    return prisma.accountingExportConfig.findUnique({
      where: {
        workspaceId_layoutId: {
          workspaceId,
          layoutId,
        },
      },
    });
  }

  async getActiveByLayout(workspaceId: number, layoutId: string) {
    return prisma.accountingExportConfig.findFirst({
      where: {
        workspaceId,
        layoutId,
        isActive: true,
      },
    });
  }
}
