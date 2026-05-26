import type { AiInsightItem } from './types';

export interface AIInsightPresentation {
  title: string;
  description: string;
  severityLabel: string;
}

/**
 * Maps known AiInsightCode to safe, pedagogical copy.
 * Unknown codes receive a neutral fallback — raw message/reason
 * is never exposed directly to prevent punitive language from
 * seeds or legacy data.
 */
const CODE_COPY_MAP: Record<string, { title: string; description: string }> = {
  RISCO_MALHA_FINA: {
    title: 'Movimentação fora do padrão',
    description:
      'Esta movimentação ficou acima da média recente para transações semelhantes. Revise se está correta e documentada.',
  },
  MISTURA_PATRIMONIAL: {
    title: 'Possível mistura patrimonial',
    description:
      'Esta movimentação pode misturar despesas pessoais e empresariais. Revise com seu contador se deve ser reclassificada.',
  },
  DESPESA_PESSOAL_POTENCIAL: {
    title: 'Despesa para revisão',
    description:
      'Esta despesa tem características de uso pessoal. Revise se ela pertence ao contexto do negócio.',
  },
};

const FALLBACK_COPY = {
  title: 'Ponto de atenção para revisão',
  description: 'Revise esta movimentação com seu contador se fizer sentido.',
};

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico',
  WARNING: 'Atenção',
  INFO: 'Informativo',
};

/**
 * Returns pedagogical, safe presentation for any AI insight.
 * Never exposes raw message/reason from the database.
 */
export function getInsightPresentation(insight: AiInsightItem): AIInsightPresentation {
  const mapped = CODE_COPY_MAP[insight.code];

  return {
    title: mapped?.title ?? FALLBACK_COPY.title,
    description: mapped?.description ?? FALLBACK_COPY.description,
    severityLabel: SEVERITY_LABELS[insight.severity] ?? 'Revisão',
  };
}

/**
 * Formats a monetary amount for display.
 * Handles both string decimals (Prisma serialization) and numbers.
 * Does NOT divide by 100 — the backend uses Decimal(19,4).
 */
export function formatInsightCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'R$ 0,00';

  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numeric)) return 'R$ 0,00';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numeric);
}
