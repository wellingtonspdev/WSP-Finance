export class ReceitaWsClient {
    private static baseURL = 'https://receitaws.com.br/v1/cnpj';

    static async getCnpj(cnpj: string): Promise<any> {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        const maxTimeout = 5000;

        const response = await fetch(`${this.baseURL}/${cleanCnpj}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(maxTimeout)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: any = await response.json();

        if (data.status === 'ERROR') {
            throw new Error(`ReceitaWS Error: ${data.message}`);
        }

        return data;
    }
}
