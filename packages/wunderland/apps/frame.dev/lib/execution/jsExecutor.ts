/**
 * JavaScript/TypeScript executor using Web Workers
 * Provides sandboxed code execution with timeout protection
 * @module execution/jsExecutor
 */

import type { ExecutionResult, LogEntry } from './types'

/** Pending esbuild initialization */
let esbuildInitPromise: Promise<void> | null = null
let esbuildReady = false

/**
 * Get the correct WASM URL based on current domain
 * quarry.space has routing issues with static assets, so use frame.dev as fallback
 */
function getEsbuildWasmUrl(): string {
  if (typeof window === 'undefined') return '/esbuild.wasm'
  
  const hostname = window.location.hostname
  
  // quarry.space has Cloudflare routing that breaks static asset paths
  // Use absolute URL to frame.dev which serves files correctly
  if (hostname === 'quarry.space' || hostname.endsWith('.quarry.space')) {
    return 'https://frame.dev/esbuild.wasm'
  }
  
  // For frame.dev, localhost, and other domains, use relative path
  return '/esbuild.wasm'
}

/**
 * Initialize esbuild-wasm for TypeScript transpilation
 * Lazy-loaded on first TypeScript execution
 */
async function initEsbuild(): Promise<void> {
  if (esbuildReady) return
  if (esbuildInitPromise) return esbuildInitPromise

  esbuildInitPromise = (async () => {
    try {
      const esbuild = await import('esbuild-wasm')
      const wasmURL = getEsbuildWasmUrl()
      console.log('[esbuild] Initializing with WASM URL:', wasmURL)
      await esbuild.initialize({
        wasmURL,
      })
      esbuildReady = true
      console.log('[esbuild] Initialized successfully')
    } catch (error) {
      console.error('Failed to initialize esbuild:', error)
      throw new Error('TypeScript transpilation unavailable')
    }
  })()

  return esbuildInitPromise
}

/**
 * Transpile TypeScript to JavaScript
 */
export async function transpileTypeScript(code: string): Promise<string> {
  await initEsbuild()
  const esbuild = await import('esbuild-wasm')

  const result = await esbuild.transform(code, {
    loader: 'ts',
    target: 'es2020',
    format: 'iife',
  })

  return result.code
}

/**
 * Create a sandboxed Web Worker for code execution
 */
function createExecutionWorker(jsCode: string): Worker {
  const workerCode = `
    // Sandboxed console
    const __logs = [];
    const __startTime = performance.now();

    const console = {
      log: (...args) => {
        __logs.push({
          type: 'log',
          data: args.map(a => {
            try {
              return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
            } catch { return String(a) }
          }).join(' '),
          timestamp: performance.now() - __startTime
        });
      },
      error: (...args) => {
        __logs.push({
          type: 'error',
          data: args.map(a => String(a)).join(' '),
          timestamp: performance.now() - __startTime
        });
      },
      warn: (...args) => {
        __logs.push({
          type: 'warn',
          data: args.map(a => String(a)).join(' '),
          timestamp: performance.now() - __startTime
        });
      },
      info: (...args) => {
        __logs.push({
          type: 'info',
          data: args.map(a => String(a)).join(' '),
          timestamp: performance.now() - __startTime
        });
      },
      // No-ops for unsupported methods
      clear: () => {},
      table: (data) => console.log(data),
      group: () => {},
      groupEnd: () => {},
      time: () => {},
      timeEnd: () => {},
    };

    // Block dangerous globals
    const fetch = undefined;
    const XMLHttpRequest = undefined;
    const WebSocket = undefined;
    const importScripts = undefined;

    try {
      // Execute user code
      ${jsCode}

      // Send success result
      postMessage({
        success: true,
        logs: __logs,
        duration: performance.now() - __startTime
      });
    } catch (e) {
      // Send error result
      postMessage({
        success: false,
        logs: __logs,
        error: e.name + ': ' + e.message,
        stack: e.stack,
        duration: performance.now() - __startTime
      });
    }
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  return new Worker(URL.createObjectURL(blob))
}

/**
 * Execute JavaScript code in a sandboxed Web Worker
 */
export async function executeJavaScript(
  code: string,
  timeout: number = 10000
): Promise<ExecutionResult> {
  const startTime = performance.now()

  return new Promise((resolve) => {
    let worker: Worker | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (worker) worker.terminate()
    }

    try {
      worker = createExecutionWorker(code)

      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup()
        resolve({
          success: false,
          output: [],
          error: `Execution timeout (${timeout / 1000}s)`,
          duration: timeout,
          language: 'javascript',
        })
      }, timeout)

      // Handle worker messages
      worker.onmessage = (event) => {
        cleanup()
        const { success, logs, error, duration } = event.data as {
          success: boolean
          logs: LogEntry[]
          error?: string
          duration: number
        }

        resolve({
          success,
          output: logs.map((l) => l.data),
          error,
          duration: duration || (performance.now() - startTime),
          language: 'javascript',
        })
      }

      // Handle worker errors
      worker.onerror = (error) => {
        cleanup()
        resolve({
          success: false,
          output: [],
          error: `Worker error: ${error.message}`,
          duration: performance.now() - startTime,
          language: 'javascript',
        })
      }
    } catch (error) {
      cleanup()
      resolve({
        success: false,
        output: [],
        error: `Failed to create worker: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - startTime,
        language: 'javascript',
      })
    }
  })
}

/**
 * Execute TypeScript code (transpile then execute)
 */
export async function executeTypeScript(
  code: string,
  timeout: number = 15000
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    // Transpile TypeScript to JavaScript
    const jsCode = await transpileTypeScript(code)

    // Execute the transpiled code (with reduced timeout for transpilation time)
    const transpileTime = performance.now() - startTime
    const execTimeout = Math.max(timeout - transpileTime, 5000)

    const result = await executeJavaScript(jsCode, execTimeout)

    return {
      ...result,
      language: 'typescript',
      duration: performance.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      output: [],
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startTime,
      language: 'typescript',
    }
  }
}

/**
 * Check if esbuild is available for TypeScript
 */
export function isTypeScriptAvailable(): boolean {
  return typeof window !== 'undefined' && 'Worker' in window
}

/**
 * Check if JavaScript execution is available
 */
export function isJavaScriptAvailable(): boolean {
  return typeof window !== 'undefined' && 'Worker' in window
}
