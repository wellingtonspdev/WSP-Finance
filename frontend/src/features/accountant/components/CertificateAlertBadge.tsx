import { clsx } from 'clsx';
import { getCertificateAlertState } from '../../../shared/lib/certificate';

interface Props {
    certificateExpiresAt: string | null;
}

const CONFIG = {
    ok: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        dot: 'bg-emerald-400',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        dot: 'bg-amber-400',
    },
    expired: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        dot: 'bg-red-400',
    },
} as const;

function buildLabel(expiresInDays: number): string {
    if (expiresInDays < 0) return 'Expirado';
    if (expiresInDays === 0) return 'Expira hoje';
    if (expiresInDays === 1) return 'Expira em 1 dia';
    return `Expira em ${expiresInDays} dias`;
}

export function CertificateAlertBadge({ certificateExpiresAt }: Props) {
    if (!certificateExpiresAt) {
        return (
            <div
                role="status"
                className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                    'text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm shadow-sm',
                    CONFIG.expired.bg, CONFIG.expired.border, CONFIG.expired.text
                )}
            >
                <div className="relative flex h-1.5 w-1.5 mr-0.5">
                    <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', CONFIG.expired.dot)} />
                    <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', CONFIG.expired.dot)} />
                </div>
                Não enviado
            </div>
        );
    }

    const state = getCertificateAlertState(certificateExpiresAt);
    if (!state) return null;

    const { level, expiresInDays } = state;
    const c = CONFIG[level];
    const label = level === 'ok' ? 'Válido' : buildLabel(expiresInDays);

    return (
        <div
            role="status"
            className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
                'text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm shadow-sm',
                c.bg, c.border, c.text
            )}
        >
            <div className="relative flex h-1.5 w-1.5 mr-0.5">
                <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', c.dot)} />
                <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', c.dot)} />
            </div>
            {label}
        </div>
    );
}
