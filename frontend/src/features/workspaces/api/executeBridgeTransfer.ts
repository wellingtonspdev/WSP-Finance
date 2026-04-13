import { api } from '../../../shared/lib/axios';

export interface BridgeTransferDTO {
    fromWorkspaceId: number;
    toWorkspaceId: number;
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    description?: string;
    date?: string;
}

export const executeBridgeTransfer = async (data: BridgeTransferDTO) => {
    const response = await api.post('/bridge/transfer', data);
    return response.data;
};
