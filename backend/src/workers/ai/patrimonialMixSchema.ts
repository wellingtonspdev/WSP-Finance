import { z } from 'zod';

export const PatrimonialMixAnalysisSchema = z.object({
  hasRisk: z.boolean(),
  code: z.enum(['MISTURA_PATRIMONIAL', 'RISCO_MALHA_FINA', 'DESPESA_PESSOAL_POTENCIAL']).nullable(),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).nullable(),
  message: z.string().min(1).max(500).nullable(),
  reason: z.string().min(1).max(1000).nullable(),
  confidence: z.number().min(0).max(1),
  educationalHint: z.string().max(500).nullable().optional(),
}).strict().superRefine((value, ctx) => {
  if (value.hasRisk) {
    if (!value.code) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['code'], message: 'code is required when hasRisk is true' });
    }

    if (!value.severity) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['severity'], message: 'severity is required when hasRisk is true' });
    }

    if (!value.message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'message is required when hasRisk is true' });
    }

    if (!value.reason) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'reason is required when hasRisk is true' });
    }
  }
});

export type PatrimonialMixAnalysis = z.infer<typeof PatrimonialMixAnalysisSchema>;

export function hasDangerousRenderableOutput(value: string): boolean {
  return /<[^>]+>|```|!\[[^\]]*]\([^)]*\)|\[[^\]]+]\([^)]*\)|https?:\/\/|javascript:|[*_]{2,}/i.test(value);
}
