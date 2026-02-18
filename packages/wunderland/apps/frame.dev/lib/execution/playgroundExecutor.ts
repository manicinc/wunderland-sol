/**
 * External playground executor for Go and Rust
 * Uses official playground APIs with graceful offline degradation
 * @module execution/playgroundExecutor
 */

import type { ExecutionResult } from './types'

/**
 * Playground API endpoints
 */
const PLAYGROUND_URLS = {
  go: 'https://go.dev/_/compile',
  rust: 'https://play.rust-lang.org/execute',
} as const

/**
 * Go playground response format
 */
interface GoPlaygroundResponse {
  Errors?: string
  Events?: Array<{
    Message: string
    Kind: 'stdout' | 'stderr'
    Delay?: number
  }>
  Status?: number
  IsTest?: boolean
  TestsFailed?: number
}

/**
 * Rust playground response format
 */
interface RustPlaygroundResponse {
  success: boolean
  stdout: string
  stderr: string
}

/**
 * Check if external playgrounds are reachable
 * Uses a simple HEAD request with short timeout
 */
export async function checkPlaygroundConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    // Try Go playground as canary
    const response = await fetch('https://go.dev/', {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors', // Avoid CORS issues for connectivity check
    })

    clearTimeout(timeoutId)
    return true
  } catch {
    return false
  }
}

/**
 * Execute Go code via go.dev playground
 */
export async function executeGo(
  code: string,
  timeout: number = 60000
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(PLAYGROUND_URLS.go, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        version: '2',
        body: code,
        withVet: 'true',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Playground returned ${response.status}`)
    }

    const result: GoPlaygroundResponse = await response.json()
    const duration = performance.now() - startTime

    // Check for compilation errors
    if (result.Errors) {
      return {
        success: false,
        output: [],
        error: result.Errors,
        duration,
        language: 'go',
      }
    }

    // Extract output from events
    const output = (result.Events || [])
      .filter((e) => e.Kind === 'stdout')
      .map((e) => e.Message)

    const stderr = (result.Events || [])
      .filter((e) => e.Kind === 'stderr')
      .map((e) => e.Message)
      .join('\n')

    return {
      success: true,
      output,
      error: stderr || undefined,
      duration,
      language: 'go',
    }
  } catch (error) {
    const duration = performance.now() - startTime

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        output: [],
        error: `Execution timeout (${timeout / 1000}s)`,
        duration: timeout,
        language: 'go',
        offline: false,
      }
    }

    return {
      success: false,
      output: [],
      error: 'Go Playground unavailable - check internet connection',
      duration,
      language: 'go',
      offline: true,
    }
  }
}

/**
 * Execute Rust code via play.rust-lang.org
 */
export async function executeRust(
  code: string,
  timeout: number = 60000
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(PLAYGROUND_URLS.rust, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'stable',
        mode: 'debug',
        edition: '2021',
        crateType: 'bin',
        tests: false,
        code,
        backtrace: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Playground returned ${response.status}`)
    }

    const result: RustPlaygroundResponse = await response.json()
    const duration = performance.now() - startTime

    // Parse output
    const output = result.stdout
      .split('\n')
      .filter((line) => line.trim())

    const stderr = result.stderr?.trim()

    return {
      success: result.success,
      output,
      error: stderr || undefined,
      duration,
      language: 'rust',
    }
  } catch (error) {
    const duration = performance.now() - startTime

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        output: [],
        error: `Execution timeout (${timeout / 1000}s)`,
        duration: timeout,
        language: 'rust',
        offline: false,
      }
    }

    return {
      success: false,
      output: [],
      error: 'Rust Playground unavailable - check internet connection',
      duration,
      language: 'rust',
      offline: true,
    }
  }
}

/**
 * Execute code via external playground
 */
export async function executeViaPlayground(
  code: string,
  language: 'go' | 'rust',
  timeout?: number
): Promise<ExecutionResult> {
  switch (language) {
    case 'go':
      return executeGo(code, timeout)
    case 'rust':
      return executeRust(code, timeout)
    default:
      return {
        success: false,
        output: [],
        error: `Unsupported playground language: ${language}`,
        language,
      }
  }
}
