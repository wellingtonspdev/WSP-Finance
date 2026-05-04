import { Request, Response } from 'express';
import { AdminService } from '../services/AdminService';

export class AdminController {
  private adminService: AdminService;

  constructor(adminService?: AdminService) {
    this.adminService = adminService || new AdminService();
  }

  async getMetrics(_req: Request, res: Response) {
    try {
      const metrics = await this.adminService.getGlobalMetrics();
      return res.status(200).json(metrics);
    } catch (err: any) {
      console.error('[AdminController] Erro ao buscar métricas:', err.message);
      return res.status(500).json({ message: 'Erro interno ao buscar métricas da plataforma.', error: err.stack, errorMessage: err.message });
    }
  }
}
