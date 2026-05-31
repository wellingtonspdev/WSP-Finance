import type { BridgeTransferDTO } from '../workspaces/api/executeBridgeTransfer';
import type { CreateTransactionDTO, TransactionPayloadDTO } from './types';

export function buildBridgePayload(data: CreateTransactionDTO, fromWorkspaceId: number): BridgeTransferDTO {
    return {
        fromWorkspaceId,
        toWorkspaceId: Number(data.toWorkspaceId),
        amount: Number(data.amount),
        description: data.description || 'Transferencia Pro-labore',
        date: new Date(data.date).toISOString(),
    };
}

export function buildTransactionPayload(
    data: CreateTransactionDTO,
    finalAttachmentUrl?: string
): Partial<TransactionPayloadDTO> & Record<string, unknown> {
    const payload: Partial<TransactionPayloadDTO> & Record<string, unknown> = {
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
        type: data.type === 'BRIDGE' ? 'INCOME' : data.type,
        categoryId: Number(data.categoryId),
        isPaid: data.isPaid === true || (data.isPaid as unknown as string) === 'true',
    };

    if (data.grossAmount && Number(data.grossAmount) > 0) payload.grossAmount = Number(data.grossAmount);
    if (data.marketplaceFee && Number(data.marketplaceFee) > 0) payload.marketplaceFee = Number(data.marketplaceFee);
    if (data.shippingCost && Number(data.shippingCost) > 0) payload.shippingCost = Number(data.shippingCost);
    if (data.productCost && Number(data.productCost) > 0) payload.productCost = Number(data.productCost);
    if (data.platformFeeRate && Number(data.platformFeeRate) > 0) payload.platformFeeRate = Number(data.platformFeeRate);
    if (finalAttachmentUrl) payload.attachmentUrl = finalAttachmentUrl;
    if (data.attachmentSize && data.attachmentSize > 0) payload.attachmentSize = data.attachmentSize;

    return payload;
}
