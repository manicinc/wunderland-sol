/**
 * Claude (Anthropic) LLM Provider
 * @module lib/llm/claude
 *
 * Text analysis using Claude models
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  GenreAnalysisResult,
  CharacterExtractionResult,
  SettingExtractionResult,
  WorthinessEvaluationResult,
  StyleRecommendationResult,
  DocumentAnalysisResult,
} from './types'
import { LLMProviderError } from './types'

export interface ClaudeConfig {
  apiKey?: string
  timeout?: number
  model?: string
}

let client: Anthropic | null = null
let isConfigured = false

const DEFAULT_MODEL = 'claude-opus-4-5-20251101'
const DEFAULT_TIMEOUT = 30000

/**
 * Initialize the Claude provider
 */
export function initClaude(config: ClaudeConfig = {}) {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.warn('[Claude] No API key provided. Provider will be unavailable.')
    return
  }

  client = new Anthropic({
    apiKey,
    timeout: config.timeout || DEFAULT_TIMEOUT,
  })

  isConfigured = true
  console.log('[Claude] Provider initialized successfully')
}

/**
 * Check if Claude is available
 */
export function isClaudeAvailable(): boolean {
  return isConfigured && client !== null
}

/**
 * Analyze genre and content type
 */
export async function analyzeGenreWithClaude(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<GenreAnalysisResult> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized. Call initClaude() first.')
  }

  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const prompt = `Analyze this text and determine:
1. Primary genre (e.g., "Science Fiction", "Technical Documentation", "Self-Help", etc.)
2. Content type (fiction, non-fiction, technical, educational, or mixed)
3. Target audience (children, young-adult, adult, professional, academic)
4. Narrative style (first-person, third-person, omniscient, instructional, conversational)
5. Key themes (3-5 main themes)
6. Overall mood/tone

Text samples:
${combinedText}

Respond ONLY with valid JSON in this exact format:
{
  "genre": "string",
  "contentType": "fiction" | "non-fiction" | "technical" | "educational" | "mixed",
  "targetAudience": "string",
  "narrativeStyle": "string",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "mood": "string",
  "confidence": 0.0-1.0
}`

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(content.text)

    return {
      genre: parsed.genre,
      contentType: parsed.contentType,
      targetAudience: parsed.targetAudience,
      narrativeStyle: parsed.narrativeStyle,
      keyThemes: parsed.keyThemes,
      mood: parsed.mood,
      confidence: parsed.confidence,
      method: 'claude',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to analyze genre with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Extract characters from text
 */
export async function extractCharactersWithClaude(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<CharacterExtractionResult> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized')
  }

  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const prompt = `Extract main characters from this text. For each character, provide:
1. Name
2. Brief description (personality, role in story)
3. Visual traits (physical appearance, clothing, distinctive features)
4. Role (protagonist, antagonist, supporting, etc.)
5. Approximate frequency (how often they appear: high, medium, low)

Only include characters that appear multiple times or are clearly significant.

Text samples:
${combinedText}

Respond ONLY with valid JSON in this exact format:
{
  "characters": [
    {
      "name": "string",
      "description": "string",
      "visualTraits": ["trait1", "trait2"],
      "role": "string",
      "frequency": number (0-1, estimate)
    }
  ],
  "confidence": 0.0-1.0
}`

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(content.text)

    return {
      characters: parsed.characters,
      confidence: parsed.confidence,
      method: 'claude',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to extract characters with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Extract settings/locations from text
 */
export async function extractSettingsWithClaude(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<SettingExtractionResult> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized')
  }

  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const prompt = `Extract main settings/locations from this text. For each setting, provide:
1. Name
2. Description (type of place, atmosphere)
3. Visual style keywords (architectural style, lighting, colors, mood)
4. Time period (if applicable)
5. Overall mood/atmosphere
6. Approximate frequency (how often it appears)

Only include settings that are clearly described or appear multiple times.

Text samples:
${combinedText}

Respond ONLY with valid JSON in this exact format:
{
  "settings": [
    {
      "name": "string",
      "description": "string",
      "visualStyle": ["style1", "style2"],
      "timePeriod": "string or null",
      "mood": "string",
      "frequency": number (0-1, estimate)
    }
  ],
  "confidence": 0.0-1.0
}`

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(content.text)

    return {
      settings: parsed.settings,
      confidence: parsed.confidence,
      method: 'claude',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to extract settings with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Evaluate if content warrants an illustration
 */
export async function evaluateWorthinessWithClaude(
  content: string,
  model: string = DEFAULT_MODEL
): Promise<WorthinessEvaluationResult> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized')
  }

  const prompt = `Evaluate if this content would benefit from an illustration.

Consider:
- Does it describe visual concepts, scenes, characters, or settings?
- Does it explain a process, workflow, or architecture that could be visualized?
- Would a diagram, chart, or illustration help understanding?
- Is it primarily abstract/textual discussion that doesn't need visuals?

Content:
${content.slice(0, 2000)}

Respond ONLY with valid JSON in this exact format:
{
  "warrants": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "visualConcepts": ["concept1", "concept2"],
  "suggestedType": "scene" | "character" | "diagram" | "process" | "setting" | null
}`

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(textContent.text)

    return {
      warrants: parsed.warrants,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      visualConcepts: parsed.visualConcepts,
      suggestedType: parsed.suggestedType,
      method: 'claude',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to evaluate worthiness with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Recommend illustration style based on content analysis
 */
export async function recommendStyleWithClaude(
  genreResult: GenreAnalysisResult,
  model: string = DEFAULT_MODEL
): Promise<StyleRecommendationResult> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized')
  }

  const prompt = `Based on this content analysis, recommend an illustration style:

Genre: ${genreResult.genre}
Content Type: ${genreResult.contentType}
Target Audience: ${genreResult.targetAudience}
Mood: ${genreResult.mood}
Key Themes: ${genreResult.keyThemes.join(', ')}

Available illustration presets:
- line-art-editorial: Clean B&W line drawings for fiction
- muted-watercolor: Soft artistic for literary works
- technical-diagram: Precise diagrams for documentation
- photorealistic-scene: Detailed realistic scenes
- minimalist-symbolic: Abstract minimalist representations
- childrens-cartoon: Playful colorful for kids
- pencil-sketch: Hand-drawn aesthetic
- noir-graphic-novel: High contrast dramatic

Recommend:
1. Best preset ID from the list above
2. Reasoning for the choice
3. Color palette (6-8 hex colors: 4 primary, 2-4 accent)
4. Recommended consistency strategy (seed-based, reference-based, or style-transfer)

Respond ONLY with valid JSON in this exact format:
{
  "recommendedPresetId": "string (one of the IDs above)",
  "reasoning": "string",
  "colorPalette": {
    "primary": ["#hex1", "#hex2", "#hex3", "#hex4"],
    "accent": ["#hex5", "#hex6"],
    "mood": "description of palette mood"
  },
  "consistencyStrategy": "seed" | "reference" | "style-transfer",
  "confidence": 0.0-1.0
}`

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const parsed = JSON.parse(content.text)

    return {
      recommendedPresetId: parsed.recommendedPresetId,
      reasoning: parsed.reasoning,
      colorPalette: parsed.colorPalette,
      consistencyStrategy: parsed.consistencyStrategy,
      confidence: parsed.confidence,
      method: 'claude',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to recommend style with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Generic text generation with Claude
 * Used by various services for custom prompts
 */
export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  if (!isClaudeAvailable()) {
    throw new Error('Claude provider not initialized. Call initClaude() first.')
  }

  try {
    const response = await client!.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return content.text
  } catch (error) {
    throw new LLMProviderError(
      'Failed to generate with Claude',
      'claude',
      error
    ) as any
  }
}

/**
 * Full document analysis (all-in-one)
 */
export async function analyzeDocumentWithClaude(
  textSamples: string[],
  options: {
    includeCharacters?: boolean
    includeSettings?: boolean
    model?: string
  } = {}
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now()
  const model = options.model || DEFAULT_MODEL

  try {
    // Run genre analysis first
    const genre = await analyzeGenreWithClaude(textSamples, model)

    // Run character and setting extraction in parallel if requested
    const [characters, settings] = await Promise.all([
      options.includeCharacters !== false
        ? extractCharactersWithClaude(textSamples, model)
        : Promise.resolve(undefined),
      options.includeSettings !== false
        ? extractSettingsWithClaude(textSamples, model)
        : Promise.resolve(undefined),
    ])

    // Get style recommendation based on genre
    const styleRecommendation = await recommendStyleWithClaude(genre, model)

    return {
      genre,
      characters,
      settings,
      styleRecommendation,
      method: 'claude',
      analysisTime: Date.now() - startTime,
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to analyze document with Claude',
      'claude',
      error
    ) as any
  }
}
