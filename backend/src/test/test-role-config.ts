export const TEST_APPLICATION_ROLE = 'wsp_test_user';
export const TEST_APPLICATION_PASSWORD = 'wsp_test_password';

export function buildRestrictedDatabaseUrl(databaseUrl?: string): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to derive the restricted test connection.');
  }

  const parsedUrl = new URL(databaseUrl);
  parsedUrl.username = TEST_APPLICATION_ROLE;
  parsedUrl.password = TEST_APPLICATION_PASSWORD;
  return parsedUrl.toString();
}
