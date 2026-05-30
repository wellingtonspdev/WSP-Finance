import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramOcrIngestionService } from '../../src/services/TelegramOcrIngestionService';
import { prisma } from '../../src/lib/prisma';

vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      bankMovement: {
        create: vi.fn(),
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

// Mock BankMovementService para garantir que ingestão nunca chama approve
vi.mock('../../src/services/BankMovementService', () => {
  const BankMovementServiceMock = vi.fn();
  BankMovementServiceMock.prototype.approve = vi.fn();
  return { BankMovementService: BankMovementServiceMock };
});

describe('TelegramOcrIngestionService', () => {
  let ingestionService: TelegramOcrIngestionService;

  const baseDtoData = {
    chatId: '12345',
    telegramUserId: '54321',
    fileId: 'file_abc',
    fileName: 'comprovante.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    telegramUserLinkId: 'link_xyz',
    userId: 10,
    workspaceId: 1,
    accountId: 5,
    categoryId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ingestionService = new TelegramOcrIngestionService();
  });

  // ─── Cria BankMovement PENDING com dados reais ───
  it('cria BankMovement PENDING com amount/date/description do OCR simulado', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_new',
      status: 'PENDING',
      source: 'TELEGRAM_OCR',
      amount: -150,
      workspaceId: 1,
      accountId: 5,
    } as any);

    const result = await ingestionService.ingest(baseDtoData);

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 1,
        accountId: 5,
        status: 'PENDING',
        source: 'TELEGRAM_OCR',
        amount: -150, // Simulação padrão é EXPENSE → negativo
        description: expect.stringContaining('comprovante.pdf'),
      }),
    });

    expect(result.status).toBe('PENDING');
    expect(result.source).toBe('TELEGRAM_OCR');
  });

  // ─── INCOME: amount positivo ───
  it('cria BankMovement com amount POSITIVO para INCOME', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_income',
      status: 'PENDING',
      amount: 250,
    } as any);

    await ingestionService.ingest({
      ...baseDtoData,
      parsedData: {
        amount: 250,
        date: new Date('2026-01-15'),
        description: 'PIX recebido',
        transactionType: 'INCOME',
      },
    });

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 250,
        description: 'PIX recebido',
      }),
    });
  });

  // ─── EXPENSE: amount negativo ───
  it('cria BankMovement com amount NEGATIVO para EXPENSE', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_expense',
      status: 'PENDING',
      amount: -80.5,
    } as any);

    await ingestionService.ingest({
      ...baseDtoData,
      parsedData: {
        amount: 80.5,
        date: new Date('2026-01-15'),
        description: 'Boleto pago',
        transactionType: 'EXPENSE',
      },
    });

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -80.5, // Negativo para EXPENSE
        description: 'Boleto pago',
      }),
    });
  });

  // ─── P1-1: Rejeita amount zero ───
  it('rejeita ingestão quando parsedData.amount é zero', async () => {
    await expect(
      ingestionService.ingest({
        ...baseDtoData,
        parsedData: {
          amount: 0,
          date: new Date(),
          description: 'OCR falhou',
          transactionType: 'EXPENSE',
        },
      }),
    ).rejects.toThrow('OCR: valor extraído inválido (zero ou negativo).');

    // BankMovement NÃO deve ser criado
    expect(prisma.bankMovement.create).not.toHaveBeenCalled();
  });

  // ─── Rejeita amount negativo ───
  it('rejeita ingestão quando parsedData.amount é negativo', async () => {
    await expect(
      ingestionService.ingest({
        ...baseDtoData,
        parsedData: {
          amount: -50,
          date: new Date(),
          description: 'Valor inválido',
          transactionType: 'EXPENSE',
        },
      }),
    ).rejects.toThrow('OCR: valor extraído inválido (zero ou negativo).');

    expect(prisma.bankMovement.create).not.toHaveBeenCalled();
  });

  // ─── Ingestão NUNCA cria Transaction ───
  it('ingestão NÃO chama transaction.create', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_safe',
      status: 'PENDING',
      amount: -100,
    } as any);

    await ingestionService.ingest(baseDtoData);

    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  // ─── Ingestão NUNCA altera Account.balance ───
  it('ingestão NÃO chama account.update', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_safe2',
      status: 'PENDING',
      amount: -100,
    } as any);

    await ingestionService.ingest(baseDtoData);

    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  // ─── rawPayload é minimizado ───
  it('rawPayload contém apenas fileId e telegramUserLinkId', async () => {
    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_payload',
      status: 'PENDING',
      amount: -150,
    } as any);

    await ingestionService.ingest(baseDtoData);

    const callArgs = vi.mocked(prisma.bankMovement.create).mock.calls[0][0];
    const rawPayload = callArgs.data.rawPayload as any;

    // Dados permitidos
    expect(rawPayload.fileId).toBe('file_abc');
    expect(rawPayload.telegramUserLinkId).toBe('link_xyz');

    // Dados proibidos NÃO devem existir
    expect(rawPayload.chatId).toBeUndefined();
    expect(rawPayload.rawText).toBeUndefined();
    expect(rawPayload.ocrText).toBeUndefined();
    expect(rawPayload.base64).toBeUndefined();
    expect(rawPayload.image).toBeUndefined();
    expect(rawPayload.token).toBeUndefined();
    expect(rawPayload.pairingCode).toBeUndefined();
    expect(rawPayload.codeHash).toBeUndefined();
    expect(rawPayload.telegramUserId).toBeUndefined();
    expect(rawPayload.telegramChatId).toBeUndefined();
  });

  // ─── Ingestão NÃO chama BankMovementService.approve ───
  it('ingestão NÃO chama BankMovementService.approve', async () => {
    const { BankMovementService } = await import('../../src/services/BankMovementService');

    vi.mocked(prisma.bankMovement.create).mockResolvedValue({
      id: 'mov_no_approve',
      status: 'PENDING',
      amount: -100,
    } as any);

    await ingestionService.ingest(baseDtoData);

    expect(BankMovementService.prototype.approve).not.toHaveBeenCalled();
  });
});
