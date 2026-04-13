const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const roleCheck = await client.$queryRaw`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  console.log('Role info from DATABASE_URL:', roleCheck);
  
  const roleCheckDirect = await new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } }).$queryRaw`SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  console.log('Role info from DIRECT_URL:', roleCheckDirect);
  
  process.exit();
}

main().catch(console.error);
