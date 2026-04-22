export interface IStorageProvider {
  /**
   * Gera uma URL para upload (No S3 seria Presigned URL, no Local será apenas o caminho)
   */
  generateUploadUrl(filename: string, contentType: string, folderType?: string, contentLength?: number): Promise<{
    uploadUrl: string; // Onde o frontend deve enviar o arquivo (PUT)
    publicUrl: string; // A URL final para salvar no banco
    headers?: Record<string, string>; // Headers necessários (ex: Content-Type)
  }>;

  /**
   * Deleta um arquivo
   */
  deleteFile(url: string): Promise<void>;

  /**
   * Gera uma URL temporária (5 min) para visualização.
   * Criptografia aplicada em the fly se for certificado.
   */
  getSignedDownloadUrl(url: string, isCertificate?: boolean): Promise<{
    downloadUrl: string;
    headers?: Record<string, string>;
  }>;

  /**
   * Criptografa e faz upload direto via buffer (Server-Side), ideal para arquivos sensíveis como Certificados A1
   * Retorna a object key salva.
   */
  uploadSecureBuffer?(buffer: Buffer, workspaceId: number, folderType: string, contentType?: string): Promise<string>;
}