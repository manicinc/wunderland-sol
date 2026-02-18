import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'scripts/',
        'templates/',
        '**/*.config.ts',
        '**/*.spec.ts',
        '**/*.test.ts'
      ],
      include: [
        'src/**/*.ts'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 50
      }
    },
    include: ['test/**/*.spec.ts', 'registry/**/test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 15000,
    passWithNoTests: true
  },
  resolve: {
    alias: {
      '@framers/agentos': path.resolve(__dirname, '../../packages/agentos/src')
    }
  }
});
