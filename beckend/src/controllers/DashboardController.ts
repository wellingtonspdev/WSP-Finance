import { Request, Response } from 'express';
import { z } from 'zod';
import { DashboardService } from '../services/DashboardService';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  async getSummary(req: Request, res: Response) {
    const querySchema = z.object({
      month: z.coerce.number().min(1).max(12).optional(),
      year: z.coerce.number().min(2000).max(2100).optional(),
    });

    const { month, year } = querySchema.parse(req.query);
    const workspaceId = req.workspaceId!;

    try {
      const summary = await this.dashboardService.getSummary(workspaceId, month, year);
      return res.status(200).json(summary);
    } catch (err: any) {
      return res.status(500).json({ message: 'Error generating dashboard summary' });
    }
  }
}