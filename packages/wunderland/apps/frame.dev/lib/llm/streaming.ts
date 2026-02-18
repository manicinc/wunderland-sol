/**
 * LLM Streaming Module
 *
 * Provides streaming support for LLM responses using:
 * - ReadableStream for modern browsers/Node.js
 * - Server-Sent Events (SSE) for real-time updates
 * - AsyncIterator for consumption
 *
 * @module lib/llm/streaming
 */

import type { LLMProvider } from './index'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface StreamChunk {
  type: 'text' | 'error' | 'done' | 'usage'
  content?: string
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface StreamOptions {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model: string
  messages: Array<{ role: string; content: string }>
  system?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

export type StreamCallback = (chunk: StreamChunk) => void

/* ═══════════════════════════════════════════════════════════════════════════
   STREAMING IMPLEMENTATIONS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Estimate token count from text content.
 * Uses rough approximation of ~4 characters per token for English text.
 * This is more accurate than counting chunks (which was the previous bug).
 * @internal Exported for testing
 */
export function estimateTokens(content: string): number {
  if (!content) return 0
  // Rough estimate: ~4 chars per token for English text
  // This is an approximation - actual tokenization varies by model
  return Math.ceil(content.length / 4)
}

/**
 * Stream from OpenAI API
 */
async function* streamOpenAI(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    yield { type: 'error', error: error.error?.message || 'OpenAI API error' }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            totalTokens += estimateTokens(content)
            yield { type: 'text', content }
          }

          // Check for finish reason
          if (data.choices?.[0]?.finish_reason) {
            yield {
              type: 'usage',
              usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: totalTokens,
                totalTokens: (data.usage?.prompt_tokens || 0) + totalTokens,
              },
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/**
 * Stream from Anthropic Claude API
 */
async function* streamAnthropic(options: StreamOptions): AsyncGenerator<StreamChunk> {
  // Filter out system messages for Anthropic format
  const anthropicMessages = options.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

  const response = await fetch(options.baseUrl || 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model,
      messages: anthropicMessages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      stream: true,
      ...(options.system && { system: options.system }),
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    yield { type: 'error', error: error.error?.message || 'Anthropic API error' }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let inputTokens = 0
  let outputTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Parse SSE event
        if (trimmed.startsWith('event: ')) {
          continue // Event type line, skip
        }

        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))

          // Handle different event types
          switch (data.type) {
            case 'message_start':
              inputTokens = data.message?.usage?.input_tokens || 0
              break

            case 'content_block_delta':
              if (data.delta?.text) {
                outputTokens += estimateTokens(data.delta.text)
                yield { type: 'text', content: data.delta.text }
              }
              break

            case 'message_delta':
              if (data.usage) {
                outputTokens = data.usage.output_tokens || outputTokens
              }
              break

            case 'message_stop':
              yield {
                type: 'usage',
                usage: {
                  promptTokens: inputTokens,
                  completionTokens: outputTokens,
                  totalTokens: inputTokens + outputTokens,
                },
              }
              break

            case 'error':
              yield { type: 'error', error: data.error?.message || 'Unknown error' }
              return
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/**
 * Stream from OpenRouter API (OpenAI-compatible)
 */
async function* streamOpenRouter(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://frame.dev',
      'X-Title': 'Quarry',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    yield { type: 'error', error: error.error?.message || 'OpenRouter API error' }
    return
  }

  // OpenRouter uses OpenAI-compatible streaming
  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            totalTokens += estimateTokens(content)
            yield { type: 'text', content }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield {
    type: 'usage',
    usage: {
      promptTokens: 0,
      completionTokens: totalTokens,
      totalTokens,
    },
  }
  yield { type: 'done' }
}

/**
 * Stream from Mistral API (OpenAI-compatible)
 */
async function* streamMistral(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const baseUrl = options.baseUrl || 'https://api.mistral.ai/v1/chat/completions'

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    yield { type: 'error', error: error.message || 'Mistral API error' }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let totalTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const content = data.choices?.[0]?.delta?.content
          if (content) {
            totalTokens += estimateTokens(content)
            yield { type: 'text', content }
          }

          // Check for finish reason
          if (data.choices?.[0]?.finish_reason) {
            yield {
              type: 'usage',
              usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: totalTokens,
                totalTokens: (data.usage?.prompt_tokens || 0) + totalTokens,
              },
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/**
 * Stream from Ollama API (local server with JSON lines format)
 */
async function* streamOllama(options: StreamOptions): AsyncGenerator<StreamChunk> {
  const baseUrl = options.baseUrl || 'http://localhost:11434'
  const endpoint = `${baseUrl}/api/chat`

  // Build Ollama-format messages
  const ollamaMessages = options.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  // Add system message if provided
  if (options.system) {
    ollamaMessages.unshift({
      role: 'system',
      content: options.system,
    })
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        num_predict: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    yield { type: 'error', error: error.error || 'Ollama API error' }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let promptTokens = 0
  let completionTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          // Ollama returns JSON objects, one per line
          const data = JSON.parse(trimmed)

          // Extract content from message
          if (data.message?.content) {
            completionTokens += estimateTokens(data.message.content)
            yield { type: 'text', content: data.message.content }
          }

          // Check for completion
          if (data.done) {
            // Ollama provides token counts in the final message
            if (data.prompt_eval_count !== undefined) {
              promptTokens = data.prompt_eval_count
            }
            if (data.eval_count !== undefined) {
              completionTokens = data.eval_count
            }

            yield {
              type: 'usage',
              usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
              },
            }
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN STREAM FUNCTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a streaming response from any provider
 */
export async function* streamLLM(options: StreamOptions): AsyncGenerator<StreamChunk> {
  switch (options.provider) {
    case 'openai':
      yield* streamOpenAI(options)
      break
    case 'anthropic':
      yield* streamAnthropic(options)
      break
    case 'openrouter':
      yield* streamOpenRouter(options)
      break
    case 'mistral':
      yield* streamMistral(options)
      break
    case 'ollama':
      yield* streamOllama(options)
      break
    default:
      yield { type: 'error', error: `Unknown provider: ${options.provider}` }
  }
}

/**
 * Stream with callback (easier to use in React)
 */
export async function streamWithCallback(
  options: StreamOptions,
  callback: StreamCallback
): Promise<{ text: string; usage: StreamChunk['usage'] }> {
  let fullText = ''
  let usage: StreamChunk['usage'] = undefined

  for await (const chunk of streamLLM(options)) {
    callback(chunk)

    if (chunk.type === 'text' && chunk.content) {
      fullText += chunk.content
    }
    if (chunk.type === 'usage') {
      usage = chunk.usage
    }
    if (chunk.type === 'error') {
      throw new Error(chunk.error)
    }
  }

  return { text: fullText, usage }
}

/**
 * Convert stream to ReadableStream (for Response objects)
 */
export function streamToReadable(options: StreamOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamLLM(options)) {
          // Format as SSE
          const data = JSON.stringify(chunk)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))

          if (chunk.type === 'done' || chunk.type === 'error') {
            controller.close()
            return
          }
        }
      } catch (error) {
        const errorChunk: StreamChunk = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
        controller.close()
      }
    },
  })
}

/* ═══════════════════════════════════════════════════════════════════════════
   SSE CLIENT HELPER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse SSE stream from a fetch response
 */
export async function* parseSSEStream(response: Response): AsyncGenerator<StreamChunk> {
  const reader = response.body?.getReader()
  if (!reader) {
    yield { type: 'error', error: 'No response body' }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const event of lines) {
        const dataLine = event
          .split('\n')
          .find((l) => l.startsWith('data: '))
        if (!dataLine) continue

        try {
          const chunk = JSON.parse(dataLine.slice(6)) as StreamChunk
          yield chunk

          if (chunk.type === 'done' || chunk.type === 'error') {
            return
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   REACT HOOK HELPER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * State for streaming hook
 */
export interface StreamState {
  text: string
  isStreaming: boolean
  error: string | null
  usage: StreamChunk['usage'] | null
}

/**
 * Create initial stream state
 */
export function createStreamState(): StreamState {
  return {
    text: '',
    isStreaming: false,
    error: null,
    usage: null,
  }
}

/**
 * Reduce stream chunk into state
 */
export function reduceStreamChunk(state: StreamState, chunk: StreamChunk): StreamState {
  switch (chunk.type) {
    case 'text':
      return { ...state, text: state.text + (chunk.content || ''), isStreaming: true }
    case 'error':
      return { ...state, error: chunk.error || 'Unknown error', isStreaming: false }
    case 'usage':
      return { ...state, usage: chunk.usage || null }
    case 'done':
      return { ...state, isStreaming: false }
    default:
      return state
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  streamLLM,
  streamWithCallback,
  streamToReadable,
  parseSSEStream,
  createStreamState,
  reduceStreamChunk,
}
