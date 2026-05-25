import { PrismaClient, TransactionType, WorkspaceType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { maskFinancialText } from '../../lib/piiMasking';
import { AiProviderInput } from '../../providers/AiProvider';

const DESCRIPTION_MAX_LENGTH = 240;
const CATEGORY_MAX_LENGTH = 80;
const MACRO_FIELD_MAX_LENGTH = 40;

type ContextClient = Pick<PrismaClient, 'transaction'>;

export class TransactionAiContextBuilder {
  constructor(private readonly client: ContextClient = prisma as unknown as ContextClient) {}

  async build(workspaceId: number, transactionId: string): Promise<AiProviderInput | null> {
    const transaction = await this.client.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId,
      },
      select: {
        description: true,
        amount: true,
        type: true,
        workspace: { select: { type: true } },
        category: {
          select: {
            name: true,
            macroCategory: {
              select: {
                code: true,
                group: true,
              },
            },
          },
        },
      },
    });

    if (!transaction || transaction.type !== TransactionType.EXPENSE) {
      return null;
    }

    const workspaceContext = transaction.workspace.type === WorkspaceType.BUSINESS ? 'BUSINESS' : 'PERSONAL';

    return {
      workspaceContext,
      transactionType: 'EXPENSE',
      amount: transaction.amount.toString(),
      descriptionMasked: maskAndTruncate(transaction.description, DESCRIPTION_MAX_LENGTH),
      categoryMasked: transaction.category?.name ? maskAndTruncate(transaction.category.name, CATEGORY_MAX_LENGTH) : null,
      macroCategoryCode: truncateSafe(transaction.category?.macroCategory?.code ?? null, MACRO_FIELD_MAX_LENGTH),
      macroCategoryGroup: transaction.category?.macroCategory?.group
        ? maskAndTruncate(transaction.category.macroCategory.group, MACRO_FIELD_MAX_LENGTH)
        : null,
      businessContext: workspaceContext === 'BUSINESS'
        ? 'Despesa registrada em workspace empresarial/CNPJ'
        : 'Despesa registrada em workspace pessoal/CPF',
    };
  }
}

function maskAndTruncate(value: string, maxLength: number): string {
  return truncateSafe(maskFinancialText(maskLikelyPersonNames(value)).replace(/\s+/g, ' ').trim(), maxLength) ?? '';
}

function maskLikelyPersonNames(value: string): string {
  return value.replace(/\b\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)+\b/gu, '[NAME_MASKED]');
}

function truncateSafe(value: string | null, maxLength: number): string | null {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
