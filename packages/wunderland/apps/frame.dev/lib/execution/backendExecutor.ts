/**
 * Backend executor for Python and Bash
 * Calls the backend API for server-side code execution
 * @module execution/backendExecutor
 */

import type { ExecutionResult, ExecutionLanguage } from './types'

/**
 * Backend execution API endpoint
 */
const EXECUTE_API = '/api/execute'

/**
 * Backend execution request
 */
interface ExecuteRequest {
  code: string
  timeout?: number
}

/**
 * Backend execution response
 */
interface ExecuteResponse {
  success: boolean
  output: string[]
  error?: string
  duration: number
  exitCode?: number
}

/**
 * Execute code via backend API
 */
async function executeViaBackend(
  code: string,
  language: 'python' | 'bash',
  timeout: number = 30000
): Promise<ExecutionResult> {
  const startTime = performance.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout + 5000) // Extra 5s for network

    const response = await fetch(`${EXECUTE_API}/${language}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        timeout,
      } as ExecuteRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status === 503) {
        return {
          success: false,
          output: [],
          error: errorData.error || `${language} execution is disabled on this server`,
          duration: performance.now() - startTime,
          language,
          offline: true,
        }
      }

      return {
        success: false,
        output: [],
        error: errorData.error || `Server error: ${response.status}`,
        duration: performance.now() - startTime,
        language,
      }
    }

    const result: ExecuteResponse = await response.json()

    return {
      success: result.success,
      output: result.output,
      error: result.error,
      duration: result.duration,
      language,
      exitCode: result.exitCode,
    }
  } catch (error) {
    const duration = performance.now() - startTime

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        output: [],
        error: `Execution timeout (${timeout / 1000}s)`,
        duration: timeout,
        language,
      }
    }

    return {
      success: false,
      output: [],
      error: 'Backend unavailable - is the server running?',
      duration,
      language,
      offline: true,
    }
  }
}

/**
 * Execute Python code via backend
 */
export async function executePython(
  code: string,
  timeout: number = 30000
): Promise<ExecutionResult> {
  return executeViaBackend(code, 'python', timeout)
}

/**
 * Execute Bash code via backend
 */
export async function executeBash(
  code: string,
  timeout: number = 30000
): Promise<ExecutionResult> {
  return executeViaBackend(code, 'bash', timeout)
}

/**
 * Check if backend execution is available for a language
 */
export async function checkBackendAvailability(
  language: 'python' | 'bash'
): Promise<boolean> {
  try {
    const response = await fetch('/api/capabilities', {
      method: 'GET',
    })

    if (!response.ok) return false

    const caps = await response.json()
    return caps?.codeExecution?.[language] === true
  } catch {
    return false
  }
}
