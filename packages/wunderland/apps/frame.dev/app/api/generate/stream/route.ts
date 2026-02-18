/**
 * Streaming LLM Generation API
 * @module api/generate/stream
 *
 * POST /api/generate/stream
 *
 * Streams LLM responses using Server-Sent Events (SSE).
 * Supports OpenAI, Anthropic, OpenRouter, Mistral, and Ollama providers.
 */

import { NextRequest } from 'next/server'
import {
  streamLLM,
  type StreamOptions,
  type StreamChunk,
} from '@/lib/llm/streaming'
import type { LLMProvider } from '@/lib/llm'

export const runtime = 'nodejs'
// Note: force-dynamic is incompatible with static export (Electron builds)
// Streaming routes are automatically dynamic in Next.js

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface StreamRequest {
  /** Provider to use */
  provider?: LLMProvider
  /** Model to use */
  model?: string
  /** Messages array */
  messages: Array<{ role: string; content: string }>
  /** System prompt */
  system?: string
  /** Max tokens */
  maxTokens?: number
  /** Temperature */
  temperature?: number
  /** API key (optional - uses server-side keys if not provided) */
  apiKey?: string
  /** Base URL override (for Ollama or custom endpoints) */
  baseUrl?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Get API key for provider
 */
function getApiKey(provider: LLMProvider, requestKey?: string): string | null {
  // Use request key if provided
  if (requestKey) return requestKey

  // Fall back to server-side keys
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY || null
    case 'mistral':
      return process.env.MISTRAL_API_KEY || null
    case 'ollama':
      // Ollama typically runs locally without an API key
      return 'ollama-local'
    default:
      return null
  }
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini'
    case 'anthropic':
      return 'claude-3-haiku-20240307'
    case 'openrouter':
      return 'anthropic/claude-3-haiku'
    case 'mistral':
      return 'mistral-small-latest'
    case 'ollama':
      return 'llama3.2'
    default:
      return 'gpt-4o-mini'
  }
}

/**
 * Get default base URL for provider
 */
function getDefaultBaseUrl(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'ollama':
      return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    default:
      return undefined
  }
}

/**
 * Determine best available provider
 */
function getBestProvider(): LLMProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.OPENROUTER_API_KEY) return 'openrouter'
  if (process.env.MISTRAL_API_KEY) return 'mistral'
  // Check if Ollama is likely available (has base URL configured)
  if (process.env.OLLAMA_BASE_URL) return 'ollama'
  return null
}

/**
 * Format SSE message
 */
function formatSSE(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

/* ═══════════════════════════════════════════════════════════════════════════
   API HANDLER
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/generate/stream
 *
 * Streams LLM responses using Server-Sent Events.
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/generate/stream', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *     system: 'You are a helpful assistant.',
 *   }),
 * })
 *
 * const reader = response.body.getReader()
 * const decoder = new TextDecoder()
 *
 * while (true) {
 *   const { done, value } = await reader.read()
 *   if (done) break
 *
 *   const chunk = decoder.decode(value)
 *   // Parse SSE data...
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StreamRequest

    // Validate messages
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        formatSSE({ type: 'error', error: 'Messages array is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    // Determine provider
    let provider = body.provider || getBestProvider()
    if (!provider) {
      return new Response(
        formatSSE({
          type: 'error',
          error: 'No LLM provider configured. Set API keys or provide in request.',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    // Get API key
    const apiKey = getApiKey(provider, body.apiKey)
    if (!apiKey) {
      return new Response(
        formatSSE({
          type: 'error',
          error: `No API key found for provider: ${provider}`,
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        }
      )
    }

    // Build stream options
    const options: StreamOptions = {
      provider,
      apiKey,
      baseUrl: body.baseUrl || getDefaultBaseUrl(provider),
      model: body.model || getDefaultModel(provider),
      messages: body.messages,
      system: body.system,
      maxTokens: body.maxTokens || 2048,
      temperature: body.temperature ?? 0.7,
      signal: request.signal,
    }

    // Create readable stream for SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamLLM(options)) {
            controller.enqueue(encoder.encode(formatSSE(chunk)))

            if (chunk.type === 'done' || chunk.type === 'error') {
              break
            }
          }
        } catch (error) {
          const errorChunk: StreamChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown streaming error',
          }
          controller.enqueue(encoder.encode(formatSSE(errorChunk)))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error) {
    console.error('[API] Stream error:', error)

    return new Response(
      formatSSE({
        type: 'error',
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    )
  }
}

/**
 * GET /api/generate/stream
 *
 * Returns streaming capabilities and documentation
 */
export async function GET() {
  const providers: Array<{ name: LLMProvider; available: boolean; model: string; baseUrl?: string }> = [
    {
      name: 'openai',
      available: !!process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
    },
    {
      name: 'anthropic',
      available: !!process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-haiku-20240307',
    },
    {
      name: 'openrouter',
      available: !!process.env.OPENROUTER_API_KEY,
      model: 'anthropic/claude-3-haiku',
    },
    {
      name: 'mistral',
      available: !!process.env.MISTRAL_API_KEY,
      model: 'mistral-small-latest',
    },
    {
      name: 'ollama',
      available: !!process.env.OLLAMA_BASE_URL,
      model: 'llama3.2',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
  ]

  const bestProvider = getBestProvider()

  return new Response(
    JSON.stringify({
      status: 'ok',
      streaming: true,
      defaultProvider: bestProvider,
      providers,
      usage: {
        endpoint: 'POST /api/generate/stream',
        contentType: 'text/event-stream',
        body: {
          messages: 'Array<{ role: string; content: string }> (required)',
          provider: 'LLMProvider (optional)',
          model: 'string (optional)',
          system: 'string (optional)',
          maxTokens: 'number (optional, default: 2048)',
          temperature: 'number (optional, default: 0.7)',
          apiKey: 'string (optional, uses server keys if not provided)',
        },
        events: {
          text: '{ type: "text", content: string }',
          usage: '{ type: "usage", usage: { promptTokens, completionTokens, totalTokens } }',
          done: '{ type: "done" }',
          error: '{ type: "error", error: string }',
        },
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
