import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// @ts-ignore
import { parse } from 'ofx-js';
import { prisma } from '../lib/prisma';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { Decimal } from '@prisma/client/runtime/library';

export class ImportService {
  private transactionRepository: TransactionRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  async importOFX(filePath: string, workspaceId: number, accountId: number) {
    // 1. Ler e Parsear o Arquivo
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = await parse(fileContent);

    // Navegar na estrutura do OFX (pode variar, mas geralmente é assim)
    const bankMsgs = data.OFX.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
    const creditCardMsgs = data.OFX.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

    const transactions = bankMsgs || creditCardMsgs;

    if (!transactions) {
      throw new Error('Nenhuma transação encontrada ou formato OFX inválido.');
    }

    // Garantir que é array (se for só 1, o parser retorna objeto)
    const transactionList = Array.isArray(transactions) ? transactions : [transactions];

    let importedCount = 0;
    let duplicateCount = 0;

    // 2. Processar cada transação
    for (const tx of transactionList) {
      const amount = new Decimal(tx.TRNAMT);
      const dateRaw = tx.DTPOSTED; // Formato YYYYMMDDHHMMSS
      const date = this.parseOFXDate(dateRaw);
      const description = tx.MEMO || 'Sem descrição';
      const fitid = tx.FITID; // ID único do banco

      // Gerar Hash de Deduplicação (Fallback)
      const hashString = `${date.toISOString()}${amount.toString()}${description}`;
      const hashDeduplication = crypto.createHash('md5').update(hashString).digest('hex');

      // 3. Verificar Duplicidade
      const exists = await prisma.transaction.findFirst({
        where: {
          workspaceId,
          OR: [
            { fitid: fitid }, // Se tiver ID do banco, é o melhor
            { hashDeduplication: hashDeduplication } // Senão, usa o hash
          ]
        }
      });

      if (exists) {
        duplicateCount++;
        continue;
      }

      // 4. Salvar (Status PENDING)
      // Precisamos de uma categoria padrão "A Classificar".
      // Se não existir, pegamos a primeira global.
      const defaultCategory = await prisma.category.findFirst({
        where: { OR: [{ workspaceId }, { workspaceId: null }] }
      });

      if (!defaultCategory) throw new Error('Nenhuma categoria disponível para importação.');

      await this.transactionRepository.create({
        workspace: { connect: { id: workspaceId } },
        account: { connect: { id: accountId } },
        category: { connect: { id: defaultCategory.id } },
        amount,
        date,
        description,
        type: amount.isPositive() ? 'INCOME' : 'EXPENSE',
        status: 'PENDING', // Importante: Pendente de revisão
        isPaid: true, // OFX é extrato realizado, então já foi pago
        fitid,
        hashDeduplication
      });

      importedCount++;
    }

    return { imported: importedCount, duplicates: duplicateCount };
  }

  private parseOFXDate(dateString: string): Date {
    // YYYYMMDD...
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));
    return new Date(year, month, day);
  }
}