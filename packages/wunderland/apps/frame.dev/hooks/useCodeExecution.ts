/**
 * Hook for managing code execution state
 * Provides execution, output management, and capability checking
 * @module hooks/useCodeExecution
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  ExecutionResult,
  ExecutionStatus,
  ExecutionLanguage,
  ExecutionCapabilities,
} from '@/lib/execution/types'
import { executeCode } from '@/lib/execution'
import { detectCapabilities, isLanguageAvailable } from '@/lib/execution/capabilities'
import { normalizeLanguage } from '@/lib/execution/types'

/**
 * Execution state for a code block
 */
export interface ExecutionState {
  /** Current status */
  status: ExecutionStatus
  /** Execution result (if completed) */
  result: ExecutionResult | null
  /** Whether execution is in progress */
  isRunning: boolean
  /** Whether the language is available */
  isAvailable: boolean
  /** Reason if unavailable */
  unavailableReason?: string
  /** Whether the service is offline */
  isOffline: boolean
}

/**
 * Hook return type
 */
export interface UseCodeExecutionReturn {
  /** Current execution state */
  state: ExecutionState
  /** Execute the code */
  execute: () => Promise<ExecutionResult>
  /** Clear the output */
  clear: () => void
  /** Execution capabilities */
  capabilities: ExecutionCapabilities | null
  /** Refresh capabilities */
  refreshCapabilities: () => Promise<void>
}

/**
 * Initial execution state
 */
const initialState: ExecutionState = {
  status: 'idle',
  result: null,
  isRunning: false,
  isAvailable: true,
  isOffline: false,
}

/**
 * Hook for managing code execution
 */
export function useCodeExecution(
  code: string,
  language: string,
  execId?: string
): UseCodeExecutionReturn {
  const [state, setState] = useState<ExecutionState>(initialState)
  const [capabilities, setCapabilities] = useState<ExecutionCapabilities | null>(null)

  const normalizedLang = normalizeLanguage(language)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load capabilities on mount and when language changes
  useEffect(() => {
    let mounted = true

    async function loadCapabilities() {
      const caps = await detectCapabilities()
      if (!mounted) return

      setCapabilities(caps)

      // Check availability for this language
      if (normalizedLang && caps[normalizedLang]) {
        const langCap = caps[normalizedLang]
        setState((prev) => ({
          ...prev,
          isAvailable: langCap.available,
          unavailableReason: langCap.reason,
          isOffline: langCap.offline ?? false,
        }))
      }
    }

    loadCapabilities()
    return () => {
      mounted = false
    }
  }, [normalizedLang])

  // Execute code
  const execute = useCallback(async (): Promise<ExecutionResult> => {
    if (!normalizedLang) {
      const result: ExecutionResult = {
        success: false,
        output: [],
        error: `Unsupported language: ${language}`,
      }
      setState((prev) => ({
        ...prev,
        status: 'error',
        result,
        isRunning: false,
      }))
      return result
    }

    // Check availability
    const availability = await isLanguageAvailable(normalizedLang)
    if (!availability.available && !availability.offline) {
      const result: ExecutionResult = {
        success: false,
        output: [],
        error: availability.reason || `${language} execution not available`,
        language: normalizedLang,
        offline: availability.offline,
      }
      setState((prev) => ({
        ...prev,
        status: 'error',
        result,
        isRunning: false,
        isAvailable: false,
        unavailableReason: availability.reason,
      }))
      return result
    }

    // Start execution
    setState((prev) => ({
      ...prev,
      status: 'running',
      isRunning: true,
    }))

    try {
      const result = await executeCode(code, language)

      // Update state based on result
      const status: ExecutionStatus = result.offline
        ? 'offline'
        : result.success
          ? 'success'
          : 'error'

      setState((prev) => ({
        ...prev,
        status,
        result,
        isRunning: false,
        isOffline: result.offline ?? false,
      }))

      return result
    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        output: [],
        error: error instanceof Error ? error.message : String(error),
        language: normalizedLang,
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        result,
        isRunning: false,
      }))

      return result
    }
  }, [code, language, normalizedLang])

  // Clear output
  const clear = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'idle',
      result: null,
    }))
  }, [])

  // Refresh capabilities
  const refreshCapabilities = useCallback(async () => {
    const caps = await detectCapabilities()
    setCapabilities(caps)

    if (normalizedLang && caps[normalizedLang]) {
      const langCap = caps[normalizedLang]
      setState((prev) => ({
        ...prev,
        isAvailable: langCap.available,
        unavailableReason: langCap.reason,
        isOffline: langCap.offline ?? false,
      }))
    }
  }, [normalizedLang])

  return {
    state,
    execute,
    clear,
    capabilities,
    refreshCapabilities,
  }
}

/**
 * Hook for checking overall execution availability
 */
export function useExecutionCapabilities() {
  const [capabilities, setCapabilities] = useState<ExecutionCapabilities | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      const caps = await detectCapabilities()
      if (mounted) {
        setCapabilities(caps)
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const caps = await detectCapabilities()
    setCapabilities(caps)
    setLoading(false)
  }, [])

  return { capabilities, loading, refresh }
}
