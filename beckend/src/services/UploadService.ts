import { IStorageProvider } from '../providers/IStorageProvider';
import { LocalStorageProvider } from '../providers/LocalStorageProvider';
import { randomUUID } from 'crypto';

export class UploadService {
  private storageProvider: IStorageProvider;

  constructor() {
    // Em produção, injetaríamos S3StorageProvider
    this.storageProvider = new LocalStorageProvider();
  }

  async requestUpload(fileName: string, contentType: string, workspaceId: number) {
    // 1. Validação de Tipo (Segurança)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (!allowedMimeTypes.includes(contentType)) {
      throw new Error('Invalid file type. Only images and PDFs are allowed.');
    }

    // 2. Gerar nome único e organizado
    // Ex: 1/uuid-comprovante.pdf (Organizado por workspace)
    // Nota: No LocalStorageProvider simples, talvez não usemos pastas aninhadas para simplificar,
    // mas o nome do arquivo conterá o ID.
    const ext = fileName.split('.').pop();
    const uniqueName = `${workspaceId}_${randomUUID()}.${ext}`;

    // 3. Gerar URL
    return await this.storageProvider.generateUploadUrl(uniqueName, contentType);
  }
}