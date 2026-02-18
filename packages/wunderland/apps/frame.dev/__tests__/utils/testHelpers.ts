/**
 * Test Helpers
 * @description Utility functions for testing async operations and common patterns
 */

import { vi } from 'vitest'

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true, with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await sleep(interval)
  }

  throw new Error(`waitFor timed out after ${timeout}ms`)
}

/**
 * Wait for all promises to settle (resolve or reject)
 */
export async function waitForAll<T>(
  promises: Promise<T>[]
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(promises)
}

/**
 * Create a deferred promise for testing async flows
 */
export function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

/**
 * Mock fetch with a response
 */
export function mockFetch(response: unknown, options?: { status?: number; ok?: boolean }) {
  const { status = 200, ok = true } = options || {}

  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Headers(),
    clone: vi.fn().mockReturnThis(),
  })
}

/**
 * Mock fetch with an error
 */
export function mockFetchError(error: Error) {
  return vi.fn().mockRejectedValue(error)
}

/**
 * Create a mock function that resolves after a delay
 */
export function createDelayedMock<T>(value: T, delay: number) {
  return vi.fn().mockImplementation(async () => {
    await sleep(delay)
    return value
  })
}

/**
 * Flush all pending promises and timers
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Run all pending timers and flush promises
 */
export async function runAllTimers(): Promise<void> {
  vi.runAllTimers()
  await flushPromises()
}

/**
 * Advance timers by a specified amount and flush promises
 */
export async function advanceTimersBy(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms)
  await flushPromises()
}

/**
 * Create a spy that tracks all calls
 */
export function createCallTracker<T extends (...args: unknown[]) => unknown>() {
  const calls: Parameters<T>[] = []
  const fn = vi.fn((...args: Parameters<T>) => {
    calls.push(args)
  }) as unknown as T

  return {
    fn,
    calls,
    lastCall: () => calls[calls.length - 1],
    callCount: () => calls.length,
    reset: () => {
      calls.length = 0
      vi.mocked(fn).mockClear()
    },
  }
}

/**
 * Assert that a function was called with specific arguments
 */
export function expectCalledWith<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ...args: Parameters<T>
): void {
  expect(fn).toHaveBeenCalledWith(...args)
}

/**
 * Assert that a function was called a specific number of times
 */
export function expectCallCount<T extends (...args: unknown[]) => unknown>(
  fn: T,
  count: number
): void {
  expect(fn).toHaveBeenCalledTimes(count)
}
