import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialIngestionEngine } from '../../src/services/FinancialIngestionEngine';
import { MovementSource } from '@prisma/client';

const createManyMock = vi.fn().mockImplementation((args) => {
  return { count: args.data.length }; // Simula a quantidade inserida
});

vi.mock('../../src/lib/prisma', () => {
  return {
    prisma: {
      bankMovement: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      account: {
        update: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        if (Array.isArray(callback)) {
           return Promise.all(callback);
        }
        return callback({
          bankMovement: {
            createMany: createManyMock
          }
        });
      }),
    },
  };
});

describe('FinancialIngestionEngine - Validações e Borda (TDD)', () => {
  let engine: FinancialIngestionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new FinancialIngestionEngine();
  });

  it('deve formatar payload de transação única (OFX borda 1)', async () => {
    const { prisma } = await import('../../src/lib/prisma');
    vi.mocked(prisma.bankMovement.findMany).mockResolvedValue([]);
    
    // Objeto único em vez de array
    const payload = {
      TRNAMT: '-150.00',
      DTPOSTED: '20260120153000',
      MEMO: 'PGTO FORNECEDOR',
      FITID: '98765'
    };

    const result = await engine.ingest(MovementSource.OFX, payload, 1, 1);

    expect(result.imported).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(createManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ fitid: '98765' })
        ])
      })
    );
  });

  it('deve processar lote de 120 transações em 3 chunks (borda 2)', async () => {
    const { prisma } = await import('../../src/lib/prisma');
    vi.mocked(prisma.bankMovement.findMany).mockResolvedValue([]);
    
    // Constrói payload com 120 itens
    const payload = Array.from({ length: 120 }).map((_, index) => ({
      TRNAMT: '10.00',
      DTPOSTED: '20260120153000',
      MEMO: `TX ${index}`,
      FITID: `FIT-${index}`
    }));

    const result = await engine.ingest(MovementSource.OPEN_FINANCE, payload, 1, 1);

    expect(result.imported).toBe(120);
    expect(result.failed).toBe(0);
    // Para 120 registros com chunk=50, deve chamar createMany 3 vezes: 50, 50, 20
    expect(createManyMock).toHaveBeenCalledTimes(3);
  });

  it('deve normalizar a data para UTC antes de gerar o SHA-256 (borda 3)', async () => {
    const { prisma } = await import('../../src/lib/prisma');
    vi.mocked(prisma.bankMovement.findMany).mockResolvedValue([]);
    
    // "20260120153000" para OFX (ofx timezone agnostic format) e outro formato
    // A engine deve converter adequadamente.
    const payload = [{
      TRNAMT: '-50.00',
      DTPOSTED: '20260120153000',
      MEMO: 'COMPRA TESTE',
      FITID: 'ABC-123'
    }];

    await engine.ingest(MovementSource.OFX, payload, 1, 1);

    // Como o FITID "ABC-123" foi parseado, precisamos checar o hash gerado.
    // O mock TDD espera que seja formatado em UTC e embutido no rawPayload ou hash.
    const createManyCall = createManyMock.mock.calls[0][0];
    const item = (createManyCall.data as any[])[0];
    
    // Verificando se a data salva no DB pertence ao TDD esperado para fuso
    expect(item.date).toEqual(new Date(Date.UTC(2026, 0, 20)));
    // O Hash deve incluir o UTC
    expect(item.hashDeduplication).toBeDefined();
  });

  it('deve continuar importando o restante caso um chunk falhe', async () => {
    const { prisma } = await import('../../src/lib/prisma');
    vi.mocked(prisma.bankMovement.findMany).mockResolvedValue([]);
    
    // 70 items = 2 chunks (50 + 20)
    const payload = Array.from({ length: 70 }).map((_, index) => ({
      TRNAMT: '10.00',
      DTPOSTED: '20260120153000',
      MEMO: `TX ${index}`,
      FITID: `FIT-${index}`
    }));

    // Forçamos falha no segundo chunk
    vi.mocked(prisma.$transaction).mockResolvedValueOnce({ count: 50 }); // primeiro chunk aprovado
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('DB falhou no chunk 2'));

    const result = await engine.ingest(MovementSource.OFX, payload, 1, 1);

    expect(result.imported).toBe(50);
    expect(result.failed).toBe(20);
    expect(result.duplicates).toBe(0);
  });

  it('REGRA DE OURO: Nunca deve interagir com o balanço da conta', async () => {
    const { prisma } = await import('../../src/lib/prisma');
    vi.mocked(prisma.bankMovement.findMany).mockResolvedValue([]);

    const payload = [{
      TRNAMT: '100.00',
      DTPOSTED: '20260120000000',
      MEMO: 'LIVRE DE ATUALIZAÇÂO',
      FITID: 'N0-B4L4NC3' // hahaha
    }];

    await engine.ingest(MovementSource.OCR, payload, 1, 2);

    expect(prisma.account.update).not.toHaveBeenCalled();
    // E não importa de onde chame, balance nunca é modificado pela Ingestion Engine
  });
});
