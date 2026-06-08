export type ExportValidatePayload = {
    layoutId: 'dominio-separated-v1';
    startDate: string;
    endDate: string;
};

export type ExportValidationIssue = {
    code: string;
    message: string;
    field?: string;
    transactionId?: string;
    recordType?: string;
    maxLength?: number;
    actualLength?: number;
};

export type ExportValidateResponse = {
    valid: boolean;
    layoutId: string;
    totalRecords: number;
    warnings: ExportValidationIssue[];
    blockers: ExportValidationIssue[];
    summary?: {
        warningsCount?: number;
        blockersCount?: number;
    };
};
