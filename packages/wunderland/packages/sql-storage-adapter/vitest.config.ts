import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/shims.d.ts',
        'node_modules/**',
        // Electron adapters require native bindings (better-sqlite3)
        'src/adapters/electron/**'
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    },
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      // Tests requiring better-sqlite3 native bindings (skipped in CI)
      'tests/dataExport.spec.ts',
      'tests/dataImport.spec.ts',
      'tests/migration.spec.ts',
      'tests/betterSqliteAdapter.spec.ts'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});