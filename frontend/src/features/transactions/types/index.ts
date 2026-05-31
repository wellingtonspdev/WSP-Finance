import { z } from 'zod';

// Schema for generic transactions and bridge
export const transactionFormSchema = z.object({
    description: z.string().min(3, 'A descricao deve ter pelo menos 3 caracteres'),
    amount: z.number().min(0.01, 'O valor nao pode ser zero'),
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

    attachment: z.any().optional(),
    attachmentUrl: z.string().optional(),
    attachmentSize: z.number().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'BRIDGE') {
        if (!data.toWorkspaceId || !data.toAccountId || !data.accountId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Preencha todas as contas do Pro-labore',
                path: ['toAccountId']
            });
        }
    } else {
        if (!data.categoryId || data.categoryId <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Selecione uma Categoria',
                path: ['categoryId']
            });
        }
    }
});

export type CreateTransactionDTO = z.infer<typeof transactionFormSchema>;

export const transactionPayloadSchema = z.object({
    description: z.string().min(3, 'A descricao deve ter pelo menos 3 caracteres'),
    amount: z.number().min(0.01, 'O valor nao pode ser zero'),
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

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    isPaid: boolean;
    status: 'COMPLETED' | 'PENDING' | 'RECONCILED' | 'CANCELED';

    accountId: number;
    categoryId: number;
    workspaceId: number;

    account?: {
        name: string;
    };
    category?: {
        name: string;
        icon: string;
        color: string;
    };

    grossAmount?: number;
    marketplaceFee?: number;
    shippingCost?: number;
    productCost?: number;
    platformFeeRate?: number;
    taxAmount?: number;
    feeAmount?: number;
    netValue?: number;

    attachmentUrl?: string;

    createdAt: string;
    updatedAt: string;

    aiInsights?: AIInsightForTransaction[];
}

export type AIInsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AIInsightForTransaction {
    id: string;
    transactionId: string;
    severity: AIInsightSeverity;
    code?: string;
    message: string;
    reason?: string | null;
    confidence?: string | number | null;
    dismissed: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface TransactionFilters {
    month?: number;
    year?: number;
    type?: 'INCOME' | 'EXPENSE';
    accountId?: number;
    categoryId?: number;
}
