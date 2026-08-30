import { defineConfig } from 'vitest/config';

function threshold(name: string, fallback: number): number | undefined {
  if (process.env.COVERAGE_THRESHOLDS === 'off') return undefined;
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured >= 0 ? configured : fallback;
}

export default defineConfig({
  test: {
    coverage: {
      branches: threshold('COVERAGE_BRANCHES', 75),
      functions: threshold('COVERAGE_FUNCTIONS', 80),
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      lines: threshold('COVERAGE_LINES', 80),
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: threshold('COVERAGE_STATEMENTS', 80),
    },
    exclude: ['**/test/integration/**', '**/e2e/**'],
    include: ['**/src/**/*.test.ts', '**/test/unit/**/*.test.ts'],
  },
});
