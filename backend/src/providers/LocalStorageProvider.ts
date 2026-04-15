import fs from 'fs';
import path from 'path';
import { IStorageProvider } from './IStorageProvider';

export class LocalStorageProvider implements IStorageProvider {
  private uploadFolder: string;
  private baseUrl: string;

  constructor() {
    this.uploadFolder = path.resolve(__dirname, '..', '..', 'uploads');
    this.baseUrl = process.env.APP_URL || 'http://localhost:3333';

    // Garante que a pasta existe
    if (!fs.existsSync(this.uploadFolder)) {
      fs.mkdirSync(this.uploadFolder, { recursive: true });
    }
  }

  async generateUploadUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string; headers?: Record<string, string> }> {
    // No modo local, a "uploadUrl" é uma rota do nosso próprio servidor que aceita o arquivo
    // O frontend fará um PUT para http://localhost:3333/uploads/filename

    const uniqueName = `${Date.now()}-${filename}`;

    return {
      uploadUrl: `${this.baseUrl}/uploads/${uniqueName}`,
      publicUrl: `${this.baseUrl}/files/${uniqueName}`, // Rota estática para ver o arquivo
      headers: { 'Content-Type': contentType }
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(this.uploadFolder, fileName);

    try {
      await fs.promises.stat(filePath);
    } catch {
      return;
    }

    await fs.promises.unlink(filePath);
  }

  async getSignedDownloadUrl(url: string, isCertificate?: boolean): Promise<{
    downloadUrl: string;
    headers?: Record<string, string>;
  }> {
    return {
      downloadUrl: url,
    };
  }
}