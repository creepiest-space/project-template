import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    include: ['**/test/integration/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
