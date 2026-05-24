import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3StorageProvider } from '../../src/providers/S3StorageProvider';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock S3Client
vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  const MockS3Client = vi.fn().mockImplementation(function() {
    return { send: vi.fn() };
  });
  return {
    ...actual,
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
  };
});

// Mock s3-request-presigner
const mockGetSignedUrl = vi.fn().mockResolvedValue('https://r2.example.com/mock-presigned-url');
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

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

describe('S3StorageProvider - getPresignedDownloadUrl', () => {
  let provider: S3StorageProvider;
  let mockSend: any;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'wsp-finance-vault';

    mockSend = vi.fn().mockResolvedValue({});
    (S3Client as any).mockImplementation(function() {
      return { send: mockSend };
    });

    (GetObjectCommand as any).mockImplementation(function(params: any) {
      return { ...params, isGetObjectCommandMock: true };
    });

    mockGetSignedUrl.mockResolvedValue('https://r2.example.com/mock-presigned-url');

    provider = new S3StorageProvider();
  });

  // P01: Returns { url, expiresInSeconds } with correct TTL
  it('P01 - returns url and expiresInSeconds matching requested TTL', async () => {
    const result = await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 600, contentType: 'text/plain', fileName: 'export.txt' }
    );

    expect(result).toEqual({
      url: 'https://r2.example.com/mock-presigned-url',
      expiresInSeconds: 600,
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 600 })
    );
  });

  // P02: TTL capped at 900
  it('P02 - caps TTL at 900 even if higher value requested', async () => {
    const result = await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 3600, contentType: 'text/plain', fileName: 'export.txt' }
    );

    expect(result.expiresInSeconds).toBeLessThanOrEqual(900);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });

  // P03: Content-Disposition contains sanitized fileName
  it('P03 - GetObjectCommand includes Content-Disposition with sanitized fileName', async () => {
    await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 900, contentType: 'text/plain', fileName: 'export-file.txt' }
    );

    const commandParams = (GetObjectCommand as any).mock.calls[0][0];
    expect(commandParams.ResponseContentDisposition).toContain('attachment');
    expect(commandParams.ResponseContentDisposition).toContain('export-file.txt');
  });

  // P04: ResponseContentType matches passed contentType
  it('P04 - GetObjectCommand uses the provided contentType', async () => {
    await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 900, contentType: 'text/plain; charset=windows-1252', fileName: 'test.txt' }
    );

    const commandParams = (GetObjectCommand as any).mock.calls[0][0];
    expect(commandParams.ResponseContentType).toBe('text/plain; charset=windows-1252');
  });

  // P05: Propagates S3 error
  it('P05 - propagates presigner error', async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error('R2 presign failure'));

    await expect(
      provider.getPresignedDownloadUrl(
        'workspaces/1/exports/uuid.txt',
        { ttlSeconds: 900, contentType: 'text/plain', fileName: 'test.txt' }
      )
    ).rejects.toThrow('R2 presign failure');
  });

  // P06: fileName with dangerous characters is sanitized
  it('P06 - sanitizes fileName with CRLF and quotes in Content-Disposition', async () => {
    await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 900, contentType: 'text/plain', fileName: 'evil"\r\nHeader-Inject: yes' }
    );

    const commandParams = (GetObjectCommand as any).mock.calls[0][0];
    const disposition = commandParams.ResponseContentDisposition as string;
    expect(disposition).not.toContain('\r');
    expect(disposition).not.toContain('\n');
    expect(disposition).toContain('attachment');
  });

  // P07: normalizes TTL 0 to 900
  it('P07 - normalizes TTL 0 to 900', async () => {
    const result = await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: 0, contentType: 'text/plain', fileName: 'export.txt' }
    );
    expect(result.expiresInSeconds).toBe(900);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });

  // P08: normalizes negative TTL to 900
  it('P08 - normalizes negative TTL to 900', async () => {
    const result = await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: -10, contentType: 'text/plain', fileName: 'export.txt' }
    );
    expect(result.expiresInSeconds).toBe(900);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });

  // P09: normalizes NaN TTL to 900
  it('P09 - normalizes NaN TTL to 900', async () => {
    const result = await provider.getPresignedDownloadUrl(
      'workspaces/1/exports/uuid.txt',
      { ttlSeconds: NaN, contentType: 'text/plain', fileName: 'export.txt' }
    );
    expect(result.expiresInSeconds).toBe(900);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 900 })
    );
  });
});
