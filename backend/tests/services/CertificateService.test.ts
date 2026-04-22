import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as forge from 'node-forge';
import { CertificateService } from '../../src/services/CertificateService';

vi.mock('node-forge', () => {
  return {
    asn1: { fromDer: vi.fn() },
    pkcs12: { pkcs12FromAsn1: vi.fn() },
    pki: { oids: { certBag: '1.2.840.113549.1.12.10.1.3' } }
  };
});

describe('CertificateService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('parseAndExtractValidity', () => {
    it('deve parsear o certificado .p12/.pfx válido com a senha correta e extrair o notAfter', () => {
      const mockBuffer = Buffer.from('mock-p12-data');
      const password = 'correct-password';
      const mockAsn1 = {};
      const mockP12 = {
        safeContents: [
          {
            safeBags: [
              {
                type: forge.pki.oids.certBag,
                cert: {
                  validity: {
                    notAfter: new Date('2027-05-10T23:59:59.000Z')
                  }
                }
              }
            ]
          }
        ]
      };

      vi.spyOn(forge.asn1, 'fromDer').mockReturnValue(mockAsn1 as any);
      vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockReturnValue(mockP12 as any);

      const result = CertificateService.parseAndExtractValidity(mockBuffer, password);

      expect(result.notAfter).toEqual(new Date('2027-05-10T23:59:59.000Z'));
      expect(result.alertLevel).toBe('ok');
    });

    it('deve retornar throw ou Erro para senha incorreta', () => {
      const mockBuffer = Buffer.from('mock-p12-data');
      const password = 'wrong-password';

      vi.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockImplementation(() => {
        throw new Error('MAC check failed');
      });

      expect(() => CertificateService.parseAndExtractValidity(mockBuffer, password)).toThrow('Senha incorreta ou arquivo PFX/P12 inválido.');
    });

    it('deve retornar throw para arquivo inválido ou corrompido', () => {
      const mockBuffer = Buffer.from('corrupted-data');
      const password = 'some-password';

      vi.spyOn(forge.asn1, 'fromDer').mockImplementation(() => {
        throw new Error('Too few bytes to parse DER');
      });

      expect(() => CertificateService.parseAndExtractValidity(mockBuffer, password)).toThrow('Arquivo .p12/.pfx inválido ou corrompido.');
    });

    it('deve extrair notAfter e definir alertLevel como expired se data no passado', () => {
      const mockBuffer = Buffer.from('mock-p12-data');
      const password = 'password';
      const mockP12 = {
        safeContents: [
          {
            safeBags: [
              {
                type: forge.pki.oids.certBag,
                cert: {
                  validity: {
                    notAfter: new Date('2020-01-01T00:00:00.000Z')
                  }
                }
              }
            ]
          }
        ]
      };

      vi.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
      vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockReturnValue(mockP12 as any);

      const result = CertificateService.parseAndExtractValidity(mockBuffer, password);

      expect(result.notAfter).toEqual(new Date('2020-01-01T00:00:00.000Z'));
      expect(result.alertLevel).toBe('expired');
    });

    it('deve falhar corretamente quando não encontrar notAfter (certificado sem expiração)', () => {
        const mockBuffer = Buffer.from('mock-p12-data');
        const password = 'password';
        const mockP12 = {
          safeContents: [
            {
              safeBags: [
                {
                  type: forge.pki.oids.certBag,
                  cert: {
                    validity: {} // Sem notAfter
                  }
                }
              ]
            }
          ]
        };
  
        vi.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
        vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockReturnValue(mockP12 as any);
  
        expect(() => CertificateService.parseAndExtractValidity(mockBuffer, password)).toThrow('Certificado não possui data de expiração (notAfter).');
      });

      it('deve navegar corretamente na cadeia caso haja intermediários (pegar o primeiro certificado de cliente)', () => {
        const mockBuffer = Buffer.from('mock-p12-data');
        const password = 'password';
        const mockP12 = {
          safeContents: [
            {
              safeBags: [
                {
                  type: forge.pki.oids.certBag, // intermediário, digamos, sem clientAuth
                  cert: null
                },
                {
                  type: forge.pki.oids.certBag, // esse tem cert válido
                  cert: {
                    validity: {
                      notAfter: new Date('2030-01-01T00:00:00.000Z')
                    }
                  }
                }
              ]
            }
          ]
        };
  
        vi.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
        vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockReturnValue(mockP12 as any);
  
        const result = CertificateService.parseAndExtractValidity(mockBuffer, password);
  
        expect(result.notAfter).toEqual(new Date('2030-01-01T00:00:00.000Z'));
      });

      it('deve preferir o certificado leaf não-CA mesmo quando um intermediário aparece primeiro', () => {
        const mockBuffer = Buffer.from('mock-p12-data');
        const password = 'password';
        const mockP12 = {
          safeContents: [
            {
              safeBags: [
                {
                  type: forge.pki.oids.certBag,
                  cert: {
                    extensions: [{ name: 'basicConstraints', cA: true }],
                    validity: {
                      notAfter: new Date('2028-01-01T00:00:00.000Z')
                    }
                  }
                },
                {
                  type: forge.pki.oids.certBag,
                  cert: {
                    extensions: [{ name: 'basicConstraints', cA: false }],
                    validity: {
                      notAfter: new Date('2031-05-20T00:00:00.000Z')
                    }
                  }
                }
              ]
            }
          ]
        };

        vi.spyOn(forge.asn1, 'fromDer').mockReturnValue({} as any);
        vi.spyOn(forge.pkcs12, 'pkcs12FromAsn1').mockReturnValue(mockP12 as any);

        const result = CertificateService.parseAndExtractValidity(mockBuffer, password);

        expect(result.notAfter).toEqual(new Date('2031-05-20T00:00:00.000Z'));
      });
  });
});
