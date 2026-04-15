import { BrasilApiClient } from './BrasilApiClient';
import { ViaCepClient } from './ViaCepClient';
import { ReceitaWsClient } from './ReceitaWsClient';
const NodeCache = require('node-cache');
const CircuitBreaker = require('opossum');

// Instância única de cache (TTL: 24 horas / 86400 segundos)
const externalCache = new NodeCache({ stdTTL: 86400, checkperiod: 1200 });

// Opções do Circuit Breaker para a BrasilAPI
const breakerOptions = {
    timeout: 5000,          // Se a requisição durar mais que 5s, atira erro
    errorThresholdPercentage: 50, // Se 50% das requisições falharem, "Abre" o circuito
    resetTimeout: 30000     // Após 30s do circuito aberto, testa novamente
};

// Envolver a chamada primária de CEP no Circuit Breaker
const brasilApiCepBreaker = new CircuitBreaker(async (cep: string) => {
    return await BrasilApiClient.getCep(cep);
}, breakerOptions);

// Se a BrasilAPI queimar, caímos transparentemente para o ViaCEP
brasilApiCepBreaker.fallback((cep: string) => {
    console.warn(`[CIRCUIT BREAKER] Fallback acionado. Tentando rotear CEP ${cep} para ViaCEP.`);
    return ViaCepClient.getCep(cep);
});

// Breaker para o CNPJ
const brasilApiCnpjBreaker = new CircuitBreaker(async (cnpj: string) => {
    return await BrasilApiClient.getCnpj(cnpj);
}, breakerOptions);

brasilApiCnpjBreaker.fallback((cnpj: string) => {
    console.warn(`[CIRCUIT BREAKER] Fallback CNPJ acionado. Tentando rotear CNPJ ${cnpj} para ReceitaWS.`);
    return ReceitaWsClient.getCnpj(cnpj);
});

export class ExternalDataService {

    // Função helper para aplicar Masking (LGPD) nos logs/retornos seguros
    private static maskCnpj(cnpj: string): string {
        if (!cnpj || cnpj.length !== 14) return '***';
        return `**.***.${cnpj.substring(5, 8)}/0001-**`;
    }

    static async fetchCep(cep: string): Promise<any> {
        const cleanCep = cep.replace(/\D/g, '');

        // 1. Camada de Proteção: Cache
        const cacheKey = `CEP_${cleanCep}`;
        const cachedData = externalCache.get(cacheKey);
        if (cachedData) {
            return { ...cachedData, metadata: { provider: 'cache', cached: true } };
        }

        try {
            // 2. Orquestração com Fallback: Dispara o Opossum Breaker
            const data: any = await brasilApiCepBreaker.fire(cleanCep);

            // Adaptar para o DTO Unificado (seja BrasilAPI ou ViaCEP)
            // ViaCEP usa logradouro/bairro/localidade/uf
            // BrasilAPI usa street/neighborhood/city/state
            const uniformAddress = {
                zipCode: data.cep || data.zipCode || cleanCep,
                street: data.street || data.logradouro || '',
                neighborhood: data.neighborhood || data.bairro || '',
                city: data.city || data.localidade || '',
                state: data.state || data.uf || ''
            };

            const result = {
                address: uniformAddress,
                metadata: { provider: data.logradouro ? 'viacep' : 'brasilapi', cached: false }
            };

            // 3. Salva no Cache
            externalCache.set(cacheKey, result);
            return result;

        } catch (err: any) {
            console.error(`Erro ao buscar CEP: ${err.message}`);
            throw new Error('Falha ao obter dados de Localização. API Externa indisponível.');
        }
    }

    static async fetchCnpj(cnpj: string): Promise<any> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        // 1. Camada de Cache
        const cacheKey = `CNPJ_${cleanCnpj}`;
        const cachedData = externalCache.get(cacheKey);
        if (cachedData) {
            return { ...cachedData, metadata: { provider: 'cache', cached: true } };
        }

        try {
            // 2. Dispara BrasilAPI via CircuitBreaker
            const data: any = await brasilApiCnpjBreaker.fire(cleanCnpj);
            console.log(`[EXTERNAL DATA] Recebida inteligência corporativa para CNPJ Mask: ${this.maskCnpj(cleanCnpj)}`);

            // 3. Moldar o Contrato Universal
            const result = {
                document: cleanCnpj,
                name: data.razao_social || data.nome || '',
                tradeName: data.nome_fantasia || data.fantasia || '',
                cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : (data.atividade_principal ? data.atividade_principal[0].code : ''),
                address: {
                    zipCode: data.cep || '',
                    street: data.logradouro || '',
                    neighborhood: data.bairro || '',
                    city: data.municipio || '',
                    state: data.uf || ''
                },
                metadata: { provider: data.atividade_principal ? 'receitaws' : 'brasilapi', cached: false }
            };

            // 4. Salva no Cache
            externalCache.set(cacheKey, result);
            return result;

        } catch (err: any) {
            console.error(`Erro ao buscar CNPJ Mask ${this.maskCnpj(cleanCnpj)}: ${err.message}`);
            throw new Error('Falha ao obter dados Corporativos. API Externa indisponível.');
        }
    }
}
