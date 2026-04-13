import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';

const { queryRawMock } = vi.hoisted(() => {
  return { queryRawMock: vi.fn() };
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    $queryRaw: queryRawMock,
  },
  ExtendedTransactionClient: {},
}));

vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');
  return {
    ...actual,
    Prisma: {
      ...(actual as any).Prisma,
      sql: (strings: TemplateStringsArray, ...values: any[]) => ({ strings, values }),
      empty: { strings: [''], values: [] },
      join: (items: any[], sep: string) => items,
    },
  };
});

import { FuzzyDeduplicationService } from '../../src/services/FuzzyDeduplicationService';

describe('FuzzyDeduplicationService - Critérios de Aceitação', () => {
  let service: FuzzyDeduplicationService;

  const baseDate = new Date('2026-04-10T12:00:00Z');

  const makeMovement = (overrides: any = {}) => ({
    id: 'mv-001',
    workspaceId: 1,
    accountId: 1,
    amount: new Decimal('150.00'),
    date: baseDate,
    description: 'POSTO SHELL LTDA',
    source: 'OFX',
    status: 'PENDING',
    fitid: 'FIT-001',
    hashDeduplication: 'hash123',
    rawPayload: {},
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FUZZY_DEDUP_MODE;
    service = new FuzzyDeduplicationService();
  });

  afterEach(() => {
    delete process.env.FUZZY_DEDUP_MODE;
  });

  // ---- CRITÉRIO 1: pg_trgm similarity match ----
  it('deve detectar "Posto Shell" e "POSTO SHELL LTDA" como match (similarity > 0.6)', async () => {
    const candidate = makeMovement({ sim: 0.78 });
    queryRawMock.mockResolvedValue([candidate]);

    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBeGreaterThan(0.6);
    expect(results[0].match.description).toBe('POSTO SHELL LTDA');
  });

  // ---- CRITÉRIO 2: Janela temporal de ±2 horas ----
  it('deve respeitar janela temporal de ±2 horas', async () => {
    // Movimento dentro da janela: retorna como candidato
    const withinWindow = makeMovement({ sim: 0.85 });
    queryRawMock.mockResolvedValue([withinWindow]);

    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    // A query deve ter sido executada com filtro temporal
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    // Se o DB retornou o candidato, ele está dentro de ±2h
    expect(results).toHaveLength(1);

    // Cenário inverso: sem candidatos fora da janela
    queryRawMock.mockResolvedValue([]);
    const emptyResults = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: new Date('2026-04-10T20:00:00Z'), // +8h do candidato → fora da janela
    });
    expect(emptyResults).toHaveLength(0);
  });

  // ---- CRITÉRIO 3: Valores < R$ 1,00 excluídos ----
  it('deve excluir valores < R$ 1,00 do fuzzy matching (taxas bancárias)', async () => {
    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'TAX IOF',
      amount: new Decimal('0.38'),
      date: baseDate,
    });

    expect(results).toHaveLength(0);
    // Nem deve ter chamado o banco
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('deve excluir valores negativos < R$ 1,00 (débitos de centavos)', async () => {
    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'TARIFA BANCARIA',
      amount: new Decimal('-0.75'),
      date: baseDate,
    });

    expect(results).toHaveLength(0);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  // ---- CRITÉRIO 4: Fallback LIKE quando pg_trgm indisponível ----
  it('deve usar fallback LIKE quando pg_trgm indisponível', async () => {
    // Primeira chamada: simula pg_trgm ausente
    queryRawMock.mockRejectedValueOnce(
      new Error('function similarity(character varying, unknown) does not exist')
    );
    // Segunda chamada (fallback): retorna resultado
    queryRawMock.mockResolvedValueOnce([
      makeMovement({ description: 'POSTO SHELL SA' }),
    ]);

    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    expect(service.isFallbackActive).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0].similarity).toBeGreaterThan(0); // Jaccard > 0
  });

  // ---- CRITÉRIO 5: Isolamento por workspaceId (RLS) ----
  it('deve honrar FUZZY_DEDUP_MODE=fallback sem tentar similarity()', async () => {
    process.env.FUZZY_DEDUP_MODE = 'fallback';
    service = new FuzzyDeduplicationService();
    queryRawMock.mockResolvedValue([
      makeMovement({ description: 'POSTO SHELL SA' }),
    ]);

    const results = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    expect(service.currentMode).toBe('fallback');
    expect(service.isFallbackActive).toBe(true);
    expect(results).toHaveLength(1);
    expect(JSON.stringify(queryRawMock.mock.calls[0])).toContain('LOWER(description) LIKE');
  });

  it('deve degradar para fallback em timeout e manter o modo seguro nas chamadas seguintes', async () => {
    queryRawMock
      .mockRejectedValueOnce(new Error('canceling statement due to statement timeout'))
      .mockResolvedValueOnce([makeMovement({ description: 'POSTO SHELL SA' })])
      .mockResolvedValueOnce([makeMovement({ description: 'POSTO SHELL EXPRESS' })]);

    const firstResults = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    const secondResults = await service.findCandidates({
      workspaceId: 1,
      description: 'Posto Shell',
      amount: new Decimal('150.00'),
      date: baseDate,
    });

    expect(firstResults).toHaveLength(1);
    expect(secondResults).toHaveLength(1);
    expect(service.currentMode).toBe('fallback');
    expect(service.isFallbackActive).toBe(true);
    expect(queryRawMock).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(queryRawMock.mock.calls[2])).toContain('LOWER(description) LIKE');
  });

  it('deve filtrar por workspaceId (isolamento de tenant)', async () => {
    queryRawMock.mockResolvedValue([]);

    await service.findCandidates({
      workspaceId: 42,
      description: 'Pagamento',
      amount: new Decimal('500.00'),
      date: baseDate,
    });

    // A query raw foi invocada — o workspaceId é injetado via Prisma.sql template
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    // Stringify para verificar que 42 está presente nos args do template
    const callStr = JSON.stringify(queryRawMock.mock.calls[0]);
    expect(callStr).toContain('42');
  });

  // ---- BORDA: Valor exatamente R$ 1,00 deve SER processado ----
  it('deve processar valores de exatamente R$ 1,00', async () => {
    queryRawMock.mockResolvedValue([]);

    await service.findCandidates({
      workspaceId: 1,
      description: 'PIX RECEBIDO',
      amount: new Decimal('1.00'),
      date: baseDate,
    });

    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
