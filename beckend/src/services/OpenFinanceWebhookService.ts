import { MovementSource } from '@prisma/client';
import { FinancialIngestionEngine } from './FinancialIngestionEngine';

export interface OpenFinanceWebhookMovement {
  transactionId?: string;
  date: string;
  description: string;
  amount: string;
}

export interface OpenFinanceWebhookPayload {
  source?: 'OPEN_FINANCE';
  workspaceId: number;
  accountId: number;
  movements: OpenFinanceWebhookMovement[];
}

export class OpenFinanceWebhookService {
  private readonly ingestionEngine: FinancialIngestionEngine;

  constructor() {
    this.ingestionEngine = new FinancialIngestionEngine();
  }

  isAuthorized(authorizationHeader?: string): boolean {
    const expectedToken = process.env.OPEN_FINANCE_WEBHOOK_KEY || 'webhook-auth-key-mock';

    if (!authorizationHeader) {
      return false;
    }

    const [scheme, token] = authorizationHeader.split(' ');

    return scheme?.toLowerCase() === 'bearer' && token === expectedToken;
  }

  async ingest(payload: OpenFinanceWebhookPayload) {
    return this.ingestionEngine.ingest(
      MovementSource.OPEN_FINANCE,
      payload.movements,
      payload.workspaceId,
      payload.accountId
    );
  }
}
