/**
 * Summarization Service
 * @module lib/summarization/summarizer
 *
 * AI-powered summarization with streaming support.
 * Uses LLM provider waterfall with caching.
 */

import type {
  SummarizationRequest,
  SummarizationProgress,
  SummarizationResult,
  SummarizationSource,
} from './types'
import { buildSystemPrompt, buildUserPrompt } from './prompts'
import { generateCacheKey, getCachedSummary, cacheSummary } from './cache'
import { streamLLM, type StreamOptions } from '@/lib/llm/streaming'
import type { LLMProvider } from '@/lib/llm'
import { getAPIKey, getConfiguredProviders } from '@/lib/config/apiKeyStorage'
import { SUMMARY_LENGTH_CONFIG } from './types'

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

interface ProviderInfo {
  provider: LLMProvider
  apiKey: string
  model: string
}

/**
 * Select the best available LLM provider for summarization
 */
async function selectProvider(preferred?: LLMProvider): Promise<ProviderInfo | null> {
  const configured = await getConfiguredProviders()

  // Map API provider names to streaming provider names
  const providerMap: Record<string, LLMProvider> = {
    anthropic: 'anthropic',
    openai: 'openai',
    openrouter: 'openrouter',
    mistral: 'mistral',
    ollama: 'ollama',
  }

  // Try preferred provider first
  if (preferred && configured.includes(preferred as 'anthropic' | 'openai' | 'openrouter' | 'mistral' | 'ollama')) {
    const keyConfig = await getAPIKey(preferred as 'anthropic' | 'openai' | 'openrouter' | 'mistral' | 'ollama')
    if (keyConfig) {
      return {
        provider: preferred,
        apiKey: keyConfig.key,
        model: preferred === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-4o-mini',
      }
    }
  }

  // Try Anthropic (great for summarization)
  if (configured.includes('anthropic')) {
    const keyConfig = await getAPIKey('anthropic')
    if (keyConfig) {
      return { provider: 'anthropic', apiKey: keyConfig.key, model: 'claude-3-haiku-20240307' }
    }
  }

  // Try OpenAI
  if (configured.includes('openai')) {
    const keyConfig = await getAPIKey('openai')
    if (keyConfig) {
      return { provider: 'openai', apiKey: keyConfig.key, model: 'gpt-4o-mini' }
    }
  }

  // Try OpenRouter
  if (configured.includes('openrouter')) {
    const keyConfig = await getAPIKey('openrouter')
    if (keyConfig) {
      return { provider: 'openrouter', apiKey: keyConfig.key, model: 'anthropic/claude-3-haiku' }
    }
  }

  return null
}

// ============================================================================
// MAIN SUMMARIZATION FUNCTION
// ============================================================================

/**
 * Summarize sources with streaming progress
 */
export async function* summarize(
  request: SummarizationRequest
): AsyncGenerator<SummarizationProgress> {
  // Validate request
  if (!request.sources.length) {
    yield {
      status: 'error',
      content: '',
      error: 'No sources provided for summarization',
    }
    return
  }

  // Check cache first
  const cacheKey = generateCacheKey(request)

  yield { status: 'initializing', content: '', progress: 5 }

  const cached = await getCachedSummary(cacheKey)
  if (cached) {
    yield {
      status: 'complete',
      content: cached.summary,
      provider: cached.provider,
      progress: 100,
    }
    return
  }

  // Select provider
  const providerInfo = await selectProvider()
  if (!providerInfo) {
    yield {
      status: 'error',
      content: '',
      error: 'No LLM provider available. Please configure an API key in Settings.',
    }
    return
  }

  yield {
    status: 'summarizing',
    content: '',
    provider: providerInfo.provider,
    progress: 10,
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt(request)
  const userPrompt = buildUserPrompt(request.sources, request.type)

  // Configure stream
  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: SUMMARY_LENGTH_CONFIG[request.length].maxTokens,
    temperature: 0.3,
    signal: request.signal,
  }

  // Stream the response
  let fullContent = ''
  let tokensUsed = 0

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content

        // Estimate progress based on content length vs expected
        const expectedWords = parseInt(SUMMARY_LENGTH_CONFIG[request.length].targetWords.split('-')[1])
        const currentWords = fullContent.split(/\s+/).length
        const progress = Math.min(90, 10 + (currentWords / expectedWords) * 80)

        yield {
          status: 'summarizing',
          content: fullContent,
          provider: providerInfo.provider,
          progress,
        }
      } else if (chunk.type === 'usage' && chunk.usage) {
        tokensUsed = chunk.usage.totalTokens
      } else if (chunk.type === 'error') {
        yield {
          status: 'error',
          content: fullContent,
          provider: providerInfo.provider,
          error: chunk.error || 'Unknown streaming error',
        }
        return
      }
    }

    // Cache the result
    const result: SummarizationResult = {
      summary: fullContent,
      type: request.type,
      sourceCount: request.sources.length,
      provider: providerInfo.provider,
      tokensUsed,
      cacheKey,
    }

    await cacheSummary(cacheKey, result)

    yield {
      status: 'complete',
      content: fullContent,
      provider: providerInfo.provider,
      progress: 100,
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      yield {
        status: 'error',
        content: fullContent,
        error: 'Summarization cancelled',
      }
    } else {
      yield {
        status: 'error',
        content: fullContent,
        provider: providerInfo.provider,
        error: error instanceof Error ? error.message : 'Summarization failed',
      }
    }
  }
}

/**
 * Summarize without streaming (returns complete result)
 */
export async function summarizeComplete(
  request: SummarizationRequest
): Promise<SummarizationResult> {
  let finalResult: SummarizationResult | null = null

  for await (const progress of summarize(request)) {
    if (progress.status === 'error') {
      throw new Error(progress.error || 'Summarization failed')
    }
    if (progress.status === 'complete') {
      finalResult = {
        summary: progress.content,
        type: request.type,
        sourceCount: request.sources.length,
        provider: progress.provider || 'unknown',
      }
    }
  }

  if (!finalResult) {
    throw new Error('Summarization completed without result')
  }

  return finalResult
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick digest of sources
 */
export async function* digestSources(
  sources: SummarizationSource[],
  options: Partial<Omit<SummarizationRequest, 'sources' | 'type'>> = {}
): AsyncGenerator<SummarizationProgress> {
  yield* summarize({
    sources,
    type: 'digest',
    length: options.length || 'standard',
    ...options,
  })
}

/**
 * Extract key points from sources
 */
export async function* extractKeyPoints(
  sources: SummarizationSource[],
  options: Partial<Omit<SummarizationRequest, 'sources' | 'type'>> = {}
): AsyncGenerator<SummarizationProgress> {
  yield* summarize({
    sources,
    type: 'key-points',
    length: options.length || 'standard',
    ...options,
  })
}

/**
 * Compare multiple sources
 */
export async function* compareSources(
  sources: SummarizationSource[],
  options: Partial<Omit<SummarizationRequest, 'sources' | 'type'>> = {}
): AsyncGenerator<SummarizationProgress> {
  if (sources.length < 2) {
    yield {
      status: 'error',
      content: '',
      error: 'Comparison requires at least 2 sources',
    }
    return
  }

  yield* summarize({
    sources,
    type: 'comparison',
    length: options.length || 'detailed',
    ...options,
  })
}

/**
 * Generate abstract from sources
 */
export async function* generateAbstract(
  sources: SummarizationSource[],
  options: Partial<Omit<SummarizationRequest, 'sources' | 'type'>> = {}
): AsyncGenerator<SummarizationProgress> {
  yield* summarize({
    sources,
    type: 'abstract',
    length: options.length || 'standard',
    audience: options.audience || 'academic',
    ...options,
  })
}

/**
 * Generate executive summary
 */
export async function* generateExecutiveSummary(
  sources: SummarizationSource[],
  options: Partial<Omit<SummarizationRequest, 'sources' | 'type'>> = {}
): AsyncGenerator<SummarizationProgress> {
  yield* summarize({
    sources,
    type: 'executive',
    length: options.length || 'brief',
    audience: 'executive',
    ...options,
  })
}
