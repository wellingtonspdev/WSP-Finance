import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import {
  TEST_APPLICATION_PASSWORD,
  TEST_APPLICATION_ROLE,
  buildRestrictedDatabaseUrl,
} from './test-role-config';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Vitest globalSetup:
 * - creates or normalizes the restricted login role used by applicationClient
 * - validates that the role does not have SUPERUSER or BYPASSRLS
 */
export async function setup() {
  const adminClient = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } },
  });

  try {
    await adminClient.$connect();

    await adminClient.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TEST_APPLICATION_ROLE}') THEN
          CREATE ROLE ${TEST_APPLICATION_ROLE}
            WITH LOGIN
            PASSWORD '${TEST_APPLICATION_PASSWORD}'
            NOSUPERUSER
            NOBYPASSRLS
            NOINHERIT;
        ELSE
          ALTER ROLE ${TEST_APPLICATION_ROLE}
            WITH LOGIN
            PASSWORD '${TEST_APPLICATION_PASSWORD}'
            NOSUPERUSER
            NOBYPASSRLS
            NOINHERIT;
        END IF;
      END
      $$;
    `);

    const [{ current_database: currentDatabase }] = await adminClient.$queryRawUnsafe<Array<{ current_database: string }>>(
      'SELECT current_database()'
    );

    await adminClient.$executeRawUnsafe(`GRANT CONNECT ON DATABASE "${currentDatabase}" TO ${TEST_APPLICATION_ROLE};`);
    await adminClient.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${TEST_APPLICATION_ROLE};`);
    await adminClient.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${TEST_APPLICATION_ROLE};`
    );
    await adminClient.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${TEST_APPLICATION_ROLE};`);

    const roleCheck = await adminClient.$queryRawUnsafe<Array<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcanlogin: boolean;
    }>>(
      `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = '${TEST_APPLICATION_ROLE}'`
    );

    if (!roleCheck.length) {
      throw new Error(`[FATAL] Role ${TEST_APPLICATION_ROLE} was not created.`);
    }

    const { rolsuper, rolbypassrls, rolcanlogin } = roleCheck[0];
    if (rolsuper || rolbypassrls || !rolcanlogin) {
      throw new Error(
        `[FATAL] Role ${TEST_APPLICATION_ROLE} is misconfigured: rolsuper=${rolsuper}, rolbypassrls=${rolbypassrls}, rolcanlogin=${rolcanlogin}`
      );
    }

    console.log(
      `[globalSetup] ${TEST_APPLICATION_ROLE} validated: LOGIN + NOSUPERUSER + NOBYPASSRLS`
    );

    // Keep the runtime clients deterministic during tests even if .env still
    // carries an older password for the restricted role.
    process.env.DATABASE_URL = buildRestrictedDatabaseUrl(
      process.env.DIRECT_URL ?? process.env.DATABASE_URL
    );
  } finally {
    await adminClient.$disconnect();
  }
}

export async function teardown() {
  // Intentionally kept as a no-op so repeated runs can reuse the same role.
}
