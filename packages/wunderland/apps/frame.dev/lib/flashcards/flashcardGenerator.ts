/**
 * Flashcard Generator
 * @module lib/flashcards/flashcardGenerator
 *
 * AI-powered flashcard generation from content or knowledge gaps.
 */

import { streamLLM, type StreamOptions } from '@/lib/llm/streaming'
import type { LLMProvider } from '@/lib/llm'
import { getAPIKey } from '@/lib/config/apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

export interface Flashcard {
  id: string
  front: string
  back: string
  tags?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface GenerateFlashcardsOptions {
  /** Number of flashcards to generate */
  count?: number
  /** Focus on specific topics */
  topics?: string[]
  /** Include tags on generated cards */
  includeTags?: boolean
  /** Difficulty distribution */
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
  /** Abort signal for cancellation */
  signal?: AbortSignal
  /** Progress callback */
  onProgress?: (current: number, total: number) => void
}

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

async function selectProvider(): Promise<{ provider: LLMProvider; apiKey: string; model: string } | null> {
  const anthropicKey = await getAPIKey('anthropic')
  if (anthropicKey) {
    return { provider: 'anthropic', apiKey: anthropicKey.key, model: 'claude-3-haiku-20240307' }
  }

  const openaiKey = await getAPIKey('openai')
  if (openaiKey) {
    return { provider: 'openai', apiKey: openaiKey.key, model: 'gpt-4o-mini' }
  }

  return null
}

// ============================================================================
// FLASHCARD GENERATION
// ============================================================================

/**
 * Generate flashcards from content
 */
export async function generateFlashcardsFromContent(
  content: string,
  title: string,
  options: GenerateFlashcardsOptions = {}
): Promise<Flashcard[]> {
  const { count = 5, topics, includeTags = true, difficulty = 'mixed', signal, onProgress } = options

  const providerInfo = await selectProvider()
  if (!providerInfo) {
    throw new Error('No API key configured. Please add an OpenAI or Anthropic API key in Settings.')
  }

  const difficultyInstruction = difficulty === 'mixed'
    ? 'Include a mix of easy, medium, and hard questions.'
    : `All questions should be ${difficulty} difficulty.`

  const topicInstruction = topics?.length
    ? `Focus on these topics: ${topics.join(', ')}`
    : 'Cover the most important concepts.'

  const systemPrompt = `You are an expert educator creating flashcards for effective learning.
Generate exactly ${count} flashcards from the following content.

${difficultyInstruction}
${topicInstruction}

Rules:
- Front: Clear, concise question or prompt (1-2 sentences max)
- Back: Complete, accurate answer (2-4 sentences max)
- Use active recall principles (questions, not just definitions)
- Each card should test one specific concept
- Vary question types: what, why, how, compare, explain

Respond in this exact JSON format:
[
  {
    "front": "question here",
    "back": "answer here",
    "difficulty": "easy|medium|hard"${includeTags ? ',\n    "tags": ["tag1", "tag2"]' : ''}
  }
]`

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: `Content to create flashcards from:\n\nTitle: ${title}\n\n${content.slice(0, 4000)}` }],
    system: systemPrompt,
    maxTokens: 1500,
    temperature: 0.7,
    signal,
  }

  let response = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        response += chunk.content
      }
    }

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('[FlashcardGenerator] No JSON found in response:', response)
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    const flashcards: Flashcard[] = parsed.map((card: any, index: number) => ({
      id: `fc-${Date.now()}-${index}`,
      front: card.front,
      back: card.back,
      difficulty: card.difficulty || 'medium',
      tags: card.tags,
    }))

    onProgress?.(flashcards.length, count)
    return flashcards
  } catch (error) {
    console.error('[FlashcardGenerator] Failed to generate flashcards:', error)
    throw error
  }
}

/**
 * Generate flashcards from knowledge gaps
 */
export async function generateFlashcardsFromGaps(
  gaps: string[],
  strandContent: string,
  options: GenerateFlashcardsOptions = {}
): Promise<Flashcard[]> {
  const { count = gaps.length, signal, onProgress } = options

  const providerInfo = await selectProvider()
  if (!providerInfo) {
    throw new Error('No API key configured.')
  }

  const systemPrompt = `You are an expert educator creating flashcards to address specific knowledge gaps.

The student has these gaps in their understanding:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Create ${count} flashcards that specifically address these gaps using the source material provided.

Rules:
- Each flashcard should directly address one of the gaps
- Front: Question that tests the gap area
- Back: Clear explanation from the source material
- Focus on building the missing understanding

Respond in this exact JSON format:
[
  {
    "front": "question here",
    "back": "answer here",
    "difficulty": "medium",
    "tags": ["gap-addressed"]
  }
]`

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: `Source material:\n\n${strandContent.slice(0, 3000)}` }],
    system: systemPrompt,
    maxTokens: 1200,
    temperature: 0.6,
    signal,
  }

  let response = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        response += chunk.content
      }
    }

    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return []
    }

    const parsed = JSON.parse(jsonMatch[0])
    const flashcards: Flashcard[] = parsed.map((card: any, index: number) => ({
      id: `fc-gap-${Date.now()}-${index}`,
      front: card.front,
      back: card.back,
      difficulty: card.difficulty || 'medium',
      tags: ['gap-flashcard', ...(card.tags || [])],
    }))

    onProgress?.(flashcards.length, count)
    return flashcards
  } catch (error) {
    console.error('[FlashcardGenerator] Failed to generate gap flashcards:', error)
    throw error
  }
}

/**
 * Generate a single flashcard from a highlight or quote
 */
export async function generateFlashcardFromHighlight(
  highlight: string,
  context: string,
  signal?: AbortSignal
): Promise<Flashcard | null> {
  const providerInfo = await selectProvider()
  if (!providerInfo) {
    return null
  }

  const systemPrompt = `Create a single flashcard from this highlighted text.

Rules:
- Front: A question that tests understanding of the highlight
- Back: The answer, which should be based on the highlight
- Make it a genuine test of understanding, not just recall

Respond in this exact JSON format:
{
  "front": "question",
  "back": "answer"
}`

  const streamOptions: StreamOptions = {
    provider: providerInfo.provider,
    apiKey: providerInfo.apiKey,
    model: providerInfo.model,
    messages: [{ role: 'user', content: `Highlighted text: "${highlight}"\n\nContext: ${context.slice(0, 500)}` }],
    system: systemPrompt,
    maxTokens: 300,
    temperature: 0.7,
    signal,
  }

  let response = ''

  try {
    for await (const chunk of streamLLM(streamOptions)) {
      if (chunk.type === 'text' && chunk.content) {
        response += chunk.content
      }
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      id: `fc-highlight-${Date.now()}`,
      front: parsed.front,
      back: parsed.back,
      difficulty: 'medium',
      tags: ['from-highlight'],
    }
  } catch (error) {
    console.error('[FlashcardGenerator] Failed to generate highlight flashcard:', error)
    return null
  }
}

/**
 * Check if flashcard generation is available
 */
export async function isFlashcardGenerationAvailable(): Promise<boolean> {
  const providerInfo = await selectProvider()
  return providerInfo !== null
}
