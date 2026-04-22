import type { CertificateAlertLevel } from '../../features/workspaces/types';

export interface CertificateAlertState {
    level: CertificateAlertLevel;
    expiresInDays: number;   // negativo se já expirado
}

/**
 * Calcula o estado de alerta do certificado A1 a partir da data de expiração.
 *
 * Espelha exatamente a lógica do CertificateService.ts do backend:
 *   expiresInDays = Math.ceil((notAfter - now) / 86_400_000)
 *   < 0  → 'expired'
 *   ≤ 30 → 'warning'
 *   else → 'ok'
 *
 * Retorna null quando não há certificado cadastrado (input null).
 */
export function getCertificateAlertState(
    certificateExpiresAt: string | null
): CertificateAlertState | null {
    if (!certificateExpiresAt) return null;

    const notAfter = new Date(certificateExpiresAt);
    const now = new Date();
    const diffMs = notAfter.getTime() - now.getTime();
    const expiresInDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let level: CertificateAlertLevel;
    if (expiresInDays < 0)        level = 'expired';
    else if (expiresInDays <= 30) level = 'warning';
    else                          level = 'ok';

    return { level, expiresInDays };
}
