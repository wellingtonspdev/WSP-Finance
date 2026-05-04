import { PrismaClient } from '@prisma/client';

async function main() {
  const directUrl = "postgresql://postgres:270520@localhost:5432/finance_app?schema=public";
  
  // Initialize Prisma Client with the superuser directUrl
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });

  try {
    console.log("Checking current user and schema...");
    const userRes = await prisma.$queryRawUnsafe(`SELECT current_user, current_schema();`);
    console.log("Current user/schema:", userRes);
    
    console.log("Applying grants...");
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO wsp_test_user;`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wsp_test_user;`);
    await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO wsp_test_user;`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO wsp_test_user;`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO wsp_test_user;`);
    console.log("Grants applied successfully.");
    
    // Now verify with the normal user
    const prismaNormal = new PrismaClient({
      datasources: {
        db: {
          url: "postgresql://wsp_test_user:wsp_test_password@localhost:5432/finance_app?schema=public"
        }
      }
    });
    const checkRes = await prismaNormal.$queryRawUnsafe(`SELECT count(*) FROM public."User";`);
    console.log("Check normal user access:", checkRes);
    await prismaNormal.$disconnect();
    
  } catch (error) {
    console.error("Error applying grants:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
