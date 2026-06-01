import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramOcrConfirmationService } from '../../src/services/TelegramOcrConfirmationService';
import { prisma } from '../../src/lib/prisma';
import { BankMovementService } from '../../src/services/BankMovementService';

vi.mock('../../src/services/BankMovementService', () => {
  const BankMovementServiceMock = vi.fn();
  BankMovementServiceMock.prototype.approve = vi.fn().mockResolvedValue({ id: 'mocked_transaction' });
  return { BankMovementService: BankMovementServiceMock };
});

vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      bankMovement: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      transaction: {
        create: vi.fn(),
      },
      account: {
        update: vi.fn(),
      },
    },
  };
});

describe('TelegramOcrConfirmationService', () => {
  let confirmationService: TelegramOcrConfirmationService;
  let mockBankMovementService: BankMovementService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBankMovementService = new BankMovementService();
    confirmationService = new TelegramOcrConfirmationService(mockBankMovementService);
  });

  // ─── P1-2: EXPENSE com amount NEGATIVO (sinal definido pela ingestão) ───
  it('EXPENSE: usa defaultExpenseCategoryId quando amount é negativo', async () => {
    const mockMovement = {
      id: 'mov_123',
      workspaceId: 1,
      status: 'PENDING',
      amount: -150.5, // Sinal negativo → EXPENSE
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    const result = await confirmationService.confirm(
      10, // userId
      1,  // workspaceId
      'mov_123',
      100, // expenseCategoryId
      200, // incomeCategoryId
    );

    // Deve chamar approve com movement.id (nunca draft.id)
    expect(mockBankMovementService.approve).toHaveBeenCalledWith({
      userId: 10,
      movementId: 'mov_123', // BankMovement.id, não TelegramOcrDraft.id
      workspaceId: 1,
      categoryId: 100, // defaultExpenseCategoryId
    });

    expect(result).toEqual({ id: 'mocked_transaction' });
  });

  // ─── P1-2: EXPENSE com override explícito e amount POSITIVO ───
  it('EXPENSE override: amount positivo + transactionType EXPENSE usa defaultExpenseCategoryId', async () => {
    const mockMovement = {
      id: 'mov_456',
      workspaceId: 1,
      status: 'PENDING',
      amount: 150.5, // Amount positivo, mas explicitamente marcado como EXPENSE
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    const result = await confirmationService.confirm(
      10, 1, 'mov_456',
      100, // expenseCategoryId
      200, // incomeCategoryId
      'EXPENSE', // override explícito
    );

    expect(mockBankMovementService.approve).toHaveBeenCalledWith({
      userId: 10,
      movementId: 'mov_456',
      workspaceId: 1,
      categoryId: 100, // Deve usar expense, não income
    });
  });

  // ─── P1-2: INCOME com amount POSITIVO ───
  it('INCOME: usa defaultIncomeCategoryId quando amount é positivo', async () => {
    const mockMovement = {
      id: 'mov_789',
      workspaceId: 1,
      status: 'PENDING',
      amount: 250.0, // Positivo → INCOME
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    const result = await confirmationService.confirm(
      10, 1, 'mov_789',
      100, // expenseCategoryId
      200, // incomeCategoryId
    );

    expect(mockBankMovementService.approve).toHaveBeenCalledWith({
      userId: 10,
      movementId: 'mov_789',
      workspaceId: 1,
      categoryId: 200, // defaultIncomeCategoryId
    });
  });

  // ─── P1-2: INCOME com override explícito e amount POSITIVO ───
  it('INCOME override: amount positivo + transactionType INCOME usa defaultIncomeCategoryId', async () => {
    const mockMovement = {
      id: 'mov_abc',
      workspaceId: 1,
      status: 'PENDING',
      amount: 500.0,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    const result = await confirmationService.confirm(
      10, 1, 'mov_abc',
      100, 200,
      'INCOME',
    );

    expect(mockBankMovementService.approve).toHaveBeenCalledWith({
      userId: 10,
      movementId: 'mov_abc',
      workspaceId: 1,
      categoryId: 200,
    });
  });

  // ─── P1-1: Bloqueia approve quando amount é zero ───
  it('BLOQUEIA approve se BankMovement tem amount zero', async () => {
    const mockMovement = {
      id: 'mov_zero',
      workspaceId: 1,
      status: 'PENDING',
      amount: 0, // OCR falhou em extrair valor
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.confirm(10, 1, 'mov_zero', 100, 200),
    ).rejects.toThrow('Não é possível aprovar comprovante com valor R$ 0,00');

    // Prova que approve NÃO foi chamado
    expect(mockBankMovementService.approve).not.toHaveBeenCalled();
  });

  // ─── P1-2: Falha se categoria inexistente para o tipo ───
  it('falha se não há expenseCategoryId para EXPENSE', async () => {
    const mockMovement = {
      id: 'mov_nocat',
      workspaceId: 1,
      status: 'PENDING',
      amount: -100,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.confirm(10, 1, 'mov_nocat', null, 200),
    ).rejects.toThrow('Categoria padrão não configurada para o tipo de transação: EXPENSE.');

    expect(mockBankMovementService.approve).not.toHaveBeenCalled();
  });

  it('falha se não há incomeCategoryId para INCOME', async () => {
    const mockMovement = {
      id: 'mov_nocat2',
      workspaceId: 1,
      status: 'PENDING',
      amount: 200,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.confirm(10, 1, 'mov_nocat2', 100, null),
    ).rejects.toThrow('Categoria padrão não configurada para o tipo de transação: INCOME.');

    expect(mockBankMovementService.approve).not.toHaveBeenCalled();
  });

  // ─── P1-3: Cancelamento usa REJECTED (não CANCELLED) ───
  it('cancela BankMovement com status REJECTED', async () => {
    const mockMovement = {
      id: 'mov_cancel',
      workspaceId: 1,
      status: 'PENDING',
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);
    vi.mocked(prisma.bankMovement.update).mockResolvedValue({ ...mockMovement, status: 'REJECTED' } as any);

    const result = await confirmationService.cancel(10, 1, 'mov_cancel');

    expect(prisma.bankMovement.update).toHaveBeenCalledWith({
      where: { id: 'mov_cancel' },
      data: { status: 'REJECTED' },
    });
    expect(result.status).toBe('REJECTED');
  });

  // ─── Cancelamento NÃO cria Transaction nem altera Account.balance ───
  it('cancelamento não chama transaction.create nem account.update', async () => {
    const mockMovement = {
      id: 'mov_safe_cancel',
      workspaceId: 1,
      status: 'PENDING',
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);
    vi.mocked(prisma.bankMovement.update).mockResolvedValue({ ...mockMovement, status: 'REJECTED' } as any);

    await confirmationService.cancel(10, 1, 'mov_safe_cancel');

    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();
    expect(mockBankMovementService.approve).not.toHaveBeenCalled();
  });

  // ─── Confirmação NÃO chama transaction.create nem account.update diretamente ───
  it('confirmação delega ao BankMovementService.approve, nunca cria Transaction diretamente', async () => {
    const mockMovement = {
      id: 'mov_delegate',
      workspaceId: 1,
      status: 'PENDING',
      amount: -100,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await confirmationService.confirm(10, 1, 'mov_delegate', 100, 200);

    // Prova que a confirmação não cria Transaction diretamente
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(prisma.account.update).not.toHaveBeenCalled();

    // Prova que delega ao BankMovementService
    expect(mockBankMovementService.approve).toHaveBeenCalledTimes(1);
  });

  // ─── Falha se BankMovement não existe ───
  it('falha se BankMovement não encontrado', async () => {
    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(null);

    await expect(
      confirmationService.confirm(10, 1, 'mov_inexistente', 100, 200),
    ).rejects.toThrow('Comprovante não encontrado ou já processado.');
  });

  // ─── Falha se BankMovement é de outro workspace ───
  it('falha se BankMovement pertence a workspace diferente', async () => {
    const mockMovement = {
      id: 'mov_other_ws',
      workspaceId: 99,
      status: 'PENDING',
      amount: -100,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.confirm(10, 1, 'mov_other_ws', 100, 200),
    ).rejects.toThrow('Comprovante não pertence ao seu workspace ativo.');
  });

  // ─── Falha se BankMovement já processado ───
  it('falha se BankMovement não está PENDING', async () => {
    const mockMovement = {
      id: 'mov_done',
      workspaceId: 1,
      status: 'APPROVED',
      amount: -100,
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.confirm(10, 1, 'mov_done', 100, 200),
    ).rejects.toThrow('Este comprovante já foi processado ou ignorado.');
  });

  // ─── Cancelamento falha se não PENDING ───
  it('falha ao cancelar se BankMovement não está PENDING', async () => {
    const mockMovement = {
      id: 'mov_processed',
      workspaceId: 1,
      status: 'APPROVED',
    };

    vi.mocked(prisma.bankMovement.findUnique).mockResolvedValue(mockMovement as any);

    await expect(
      confirmationService.cancel(10, 1, 'mov_processed'),
    ).rejects.toThrow('Comprovante não pode mais ser cancelado.');
  });
});
