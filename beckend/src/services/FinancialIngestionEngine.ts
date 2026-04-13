import crypto from 'crypto';
import { MovementSource } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { BankMovementRepository } from '../repositories/BankMovementRepository';
import { FuzzyDeduplicationService } from './FuzzyDeduplicationService';
import { Decimal } from 'decimal.js';

export interface IngestResult {
  imported: number;
  duplicates: number;
  failed: number;
}

export class FinancialIngestionEngine {
  private repository: BankMovementRepository;
  private fuzzyDedup: FuzzyDeduplicationService;

  constructor(
    repository?: BankMovementRepository,
    fuzzyDedup?: FuzzyDeduplicationService
  ) {
    this.repository = repository ?? new BankMovementRepository();
    this.fuzzyDedup = fuzzyDedup ?? new FuzzyDeduplicationService();
  }

  async ingest(
    source: MovementSource,
    payload: any,
    workspaceId: number,
    accountId: number
  ): Promise<IngestResult> {
    if (!payload) {
      return { imported: 0, duplicates: 0, failed: 0 };
    }

    // Edge case 1: Normalize to array
    const rawList = Array.isArray(payload) ? payload : [payload];
    
    let importedCount = 0;
    let failedCount = 0;
    let fuzzyDuplicateCount = 0;
    const CHUNK_SIZE = 50;
    
    // Preparar os mapeamentos (Normalização de Datas + MD5 Hash)
    const movements: Prisma.BankMovementCreateManyInput[] = rawList.map((tx) => {
      // Diferenciar source para o parser adequado
      let amountStr: string;
      let dateRaw: string;
      let description: string;
      let fitid: string | null;

      if (source === MovementSource.OFX) {
        amountStr = tx.TRNAMT;
        dateRaw = tx.DTPOSTED;
        description = tx.MEMO || 'Sem descrição';
        fitid = tx.FITID || null;
      } else {
        amountStr = tx.amount || tx.TRNAMT; // Fallbacks da extração Webhook/OpenFinance
        dateRaw = tx.date || tx.DTPOSTED;
        description = tx.description || tx.MEMO || 'Sem descrição';
        fitid = tx.fitid || tx.transactionId || null;
      }

      const amount = new Decimal(amountStr || 0);

      // Edge Case 3: Normalizar Date para UTC antes de hash deduplication
      const dateUtc = this.parseDateToUTC(dateRaw);

      // Gerar Hash de Deduplicação
      const hashString = `${dateUtc.toISOString()}${amount.toString()}${description}`;
      const hashDeduplication = crypto.createHash('sha256').update(hashString).digest('hex');

      return {
        workspaceId,
        accountId,
        amount,
        date: dateUtc,
        description,
        source,
        status: 'PENDING',
        fitid,
        hashDeduplication,
        rawPayload: tx, // Persiste JSON original para consulta futura
      };
    });

    // Fase de Pré-processamento: Fuzzy Deduplication antes do batching
    const filteredMovements: Prisma.BankMovementCreateManyInput[] = [];

    for (const mov of movements) {
      try {
        const candidates = await this.fuzzyDedup.findCandidates({
          workspaceId: mov.workspaceId as number,
          description: mov.description as string,
          amount: new Decimal(mov.amount as any),
          date: mov.date as Date,
        });

        if (candidates.length > 0) {
          fuzzyDuplicateCount++;
        } else {
          filteredMovements.push(mov);
        }
      } catch {
        // Fallback resiliente: se fuzzy dedup falhar, inclui o movimento
        filteredMovements.push(mov);
      }
    }

    const totalExpected = movements.length;

    // Edge Case 2: Processar em Chunks de 50 + Transação
    for (let i = 0; i < filteredMovements.length; i += CHUNK_SIZE) {
      const chunk = filteredMovements.slice(i, i + CHUNK_SIZE);
      
      try {
        // O Prisma vai retornar "count" com o que de fato foi inserido.
        // O "skipDuplicates: true" lá no repository garante que duplicates reduzam esse count.
        const txResult = await prisma.$transaction(async (tx: any) => {
          return this.repository.createBatch(chunk, tx);
        });

        importedCount += txResult.count;
      } catch (error) {
        // Lote rejeitado (Erro de DB ou Dados Corrompidos)
        console.error(`Falha no processamento do lote (chunk ${i})`, error);
        failedCount += chunk.length;
      }
    }

    const hashDuplicateCount = totalExpected - importedCount - failedCount - fuzzyDuplicateCount;

    return {
      imported: importedCount,
      duplicates: (hashDuplicateCount >= 0 ? hashDuplicateCount : 0) + fuzzyDuplicateCount,
      failed: failedCount,
    };
  }

  /**
   * Normaliza múltiplas origens de data para Date restrito à zona UTC.
   */
  private parseDateToUTC(dateString: string): Date {
    if (!dateString) return new Date();

    // Se é OFX Format: YYYYMMDDHHMMSS e.g. 20260120153000
    if (/^\d{14}$|^\d{8}$/.test(dateString.trim())) {
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // 0-indexed
      const day = parseInt(dateString.substring(6, 8));
      return new Date(Date.UTC(year, month, day));
    }

    // Se vier do Webhook em ISO Date/Time
    const dt = new Date(dateString);
    if (!isNaN(dt.getTime())) {
      // Ajustar para truncamento sem conversão confusa
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    }

    return new Date(); // fallback if string is weird
  }
}

