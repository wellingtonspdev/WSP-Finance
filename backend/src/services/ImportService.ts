import { promises as fsPromises } from 'fs';
import path from 'path';
// @ts-ignore
import { parse } from 'ofx-js';
import { FinancialIngestionEngine } from './FinancialIngestionEngine';
import { MovementSource } from '@prisma/client';

export class ImportService {
  private ingestionEngine: FinancialIngestionEngine;

  constructor() {
    this.ingestionEngine = new FinancialIngestionEngine();
  }

  async importOFX(filePath: string, workspaceId: number, accountId: number) {
    // 1. Validar e Ler Arquivo Seguramente
    if (!filePath || filePath.includes('..') || !filePath.toLowerCase().endsWith('.ofx')) {
      throw new Error('Caminho de arquivo inválido ou não seguro.');
    }

    let transactions;
    try {
      const fileContent = await fsPromises.readFile(filePath, 'utf8');
      const data = await parse(fileContent);

      // Navegar na estrutura do OFX (pode variar, mas geralmente é assim)
      const bankMsgs = data.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN;
      const creditCardMsgs = data.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST?.STMTTRN;

      transactions = bankMsgs || creditCardMsgs;
    } catch (err) {
      throw new Error('Falha de leitura segura ou formato incorreto do OFX.');
    }

    if (!transactions) {
      throw new Error('Nenhuma transação encontrada ou formato OFX inválido.');
    }

    // 2. Delegar para a Financial Ingestion Engine
    return this.ingestionEngine.ingest(
      MovementSource.OFX,
      transactions,
      workspaceId,
      accountId
    );
  }
}