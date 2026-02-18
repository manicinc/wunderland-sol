/**
 * Document Analysis Engine
 * @module lib/analysis/documentAnalyzer
 *
 * Analyzes PDF/EPUB content to extract genre, characters, settings,
 * and recommend illustration styles.
 */

import { llm, z, isLLMAvailable } from '../llm'
import type { PDFChunk } from '../pdf/chunker'
import type { EPUBChunk } from '../epub/chunker'
import {
  getIllustrationPreset,
  findPresetByKeywords,
  getDefaultPreset,
  type IllustrationPreset,
} from '../images/illustrationPresets'
import {
  createWorkStyleProfile,
  type WorkStyleProfile,
  type ContentAnalysis,
  type ColorPalette,
  type StyleSuggestions,
} from '../images/workStyleProfile'
import type { CharacterDefinition, SettingDefinition } from '../images/styleMemory'
import { analyzeGenreNLP, extractCharactersNLP, extractSettingsNLP, recommendStyleNLP } from '../llm/nlp'

type Chunk = PDFChunk | EPUBChunk

export interface AnalyzeDocumentOptions {
  useLLM?: boolean
  includeCharacters?: boolean
  includeSettings?: boolean
  maxSamples?: number
}

export interface AnalysisResult {
  profile: WorkStyleProfile
  suggestions: StyleSuggestions
  confidence: number
  method: 'claude' | 'openai' | 'nlp'
}

/**
 * Extract representative text samples from chunks
 */
function extractTextSamples(chunks: Chunk[], maxSamples: number = 5): string[] {
  if (chunks.length === 0) return []

  // Take samples from beginning, middle, and end
  const indices: number[] = []

  // First chunk
  indices.push(0)

  // Middle chunks
  if (chunks.length > 2) {
    const mid = Math.floor(chunks.length / 2)
    indices.push(mid - 1, mid, mid + 1)
  }

  // Last chunk
  if (chunks.length > 1) {
    indices.push(chunks.length - 1)
  }

  // De-duplicate and limit
  const uniqueIndices = [...new Set(indices)].slice(0, maxSamples)

  return uniqueIndices
    .map(i => chunks[i]?.content || '')
    .filter(content => content.length > 100) // Skip very short samples
    .map(content => content.slice(0, 2000)) // Limit each sample length
}

/**
 * Analyze genre and content type using LLM
 */
async function analyzeGenreWithLLM(textSamples: string[]): Promise<ContentAnalysis> {
  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const schema = z.object({
    genre: z.string(),
    contentType: z.enum(['fiction', 'non-fiction', 'technical', 'educational', 'mixed']),
    targetAudience: z.string(),
    narrativeStyle: z.string().optional(),
    keyThemes: z.array(z.string()),
    mood: z.string().optional(),
    confidence: z.number().min(0).max(1),
  })

  const result = await llm.generate({
    prompt: `Analyze this text and determine:
1. Primary genre (e.g., "Science Fiction", "Technical Documentation", "Self-Help", etc.)
2. Content type (fiction, non-fiction, technical, educational, or mixed)
3. Target audience (children, young-adult, adult, professional, academic)
4. Narrative style (first-person, third-person, omniscient, instructional, conversational)
5. Key themes (3-5 main themes)
6. Overall mood/tone

Text samples:
${combinedText}`,
    schema,
    maxTokens: 1024,
  })

  // Determine which provider was used
  const method = result.provider === 'anthropic' ? 'claude' :
                 result.provider === 'openai' ? 'openai' : 'nlp'

  return {
    ...result.data,
    method: method as 'claude' | 'openai' | 'nlp',
  }
}

/**
 * Extract characters from text using LLM
 */
async function extractCharactersWithLLM(textSamples: string[]): Promise<CharacterDefinition[]> {
  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const schema = z.object({
    characters: z.array(z.object({
      name: z.string(),
      description: z.string(),
      visualTraits: z.array(z.string()),
      role: z.string().optional(),
      age: z.string().optional(),
      gender: z.string().optional(),
    })),
  })

  const result = await llm.generate({
    prompt: `Extract main characters from this text. For each character, provide:
1. Name
2. Brief description (personality, role in story)
3. Visual traits (physical appearance, clothing, distinctive features)
4. Role (protagonist, antagonist, supporting, etc.)
5. Age (if mentioned)
6. Gender (if mentioned)

Only include characters that appear multiple times or are clearly significant.

Text samples:
${combinedText}`,
    schema,
    maxTokens: 2048,
  })

  return result.data.characters.map((char, index) => ({
    id: `char-${index}-${Date.now()}`,
    name: char.name,
    description: char.description,
    visualTraits: char.visualTraits,
    age: char.age,
    gender: char.gender,
    promptModifiers: [],
  }))
}

/**
 * Extract settings from text using LLM
 */
async function extractSettingsWithLLM(textSamples: string[]): Promise<SettingDefinition[]> {
  const combinedText = textSamples.join('\n\n---\n\n').slice(0, 8000)

  const schema = z.object({
    settings: z.array(z.object({
      name: z.string(),
      description: z.string(),
      visualStyle: z.array(z.string()),
      timePeriod: z.string().optional(),
      mood: z.string().optional(),
    })),
  })

  const result = await llm.generate({
    prompt: `Extract main settings/locations from this text. For each setting, provide:
1. Name
2. Description (type of place, atmosphere)
3. Visual style keywords (architectural style, lighting, colors, mood)
4. Time period (if applicable)
5. Overall mood/atmosphere

Only include settings that are clearly described or appear multiple times.

Text samples:
${combinedText}`,
    schema,
    maxTokens: 2048,
  })

  return result.data.settings.map((setting, index) => ({
    id: `setting-${index}-${Date.now()}`,
    name: setting.name,
    description: setting.description,
    visualStyle: setting.visualStyle,
    timePeriod: setting.timePeriod,
    mood: setting.mood,
    colorPalette: [],
  }))
}

/**
 * Recommend illustration style using LLM
 */
async function recommendStyleWithLLM(analysis: ContentAnalysis): Promise<{
  presetId: string
  reasoning: string
  colorPalette: ColorPalette
  consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  confidence: number
}> {
  const schema = z.object({
    recommendedPresetId: z.enum([
      'line-art-editorial',
      'muted-watercolor',
      'technical-diagram',
      'photorealistic-scene',
      'minimalist-symbolic',
      'childrens-cartoon',
      'pencil-sketch',
      'noir-graphic-novel',
    ]),
    reasoning: z.string(),
    colorPalette: z.object({
      primary: z.array(z.string()),
      accent: z.array(z.string()),
      mood: z.string(),
    }),
    consistencyStrategy: z.enum(['seed', 'reference', 'style-transfer']),
    confidence: z.number().min(0).max(1),
  })

  const result = await llm.generate({
    prompt: `Based on this content analysis, recommend an illustration style:

Genre: ${analysis.genre}
Content Type: ${analysis.contentType}
Target Audience: ${analysis.targetAudience}
Mood: ${analysis.mood}
Key Themes: ${analysis.keyThemes.join(', ')}

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
4. Recommended consistency strategy (seed-based, reference-based, or style-transfer)`,
    schema,
    maxTokens: 1024,
  })

  const colorPalette: ColorPalette = {
    primary: result.data.colorPalette.primary,
    accent: result.data.colorPalette.accent,
    mood: result.data.colorPalette.mood,
    source: 'auto-detected' as const,
  }

  return {
    presetId: result.data.recommendedPresetId,
    reasoning: result.data.reasoning,
    colorPalette,
    consistencyStrategy: result.data.consistencyStrategy,
    confidence: result.data.confidence,
  }
}

/**
 * Main document analysis function
 */
export async function analyzeDocumentForIllustration(
  workId: string,
  workTitle: string,
  workType: 'pdf' | 'epub',
  chunks: Chunk[],
  options: AnalyzeDocumentOptions = {}
): Promise<AnalysisResult> {
  const {
    useLLM = true,
    includeCharacters = true,
    includeSettings = true,
    maxSamples = 5,
  } = options

  // Extract text samples
  const textSamples = extractTextSamples(chunks, maxSamples)

  if (textSamples.length === 0) {
    throw new Error('No text samples available for analysis')
  }

  // Determine if LLM is available and should be used
  const shouldUseLLM = useLLM && isLLMAvailable()

  let analysis: ContentAnalysis
  let characters: CharacterDefinition[] = []
  let settings: SettingDefinition[] = []
  let styleRecommendation: {
    presetId: string
    reasoning: string
    colorPalette: ColorPalette
    consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
    confidence: number
  }

  if (shouldUseLLM) {
    try {
      // Use LLM for analysis
      analysis = await analyzeGenreWithLLM(textSamples)

      // Extract characters and settings in parallel if requested
      const [llmCharacters, llmSettings] = await Promise.all([
        includeCharacters ? extractCharactersWithLLM(textSamples) : Promise.resolve([]),
        includeSettings ? extractSettingsWithLLM(textSamples) : Promise.resolve([]),
      ])

      characters = llmCharacters
      settings = llmSettings

      // Get style recommendation
      styleRecommendation = await recommendStyleWithLLM(analysis)
    } catch (error) {
      console.warn('[DocumentAnalyzer] LLM analysis failed, falling back to NLP:', error)
      // Fall back to NLP
      return analyzeWithNLP(workId, workTitle, workType, chunks, textSamples, options)
    }
  } else {
    // Use NLP directly
    return analyzeWithNLP(workId, workTitle, workType, chunks, textSamples, options)
  }

  // Create work style profile
  const profile = createWorkStyleProfile(
    workId,
    workTitle,
    workType,
    analysis,
    {
      presetId: styleRecommendation.presetId,
      colorPalette: styleRecommendation.colorPalette,
      consistencyStrategy: styleRecommendation.consistencyStrategy,
      characters,
      settings,
      totalChunks: chunks.length,
    }
  )

  // Generate suggestions
  const suggestions: StyleSuggestions = {
    recommendedPresetId: styleRecommendation.presetId,
    reasoning: styleRecommendation.reasoning,
    alternativePresets: getAlternativePresets(styleRecommendation.presetId, analysis),
    suggestedColorPalette: styleRecommendation.colorPalette,
    suggestedConsistencyStrategy: styleRecommendation.consistencyStrategy,
    confidence: Math.min(analysis.confidence, styleRecommendation.confidence),
  }

  return {
    profile,
    suggestions,
    confidence: suggestions.confidence,
    method: analysis.method,
  }
}

/**
 * Analyze with NLP fallback
 */
function analyzeWithNLP(
  workId: string,
  workTitle: string,
  workType: 'pdf' | 'epub',
  chunks: Chunk[],
  textSamples: string[],
  options: AnalyzeDocumentOptions
): AnalysisResult {
  // Use NLP heuristics
  const genreResult = analyzeGenreNLP(textSamples)

  const analysis: ContentAnalysis = {
    genre: genreResult.genre,
    contentType: genreResult.contentType,
    targetAudience: genreResult.targetAudience,
    narrativeStyle: genreResult.narrativeStyle,
    keyThemes: genreResult.keyThemes,
    confidence: genreResult.confidence,
    method: 'nlp',
  }

  // Extract characters and settings
  const characters = options.includeCharacters !== false
    ? extractCharactersNLP(textSamples).characters.map((char, index) => ({
        id: `char-${index}-${Date.now()}`,
        name: char.name,
        description: char.description,
        visualTraits: char.visualTraits,
        role: char.role,
        promptModifiers: [],
      } as CharacterDefinition))
    : []

  const settings = options.includeSettings !== false
    ? extractSettingsNLP(textSamples).settings.map((setting, index) => ({
        id: `setting-${index}-${Date.now()}`,
        name: setting.name,
        description: setting.description,
        visualStyle: setting.visualStyle,
        timePeriod: setting.timePeriod,
        mood: setting.mood,
        colorPalette: [],
      } as SettingDefinition))
    : []

  // Get style recommendation
  const styleResult = recommendStyleNLP(genreResult)

  const profile = createWorkStyleProfile(
    workId,
    workTitle,
    workType,
    analysis,
    {
      presetId: styleResult.recommendedPresetId,
      colorPalette: styleResult.colorPalette,
      consistencyStrategy: styleResult.consistencyStrategy,
      characters,
      settings,
      totalChunks: chunks.length,
    }
  )

  const suggestions: StyleSuggestions = {
    recommendedPresetId: styleResult.recommendedPresetId,
    reasoning: styleResult.reasoning,
    alternativePresets: getAlternativePresets(styleResult.recommendedPresetId, analysis),
    suggestedColorPalette: styleResult.colorPalette,
    suggestedConsistencyStrategy: styleResult.consistencyStrategy,
    confidence: styleResult.confidence,
  }

  return {
    profile,
    suggestions,
    confidence: suggestions.confidence,
    method: 'nlp',
  }
}

/**
 * Get alternative preset recommendations
 */
function getAlternativePresets(selectedPresetId: string, analysis: ContentAnalysis): string[] {
  const all = getAllPresetIdsForContentType(analysis.contentType)
  return all.filter(id => id !== selectedPresetId).slice(0, 3)
}

/**
 * Get all preset IDs suitable for a content type
 */
function getAllPresetIdsForContentType(contentType: string): string[] {
  const presetMap: Record<string, string[]> = {
    fiction: ['line-art-editorial', 'muted-watercolor', 'photorealistic-scene', 'noir-graphic-novel', 'pencil-sketch'],
    'non-fiction': ['minimalist-symbolic', 'line-art-editorial', 'pencil-sketch'],
    technical: ['technical-diagram', 'minimalist-symbolic', 'line-art-editorial'],
    educational: ['technical-diagram', 'childrens-cartoon', 'minimalist-symbolic'],
    mixed: ['line-art-editorial', 'minimalist-symbolic', 'technical-diagram'],
  }

  return presetMap[contentType] || presetMap.mixed || []
}
