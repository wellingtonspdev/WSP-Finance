const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: 'postgresql://postgres:270520@localhost:5432/finance_app?schema=public' });

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wsp_test_user') THEN 
        CREATE ROLE wsp_test_user WITH LOGIN PASSWORD 'testpwd123'; 
      END IF; 
    END $$;
  `);

  await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE finance_app TO wsp_test_user;`);
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO wsp_test_user;`);
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wsp_test_user;`);
  await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wsp_test_user;`);
  await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wsp_test_user;`);
  await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO wsp_test_user;`);
  
  console.log('Test user created and grants applied.');
  process.exit(0);
}

main().catch(console.error);
