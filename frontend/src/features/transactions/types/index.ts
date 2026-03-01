import { z } from 'zod';

// Schema for generic transactions and bridge
export const transactionFormSchema = z.object({
    description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
    amount: z.number().min(0, 'O valor não pode ser negativo'),
    date: z.string(), // ISO String or YYYY-MM-DD
    type: z.enum(['INCOME', 'EXPENSE', 'BRIDGE']), // Adicionado BRIDGE mock local

    // Default Fields
    accountId: z.number().int().optional(),
    categoryId: z.number().int().optional(),
    isPaid: z.boolean(),

    // Bridge specific fields
    toWorkspaceId: z.number().int().optional(),
    toAccountId: z.number().int().optional(),

    // PACT Marketplace Fields (Optional)
    grossAmount: z.number().optional(),
    marketplaceFee: z.number().optional(),
    shippingCost: z.number().optional(),
    productCost: z.number().optional(),
    platformFeeRate: z.number().optional(),

    // Cloudflare R2 Upload Hook
    attachment: z.any().optional(), // File type avoid runtime crash on SSR or Zod File checks
    attachmentUrl: z.string().optional(),
    attachmentSize: z.number().optional(),
}).refine(data => {
    // Validar Bridge DTO Localmente
    if (data.type === 'BRIDGE') {
        if (!data.toWorkspaceId || !data.toAccountId || !data.accountId) {
            return false;
        }
    }
    return true;
}, "Preencha todos os campos do Pró-labore");

export type CreateTransactionDTO = z.infer<typeof transactionFormSchema>;

export const transactionPayloadSchema = z.object({
    description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
    amount: z.number().min(0, 'O valor não pode ser negativo'),
    date: z.string(),
    type: z.enum(['INCOME', 'EXPENSE', 'BRIDGE']),
    accountId: z.number().int().optional(),
    categoryId: z.number().int().optional(),
    isPaid: z.boolean(),
    toWorkspaceId: z.number().int().optional(),
    toAccountId: z.number().int().optional(),
    grossAmount: z.number().optional(),
    marketplaceFee: z.number().optional(),
    shippingCost: z.number().optional(),
    productCost: z.number().optional(),
    platformFeeRate: z.number().optional(),
    attachmentUrl: z.string().optional(),
    attachmentSize: z.number().optional(),
});

export type TransactionPayloadDTO = z.infer<typeof transactionPayloadSchema>;

// API Response Type for Transaction
export interface Transaction {
    id: number;
    description: string;
    amount: number;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    isPaid: boolean;
    status: 'COMPLETED' | 'PENDING' | 'RECONCILED' | 'CANCELED';

    accountId: number;
    categoryId: number;
    workspaceId: number;

    // Relacionamentos aninhados opcionais (recebidos via Prisma include)
    account?: {
        name: string;
    };
    category?: {
        name: string;
        icon: string;
        color: string;
    };

    // PACT V3 properties
    grossAmount?: number;
    marketplaceFee?: number;
    shippingCost?: number;
    productCost?: number;
    platformFeeRate?: number;
    taxAmount?: number;
    feeAmount?: number;
    netValue?: number;

    // V3.8 Cota e Vault
    attachmentUrl?: string;

    createdAt: string;
    updatedAt: string;
}

// Transaction List Filter Params
export interface TransactionFilters {
    month?: number;
    year?: number;
    type?: 'INCOME' | 'EXPENSE';
    accountId?: number;
    categoryId?: number;
}
