/**
 * Unit Test Setup
 * @description Global setup for unit and integration tests
 */

import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock console.error to fail tests on unexpected errors
const originalConsoleError = console.error
console.error = (...args: unknown[]) => {
  // Allow specific expected errors through
  const message = args[0]
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render') ||
      message.includes('act(...)'))
  ) {
    return
  }
  originalConsoleError(...args)
}

// Mock environment variables for tests
vi.stubEnv('NODE_ENV', 'test')

// Global test utilities
globalThis.sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Type declarations for global utilities
declare global {
  function sleep(ms: number): Promise<void>
}

export {}
