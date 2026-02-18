/**
 * React Hook for LLM Streaming
 *
 * Provides a simple hook for streaming LLM responses with:
 * - Automatic SSE parsing
 * - State management (text, loading, error)
 * - Abort controller support
 * - Usage tracking
 *
 * @module lib/llm/useStream
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import {
  type StreamChunk,
  type StreamState,
  createStreamState,
  reduceStreamChunk,
  parseSSEStream,
  streamLLM,
} from './streaming'
import type { LLMProvider } from './index'
import { getAPIKey, getBestAvailableProvider, type APIProvider } from '../config/apiKeyStorage'

/* ═══════════════════════════════════════════════════════════════════════════
   STATIC EXPORT DETECTION
═══════════════════════════════════════════════════════════════════════════ */

// Detect if we're in static export mode (defined at build time by webpack)
// In static mode, API routes don't exist, so we must call provider APIs directly
declare const __IS_STATIC_EXPORT__: boolean | undefined
const isStaticExport = typeof __IS_STATIC_EXPORT__ !== 'undefined' && __IS_STATIC_EXPORT__

// Default models for each provider
const DEFAULT_MODELS: Record<APIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20240307',
  openrouter: 'anthropic/claude-3-haiku',
  mistral: 'mistral-small-latest',
  ollama: 'llama3.2',
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseStreamOptions {
  /** LLM provider */
  provider?: LLMProvider
  /** Model to use */
  model?: string
  /** System prompt */
  system?: string
  /** Max tokens */
  maxTokens?: number
  /** Temperature */
  temperature?: number
  /** API endpoint (default: /api/generate/stream) */
  endpoint?: string
  /** Called on each text chunk */
  onChunk?: (chunk: string, fullText: string) => void
  /** Called when streaming completes */
  onComplete?: (text: string, usage?: StreamChunk['usage']) => void
  /** Called on error */
  onError?: (error: string) => void
}

export interface UseStreamResult {
  /** Current accumulated text */
  text: string
  /** Whether currently streaming */
  isStreaming: boolean
  /** Error message if any */
  error: string | null
  /** Token usage stats */
  usage: StreamChunk['usage'] | null
  /** Start streaming with messages */
  stream: (messages: Array<{ role: string; content: string }>) => Promise<string>
  /** Abort current stream */
  abort: () => void
  /** Reset state */
  reset: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for streaming LLM responses
 *
 * @example
 * ```tsx
 * function Chat() {
 *   const { text, isStreaming, stream, abort } = useStream({
 *     system: 'You are a helpful assistant.',
 *     onComplete: (text) => console.log('Done:', text),
 *   })
 *
 *   const handleSend = async () => {
 *     await stream([{ role: 'user', content: 'Hello!' }])
 *   }
 *
 *   return (
 *     <div>
 *       <div>{text}</div>
 *       {isStreaming && <button onClick={abort}>Stop</button>}
 *       <button onClick={handleSend} disabled={isStreaming}>Send</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useStream(options: UseStreamOptions = {}): UseStreamResult {
  const {
    provider,
    model,
    system,
    maxTokens,
    temperature,
    endpoint = '/api/generate/stream',
    onChunk,
    onComplete,
    onError,
  } = options

  const [state, setState] = useState<StreamState>(createStreamState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    setState(createStreamState())
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setState((prev) => ({ ...prev, isStreaming: false }))
  }, [])

  const stream = useCallback(
    async (messages: Array<{ role: string; content: string }>): Promise<string> => {
      // Reset state
      setState({ text: '', isStreaming: true, error: null, usage: null })

      // Create abort controller
      abortControllerRef.current = new AbortController()

      try {
        let fullText = ''
        let finalUsage: StreamChunk['usage'] | null = null

        // In static export mode, use direct provider API calls (no API routes exist)
        if (isStaticExport) {
          // Get the best available provider
          const selectedProvider = provider || await getBestAvailableProvider()
          if (!selectedProvider) {
            throw new Error('No API key configured. Please add your API key in Settings.')
          }

          // Get the API key for the selected provider
          const keyConfig = await getAPIKey(selectedProvider as APIProvider)
          if (!keyConfig?.key && selectedProvider !== 'ollama') {
            throw new Error(`No API key found for ${selectedProvider}. Please configure it in Settings.`)
          }

          // Use the direct streaming implementation
          const selectedModel = model || DEFAULT_MODELS[selectedProvider as APIProvider]

          for await (const chunk of streamLLM({
            provider: selectedProvider as LLMProvider,
            apiKey: keyConfig?.key || '',
            baseUrl: keyConfig?.baseUrl,
            model: selectedModel,
            messages,
            system,
            maxTokens: maxTokens || 1024,
            temperature: temperature || 0.7,
            signal: abortControllerRef.current.signal,
          })) {
            setState((prev) => reduceStreamChunk(prev, chunk))

            if (chunk.type === 'text' && chunk.content) {
              fullText += chunk.content
              onChunk?.(chunk.content, fullText)
            }

            if (chunk.type === 'usage' && chunk.usage) {
              finalUsage = chunk.usage
            }

            if (chunk.type === 'error' && chunk.error) {
              onError?.(chunk.error)
              throw new Error(chunk.error)
            }
          }
        } else {
          // In non-static mode, use the API route
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages,
              provider,
              model,
              system,
              maxTokens,
              temperature,
            }),
            signal: abortControllerRef.current.signal,
          })

          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
          }

          // Parse SSE stream
          for await (const chunk of parseSSEStream(response)) {
            setState((prev) => reduceStreamChunk(prev, chunk))

            if (chunk.type === 'text' && chunk.content) {
              fullText += chunk.content
              onChunk?.(chunk.content, fullText)
            }

            if (chunk.type === 'usage' && chunk.usage) {
              finalUsage = chunk.usage
            }

            if (chunk.type === 'error' && chunk.error) {
              onError?.(chunk.error)
              throw new Error(chunk.error)
            }
          }
        }

        onComplete?.(fullText, finalUsage ?? undefined)
        return fullText
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // User aborted - not an error
          return state.text
        }

        const message = error instanceof Error ? error.message : 'Stream failed'
        setState((prev) => ({ ...prev, error: message, isStreaming: false }))
        onError?.(message)
        throw error
      } finally {
        abortControllerRef.current = null
      }
    },
    [endpoint, provider, model, system, maxTokens, temperature, onChunk, onComplete, onError]
  )

  return {
    text: state.text,
    isStreaming: state.isStreaming,
    error: state.error,
    usage: state.usage,
    stream,
    abort,
    reset,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMPLE STREAM FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Simple streaming function for non-React contexts
 *
 * @example
 * ```typescript
 * for await (const chunk of streamChat([
 *   { role: 'user', content: 'Hello!' }
 * ])) {
 *   process.stdout.write(chunk.content || '')
 * }
 * ```
 */
export async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  options: Omit<UseStreamOptions, 'onChunk' | 'onComplete' | 'onError'> = {}
): AsyncGenerator<StreamChunk> {
  const {
    provider,
    model,
    system,
    maxTokens,
    temperature,
    endpoint = '/api/generate/stream',
  } = options

  // In static export mode, use direct provider API calls
  if (isStaticExport) {
    const selectedProvider = provider || await getBestAvailableProvider()
    if (!selectedProvider) {
      yield { type: 'error', error: 'No API key configured. Please add your API key in Settings.' }
      return
    }

    const keyConfig = await getAPIKey(selectedProvider as APIProvider)
    if (!keyConfig?.key && selectedProvider !== 'ollama') {
      yield { type: 'error', error: `No API key found for ${selectedProvider}. Please configure it in Settings.` }
      return
    }

    const selectedModel = model || DEFAULT_MODELS[selectedProvider as APIProvider]

    yield* streamLLM({
      provider: selectedProvider as LLMProvider,
      apiKey: keyConfig?.key || '',
      baseUrl: keyConfig?.baseUrl,
      model: selectedModel,
      messages,
      system,
      maxTokens: maxTokens || 1024,
      temperature: temperature || 0.7,
    })
    return
  }

  // In non-static mode, use the API route
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      provider,
      model,
      system,
      maxTokens,
      temperature,
    }),
  })

  if (!response.ok) {
    yield { type: 'error', error: `HTTP error: ${response.status}` }
    return
  }

  yield* parseSSEStream(response)
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default useStream
