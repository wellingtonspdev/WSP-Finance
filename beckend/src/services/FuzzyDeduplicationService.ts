import { Prisma, BankMovement } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Decimal } from 'decimal.js';

export type FuzzyDedupMode = 'auto' | 'trgm' | 'fallback';

export interface FuzzyCandidate {
  match: BankMovement;
  similarity: number;
}

interface FuzzySearchParams {
  workspaceId: number;
  description: string;
  amount: Decimal;
  date: Date;
  excludeId?: string;
}

interface FuzzyDeduplicationServiceOptions {
  mode?: FuzzyDedupMode;
}

/**
 * Serviço de deduplicação fuzzy para BankMovements.
 *
 * Dual-mode:
 *   1. pg_trgm (preferido) — usa similarity() nativa do PostgreSQL
 *   2. Fallback LIKE + LOWER() — caso Supabase negar CREATE EXTENSION
 *
 * Regras de negócio obrigatórias:
 *   - Janela temporal: ±2 horas da data do movimento
 *   - Valores < R$ 1,00 são EXCLUÍDOS (evita falsos positivos em taxas bancárias)
 *   - Filtra apenas status PENDING
 *   - Isolamento por workspaceId (RLS)
 */
export class FuzzyDeduplicationService {

  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // ±2 horas
  private static readonly MIN_AMOUNT = new Decimal('1.00');
  private static readonly VALID_MODES: FuzzyDedupMode[] = ['auto', 'trgm', 'fallback'];

  private readonly configuredMode: FuzzyDedupMode;
  private runtimeModeOverride: FuzzyDedupMode | null = null;

  constructor(options: FuzzyDeduplicationServiceOptions = {}) {
    this.configuredMode = this.resolveMode(options.mode ?? process.env.FUZZY_DEDUP_MODE);
  }

  /**
   * Busca candidatos de duplicata fuzzy para um movimento.
   * Aplica todas as regras de borda antes da query.
   */
  async findCandidates(params: FuzzySearchParams): Promise<FuzzyCandidate[]> {
    // Regra de borda: valores < R$ 1,00 excluídos do fuzzy matching
    if (params.amount.abs().lt(FuzzyDeduplicationService.MIN_AMOUNT)) {
      return [];
    }

    const dateFrom = new Date(params.date.getTime() - FuzzyDeduplicationService.TIME_WINDOW_MS);
    const dateTo = new Date(params.date.getTime() + FuzzyDeduplicationService.TIME_WINDOW_MS);
    const activeMode = this.currentMode;

    if (activeMode === 'fallback') {
      return this.findWithLikeFallback(params, dateFrom, dateTo);
    }

    try {
      return await this.findWithTrgm(params, dateFrom, dateTo);
    } catch (error: any) {
      // Se pg_trgm não está disponível, ativa fallback permanente
      if (activeMode === 'auto' && (
        error.message?.includes('function similarity') ||
        error.message?.includes('does not exist') ||
        this.shouldFallbackToApplication(error)
      )) {
        console.warn(
          '[FuzzyDedup] pg_trgm indisponível — ativando fallback LIKE/LOWER. ' +
          'Documentado em .specify/contracts.md'
        );
        this.activateRuntimeFallback(error);
        return this.findWithLikeFallback(params, dateFrom, dateTo);
      }
      throw error;
    }
  }

  /**
   * Modo pg_trgm: usa similarity() nativa com threshold 0.6
   */
  private async findWithTrgm(
    params: FuzzySearchParams,
    dateFrom: Date,
    dateTo: Date
  ): Promise<FuzzyCandidate[]> {
    const excludeClause = params.excludeId
      ? Prisma.sql`AND id != ${params.excludeId}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      (BankMovement & { sim: number })[]
    >`
      SELECT *, similarity(description, ${params.description}) AS sim
      FROM "BankMovement"
      WHERE "workspaceId" = ${params.workspaceId}
        AND status = 'PENDING'
        AND amount = ${params.amount}::decimal
        AND date BETWEEN ${dateFrom} AND ${dateTo}
        AND similarity(description, ${params.description}) > ${FuzzyDeduplicationService.SIMILARITY_THRESHOLD}
        ${excludeClause}
      ORDER BY sim DESC
      LIMIT 10
    `;

    return rows.map((row) => ({
      match: row,
      similarity: Number(row.sim),
    }));
  }

  /**
   * Modo fallback: LIKE + LOWER() no application layer.
   * Estratégia: extrai as 3 primeiras palavras da descrição e busca com ILIKE.
   */
  private async findWithLikeFallback(
    params: FuzzySearchParams,
    dateFrom: Date,
    dateTo: Date
  ): Promise<FuzzyCandidate[]> {
    // Extrair palavras significativas (>= 3 caracteres) para busca
    const words = params.description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3);

    if (words.length === 0) return [];

    // Monta condições ILIKE para cada palavra
    const likeConditions = words.map(
      (word) => Prisma.sql`LOWER(description) LIKE ${'%' + word + '%'}`
    );

    const combinedLike = Prisma.join(likeConditions, ' AND ');

    const excludeClause = params.excludeId
      ? Prisma.sql`AND id != ${params.excludeId}`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<BankMovement[]>`
      SELECT *
      FROM "BankMovement"
      WHERE "workspaceId" = ${params.workspaceId}
        AND status = 'PENDING'
        AND amount = ${params.amount}::decimal
        AND date BETWEEN ${dateFrom} AND ${dateTo}
        AND ${combinedLike}
        ${excludeClause}
      LIMIT 10
    `;

    // Calcular similaridade aproximada no application layer
    return rows
      .map((row) => ({
        match: row,
        similarity: this.calculateJaccardSimilarity(
          params.description.toLowerCase(),
          row.description.toLowerCase()
        ),
      }))
      .sort((left, right) => right.similarity - left.similarity);
  }

  /**
   * Similaridade de Jaccard sobre trigramas (emulação de pg_trgm no app layer).
   */
  private calculateJaccardSimilarity(a: string, b: string): number {
    const trigramsA = this.generateTrigrams(a);
    const trigramsB = this.generateTrigrams(b);

    const intersection = trigramsA.filter((t) => trigramsB.includes(t));
    const union = new Set([...trigramsA, ...trigramsB]);

    return union.size === 0 ? 0 : intersection.length / union.size;
  }

  private generateTrigrams(text: string): string[] {
    const padded = `  ${text} `;
    const trigrams: string[] = [];
    for (let i = 0; i <= padded.length - 3; i++) {
      trigrams.push(padded.substring(i, i + 3));
    }
    return trigrams;
  }

  private resolveMode(mode: string | undefined): FuzzyDedupMode {
    if (mode && FuzzyDeduplicationService.VALID_MODES.includes(mode as FuzzyDedupMode)) {
      return mode as FuzzyDedupMode;
    }

    return 'auto';
  }

  private shouldFallbackToApplication(error: unknown): boolean {
    const normalizedMessage = `${(error as any)?.message ?? ''}`.toLowerCase();
    const normalizedCode = `${(error as any)?.code ?? ''}`.toLowerCase();

    return (
      normalizedMessage.includes('function similarity') ||
      normalizedMessage.includes('does not exist') ||
      normalizedMessage.includes('statement timeout') ||
      normalizedMessage.includes('canceling statement due to statement timeout') ||
      normalizedMessage.includes('query canceled') ||
      normalizedMessage.includes('query cancelled') ||
      normalizedCode === '42883' ||
      normalizedCode === '57014'
    );
  }

  private activateRuntimeFallback(error: unknown): void {
    if (this.runtimeModeOverride === 'fallback') {
      return;
    }

    const normalizedMessage = `${(error as any)?.message ?? ''}`.toLowerCase();
    const fallbackReason = normalizedMessage.includes('timeout')
      ? 'timeout no banco'
      : 'pg_trgm indisponivel';

    console.warn(
      `[FuzzyDedup] ${fallbackReason} - ativando fallback LIKE/LOWER em modo auto.`
    );

    this.runtimeModeOverride = 'fallback';
  }

  /** Expõe estado do fallback para testes e observabilidade. */
  get isFallbackActive(): boolean {
    return this.currentMode === 'fallback';
  }

  get currentMode(): FuzzyDedupMode {
    return this.runtimeModeOverride ?? this.configuredMode;
  }

  /** Força modo fallback (para testes). */
  forceUseFallback(value: boolean): void {
    this.runtimeModeOverride = value ? 'fallback' : null;
  }
}
