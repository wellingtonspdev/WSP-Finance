import { PrismaClient, MovementSource, MovementStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

interface BankMovementConfig {
    workspaceId: number;
    accountId: number;
    count: number;
}

const FUZZY_BANC_DESCRIPTIONS = [
    // Cluster UBER
    'Uber *Trip 102', 'UBER DO BRASIL TECNOLOG', 'Uber Brasil', 'UBR* PENDING',
    // Cluster AMAZON
    'Amazon AWS Cloud', 'AMZN AWS', 'Amzn Prime', 'AMAZON.COM.BR',
    // Cluster 99APP
    '99App *Corrida', '99 POP', '99APP *PAGAMENTO', 'NINENINECORP',
    // Diversos
    'PAGAMENTO FORNECEDOR', 'TRANSFERÊNCIA RECEBIDA', 'TARIFA BANCARIA', 'RENDIMENTO APL',
    'PAGTO ELETRONICO', 'DEPOSITO PIX', 'IOF', 'TED CIP'
];

export async function seedBankMovements(prisma: PrismaClient, configs: BankMovementConfig[]) {
    let totalCount = 0;
    const now = new Date();

    for (const cfg of configs) {
        let wsCount = 0;
        
        // Distribuição teórica: 50% PENDING, 25% APPROVED, 12.5% REJECTED, 12.5% MERGED
        for (let i = 0; i < cfg.count; i++) {
            let status: MovementStatus = 'PENDING';
            const rnd = Math.random();
            if (rnd > 0.5 && rnd <= 0.75) status = 'APPROVED';
            else if (rnd > 0.75 && rnd <= 0.875) status = 'REJECTED';
            else if (rnd > 0.875) status = 'MERGED';

            let source: MovementSource = 'OFX';
            const rndSource = Math.random();
            if (rndSource > 0.4 && rndSource <= 0.8) source = 'OPEN_FINANCE';
            else if (rndSource > 0.8 && rndSource <= 0.9) source = 'OCR';
            else if (rndSource > 0.9) source = 'MANUAL';

            // Data nos últimos 90 dias
            const daysAgo = Math.floor(Math.random() * 90);
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

            const desc = FUZZY_BANC_DESCRIPTIONS[Math.floor(Math.random() * FUZZY_BANC_DESCRIPTIONS.length)];
            const isExpense = Math.random() > 0.5;
            const absoluteAmount = new Decimal(Math.random() * 2000 + 10).toDecimalPlaces(4);
            const amount = isExpense ? absoluteAmount.negated() : absoluteAmount;
            
            const uuid = uuidv4();
            const fitid = `FT-${cfg.workspaceId}-${date.getTime()}-${i}`;
            const hash = `HASH-${uuid}`;

            const payload = {
                banco: 'Simulado',
                agencia: '0001',
                conta: '123456-7',
                tipo: isExpense ? 'DEBITO' : 'CREDITO',
                valorDocumento: amount.toString()
            };

            await prisma.bankMovement.create({
                data: {
                    workspaceId: cfg.workspaceId,
                    accountId: cfg.accountId,
                    amount: amount,
                    date: date,
                    description: desc,
                    source: source,
                    status: status,
                    fitid: fitid,
                    hashDeduplication: hash,
                    rawPayload: payload
                }
            });

            wsCount++;
            totalCount++;
        }
    }

    return { count: totalCount };
}
