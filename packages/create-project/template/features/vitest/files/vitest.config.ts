import { defineConfig } from 'vitest/config';

function threshold(name: string, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured >= 0 ? configured : fallback;
}

export default defineConfig({
  test: {
    coverage: {
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      ...(process.env.COVERAGE_THRESHOLDS === 'off'
        ? {}
        : {
            thresholds: {
              branches: threshold('COVERAGE_BRANCHES', 75),
              functions: threshold('COVERAGE_FUNCTIONS', 80),
              lines: threshold('COVERAGE_LINES', 80),
              statements: threshold('COVERAGE_STATEMENTS', 80),
            },
          }),
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/test/integration/**',
      '**/e2e/**',
    ],
    include: ['**/src/**/*.test.ts', '**/test/unit/**/*.test.ts'],
  },
});
