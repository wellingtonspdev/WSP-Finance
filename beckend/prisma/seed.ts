import { PrismaClient, TransactionType, TransactionStatus, AccountType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { subDays, addDays, startOfMonth } from 'date-fns';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  // 1. Limpeza (Ordem Reversa para evitar FK Errors)
  console.log('🧹 Limpando banco de dados...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 2. Criar Usuário (Ana Silva)
  console.log('👤 Criando usuário Ana Silva...');
  const passwordHash = await hash('senha123', 8);
  
  const user = await prisma.user.create({
    data: {
      name: 'Ana Silva',
      email: 'ana@wspfinance.com',
      passwordHash,
      emailVerifiedAt: new Date(),
    }
  });

  // 3. Criar Workspaces
  console.log('🏢 Criando Workspaces...');
  
  // Workspace Pessoal
  const personalWs = await prisma.workspace.create({
    data: {
      name: 'Pessoal',
      type: 'PERSONAL',
      taxRate: 0,
      members: {
        create: { userId: user.id, role: 'OWNER' }
      }
    }
  });

  // Workspace Empresarial (Loja)
  const businessWs = await prisma.workspace.create({
    data: {
      name: 'Minha Loja',
      type: 'BUSINESS',
      taxRate: 6.0, // 6% Simples Nacional
      members: {
        create: { userId: user.id, role: 'OWNER' }
      }
    }
  });

  // 4. Criar Categorias (Diversidade para Gráficos)
  console.log('🏷️ Criando Categorias...');
  
  // Categorias Pessoais
  const catFood = await prisma.category.create({ data: { name: 'Alimentação', icon: 'shopping-cart', color: '#10B981', workspaceId: personalWs.id } });
  const catHome = await prisma.category.create({ data: { name: 'Moradia', icon: 'home', color: '#3B82F6', workspaceId: personalWs.id } });
  const catTransport = await prisma.category.create({ data: { name: 'Transporte', icon: 'truck', color: '#F59E0B', workspaceId: personalWs.id } });
  const catHealth = await prisma.category.create({ data: { name: 'Saúde', icon: 'activity', color: '#EF4444', workspaceId: personalWs.id } });
  const catLeisure = await prisma.category.create({ data: { name: 'Lazer', icon: 'film', color: '#8B5CF6', workspaceId: personalWs.id } });
  const catSalary = await prisma.category.create({ data: { name: 'Salário', icon: 'dollar-sign', color: '#10B981', workspaceId: personalWs.id } });

  // Categorias Empresariais
  const catSales = await prisma.category.create({ data: { name: 'Vendas', icon: 'shopping-bag', color: '#10B981', workspaceId: businessWs.id } });
  const catSuppliers = await prisma.category.create({ data: { name: 'Fornecedores', icon: 'box', color: '#F59E0B', workspaceId: businessWs.id } });
  const catTaxes = await prisma.category.create({ data: { name: 'Impostos', icon: 'file-text', color: '#EF4444', workspaceId: businessWs.id } });
  const catProlabore = await prisma.category.create({ data: { name: 'Pro-labore', icon: 'user', color: '#3B82F6', workspaceId: businessWs.id } });

  // 5. Criar Contas
  console.log('🏦 Criando Contas...');
  
  const accPersonal = await prisma.account.create({
    data: {
      name: 'Nubank',
      type: 'CHECKING',
      workspaceId: personalWs.id,
      balance: 0 // Será atualizado no final
    }
  });

  const accBusiness = await prisma.account.create({
    data: {
      name: 'Inter PJ',
      type: 'CHECKING',
      workspaceId: businessWs.id,
      balance: 0 // Será atualizado no final
    }
  });

  // 6. Injetar Transações (O Core)
  console.log('💸 Injetando Transações...');
  const today = new Date();

  // --- WORKSPACE PESSOAL ---
  
  // Receita Inicial (Salário mês passado)
  await prisma.transaction.create({
    data: {
      description: 'Salário Mês Anterior',
      amount: 3500,
      date: subDays(today, 30),
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: accPersonal.id,
      categoryId: catSalary.id,
      workspaceId: personalWs.id
    }
  });

  // Despesas Diversas (Gráfico de Pizza)
  const personalExpenses = [
    { desc: 'Aluguel', amount: 1200, cat: catHome, daysAgo: 5 },
    { desc: 'Supermercado Semanal', amount: 400, cat: catFood, daysAgo: 2 },
    { desc: 'iFood Fim de Semana', amount: 150, cat: catFood, daysAgo: 10 },
    { desc: 'Uber Trabalho', amount: 45, cat: catTransport, daysAgo: 1 },
    { desc: 'Tanque Cheio', amount: 250, cat: catTransport, daysAgo: 15 },
    { desc: 'Farmácia', amount: 120, cat: catHealth, daysAgo: 8 },
    { desc: 'Netflix', amount: 55.90, cat: catLeisure, daysAgo: 20 },
    { desc: 'Cinema', amount: 80, cat: catLeisure, daysAgo: 3 },
  ];

  for (const exp of personalExpenses) {
    await prisma.transaction.create({
      data: {
        description: exp.desc,
        amount: exp.amount,
        date: subDays(today, exp.daysAgo),
        type: 'EXPENSE',
        status: 'COMPLETED',
        accountId: accPersonal.id,
        categoryId: exp.cat.id,
        workspaceId: personalWs.id
      }
    });
  }

  // Risco de Caixa (Conta a Pagar Futura)
  await prisma.transaction.create({
    data: {
      description: 'Cartão de Crédito (Fatura)',
      amount: 2500,
      date: addDays(today, 3), // Futuro
      dueDate: addDays(today, 3),
      type: 'EXPENSE',
      status: 'PENDING',
      isPaid: false,
      accountId: accPersonal.id,
      categoryId: catHome.id, // Exemplo
      workspaceId: personalWs.id
    }
  });

  // --- WORKSPACE EMPRESARIAL ---

  // Vendas Marketplace (PACT - Cálculo de Margem)
  const sales = [
    { desc: 'Venda Shopee #1001', gross: 500, fee: 75, ship: 25, cost: 150, daysAgo: 10 },
    { desc: 'Venda ML #2020', gross: 1200, fee: 180, ship: 40, cost: 400, daysAgo: 5 },
    { desc: 'Venda Site #300', gross: 300, fee: 10, ship: 15, cost: 80, daysAgo: 1 },
  ];

  for (const sale of sales) {
    const netAmount = sale.gross - sale.fee - sale.ship;
    const taxAmount = sale.gross * 0.06; // 6% de imposto

    await prisma.transaction.create({
      data: {
        description: sale.desc,
        amount: netAmount, // Líquido
        date: subDays(today, sale.daysAgo),
        type: 'INCOME',
        status: 'COMPLETED',
        accountId: accBusiness.id,
        categoryId: catSales.id,
        workspaceId: businessWs.id,
        // PACT Fields
        grossAmount: sale.gross,
        marketplaceFee: sale.fee,
        shippingCost: sale.ship,
        productCost: sale.cost,
        taxAmount: taxAmount
      }
    });
  }

  // Despesas Operacionais
  await prisma.transaction.create({
    data: {
      description: 'Fornecedor Tecidos',
      amount: 2000,
      date: subDays(today, 12),
      type: 'EXPENSE',
      status: 'COMPLETED',
      accountId: accBusiness.id,
      categoryId: catSuppliers.id,
      workspaceId: businessWs.id
    }
  });

  // Imposto Pago (Histórico)
  await prisma.transaction.create({
    data: {
      description: 'DAS Simples Nacional (Mês Anterior)',
      amount: 600,
      date: subDays(today, 5),
      type: 'EXPENSE',
      status: 'COMPLETED',
      accountId: accBusiness.id,
      categoryId: catTaxes.id,
      workspaceId: businessWs.id
    }
  });

  // Bridge (Pro-labore)
  const bridgeId = 'seed-bridge-uuid-123';
  
  // Saída Empresa
  await prisma.transaction.create({
    data: {
      description: 'Transferência Pro-labore',
      amount: 3000,
      date: subDays(today, 2),
      type: 'EXPENSE',
      status: 'COMPLETED',
      accountId: accBusiness.id,
      categoryId: catProlabore.id,
      workspaceId: businessWs.id,
      fitid: `BRIDGE_OUT_${bridgeId}`
    }
  });

  // Entrada Pessoal
  await prisma.transaction.create({
    data: {
      description: 'Recebimento Pro-labore',
      amount: 3000,
      date: subDays(today, 2),
      type: 'INCOME',
      status: 'COMPLETED',
      accountId: accPersonal.id,
      categoryId: catSalary.id,
      workspaceId: personalWs.id,
      fitid: `BRIDGE_IN_${bridgeId}`
    }
  });

  // 7. Atualizar Saldos Finais (Consistência)
  console.log('⚖️ Calculando e Atualizando Saldos...');

  // Saldo Pessoal: 3500 (Salário) - 2300.90 (Despesas) + 3000 (Bridge) = ~4199.10
  // Nota: A conta a pagar de 2500 não desconta pois isPaid: false
  const personalBalance = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { accountId: accPersonal.id, type: 'INCOME', isPaid: true }
  }).then(r => r._sum.amount?.toNumber() || 0) - 
  await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { accountId: accPersonal.id, type: 'EXPENSE', isPaid: true }
  }).then(r => r._sum.amount?.toNumber() || 0);

  await prisma.account.update({
    where: { id: accPersonal.id },
    data: { balance: personalBalance }
  });

  // Saldo Empresarial
  const businessBalance = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { accountId: accBusiness.id, type: 'INCOME', isPaid: true }
  }).then(r => r._sum.amount?.toNumber() || 0) - 
  await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { accountId: accBusiness.id, type: 'EXPENSE', isPaid: true }
  }).then(r => r._sum.amount?.toNumber() || 0);

  await prisma.account.update({
    where: { id: accBusiness.id },
    data: { balance: businessBalance }
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log(`📧 Login: ana@wspfinance.com | Senha: senha123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });