export class BrasilApiClient {
    private static baseURL = 'https://brasilapi.com.br/api';

    static async getCnpj(cnpj: string): Promise<any> {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        const maxTimeout = 5000; // 5 segundos max

        const response = await fetch(`${this.baseURL}/cnpj/v1/${cleanCnpj}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(maxTimeout)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    static async getCep(cep: string): Promise<any> {
        const cleanCep = cep.replace(/\D/g, '');
        const maxTimeout = 5000;

        const response = await fetch(`${this.baseURL}/cep/v2/${cleanCep}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(maxTimeout)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
}
