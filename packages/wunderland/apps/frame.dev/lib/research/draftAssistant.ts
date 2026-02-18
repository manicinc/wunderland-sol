/**
 * Draft Assistant
 * @module lib/research/draftAssistant
 *
 * AI-powered outline and draft generation from research sessions.
 * Uses the LLM provider waterfall for best available model.
 */

import type { ResearchSession } from './types'
import { isAcademicResult } from './academicDetector'
import { streamLLM, type StreamOptions } from '@/lib/llm/streaming'
import type { LLMProvider } from '@/lib/llm'
import { getAPIKey } from '@/lib/config/apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

export type OutlineType = 'bullet' | 'numbered' | 'structured' | 'mindmap'
export type OutlineDepth = 'shallow' | 'medium' | 'deep'

export interface DraftOptions {
  /** Type of outline to generate */
  outlineType: OutlineType
  /** Depth of outline */
  depth: OutlineDepth
  /** Focus on specific aspect */
  focus?: string
  /** Include source citations */
  includeCitations?: boolean
  /** Preferred LLM provider */
  preferredProvider?: LLMProvider
  /** Abort signal */
  signal?: AbortSignal
}

export interface DraftProgress {
  type: 'generating' | 'streaming' | 'complete' | 'error'
  content: string
  provider?: string
  error?: string
}

export interface DraftResult {
  outline: string
  provider: string
  tokensUsed?: number
}

// ============================================================================
// PROMPTS
// ============================================================================

const OUTLINE_PROMPTS: Record<OutlineType, string> = {
  bullet: `Create a bullet-point outline from these research sources. Use clear hierarchical structure with main topics and subtopics.`,

  numbered: `Create a numbered outline from these research sources. Use multi-level numbering (1., 1.1., 1.1.1.) for hierarchy.`,

  structured: `Create a structured academic outline from these research sources. Include:
- Introduction section with thesis/purpose
- Main body sections with supporting points
- Conclusion section
- Key arguments and evidence from sources`,

  mindmap: `Create a text-based mindmap outline from these research sources. Use this format:
CENTRAL TOPIC
├── Main Branch 1
│   ├── Sub-topic 1.1
│   └── Sub-topic 1.2
├── Main Branch 2
└── Main Branch 3`,
}

const DEPTH_MODIFIERS: Record<OutlineDepth, string> = {
  shallow: `Keep the outline concise with 3-5 main points and minimal sub-points.`,
  medium: `Create a moderately detailed outline with 5-8 main points and relevant sub-points.`,
  deep: `Create a comprehensive outline covering all aspects from the sources with detailed sub-points and examples.`,
}

/**
 * Build the system prompt for outline generation
 */
function buildSystemPrompt(options: DraftOptions): string {
  const parts = [
    `You are a research assistant helping create structured outlines from web research.`,
    OUTLINE_PROMPTS[options.outlineType],
    DEPTH_MODIFIERS[options.depth],
  ]

  if (options.focus) {
    parts.push(`Focus specifically on: ${options.focus}`)
  }

  if (options.includeCitations) {
    parts.push(`Include source citations in [Author, Year] or [Source Domain] format where relevant.`)
  }

  parts.push(`Maintain objectivity and synthesize information across sources. Highlight key themes and connections.`)

  return parts.join('\n\n')
}

/**
 * Build the user prompt with research context
 */
function buildUserPrompt(session: ResearchSession, options: DraftOptions): string {
  const sources = session.savedResults.map((r, i) => {
    const isAcademic = isAcademicResult(r)
    const type = isAcademic ? '📚 Academic' : '🌐 Web'

    let sourceInfo = `Source ${i + 1} [${type}]: ${r.title}\n`
    sourceInfo += `URL: ${r.url}\n`
    sourceInfo += `Domain: ${r.domain}\n`

    if (r.authors?.length) {
      sourceInfo += `Authors: ${r.authors.join(', ')}\n`
    }

    if (r.publishedDate) {
      sourceInfo += `Date: ${r.publishedDate}\n`
    }

    sourceInfo += `Summary: ${r.snippet}\n`

    return sourceInfo
  }).join('\n---\n')

  return `Research Query: "${session.query}"

The following sources were collected during research:

${sources}

Please create an outline synthesizing the key information from these sources.`
}

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

/**
 * Get the best available provider for outline generation
 */
async function selectProvider(preferred?: LLMProvider): Promise<{ provider: LLMProvider; apiKey: string; model: string } | null> {
  // Try preferred provider first
  if (preferred) {
    const providerName = preferred === 'anthropic' ? 'anthropic' : preferred
    const keyConfig = await getAPIKey(providerName as 'anthropic' | 'openai')
    if (keyConfig) {
      return {
        provider: preferred,
        apiKey: keyConfig.key,
        model: preferred === 'anthropic' ? 'claude-3-haiku-20240307' : 'gpt-4o-mini',
      }
    }
  }

  // Try Anthropic first (better at structured output)
  const anthropicKey = await getAPIKey('anthropic')
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey.key, model: 'claude-3-haiku-20240307' }
  }

  // Try OpenAI
  const openaiKey = await getAPIKey('openai')
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey.key, model: 'gpt-4o-mini' }
  }

  return null
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate outline from research session with streaming
 */
export async function* generateOutlineFromSession(
  session: ResearchSession,
  options: DraftOptions
): AsyncGenerator<DraftProgress> {
  // Check for saved results
  if (!session.savedResults.length) {
    yield {
      type: 'error',
      content: '',
      error: 'No saved results in this research session. Save some results first.',
    }
    return
  }

  // Select provider
  const providerInfo = await selectProvider(options.preferredProvider)
  if (!providerInfo) {
    yield {
      type: 'error',
      content: '',
      error: 'No LLM provider available. Please configure an API key (OpenAI or Anthropic) in Settings.',
    }
    return
  }

  yield { type: 'generating', content: '', provider: providerInfo.provider }

  // Build prompts
  const systemPrompt = buildSystemPrompt(options)
  const userPrompt = buildUserPrompt(session, options)

  // Prepare stream options
  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: options.depth === 'deep' ? 2048 : options.depth === 'medium' ? 1024 : 512,
    temperature: 0.3, // Lower temperature for more structured output
    signal: options.signal,
  }

  // Stream response
  let fullContent = ''
  let tokensUsed = 0

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content
        yield { type: 'streaming', content: fullContent, provider: providerInfo.provider }
      } else if (chunk.type === 'usage' && chunk.usage) {
        tokensUsed = chunk.usage.totalTokens
      } else if (chunk.type === 'error') {
        yield {
          type: 'error',
          content: fullContent,
          provider: providerInfo.provider,
          error: chunk.error || 'Unknown streaming error',
        }
        return
      }
    }

    yield {
      type: 'complete',
      content: fullContent,
      provider: providerInfo.provider,
    }

  } catch (error) {
    yield {
      type: 'error',
      content: fullContent,
      provider: providerInfo.provider,
      error: error instanceof Error ? error.message : 'Generation failed',
    }
  }
}

/**
 * Generate outline without streaming (returns complete result)
 */
export async function generateOutline(
  session: ResearchSession,
  options: DraftOptions
): Promise<DraftResult> {
  let result: DraftResult = { outline: '', provider: 'unknown' }

  for await (const progress of generateOutlineFromSession(session, options)) {
    if (progress.type === 'error') {
      throw new Error(progress.error || 'Generation failed')
    }
    if (progress.type === 'complete') {
      result = {
        outline: progress.content,
        provider: progress.provider || 'unknown',
      }
    }
  }

  return result
}

/**
 * Generate a research summary (shorter than full outline)
 */
export async function* generateSummaryFromSession(
  session: ResearchSession,
  options: Omit<DraftOptions, 'outlineType' | 'depth'> = {}
): AsyncGenerator<DraftProgress> {
  // Check for saved results
  if (!session.savedResults.length) {
    yield {
      type: 'error',
      content: '',
      error: 'No saved results in this research session.',
    }
    return
  }

  const providerInfo = await selectProvider(options.preferredProvider)
  if (!providerInfo) {
    yield {
      type: 'error',
      content: '',
      error: 'No LLM provider available.',
    }
    return
  }

  yield { type: 'generating', content: '', provider: providerInfo.provider }

  const systemPrompt = `You are a research assistant. Synthesize the following sources into a concise summary (2-3 paragraphs). Highlight key findings, themes, and any disagreements between sources.`

  const userPrompt = buildUserPrompt(session, { ...options, outlineType: 'bullet', depth: 'shallow' })

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
    maxTokens: 512,
    temperature: 0.4,
    signal: options.signal,
  }

  let fullContent = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content
        yield { type: 'streaming', content: fullContent, provider: providerInfo.provider }
      } else if (chunk.type === 'error') {
        yield {
          type: 'error',
          content: fullContent,
          error: chunk.error || 'Unknown error',
        }
        return
      }
    }

    yield { type: 'complete', content: fullContent, provider: providerInfo.provider }

  } catch (error) {
    yield {
      type: 'error',
      content: fullContent,
      error: error instanceof Error ? error.message : 'Summary generation failed',
    }
  }
}

/**
 * Generate key points from research
 */
export async function generateKeyPoints(
  session: ResearchSession,
  maxPoints: number = 5,
  signal?: AbortSignal
): Promise<string[]> {
  const result = await generateOutline(session, {
    outlineType: 'bullet',
    depth: 'shallow',
    includeCitations: false,
    signal,
  })

  // Parse bullet points from the outline
  const lines = result.outline.split('\n')
  const points: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
      const point = trimmed.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim()
      if (point.length > 10) {
        points.push(point)
        if (points.length >= maxPoints) break
      }
    }
  }

  return points
}
