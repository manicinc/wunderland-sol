/**
 * OpenAI LLM Provider
 * @module lib/llm/openai
 *
 * Text analysis using OpenAI GPT models
 */

import OpenAI from 'openai'
import type {
  GenreAnalysisResult,
  CharacterExtractionResult,
  SettingExtractionResult,
  WorthinessEvaluationResult,
  StyleRecommendationResult,
  DocumentAnalysisResult,
} from './types'
import { LLMProviderError } from './types'

export interface OpenAILLMConfig {
  apiKey?: string
  organization?: string
  timeout?: number
  model?: string
}

let client: OpenAI | null = null
let isConfigured = false

const DEFAULT_MODEL = 'gpt-5.2'
const DEFAULT_TIMEOUT = 30000

/**
 * Initialize the OpenAI LLM provider
 */
export function initOpenAILLM(config: OpenAILLMConfig = {}) {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn('[OpenAI LLM] No API key provided. Provider will be unavailable.')
    return
  }

  client = new OpenAI({
    apiKey,
    organization: config.organization,
    timeout: config.timeout || DEFAULT_TIMEOUT,
  })

  isConfigured = true
  console.log('[OpenAI LLM] Provider initialized successfully')
}

/**
 * Check if OpenAI LLM is available
 */
export function isOpenAILLMAvailable(): boolean {
  return isConfigured && client !== null
}

/**
 * Analyze genre and content type
 */
export async function analyzeGenreWithOpenAI(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<GenreAnalysisResult> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized. Call initOpenAILLM() first.')
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
    const response = await client!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)

    return {
      genre: parsed.genre,
      contentType: parsed.contentType,
      targetAudience: parsed.targetAudience,
      narrativeStyle: parsed.narrativeStyle,
      keyThemes: parsed.keyThemes,
      mood: parsed.mood,
      confidence: parsed.confidence,
      method: 'openai',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to analyze genre with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Extract characters from text
 */
export async function extractCharactersWithOpenAI(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<CharacterExtractionResult> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized')
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
    const response = await client!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)

    return {
      characters: parsed.characters,
      confidence: parsed.confidence,
      method: 'openai',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to extract characters with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Extract settings/locations from text
 */
export async function extractSettingsWithOpenAI(
  textSamples: string[],
  model: string = DEFAULT_MODEL
): Promise<SettingExtractionResult> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized')
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
    const response = await client!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)

    return {
      settings: parsed.settings,
      confidence: parsed.confidence,
      method: 'openai',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to extract settings with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Evaluate if content warrants an illustration
 */
export async function evaluateWorthinessWithOpenAI(
  content: string,
  model: string = DEFAULT_MODEL
): Promise<WorthinessEvaluationResult> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized')
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
    const response = await client!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 512,
      response_format: { type: 'json_object' },
    })

    const textContent = response.choices[0]?.message?.content
    if (!textContent) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(textContent)

    return {
      warrants: parsed.warrants,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      visualConcepts: parsed.visualConcepts,
      suggestedType: parsed.suggestedType,
      method: 'openai',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to evaluate worthiness with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Recommend illustration style based on content analysis
 */
export async function recommendStyleWithOpenAI(
  genreResult: GenreAnalysisResult,
  model: string = DEFAULT_MODEL
): Promise<StyleRecommendationResult> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized')
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
    const response = await client!.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    const parsed = JSON.parse(content)

    return {
      recommendedPresetId: parsed.recommendedPresetId,
      reasoning: parsed.reasoning,
      colorPalette: parsed.colorPalette,
      consistencyStrategy: parsed.consistencyStrategy,
      confidence: parsed.confidence,
      method: 'openai',
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to recommend style with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Generic text generation with OpenAI
 * Used by various services for custom prompts
 */
export async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  if (!isOpenAILLMAvailable()) {
    throw new Error('OpenAI LLM provider not initialized. Call initOpenAILLM() first.')
  }

  try {
    const response = await client!.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    return content
  } catch (error) {
    throw new LLMProviderError(
      'Failed to generate with OpenAI',
      'openai',
      error
    ) as any
  }
}

/**
 * Full document analysis (all-in-one)
 */
export async function analyzeDocumentWithOpenAI(
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
    const genre = await analyzeGenreWithOpenAI(textSamples, model)

    // Run character and setting extraction in parallel if requested
    const [characters, settings] = await Promise.all([
      options.includeCharacters !== false
        ? extractCharactersWithOpenAI(textSamples, model)
        : Promise.resolve(undefined),
      options.includeSettings !== false
        ? extractSettingsWithOpenAI(textSamples, model)
        : Promise.resolve(undefined),
    ])

    // Get style recommendation based on genre
    const styleRecommendation = await recommendStyleWithOpenAI(genre, model)

    return {
      genre,
      characters,
      settings,
      styleRecommendation,
      method: 'openai',
      analysisTime: Date.now() - startTime,
    }
  } catch (error) {
    throw new LLMProviderError(
      'Failed to analyze document with OpenAI',
      'openai',
      error
    ) as any
  }
}
