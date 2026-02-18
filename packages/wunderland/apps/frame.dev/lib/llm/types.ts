/**
 * LLM Analysis Types
 * @module lib/llm/types
 *
 * Common types for LLM-based content analysis
 */

export type LLMProvider = 'claude' | 'openai' | 'nlp'

export interface LLMAnalysisOptions {
  useLLM?: boolean
  llmProvider?: 'auto' | LLMProvider
  timeout?: number
  maxTokens?: number
}

/**
 * Genre Detection Result
 */
export interface GenreAnalysisResult {
  genre: string
  contentType: 'fiction' | 'non-fiction' | 'technical' | 'educational' | 'mixed'
  targetAudience: string
  narrativeStyle?: string
  keyThemes: string[]
  mood?: string
  confidence: number
  method: LLMProvider
}

/**
 * Character Extraction Result
 */
export interface CharacterExtractionResult {
  characters: Array<{
    name: string
    description: string
    visualTraits: string[]
    role?: string
    frequency: number
  }>
  confidence: number
  method: LLMProvider
}

/**
 * Setting Extraction Result
 */
export interface SettingExtractionResult {
  settings: Array<{
    name: string
    description: string
    visualStyle: string[]
    timePeriod?: string
    mood?: string
    frequency: number
  }>
  confidence: number
  method: LLMProvider
}

/**
 * Worthiness Evaluation Result
 */
export interface WorthinessEvaluationResult {
  warrants: boolean
  confidence: number
  reasoning: string
  visualConcepts: string[]
  suggestedType?: 'scene' | 'character' | 'diagram' | 'process' | 'setting'
  method: LLMProvider
}

/**
 * Style Recommendation Result
 */
export interface StyleRecommendationResult {
  recommendedPresetId: string
  reasoning: string
  colorPalette: {
    primary: string[]
    accent: string[]
    mood: string
    source: 'auto-detected' | 'user-selected'
  }
  consistencyStrategy: 'seed' | 'reference' | 'style-transfer'
  confidence: number
  method: LLMProvider
}

/**
 * Combined Document Analysis Result
 */
export interface DocumentAnalysisResult {
  genre: GenreAnalysisResult
  characters?: CharacterExtractionResult
  settings?: SettingExtractionResult
  styleRecommendation: StyleRecommendationResult
  method: LLMProvider
  analysisTime: number
}

/**
 * LLM Provider Error
 */
export class LLMProviderError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public originalError?: unknown
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'LLMProviderError'
  }
}
