import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      '__tests__/unit/**/*.test.{ts,tsx}',
      '__tests__/integration/**/*.test.{ts,tsx}',
      // Legacy tests
      '__tests__/api/**/*.test.ts',
    ],
    exclude: ['node_modules', '.next', '__tests__/components/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['node_modules', '.next', '**/__tests__/**', '**/*.d.ts'],
    },
    setupFiles: ['__tests__/setup/unitSetup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})














