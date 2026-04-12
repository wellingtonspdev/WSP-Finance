import { Prisma, BankMovement } from '@prisma/client';
import { prisma, ExtendedTransactionClient } from '../lib/prisma';
import { Decimal } from 'decimal.js';

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
  private useFallback = false;

  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly TIME_WINDOW_MS = 2 * 60 * 60 * 1000; // ±2 horas
  private static readonly MIN_AMOUNT = new Decimal('1.00');

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

    if (this.useFallback) {
      return this.findWithLikeFallback(params, dateFrom, dateTo);
    }

    try {
      return await this.findWithTrgm(params, dateFrom, dateTo);
    } catch (error: any) {
      // Se pg_trgm não está disponível, ativa fallback permanente
      if (
        error.message?.includes('function similarity') ||
        error.message?.includes('does not exist') ||
        error.code === '42883' // undefined_function
      ) {
        console.warn(
          '[FuzzyDedup] pg_trgm indisponível — ativando fallback LIKE/LOWER. ' +
          'Documentado em .specify/contracts.md'
        );
        this.useFallback = true;
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
    return rows.map((row) => ({
      match: row,
      similarity: this.calculateJaccardSimilarity(
        params.description.toLowerCase(),
        row.description.toLowerCase()
      ),
    }));
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

  /** Expõe estado do fallback para testes e observabilidade. */
  get isFallbackActive(): boolean {
    return this.useFallback;
  }

  /** Força modo fallback (para testes). */
  forceUseFallback(value: boolean): void {
    this.useFallback = value;
  }
}
