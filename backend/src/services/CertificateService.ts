import * as forge from 'node-forge';

export interface CertificateValidityInfo {
  notAfter: Date;
  expiresInDays: number;
  alertLevel: 'ok' | 'warning' | 'expired';
}

interface ForgeCertificateExtension {
  name?: string;
  id?: string;
  cA?: boolean;
}

export class CertificateService {
  private static getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private static isCertificateAuthority(cert: forge.pki.Certificate): boolean {
    const extensions = cert.extensions as ForgeCertificateExtension[] | undefined;
    const basicConstraints = extensions?.find((extension) => (
      extension.name === 'basicConstraints' || extension.id === '2.5.29.19'
    ));

    return basicConstraints?.cA === true;
  }

  private static selectLeafCertificate(certs: forge.pki.Certificate[]): forge.pki.Certificate | null {
    return certs.find((cert) => !CertificateService.isCertificateAuthority(cert)) ?? certs[0] ?? null;
  }

  /**
   * Parseia o buffer de um PFX/P12 e extrai a data de expiração (notAfter) do certificado leaf.
   */
  static parseAndExtractValidity(buffer: Buffer, password: string): CertificateValidityInfo {
    try {
      const p12Asn1 = forge.asn1.fromDer(buffer.toString('binary'));
      let p12;
      try {
        p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
      } catch (err: unknown) {
        if (CertificateService.getErrorMessage(err).includes('MAC check failed')) {
          throw new Error('Senha incorreta ou arquivo PFX/P12 inválido.');
        }
        throw err;
      }

      const certificates: forge.pki.Certificate[] = [];

      for (const safeContent of p12.safeContents) {
        for (const safeBag of safeContent.safeBags) {
          if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
            certificates.push(safeBag.cert);
          }
        }
      }

      const cert = CertificateService.selectLeafCertificate(certificates);

      if (!cert) {
        throw new Error('Nenhum certificado válido encontrado no arquivo.');
      }

      if (!cert.validity || !cert.validity.notAfter) {
        throw new Error('Certificado não possui data de expiração (notAfter).');
      }

      const notAfter = cert.validity.notAfter;
      const now = new Date();

      const diffTime = notAfter.getTime() - now.getTime();
      const expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertLevel: 'ok' | 'warning' | 'expired' = 'ok';
      if (expiresInDays < 0) {
        alertLevel = 'expired';
      } else if (expiresInDays <= 30) {
        alertLevel = 'warning';
      }

      return {
        notAfter,
        expiresInDays,
        alertLevel
      };

    } catch (error: unknown) {
      const message = CertificateService.getErrorMessage(error);
      if (message.includes('Senha incorreta') || message.includes('não possui data') || message.includes('Nenhum certificado')) {
        throw error;
      }
      throw new Error('Arquivo .p12/.pfx inválido ou corrompido.');
    }
  }
}
