export class ViaCepClient {
    private static baseURL = 'https://viacep.com.br/ws';

    static async getCep(cep: string): Promise<any> {
        const cleanCep = cep.replace(/\D/g, '');
        const maxTimeout = 5000;

        const response = await fetch(`${this.baseURL}/${cleanCep}/json/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(maxTimeout)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: any = await response.json();

        if (data.erro) {
            throw new Error("CEP não encontrado no ViaCEP");
        }

        return data;
    }
}
