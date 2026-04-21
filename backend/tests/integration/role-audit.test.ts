import { describe, expect, it } from 'vitest';
import {
  applicationClient,
  applicationDatabaseUrl,
  managementClient,
} from '../../src/test/prisma-test-clients';
import { TEST_APPLICATION_ROLE } from '../../src/test/test-role-config';

describe('[AUDIT] Role Security', () => {
  it('restricted test role exists and does not have elevated privileges', async () => {
    const result = await managementClient.$queryRawUnsafe<Array<{
      rolname: string;
      rolsuper: boolean;
      rolbypassrls: boolean;
      rolcanlogin: boolean;
    }>>(
      `SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = '${TEST_APPLICATION_ROLE}'`
    );

    expect(result).toHaveLength(1);
    expect(result[0].rolsuper).toBe(false);
    expect(result[0].rolbypassrls).toBe(false);
    expect(result[0].rolcanlogin).toBe(true);
  });

  it('managementClient and applicationClient run under different database users', async () => {
    const [managementRuntime] = await managementClient.$queryRawUnsafe<Array<{
      current_user: string;
      session_user: string;
    }>>('SELECT current_user, session_user');

    const [applicationRuntime] = await applicationClient.$queryRawUnsafe<Array<{
      current_user: string;
      session_user: string;
    }>>('SELECT current_user, session_user');

    expect(applicationRuntime.current_user).toBe(TEST_APPLICATION_ROLE);
    expect(applicationRuntime.session_user).toBe(TEST_APPLICATION_ROLE);
    expect(managementRuntime.current_user).not.toBe(applicationRuntime.current_user);
  });

  it('documents the derived restricted connection instead of silently reusing DATABASE_URL', () => {
    expect(applicationDatabaseUrl).toContain(`${TEST_APPLICATION_ROLE}:`);
  });
});
