import { api } from '../../../shared/lib/axios';

export interface Account {
    id: number;
    name: string;
    balance: number;
    type: string;
    color?: string;
    institution?: string;
}

export const getAccounts = async (): Promise<Account[]> => {
    const response = await api.get('/accounts');
    return response.data;
};
