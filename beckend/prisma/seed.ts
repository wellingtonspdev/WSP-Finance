import { PrismaClient, TransactionType, TransactionStatus, AccountType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { subDays, addDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Avançado (V3.0 Estresse Maximo)...');

  // 1. Limpeza (Ordem Reversa Rígida)
  console.log('🧹 Limpando banco de dados...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.refreshToken.deleteMany();             // V3: Deleção nova
  await prisma.passwordResetToken.deleteMany();       // V3: Deleção nova
  await prisma.accountVerificationToken.deleteMany(); // V3: Deleção nova
  await prisma.user.deleteMany();

  // 2. Criar Usuários (O Owner e o Contador Híbrido)
  console.log('👥 Criando Personas...');
  const defaultPassword = await hash('senha123', 8);

  const ana = await prisma.user.create({
    data: {
      name: 'Ana Silva (Empresária)',
      email: 'ana@wspfinance.com',
      passwordHash: defaultPassword,
      emailVerifiedAt: new Date(),
    }
  });

  const wellington = await prisma.user.create({
    data: {
      name: 'Wellington (Contador)',
      email: 'wellington@wspfinance.com',
      passwordHash: defaultPassword,
      emailVerifiedAt: new Date(),
    }
  });

  // 3. Criar Workspaces (Fricção Zero)
  console.log('🏢 Formando Workspaces e Memberships Híbridos...');

  const anaPersonalWs = await prisma.workspace.create({
    data: {
      name: 'Finanças Ana',
      type: 'PERSONAL',
      taxRate: 0,
      members: {
        create: { userId: ana.id, role: 'OWNER' }
      }
    }
  });

  // Workspace Empresarial com Dados Externos Reais (+ Contador como Viewer)
  const businessWs = await prisma.workspace.create({
    data: {
      name: 'Tech WSP Comercio', // Nome real do CNPJ
      type: 'BUSINESS',
      taxRate: 6.0, // Simples Nacional presumido
      documentType: 'CNPJ',
      document: '41562512000115',
      cnae: '4751201',
      zipCode: '01311200',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      members: {
        create: [
          { userId: ana.id, role: 'OWNER' },
          { userId: wellington.id, role: 'VIEWER' } // Multi-Perfil!
        ]
      }
    }
  });

  // Workspace Pessoal do Contador (Pra ele ser Híbrido Owner vs Viewer)
  const welPersonalWs = await prisma.workspace.create({
    data: {
      name: 'Pessoal Wellington',
      type: 'PERSONAL',
      taxRate: 0,
      members: {
        create: { userId: wellington.id, role: 'OWNER' }
      }
    }
  });

  // 4. Criar Categorias Globais
  console.log('🏷️ Forjando Categorias de Análise...');
  const catIncome = await prisma.category.create({ data: { name: 'Vendas', icon: 'trending-up', workspaceId: null } });
  const catTransport = await prisma.category.create({ data: { name: 'Logística', icon: 'truck', workspaceId: null } });
  const catTaxes = await prisma.category.create({ data: { name: 'Tributos', icon: 'pie-chart', workspaceId: null } });
  const catProlabore = await prisma.category.create({ data: { name: 'Pró-Labore', icon: 'user', workspaceId: null } });
  const catShopping = await prisma.category.create({ data: { name: 'Compras', icon: 'shopping-bag', workspaceId: null } });

  // 5. Instanciar Contas Multiformes
  console.log('🏦 Criando Estrutura de Contas Multiformes...');

  const accAnaBank = await prisma.account.create({
    data: { name: 'Itaú Personal', type: 'CHECKING', workspaceId: anaPersonalWs.id }
  });

  const accBusinessBank = await prisma.account.create({
    data: { name: 'Conta Nubank PJ', type: 'CHECKING', workspaceId: businessWs.id }
  });

  const accBusinessCard = await prisma.account.create({
    data: { name: 'Cartão de Crédito PJ', type: 'CREDIT_CARD', workspaceId: businessWs.id }
  });

  const accBusinessSavings = await prisma.account.create({
    data: { name: 'Caixinha Reserva', type: 'SAVINGS', workspaceId: businessWs.id }
  });

  const accWelBank = await prisma.account.create({
    data: { name: 'Bradesco Prime', type: 'CHECKING', workspaceId: welPersonalWs.id }
  });

  // 6. Injeção Profunda de Transações
  console.log('💸 Injetando Transações e Testes de Estresse...');
  const today = new Date();

  // --- C1: Cenário PACT Convencional ---
  await prisma.transaction.create({
    data: {
      description: 'Venda Mercado Livre #001',
      date: subDays(today, 5),
      type: 'INCOME',
      status: 'RECONCILED',
      accountId: accBusinessBank.id,
      categoryId: catIncome.id,
      workspaceId: businessWs.id,
      grossAmount: 1500.00,
      marketplaceFee: 250.00,
      shippingCost: 50.00,
      productCost: 600.00,
      taxAmount: 90.00, // 6%
      amount: 1500 - 250 - 50, // netCash
    }
  });

  // --- C2: Cenário Margem Negativa (Ruptura PACT) ---
  await prisma.transaction.create({
    data: {
      description: 'Venda Shopee Prejuízo #002',
      date: subDays(today, 2),
      type: 'INCOME', // Categoria de Venda
      status: 'COMPLETED',
      accountId: accBusinessBank.id,
      categoryId: catIncome.id,
      workspaceId: businessWs.id,
      grossAmount: 120.00,
      marketplaceFee: 40.00,  // Alta Taxa
      shippingCost: 85.00,    // Frete explodiu
      productCost: 80.00,
      taxAmount: 7.20,
      amount: 120 - 40 - 85, // -5.00 (Loss!)
    }
  });

  // --- C3: Cartão de Crédito Pendente ---
  await prisma.transaction.create({
    data: {
      description: 'Assinatura AWS (Dollar)',
      date: today,
      dueDate: addDays(today, 10), // Vence no futuro
      type: 'EXPENSE',
      status: 'PENDING',
      isPaid: false,
      accountId: accBusinessCard.id,
      categoryId: catTransport.id, // Servidor 
      workspaceId: businessWs.id,
      amount: 540.35,
    }
  });

  // --- C4: Ponte Pró-Labore (Bridge Transfer) ---
  const bridgeToken = 'B-10020-UUID';
  // Saída da Firma (Completa, bateu o caixa)
  await prisma.transaction.create({
    data: {
      description: 'Saída Pró-Labore',
      date: subDays(today, 1),
      type: 'EXPENSE',
      status: 'RECONCILED',
      accountId: accBusinessBank.id,
      categoryId: catProlabore.id,
      workspaceId: businessWs.id,
      amount: 5000.00,
      fitid: `OUT_${bridgeToken}`,
    }
  });

  // Entrada no Pessoal da Ana
  await prisma.transaction.create({
    data: {
      description: 'Recebimento Pró-Labore Tech WSP',
      date: subDays(today, 1),
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: accAnaBank.id,
      categoryId: catProlabore.id,
      workspaceId: anaPersonalWs.id,
      amount: 5000.00,
      fitid: `IN_${bridgeToken}`,
    }
  });

  // --- C4.5: Honorários do Contador (Bridge Transfer para Wellington) ---
  const bridgeTokenWel = 'B-9988-UUID';
  await prisma.transaction.create({
    data: {
      description: 'Pagamento Honorários Contábeis',
      date: subDays(today, 2),
      type: 'EXPENSE',
      status: 'RECONCILED',
      accountId: accBusinessBank.id,
      categoryId: catTaxes.id, // Servindo como Categoria de Serviços
      workspaceId: businessWs.id,
      amount: 1200.00,
      fitid: `OUT_${bridgeTokenWel}`,
    }
  });

  await prisma.transaction.create({
    data: {
      description: 'Recebimento Tech WSP',
      date: subDays(today, 2),
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: accWelBank.id,
      categoryId: catIncome.id,
      workspaceId: welPersonalWs.id,
      amount: 1200.00,
      fitid: `IN_${bridgeTokenWel}`,
    }
  });

  // --- C5: Tranferência Interna (Checking -> Savings) ---
  const intToken = 'INT-550-UUID';
  await prisma.transaction.create({
    data: {
      description: 'Movimentação para Investimento',
      date: today,
      type: 'EXPENSE',
      status: 'COMPLETED',
      accountId: accBusinessBank.id,
      categoryId: catTransport.id, // Categoria ignorada aqui mas exigida
      workspaceId: businessWs.id,
      amount: 1000.00,
      fitid: `T_OUT_${intToken}`
    }
  });

  await prisma.transaction.create({
    data: {
      description: 'Aplicação Automática',
      date: today,
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: accBusinessSavings.id,
      categoryId: catTransport.id,
      workspaceId: businessWs.id,
      amount: 1000.00,
      fitid: `T_IN_${intToken}`
    }
  });

  // --- C6: Armadilha Decimal (Chaos Test) ---
  // Inserimos um NaN no banco pra estressar a resiliência do Client Next.JS
  // Felizmente o Prisma e o Postgres evitam que inseramos letras puro em um formato Float
  // Portanto vamos inserir um número grotesco, fracionado e gigante (19 casas) para garantir o money Format
  await prisma.transaction.create({
    data: {
      description: 'Estresse Decimal (Vírus do Dízimo)',
      date: subDays(today, 30),
      type: 'EXPENSE',
      status: 'COMPLETED',
      accountId: accAnaBank.id,
      categoryId: catShopping.id,
      workspaceId: anaPersonalWs.id,
      amount: 0.3333333333333333, // Dízimo quebrado
    }
  });

  console.log('⚖️ Recalculando Saldos Finais Matemáticos na base de dados...');
  const accountsToUpdate = [accAnaBank.id, accBusinessBank.id, accBusinessCard.id, accBusinessSavings.id, accWelBank.id];

  for (const accId of accountsToUpdate) {
    const incomes = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { accountId: accId, type: 'INCOME', isPaid: true }
    });
    const expenses = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { accountId: accId, type: 'EXPENSE', isPaid: true }
    });

    const inc = incomes._sum.amount ? incomes._sum.amount.toNumber() : 0;
    const exp = expenses._sum.amount ? expenses._sum.amount.toNumber() : 0;

    await prisma.account.update({
      where: { id: accId },
      data: { balance: inc - exp }
    });
  }

  console.log('✅ Seed Brutal V3 Injetado Integralmente!');
  console.log('--- PERSONAS ---');
  console.log('👩🏻‍💼 Ana Silva: ana@wspfinance.com | senha123');
  console.log('👨🏽‍💼 Wellington: wellington@wspfinance.com | senha123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });