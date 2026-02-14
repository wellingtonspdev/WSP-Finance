import { Request, Response } from 'express';
import { z } from 'zod';
import { ImportService } from '../services/ImportService';
import path from 'path';

export class ImportController {
  private importService: ImportService;

  constructor() {
    this.importService = new ImportService();
  }

  async importOFX(req: Request, res: Response) {
    const schema = z.object({
      fileName: z.string(), // Nome do arquivo já salvo em uploads/
      accountId: z.number().int().positive(),
    });

    const { fileName, accountId } = schema.parse(req.body);
    const workspaceId = req.workspaceId!;

    // Caminho físico do arquivo (Modo Local)
    const filePath = path.resolve(__dirname, '..', '..', 'uploads', fileName);

    try {
      const result = await this.importService.importOFX(filePath, workspaceId, accountId);
      return res.status(200).json({
        message: 'Importação concluída',
        details: result
      });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'Arquivo não encontrado. Faça o upload primeiro.' });
      }
      return res.status(400).json({ message: err.message });
    }
  }
}