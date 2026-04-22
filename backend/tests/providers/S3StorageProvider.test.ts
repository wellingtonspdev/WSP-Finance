import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3StorageProvider } from '../../src/providers/S3StorageProvider';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock S3Client
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  const MockS3Client = vi.fn().mockImplementation(function() {
    return { send: vi.fn() };
  });
  return {
    ...actual,
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn()
  };
});

describe('S3StorageProvider - uploadSecureBuffer', () => {
  let provider: S3StorageProvider;
  let mockSend: any;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'wsp-finance-vault';
    process.env.VAULT_MASTER_KEY = 'test-secret-key-that-is-at-least-32-chars';

    mockSend = vi.fn().mockResolvedValue({});
    // Retrieve the instance mock so we can override the send method
    (S3Client as any).mockImplementation(function() {
      return { send: mockSend };
    });

    (PutObjectCommand as any).mockImplementation(function(params: any) {
      return { ...params, isPutObjectCommandMock: true };
    });

    provider = new S3StorageProvider();
  });

  const validBuffer = Buffer.from('mock content');

  it('1. aceita upload por Buffer, aplica SSE-C esperado e devolve a objectKey', async () => {
    const workspaceId = 1;
    const folderType = 'CERTIFICATE';
    const contentType = 'application/x-pkcs12';

    const result = await provider.uploadSecureBuffer!(validBuffer, workspaceId, folderType, contentType);

    // Valida que o client.send foi chamado
    expect(mockSend).toHaveBeenCalled();
    const commandParam = (PutObjectCommand as any).mock.calls[0][0];

    // Valida propriedades do comando put
    expect(commandParam.Body).toBe(validBuffer);
    expect(commandParam.ContentType).toBe(contentType);
    expect(commandParam.Bucket).toBe('wsp-finance-vault'); // Default bucket
    expect(commandParam.Key).toMatch(/^workspaces\/1\/vault\/[a-f0-9-]+\.p12$/); // Convenção de key esperada

    // Valida SSE-C
    expect(commandParam.SSECustomerAlgorithm).toBe('AES256');
    expect(commandParam.SSECustomerKey).toBeDefined();
    expect(commandParam.SSECustomerKeyMD5).toBeDefined();

    // Valida o retorno do service (deve ser a mesma string do Key gerado)
    expect(result).toBe(commandParam.Key);
  });

  it('2. usa fallback de contentType e extension se contentType não enviado', async () => {
    const result = await provider.uploadSecureBuffer!(validBuffer, 1, 'CERTIFICATE');
    
    expect(mockSend).toHaveBeenCalled();
    const commandParam = (PutObjectCommand as any).mock.calls[0][0];
    
    expect(commandParam.ContentType).toBe('application/octet-stream'); // Fallback default
    expect(commandParam.Key).toMatch(/^workspaces\/1\/vault\/[a-f0-9-]+\.bin$/); 
    expect(result).toBe(commandParam.Key);
  });

  it('3. propaga erro do S3 de forma íntegra para a camada de serviço', async () => {
    mockSend.mockRejectedValue(new Error('S3 Network Error'));
    
    await expect(provider.uploadSecureBuffer!(validBuffer, 1, 'CERTIFICATE')).rejects.toThrow('S3 Network Error');
  });

  it('4. falha fechado se VAULT_MASTER_KEY não estiver configurada', async () => {
    delete process.env.VAULT_MASTER_KEY;

    await expect(provider.uploadSecureBuffer!(validBuffer, 1, 'CERTIFICATE'))
      .rejects.toThrow('VAULT_MASTER_KEY is required');
    expect(mockSend).not.toHaveBeenCalled();
  });

});
