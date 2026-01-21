const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  const globalCategories = [
    { name: 'Alimentação', icon: 'food', color: '#FF5733' },
    { name: 'Transporte', icon: 'bus', color: '#33FF57' },
    { name: 'Lazer', icon: 'game', color: '#3357FF' },
    { name: 'Saúde', icon: 'health', color: '#FF33A8' },
    { name: 'Salário', icon: 'money', color: '#33FFF5' },
  ];

  for (const cat of globalCategories) {
    // Verifica se já existe para não duplicar
    const exists = await prisma.category.findFirst({
      where: { name: cat.name, workspaceId: null }
    });

    if (!exists) {
      await prisma.category.create({
        data: {
          ...cat,
          workspaceId: null // Define como Global
        }
      });
      console.log(`✅ Categoria Global criada: ${cat.name}`);
    }
  }

  console.log('🌱 Seed finalizado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });