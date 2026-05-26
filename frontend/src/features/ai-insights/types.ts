export interface AiInsightTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  categoryName: string | null;
  accountName: string | null;
}

export interface AiInsightItem {
  id: string;
  workspaceId: number;
  transactionId: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  code: string;
  message: string;
  reason: string;
  confidence: number | string;
  dismissed: boolean;
  createdAt: string;
  updatedAt: string;
  transaction: AiInsightTransaction;
}

export interface AiInsightSummary {
  activeCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  dismissedCount: number;
}

export interface AiInsightListResponse {
  data: AiInsightItem[];
  nextCursor: string | null;
  hasMore: boolean;
  summary: AiInsightSummary;
}

export interface HubFilters {
  dismissed?: 'all' | boolean;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  cursor?: string;
  pageSize?: number;
}
