import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    globalSetup: ['./src/test/setup-test-role.ts'],
    testTimeout: 15000,
  },
});
