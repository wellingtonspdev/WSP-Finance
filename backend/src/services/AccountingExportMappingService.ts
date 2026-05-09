import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateAccountingExportMappingInput {
  workspaceId: number;
  macroCategoryId: number;
  layoutId: string;
  targetSystem: string;
  debitAccountCode: string;
  creditAccountCode: string;
  historyCode?: string | null;
  costCenterCode?: string | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
}

export interface ListAccountingExportMappingsInput {
  workspaceId: number;
  layoutId: string;
}

export interface FindActiveAccountingExportMappingInput {
  workspaceId: number;
  macroCategoryId: number;
  layoutId: string;
}

export interface DeactivateAccountingExportMappingInput {
  workspaceId: number;
  id: number;
  updatedByUserId?: number | null;
}

const NUMERIC_CODE_REGEX = /^[0-9]+$/;
const SUPPORTED_TARGET_SYSTEM = 'DOMINIO';
const SUPPORTED_LAYOUT_ID = 'dominio-separated-v1';

function validatePositiveInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} is required`);
  }
}

function requiredTrimmed(value: string | undefined | null, fieldName: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmed;
}

function numericRequiredCode(value: string | undefined | null, fieldName: string) {
  const trimmed = requiredTrimmed(value, `${fieldName}`);
  if (!NUMERIC_CODE_REGEX.test(trimmed)) {
    throw new Error(`${fieldName} must be numeric`);
  }

  return trimmed;
}

function optionalNumericCode(value: string | undefined | null, fieldName: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!NUMERIC_CODE_REGEX.test(trimmed)) {
    throw new Error(`${fieldName} must be numeric`);
  }

  return trimmed;
}

export class AccountingExportMappingService {
  async create(input: CreateAccountingExportMappingInput) {
    validatePositiveInteger(input.workspaceId, 'workspaceId');
    validatePositiveInteger(input.macroCategoryId, 'macroCategoryId');

    const layoutId = requiredTrimmed(input.layoutId, 'layoutId');
    const targetSystem = requiredTrimmed(input.targetSystem, 'targetSystem');
    if (targetSystem !== SUPPORTED_TARGET_SYSTEM) {
      throw new Error('targetSystem must be DOMINIO');
    }

    if (layoutId !== SUPPORTED_LAYOUT_ID) {
      throw new Error('layoutId must be dominio-separated-v1');
    }

    const debitAccountCode = numericRequiredCode(input.debitAccountCode, 'debitAccountCode');
    const creditAccountCode = numericRequiredCode(input.creditAccountCode, 'creditAccountCode');
    const historyCode = optionalNumericCode(input.historyCode, 'historyCode');
    const costCenterCode = optionalNumericCode(input.costCenterCode, 'costCenterCode');

    const macroCategory = await prisma.macroCategory.findUnique({
      where: { id: input.macroCategoryId },
    });

    if (!macroCategory || !macroCategory.isActive) {
      throw new Error('MacroCategory not found or inactive');
    }

    const duplicate = await prisma.accountingExportMapping.findUnique({
      where: {
        workspaceId_macroCategoryId_layoutId: {
          workspaceId: input.workspaceId,
          macroCategoryId: input.macroCategoryId,
          layoutId,
        },
      },
    });

    if (duplicate) {
      throw new Error('Accounting export mapping already exists for workspace/macroCategory/layout');
    }

    try {
      return await prisma.accountingExportMapping.create({
        data: {
          workspaceId: input.workspaceId,
          macroCategoryId: input.macroCategoryId,
          layoutId,
          targetSystem,
          debitAccountCode,
          creditAccountCode,
          historyCode,
          costCenterCode,
          isActive: true,
          createdByUserId: input.createdByUserId ?? null,
          updatedByUserId: input.updatedByUserId ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Accounting export mapping already exists for workspace/macroCategory/layout');
      }

      throw error;
    }
  }

  async listByWorkspaceAndLayout(input: ListAccountingExportMappingsInput) {
    validatePositiveInteger(input.workspaceId, 'workspaceId');
    const layoutId = requiredTrimmed(input.layoutId, 'layoutId');

    return prisma.accountingExportMapping.findMany({
      where: {
        workspaceId: input.workspaceId,
        layoutId,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findActiveForExport(input: FindActiveAccountingExportMappingInput) {
    validatePositiveInteger(input.workspaceId, 'workspaceId');
    validatePositiveInteger(input.macroCategoryId, 'macroCategoryId');
    const layoutId = requiredTrimmed(input.layoutId, 'layoutId');

    return prisma.accountingExportMapping.findFirst({
      where: {
        workspaceId: input.workspaceId,
        macroCategoryId: input.macroCategoryId,
        layoutId,
        isActive: true,
      },
    });
  }

  async deactivate(input: DeactivateAccountingExportMappingInput) {
    validatePositiveInteger(input.workspaceId, 'workspaceId');
    validatePositiveInteger(input.id, 'id');

    const result = await prisma.accountingExportMapping.updateMany({
      where: {
        id: input.id,
        workspaceId: input.workspaceId,
      },
      data: {
        isActive: false,
        ...(input.updatedByUserId !== undefined ? { updatedByUserId: input.updatedByUserId } : {}),
      },
    });

    if (result.count === 0) {
      throw new Error('Accounting export mapping not found');
    }

    return prisma.accountingExportMapping.findFirst({
      where: {
        id: input.id,
        workspaceId: input.workspaceId,
      },
    });
  }
}
