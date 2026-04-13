import { Decimal } from 'decimal.js';

/**
 * Utilitários para tratamento seguro de valores monetários.
 * O Backend PACT V3.0 envia os decimais financeiros como String (ex: "1050.4500").
 * Usamos decimal.js para garantir que cálculos não sofram do floating-point hell.
 */

/**
 * Converte um valor numérico bruto (ex: 1050.45 ou "1050.4500") para Currency Brasileira BRL (R$ 1.050,45).
 */
export function formatDecimalToBrl(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return 'R$ 0,00';

    try {
        const dec = new Decimal(value);
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(dec.toNumber());
    } catch {
        return 'R$ 0,00';
    }
}

/**
 * Converte uma máscara string originada de formulários (ex: "R$ 1.050,45" ou "1.050,45") para Número JS PURO.
 * Essencial para o envio final do payload JSON via Zod Validator e TanStack Mutate.
 */
export function formatBrlToNumber(brlString: string): number {
    if (!brlString) return 0.00;

    // Remove R$ e espaços em branco em excesso
    let rawStr = brlString.replace(/[R$\s]/g, '').trim();
    if (!rawStr) return 0.00;

    // Se houver múltiplas vírgulas, é entrada malformada
    if ((rawStr.match(/,/g) || []).length > 1) return 0.00;

    // Removemos TODOS os pontos (que seriam separadores de milhar no BR)
    rawStr = rawStr.replace(/\./g, '');

    // Trocamos a vírgula (decimal do BR) pelo ponto (formato universal decimal)
    rawStr = rawStr.replace(',', '.');

    try {
        const result = new Decimal(rawStr).toNumber();
        return isNaN(result) ? 0.00 : result;
    } catch {
        return 0.00;
    }
}

/**
 * Calcula a margem líquida preditiva (Widget PACT).
 * netValue = grossAmount - marketplaceFee - shippingCost - productCost - taxAmount
 * O taxAmount aqui no frontend é preditivo, pre-assistindo o backend.
 */
export function calculatePactNetValue(
    grossAmount: number = 0,
    marketplaceFee: number = 0,
    shippingCost: number = 0,
    productCost: number = 0,
    taxRatePercent: number = 0
): number {
    try {
        const gross = new Decimal(grossAmount);
        const fee = new Decimal(marketplaceFee);
        const ship = new Decimal(shippingCost);
        const cost = new Decimal(productCost);

        // Predição Simples de Imposto (Simulação Oculta)
        const taxAmount = gross.mul(new Decimal(taxRatePercent).dividedBy(100));

        const net = gross.minus(fee).minus(ship).minus(cost).minus(taxAmount);
        return net.toNumber();
    } catch {
        return 0;
    }
}
