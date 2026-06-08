import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DIRECT_URL;
const runtimeRole = process.env.APP_DATABASE_USER;
const runtimePassword = process.env.APP_DATABASE_PASSWORD;

if (!directUrl) {
  throw new Error('DIRECT_URL is required to prepare the Docker runtime role.');
}

if (!runtimeRole || !runtimePassword) {
  throw new Error('APP_DATABASE_USER and APP_DATABASE_PASSWORD are required.');
}

const safeRuntimeRole = runtimeRole;
const safeRuntimePassword = runtimePassword;

const assertSafeIdentifier = (value: string, name: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${name} must be a simple PostgreSQL identifier.`);
  }
};

const quoteLiteral = (value: string) => value.replace(/'/g, "''");

async function main() {
  assertSafeIdentifier(safeRuntimeRole, 'APP_DATABASE_USER');

  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });

  try {
    await prisma.$connect();

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${safeRuntimeRole}') THEN
          CREATE ROLE ${safeRuntimeRole}
            WITH LOGIN
            PASSWORD '${quoteLiteral(safeRuntimePassword)}'
            NOSUPERUSER
            NOBYPASSRLS
            NOINHERIT;
        ELSE
          ALTER ROLE ${safeRuntimeRole}
            WITH LOGIN
            PASSWORD '${quoteLiteral(safeRuntimePassword)}'
            NOSUPERUSER
            NOBYPASSRLS
            NOINHERIT;
        END IF;
      END
      $$;
    `);

    const [{ current_database: currentDatabase }] =
      await prisma.$queryRawUnsafe<Array<{ current_database: string }>>(
        'SELECT current_database()'
      );

    await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE "${currentDatabase}" TO ${safeRuntimeRole};`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${safeRuntimeRole};`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${safeRuntimeRole};`);
    await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${safeRuntimeRole};`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${safeRuntimeRole};`);
    await prisma.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${safeRuntimeRole};`);

    const roleCheck = await prisma.$queryRawUnsafe<
      Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean }>
    >(`SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = '${safeRuntimeRole}'`);

    if (!roleCheck.length) {
      throw new Error(`Runtime role ${safeRuntimeRole} was not created.`);
    }

    const { rolsuper, rolbypassrls, rolcanlogin } = roleCheck[0];
    if (rolsuper || rolbypassrls || !rolcanlogin) {
      throw new Error(
        `Runtime role ${safeRuntimeRole} is unsafe: rolsuper=${rolsuper}, rolbypassrls=${rolbypassrls}, rolcanlogin=${rolcanlogin}`
      );
    }

    console.log(`[docker-dev] Runtime role ${safeRuntimeRole} validated: LOGIN + NOSUPERUSER + NOBYPASSRLS`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
