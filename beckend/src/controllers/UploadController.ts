import { Request, Response } from 'express';
import { z } from 'zod';
import { UploadService } from '../services/UploadService';
import fs from 'fs';
import path from 'path';

export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  // Rota para pedir permissão de upload
  async requestUploadUrl(req: Request, res: Response) {
    const schema = z.object({
      fileName: z.string(),
      contentType: z.string(),
    });

    const { fileName, contentType } = schema.parse(req.body);
    const workspaceId = req.workspaceId!;

    try {
      const result = await this.uploadService.requestUpload(fileName, contentType, workspaceId);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  // Rota Mágica Local: Recebe o arquivo real (Apenas para simular o S3)
  // Em produção com S3, essa rota NÃO existiria.
  async localUploadHandler(req: Request, res: Response) {
    const { filename } = req.params;
    const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
    const filePath = path.join(uploadFolder, filename);

    // Stream do arquivo direto para o disco
    const writeStream = fs.createWriteStream(filePath);
    
    req.pipe(writeStream);

    req.on('end', () => {
      res.status(200).send();
    });

    req.on('error', (err) => {
      console.error(err);
      res.status(500).send();
    });
  }
}