import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportService } from '../../src/services/ImportService';
import { promises as fsPromises } from 'fs';
import * as ofx from 'ofx-js';
import { FinancialIngestionEngine } from '../../src/services/FinancialIngestionEngine';
import { MovementSource } from '@prisma/client';

// Mocks
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

vi.mock('ofx-js', () => ({
  parse: vi.fn(),
}));

const ingestMock = vi.fn().mockResolvedValue({ imported: 1, duplicates: 0, failed: 0 });

vi.mock('../../src/services/FinancialIngestionEngine', () => {
  return {
    FinancialIngestionEngine: class {
      ingest = ingestMock;
    }
  };
});

describe('ImportService - Baseline Tests', () => {
  let importService: ImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    importService = new ImportService();
  });

  it('deve rejeitar path traversal ou caminho sem .ofx', async () => {
    await expect(importService.importOFX('../../../etc/passwd', 1, 1)).rejects.toThrow('Caminho de arquivo inválido ou não seguro.');
    await expect(importService.importOFX('/app/file.txt', 1, 1)).rejects.toThrow('Caminho de arquivo inválido ou não seguro.');
  });

  it('deve tratar erro no parse ou readFile e relançar erro limpo do App', async () => {
    vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('no permission'));

    await expect(importService.importOFX('caminho/fake.ofx', 1, 1)).rejects.toThrow('Falha de leitura segura ou formato incorreto do OFX.');
  });

  it('deve extrair e criar transações a partir de um objeto de payload (borda 1: transação única)', async () => {
    // Mock do arquivo
    vi.mocked(fsPromises.readFile).mockResolvedValue('fake-ofx-content');

    // Mock do parse da biblioteca ofx-js simulando transação ÚNICA (objeto em vez de array)
    vi.mocked(ofx.parse).mockResolvedValue({
      OFX: {
        BANKMSGSRSV1: {
          STMTTRNRS: {
            STMTRS: {
              BANKTRANLIST: {
                STMTTRN: {
                  TRNAMT: '-50.00',
                  DTPOSTED: '20260115120000',
                  MEMO: 'PGTO CONTA LUZ',
                  FITID: '12345',
                },
              },
            },
          },
        },
      },
    });

    const result = await importService.importOFX('caminho/fake.ofx', 1, 1);

    expect(result.imported).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.failed).toBe(0);
    expect(fsPromises.readFile).toHaveBeenCalledWith('caminho/fake.ofx', 'utf8');
    expect(ofx.parse).toHaveBeenCalledWith('fake-ofx-content');
    
    // Assert delegation to FinancialIngestionEngine
    expect(ingestMock).toHaveBeenCalledWith(
      MovementSource.OFX,
      expect.objectContaining({
        TRNAMT: '-50.00',
        FITID: '12345'
      }),
      1,
      1
    );
  });

  it('deve delegar corretamentente lista de transações para ingest', async () => {
    vi.mocked(fsPromises.readFile).mockResolvedValue('fake-ofx-content');

    vi.mocked(ofx.parse).mockResolvedValue({
      OFX: {
        BANKMSGSRSV1: {
          STMTTRNRS: {
            STMTRS: {
              BANKTRANLIST: {
                STMTTRN: [
                  {
                    TRNAMT: '-50.00',
                    DTPOSTED: '20260115120000',
                    MEMO: 'PGTO CONTA LUZ',
                    FITID: '12345',
                  },
                ],
              },
            },
          },
        },
      },
    });

    const result = await importService.importOFX('caminho/fake.ofx', 1, 1);

    expect(ingestMock).toHaveBeenCalledWith(
      MovementSource.OFX,
      expect.arrayContaining([
        expect.objectContaining({ FITID: '12345' })
      ]),
      1,
      1
    );
  });
});
