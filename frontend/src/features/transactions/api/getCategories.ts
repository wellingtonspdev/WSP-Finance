import { api } from '../../../shared/lib/axios';

export interface Category {
    id: number;
    name: string;
    type: 'INCOME' | 'EXPENSE';
    color?: string;
    icon?: string;
}

export const getCategories = async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
};
