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

export type ExportHistoryItem = {
    id: string;
    workspaceId: number;
    layoutId: string;
    targetSystem: string;
    periodStart: string;
    periodEnd: string;
    fileName: string;
    hash: string;
    sizeBytes: number;
    recordCount: number;
    contentType: string;
    encoding: string;
    warningsCount: number;
    retentionUntil: string;
    createdAt: string;
    status: 'AVAILABLE';
    createdByUser: {
        id: number;
        name: string | null;
        email: string;
    };
};

export type ExportHistoryResponse = {
    data: ExportHistoryItem[];
};

export type ExportDownloadResponse = {
    url: string;
    expiresInSeconds: number;
    fileName: string;
    contentType: string;
};
