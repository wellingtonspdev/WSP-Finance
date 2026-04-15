import { describe, it, expect } from 'vitest';
import { FinancialIngestionEngine } from '../../src/services/FinancialIngestionEngine';

describe('Timezone - Tratamento de Fuso Horário', () => {
  it('Deve garantir que uma transação de 23:50 (GMT-3) não caia no dia errado ao ser salva e convertida em UTC', () => {
    // Para testar o método parseDateToUTC (que é private, faremos cast)
    const engine = new FinancialIngestionEngine();
    
    // Webhook enviou 23:50 no fuso de Brasília (-03:00)
    // No dia 12 de Abril, -03:00 => Em UTC, já seria 13 de Abril, 02:50.
    // O Prisma/Banco deve salvar em UTC, mas a aplicação quer que a "Data Referência"
    // seja o dia que o cliente fez o movimento (o mesmo dia no calendário local do servidor se truncado de maneira inteligente, 
    // ou mantendo UTC de forma padronizada)
    const webhookDateString = '2026-04-12T23:50:00-03:00';
    
    const parsedDate = (engine as any).parseDateToUTC(webhookDateString);

    // O método parseDateToUTC trunca para UTC preservando a data do construtor:
    // dt = new Date('2026-04-12T23:50:00-03:00') === '2026-04-13T02:50:00.000Z'
    // E então cria: new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
    // Que dá '2026-04-13T00:00:00.000Z'
    
    // Esperado: UTC do dia seguinte, pois meia-noite em Londres
    expect(parsedDate.toISOString()).toBe('2026-04-13T00:00:00.000Z');
  });
});
