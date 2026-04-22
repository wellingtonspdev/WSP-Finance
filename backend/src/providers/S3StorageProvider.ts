import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommandInput, GetObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageProvider } from './IStorageProvider';
import crypto from 'crypto';

export class S3StorageProvider implements IStorageProvider {
    private static readonly MIN_VAULT_MASTER_KEY_LENGTH = 32;

    private client: S3Client;
    private bucketName: string;
    private baseUrl: string;

    constructor() {
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        this.bucketName = process.env.R2_BUCKET_NAME || 'wsp-finance-vault';

        if (!accountId || !accessKeyId || !secretAccessKey) {
            console.warn('⚠️ Cloudflare R2 Credentials missing. S3StorageProvider might fail.');
        }

        // Configurando AWS SDK v3 especificamente para a API da Cloudflare R2
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: accessKeyId || '',
                secretAccessKey: secretAccessKey || '',
            }
        });

        // Public URL base (Pode ser o domínio customizado do bucket caso aplicável)
        this.baseUrl = process.env.R2_PUBLIC_DEV_URL || 'https://r2.dev';
    }

    private getVaultCustomerKeyMaterial(): { keyBase64: string; keyMd5: string } {
        const rawSecret = process.env.VAULT_MASTER_KEY?.trim();

        if (!rawSecret || rawSecret.length < S3StorageProvider.MIN_VAULT_MASTER_KEY_LENGTH) {
            throw new Error('VAULT_MASTER_KEY is required and must contain at least 32 characters for certificate storage.');
        }

        const aesKeyBuffer = crypto.createHash('sha256').update(rawSecret).digest();

        return {
            keyBase64: aesKeyBuffer.toString('base64'),
            keyMd5: crypto.createHash('md5').update(aesKeyBuffer).digest('base64')
        };
    }

    async generateUploadUrl(filename: string, contentType: string, folderType?: string, contentLength?: number): Promise<{ uploadUrl: string; publicUrl: string; headers?: Record<string, string> }> {

        // Tratamento Seguro: Permitimos a barra '/' para sub-diretórios, mas eliminamos '../' e caracteres estranhos para evitar Path Traversal
        const objectKey = filename
            .replace(/\.\.\//g, '')  // Mata o Path Traversal duplo
            .replace(/[^a-zA-Z0-9.\-\/]/g, '_'); // Permite diretórios criados de forma lícita

        // Montando as propriedades base do PutObject
        const commandParams: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: objectKey,
            ContentType: contentType, // VITAL: Trava o MIME Type na assinatura V4.
        };

        if (contentLength) {
            commandParams.ContentLength = contentLength; // VITAL: Trava o Tamanho fidedigno na AWS V4.
        }

        const headersToReturn: Record<string, string> = {
            'Content-Type': contentType
        };

        // --- Lógica de Criptografia SSE-C Isolada Opcional ---
        // Se for um certificado fiscal, exigimos criptografia Simétrica C/ Key do Cliente
        if (folderType === 'CERTIFICATE' || contentType === 'application/x-pkcs12' || contentType === 'application/x-pem-file') {
            const { keyBase64, keyMd5 } = this.getVaultCustomerKeyMaterial();

            commandParams.SSECustomerAlgorithm = 'AES256';
            commandParams.SSECustomerKey = keyBase64;
            commandParams.SSECustomerKeyMD5 = keyMd5;

            // O navegador precisará repassar esses exatos Headers no momento do Axios PUT
            headersToReturn['x-amz-server-side-encryption-customer-algorithm'] = 'AES256';
            headersToReturn['x-amz-server-side-encryption-customer-key'] = keyBase64;
            headersToReturn['x-amz-server-side-encryption-customer-key-MD5'] = keyMd5;
        }

        const command = new PutObjectCommand(commandParams);

        // Gerando Presigned URL - Validade: 15 Minutos (900 seg)
        const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 900 });

        return {
            uploadUrl: signedUrl,
            publicUrl: objectKey, // Salvaremos SOMENTE a Object Key no banco (Prisma)
            headers: headersToReturn
        };
    }

    async deleteFile(url: string): Promise<void> {
        // A url passada aqui será a "Object Key" do Prisma
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: url,
            });
            await this.client.send(command);
            console.log(`[R2 GC] Arquivo expurgado com sucesso: ${url}`);
        } catch (error) {
            console.error(`[R2 GC] Falha ao expurgar arquivo zumbi: ${url}`, error);
            // Non-blocking throw 
        }
    }

    async getSignedDownloadUrl(url: string, isCertificate: boolean = false): Promise<{ downloadUrl: string; headers?: Record<string, string> }> {
        // Inferencia basilar do Content-Type via extensão para garantir que o navegador faça render inline, e não "Save As..."
        let responseContentType = 'application/octet-stream';
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.endsWith('.pdf')) responseContentType = 'application/pdf';
        else if (lowerUrl.endsWith('.png')) responseContentType = 'image/png';
        else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) responseContentType = 'image/jpeg';

        const commandParams: GetObjectCommandInput = {
            Bucket: this.bucketName,
            Key: url,
            ResponseContentType: responseContentType,
        };

        const headersToReturn: Record<string, string> = {};

        // Se for certificado (vault), o GET precisa das mesmas chaves do SSE-C que usamos no PUT
        if (isCertificate || url.includes('/vault/')) {
            const { keyBase64, keyMd5 } = this.getVaultCustomerKeyMaterial();

            commandParams.SSECustomerAlgorithm = 'AES256';
            commandParams.SSECustomerKey = keyBase64;
            commandParams.SSECustomerKeyMD5 = keyMd5;

            // O navegador (Frontend Axios Fetch) precisará incluir esses headers para passar a chave e visualizar
            headersToReturn['x-amz-server-side-encryption-customer-algorithm'] = 'AES256';
            headersToReturn['x-amz-server-side-encryption-customer-key'] = keyBase64;
            headersToReturn['x-amz-server-side-encryption-customer-key-MD5'] = keyMd5;
        }

        const command = new GetObjectCommand(commandParams);

        // TTL Curto: 5 minutos = 300 segundos
        const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 300 });

        return {
            downloadUrl: signedUrl,
            headers: Object.keys(headersToReturn).length > 0 ? headersToReturn : undefined
        };
    }

    async uploadSecureBuffer(buffer: Buffer, workspaceId: number, folderType: string, contentType?: string): Promise<string> {
        // Gera um UUID ou usa timestamp
        const finalContentType = contentType || 'application/octet-stream';
        const ext = finalContentType === 'application/x-pkcs12' ? 'p12' : 'bin';
        const objectKey = `workspaces/${workspaceId}/vault/${crypto.randomUUID() || Date.now()}.${ext}`;

        const commandParams: PutObjectCommandInput = {
            Bucket: this.bucketName,
            Key: objectKey,
            Body: buffer,
            ContentType: finalContentType,
            ContentLength: buffer.length,
        };

        // Lógica de Criptografia SSE-C Isolada Opcional
        if (folderType === 'CERTIFICATE' || finalContentType === 'application/x-pkcs12' || finalContentType === 'application/x-pem-file') {
            const { keyBase64, keyMd5 } = this.getVaultCustomerKeyMaterial();

            commandParams.SSECustomerAlgorithm = 'AES256';
            commandParams.SSECustomerKey = keyBase64;
            commandParams.SSECustomerKeyMD5 = keyMd5;
        }

        const command = new PutObjectCommand(commandParams);
        await this.client.send(command);

        return objectKey;
    }
}
