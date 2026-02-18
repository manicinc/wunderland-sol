/**
 * Summarization Hook
 * @module lib/summarization/hooks/useSummarization
 *
 * React hook for managing summarization with streaming state.
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type {
  SummarizationRequest,
  SummarizationProgress,
  SummarizationResult,
  SummarizationSource,
  SummaryType,
  SummaryLength,
} from '../types'
import { summarize } from '../summarizer'

// ============================================================================
// TYPES
// ============================================================================

export interface UseSummarizationState {
  /** Current status */
  status: 'idle' | 'summarizing' | 'complete' | 'error'
  /** Current/final content */
  content: string
  /** Progress percentage (0-100) */
  progress: number
  /** Provider being used */
  provider: string | null
  /** Error message if any */
  error: string | null
  /** Whether the operation is cancellable */
  canCancel: boolean
}

export interface UseSummarizationActions {
  /** Start summarization */
  summarize: (request: SummarizationRequest) => Promise<void>
  /** Start quick summarization with defaults */
  summarizeQuick: (
    sources: SummarizationSource[],
    type?: SummaryType,
    length?: SummaryLength
  ) => Promise<void>
  /** Cancel ongoing summarization */
  cancel: () => void
  /** Reset to idle state */
  reset: () => void
}

export type UseSummarizationResult = UseSummarizationState & UseSummarizationActions

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing summarization with streaming
 */
export function useSummarization(): UseSummarizationResult {
  const [state, setState] = useState<UseSummarizationState>({
    status: 'idle',
    content: '',
    progress: 0,
    provider: null,
    error: null,
    canCancel: false,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Cancel ongoing summarization
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setState(prev => ({
        ...prev,
        status: 'idle',
        canCancel: false,
        error: 'Cancelled',
      }))
    }
  }, [])

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    cancel()
    setState({
      status: 'idle',
      content: '',
      progress: 0,
      provider: null,
      error: null,
      canCancel: false,
    })
  }, [cancel])

  /**
   * Start summarization
   */
  const doSummarize = useCallback(async (request: SummarizationRequest) => {
    // Cancel any existing operation
    cancel()

    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Reset state
    setState({
      status: 'summarizing',
      content: '',
      progress: 0,
      provider: null,
      error: null,
      canCancel: true,
    })

    try {
      const requestWithSignal: SummarizationRequest = {
        ...request,
        signal: abortController.signal,
      }

      for await (const progress of summarize(requestWithSignal)) {
        // Check if cancelled
        if (abortController.signal.aborted) break

        // Update state based on progress
        switch (progress.status) {
          case 'initializing':
          case 'fetching':
          case 'summarizing':
            setState(prev => ({
              ...prev,
              status: 'summarizing',
              content: progress.content,
              progress: progress.progress || prev.progress,
              provider: progress.provider || prev.provider,
            }))
            break

          case 'complete':
            setState({
              status: 'complete',
              content: progress.content,
              progress: 100,
              provider: progress.provider || null,
              error: null,
              canCancel: false,
            })
            break

          case 'error':
            setState({
              status: 'error',
              content: progress.content,
              progress: 0,
              provider: progress.provider || null,
              error: progress.error || 'Unknown error',
              canCancel: false,
            })
            break
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Already handled in cancel()
        return
      }

      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Summarization failed',
        canCancel: false,
      }))
    } finally {
      abortControllerRef.current = null
    }
  }, [cancel])

  /**
   * Quick summarization with defaults
   */
  const summarizeQuick = useCallback(async (
    sources: SummarizationSource[],
    type: SummaryType = 'digest',
    length: SummaryLength = 'standard'
  ) => {
    await doSummarize({
      sources,
      type,
      length,
    })
  }, [doSummarize])

  return {
    ...state,
    summarize: doSummarize,
    summarizeQuick,
    cancel,
    reset,
  }
}

/**
 * Simplified hook for quick summarization
 */
export function useQuickSummarize() {
  const {
    status,
    content,
    progress,
    error,
    summarizeQuick,
    cancel,
    reset,
  } = useSummarization()

  return {
    isSummarizing: status === 'summarizing',
    isComplete: status === 'complete',
    isError: status === 'error',
    summary: content,
    progress,
    error,
    summarize: summarizeQuick,
    cancel,
    reset,
  }
}
