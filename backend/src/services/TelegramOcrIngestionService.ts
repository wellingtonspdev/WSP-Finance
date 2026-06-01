import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';

export interface TelegramOcrParsedData {
  amount: number;
  date: Date;
  description: string;
  transactionType: 'EXPENSE' | 'INCOME';
}

export interface TelegramOcrIngestDTO {
  chatId: string;
  telegramUserId?: string;
  telegramUsername?: string;
  fileId: string;
  fileName?: string;
  mimeType: string;
  fileSize: number;
  telegramUserLinkId: string;
  userId: number;
  workspaceId: number;
  accountId: number;
  categoryId: number | null;
  parsedData?: TelegramOcrParsedData;
}

export class TelegramOcrIngestionService {
  async ingest(data: TelegramOcrIngestDTO) {
    // POC acadêmica: simula extração OCR com dados fictícios.
    // Em produção, o download do arquivo e o envio ao provedor de OCR
    // aconteceriam antes desta chamada.
    const parsed = data.parsedData ?? this.simulateOcrParsing(data.fileName);

    if (parsed.amount <= 0) {
      throw new AppError('OCR: valor extraído inválido (zero ou negativo).', 422);
    }

    // Sinal do amount segue o transactionType
    const signedAmount = parsed.transactionType === 'EXPENSE'
      ? -Math.abs(parsed.amount)
      : Math.abs(parsed.amount);

    const movement = await prisma.bankMovement.create({
      data: {
        workspaceId: data.workspaceId,
        accountId: data.accountId,
        description: parsed.description,
        amount: signedAmount,
        date: parsed.date,
        status: 'PENDING',
        source: 'TELEGRAM_OCR',
        rawPayload: {
          fileId: data.fileId,
          telegramUserLinkId: data.telegramUserLinkId,
        },
      },
    });

    return movement;
  }

  /**
   * Simulação de OCR para a POC acadêmica.
   * Em produção seria substituído pelo provedor real.
   */
  private simulateOcrParsing(fileName?: string): TelegramOcrParsedData {
    return {
      amount: 150.0,
      date: new Date(),
      description: `Comprovante via Telegram (${fileName || 'document.pdf'})`,
      transactionType: 'EXPENSE',
    };
  }
}
