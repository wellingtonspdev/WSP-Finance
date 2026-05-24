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

    // 1. Reject empty or whitespace-only keys
    if (!relativePath || relativePath.trim() === '') {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // 2. Reject null bytes
    if (relativePath.includes('\0')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // 3. Reject any backslash (blocks Windows paths and ..\\ traversal cross-platform)
    if (relativePath.includes('\\')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // 4. Cross-platform absolute path detection (OS-native + POSIX + Win32)
    if (
      path.isAbsolute(relativePath) ||
      path.posix.isAbsolute(relativePath) ||
      path.win32.isAbsolute(relativePath)
    ) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // 5. Validate each segment: reject '..', '.', and empty segments
    const segments = relativePath.split('/');
    if (segments.some((segment) => segment === '..' || segment === '.' || segment === '')) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    // 6. Resolve and verify the target stays within uploadFolder
    const root = path.resolve(this.uploadFolder);
    const target = path.resolve(root, ...segments);
    const relative = path.relative(root, target);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Invalid storage key: path traversal detected');
    }

    return target;
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

  async getPresignedDownloadUrl(
    objectKey: string,
    options: { ttlSeconds: number; contentType: string; fileName: string }
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const DEFAULT_EXPIRES_IN_SECONDS = 900;
    const MAX_EXPIRES_IN_SECONDS = 900;

    const effectiveTtl = Number.isFinite(options.ttlSeconds) && options.ttlSeconds > 0
        ? Math.min(options.ttlSeconds, MAX_EXPIRES_IN_SECONDS)
        : DEFAULT_EXPIRES_IN_SECONDS;

    // Local provider returns a fake presigned URL for testing purposes.
    // This URL is NOT publicly accessible and does not expose bucket internals.
    return {
      url: `${this.baseUrl}/local-presigned/${encodeURIComponent(options.fileName)}`,
      expiresInSeconds: effectiveTtl,
    };
  }
}