import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/lib/axios';

interface LocationResponse {
    zipCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

interface DocumentResponse {
    document: string;
    name: string;
    tradeName: string;
    cnae: string;
    address: LocationResponse;
}

export function useExternalLocation() {
    return useMutation({
        mutationFn: async (cep: string) => {
            const response = await api.get<LocationResponse>(`/external/location/${cep.replace(/\D/g, '')}`);
            return response.data;
        }
    });
}

export function useExternalDocument() {
    return useMutation({
        mutationFn: async (cnpj: string) => {
            const response = await api.get<DocumentResponse>(`/external/document/${cnpj.replace(/\D/g, '')}`);
            return response.data;
        }
    });
}
