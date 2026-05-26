import { Request, Response } from 'express';
import { AiInsightService } from '../services/AiInsightService';

export class AiInsightController {
  private readonly aiInsightService: AiInsightService;

  constructor() {
    this.aiInsightService = new AiInsightService();
  }

  /**
   * GET /ai-insights
   *
   * Lists AI insights for the workspace (Análises Hub).
   * Supports pagination, filtering by dismissed and severity.
   */
  async listForHub(req: Request, res: Response): Promise<void> {
    const workspaceId = req.workspaceId!;
    const { cursor, pageSize, severity, dismissed } = req.query;

    const limit = pageSize ? parseInt(pageSize as string, 10) : 20;
    const finalLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100);

    let dismissedFilter: boolean | 'all' | undefined = undefined;
    if (dismissed === 'true') dismissedFilter = true;
    else if (dismissed === 'false') dismissedFilter = false;
    else if (dismissed === 'all') dismissedFilter = 'all';
    else dismissedFilter = false; // default is false per requirements

    let severityFilter: any = undefined;
    if (severity === 'INFO' || severity === 'WARNING' || severity === 'CRITICAL') {
      severityFilter = severity;
    }

    const result = await this.aiInsightService.listForWorkspaceHub(workspaceId, {
      cursor: cursor as string,
      limit: finalLimit,
      dismissed: dismissedFilter,
      severity: severityFilter,
    });

    res.status(200).json(result);
  }

  /**
   * PATCH /ai-insights/:id/dismiss
   *
   * Marks an AI insight as dismissed (ignored by user).
   * Does NOT delete the insight — preserves auditability.
   * Does NOT alter Transaction, Account.balance, or ledger.
   */
  async dismiss(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;

    const result = await this.aiInsightService.dismiss(workspaceId, id);

    // DTO whitelist: only expose id and dismissed
    res.status(200).json({
      id: result.id,
      dismissed: result.dismissed,
    });
  }
}
