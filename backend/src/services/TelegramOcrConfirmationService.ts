import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';
import { BankMovementService } from './BankMovementService';

export class TelegramOcrConfirmationService {
  constructor(private bankMovementService: BankMovementService = new BankMovementService()) {}

  async confirm(
    userId: number,
    workspaceId: number,
    movementId: string,
    expenseCategoryId: number | null,
    incomeCategoryId: number | null,
    overrideTransactionType?: 'EXPENSE' | 'INCOME',
  ) {
    const movement = await prisma.bankMovement.findUnique({
      where: { id: movementId },
    });

    if (!movement) {
      throw new AppError('Comprovante não encontrado ou já processado.', 404);
    }

    if (movement.workspaceId !== workspaceId) {
      throw new AppError('Comprovante não pertence ao seu workspace ativo.', 403);
    }

    if (movement.status !== 'PENDING') {
      throw new AppError('Este comprovante já foi processado ou ignorado.', 400);
    }

    // O BankMovement já foi criado pela ingestão com amount/date/description reais.
    // Bloquear aprovação de movimento sem valor financeiro.
    const currentAmount = Number(movement.amount);
    if (currentAmount === 0) {
      throw new AppError('Não é possível aprovar comprovante com valor R$ 0,00. OCR não extraiu valor válido.', 422);
    }

    // transactionType é derivado do sinal do amount (definido pela ingestão)
    // ou pode ser sobrescrito explicitamente para casos especiais.
    const transactionType: 'EXPENSE' | 'INCOME' = overrideTransactionType
      ?? (currentAmount < 0 ? 'EXPENSE' : 'INCOME');

    const categoryIdToUse = transactionType === 'EXPENSE'
      ? expenseCategoryId
      : incomeCategoryId;

    if (!categoryIdToUse) {
      throw new AppError(`Categoria padrão não configurada para o tipo de transação: ${transactionType}.`, 400);
    }

    const processedMovement = await this.bankMovementService.approve({
      userId,
      movementId: movement.id,
      workspaceId,
      categoryId: categoryIdToUse as number,
    } as any);

    return processedMovement;
  }

  async cancel(userId: number, workspaceId: number, movementId: string) {
    const movement = await prisma.bankMovement.findUnique({
      where: { id: movementId },
    });

    if (!movement) {
      throw new AppError('Comprovante não encontrado.', 404);
    }

    if (movement.workspaceId !== workspaceId) {
      throw new AppError('Acesso negado.', 403);
    }

    if (movement.status !== 'PENDING') {
      throw new AppError('Comprovante não pode mais ser cancelado.', 400);
    }

    return await prisma.bankMovement.update({
      where: { id: movementId },
      data: { status: 'REJECTED' },
    });
  }
}
