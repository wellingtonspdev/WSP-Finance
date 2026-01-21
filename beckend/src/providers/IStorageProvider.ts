export interface IStorageProvider {
  /**
   * Gera uma URL para upload (No S3 seria Presigned URL, no Local será apenas o caminho)
   */
  generateUploadUrl(filename: string, contentType: string): Promise<{
    uploadUrl: string; // Onde o frontend deve enviar o arquivo (PUT)
    publicUrl: string; // A URL final para salvar no banco
    headers?: Record<string, string>; // Headers necessários (ex: Content-Type)
  }>;

  /**
   * Deleta um arquivo
   */
  deleteFile(url: string): Promise<void>;
}