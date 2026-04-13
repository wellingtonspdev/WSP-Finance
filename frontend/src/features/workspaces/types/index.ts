import { z } from 'zod';

export interface Workspace {
  id: number;
  name: string;
  type: 'PERSONAL' | 'BUSINESS';
}

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['PERSONAL', 'BUSINESS']).default('PERSONAL'),
  fiscalIdentity: z.object({
    documentType: z.enum(['CPF', 'CNPJ']),
    document: z.string().min(11, 'Documento inválido'),
    cnae: z.string().nullable().optional()
  }).optional(),
  address: z.object({
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional()
});

export type CreateWorkspaceDTO = z.infer<typeof createWorkspaceSchema>;