/**
 * Code execution module
 * Unified interface for executing code in multiple languages
 * @module execution
 */

export * from './types'
export * from './jsExecutor'
export * from './backendExecutor'
export * from './playgroundExecutor'
export * from './capabilities'
export * from './outputPersistence'

import type { ExecutionResult, ExecutionLanguage } from './types'
import { normalizeLanguage, EXECUTION_TIMEOUTS } from './types'
import { executeJavaScript, executeTypeScript } from './jsExecutor'
import { executePython, executeBash } from './backendExecutor'
import { executeGo, executeRust } from './playgroundExecutor'

/**
 * Execute code in the specified language
 * Automatically routes to the appropriate executor
 */
export async function executeCode(
  code: string,
  language: string,
  timeout?: number
): Promise<ExecutionResult> {
  const normalizedLang = normalizeLanguage(language)

  if (!normalizedLang) {
    return {
      success: false,
      output: [],
      error: `Unsupported language: ${language}`,
    }
  }

  const execTimeout = timeout ?? EXECUTION_TIMEOUTS[normalizedLang]

  switch (normalizedLang) {
    case 'javascript':
      return executeJavaScript(code, execTimeout)

    case 'typescript':
      return executeTypeScript(code, execTimeout)

    case 'python':
      return executePython(code, execTimeout)

    case 'bash':
      return executeBash(code, execTimeout)

    case 'go':
      return executeGo(code, execTimeout)

    case 'rust':
      return executeRust(code, execTimeout)

    default:
      return {
        success: false,
        output: [],
        error: `No executor for language: ${normalizedLang}`,
        language: normalizedLang,
      }
  }
}
