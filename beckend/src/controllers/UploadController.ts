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
      folderType: z.enum(['AVATAR', 'RECEIPT', 'INVOICE', 'CERTIFICATE', 'ASSET']),
      fileSize: z.number().int().positive().max(10 * 1024 * 1024, 'O arquivo excede o teto transacional de 10MB'),
    });

    const { fileName, contentType, folderType, fileSize } = schema.parse(req.body);
    const workspaceId = req.workspaceId!;

    try {
      const result = await this.uploadService.requestUpload(fileName, contentType, workspaceId, folderType, fileSize);
      return res.status(200).json(result);
    } catch (err: any) {
      if (err.status === 402) {
        return res.status(402).json({ message: err.message });
      }
      return res.status(400).json({ message: err.message });
    }
  }

  // Rota Mágica Local: Recebe o arquivo real (Apenas para simular o S3)
  // Em produção com S3, essa rota NÃO existiria.
  async localUploadHandler(req: Request, res: Response) {
    const { filename } = req.params;
    const uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
    const filePath = path.join(uploadFolder, filename as string);

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

  // Rota de GET de Assinatura para Visualização (Fase VIII)
  async getAttachmentUrl(req: Request, res: Response) {
    const { id } = req.params;
    const workspaceId = req.workspaceId!;

    try {
      const result = await this.uploadService.getAttachmentSignedUrl(id, workspaceId);
      return res.status(200).json(result);
    } catch (err: any) {
      if (err.message.includes('não encontrada') || err.message.includes('não possui')) {
        return res.status(404).json({ message: err.message });
      }
      return res.status(500).json({ message: 'Falha ao processar assinatura de visualização.', error: err.message });
    }
  }
}