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

  private validatePath(keyOrUrl: string): string {
    let relativePath = keyOrUrl;
    if (keyOrUrl.startsWith(this.baseUrl)) {
      relativePath = keyOrUrl.replace(`${this.baseUrl}/files/`, '').replace(`${this.baseUrl}/uploads/`, '');
    }

    // 1. Block absolute paths or root/parent traversal attempts
    if (
      path.isAbsolute(relativePath) ||
      relativePath.includes('..') ||
      relativePath.startsWith('/') ||
      relativePath.startsWith('\\')
    ) {
      throw new Error('Path traversal security violation');
    }

    const filePath = path.resolve(this.uploadFolder, relativePath);

    // 2. Strict sibling and parent traversal check
    const relative = path.relative(this.uploadFolder, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Path traversal security violation');
    }

    return filePath;
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType?: string): Promise<void> {
    const filePath = this.validatePath(key);
    const fileDir = path.dirname(filePath);
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const filePath = this.validatePath(fileUrl);
    try {
      await fs.promises.stat(filePath);
      await fs.promises.unlink(filePath);
    } catch {
      // Ignora silenciosamente
    }
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