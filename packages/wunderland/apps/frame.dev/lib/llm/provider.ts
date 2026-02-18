/**
 * LLM Provider Waterfall Chain
 * @module lib/llm/provider
 *
 * Orchestrates Claude → OpenAI → NLP fallback chain
 */

import {
  initClaude,
  isClaudeAvailable,
  analyzeDocumentWithClaude,
  analyzeGenreWithClaude,
  extractCharactersWithClaude,
  extractSettingsWithClaude,
  evaluateWorthinessWithClaude,
  recommendStyleWithClaude,
} from './claude'

import {
  initOpenAILLM,
  isOpenAILLMAvailable,
  analyzeDocumentWithOpenAI,
  analyzeGenreWithOpenAI,
  extractCharactersWithOpenAI,
  extractSettingsWithOpenAI,
  evaluateWorthinessWithOpenAI,
  recommendStyleWithOpenAI,
} from './openai'

import {
  analyzeGenreNLP,
  extractCharactersNLP,
  extractSettingsNLP,
  evaluateWorthinessNLP,
  recommendStyleNLP,
  analyzeDocumentNLP,
} from './nlp'

import type {
  LLMProvider,
  LLMAnalysisOptions,
  DocumentAnalysisResult,
  GenreAnalysisResult,
  CharacterExtractionResult,
  SettingExtractionResult,
  WorthinessEvaluationResult,
  StyleRecommendationResult,
} from './types'

/**
 * Initialize all LLM providers
 */
export function initAllProviders() {
  initClaude()
  initOpenAILLM()
  console.log('[LLM Providers] All providers initialized')
}

/**
 * Determine which providers are available
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = []
  if (isClaudeAvailable()) providers.push('claude')
  if (isOpenAILLMAvailable()) providers.push('openai')
  providers.push('nlp') // Always available
  return providers
}

/**
 * Analyze full document with provider waterfall
 */
export async function analyzeDocument(
  textSamples: string[],
  options: LLMAnalysisOptions & {
    includeCharacters?: boolean
    includeSettings?: boolean
  } = {}
): Promise<DocumentAnalysisResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  // If LLM disabled, use NLP directly
  if (!useLLM || llmProvider === 'nlp') {
    return analyzeDocumentNLP(textSamples, options)
  }

  // Try specific provider
  if (llmProvider === 'claude') {
    if (isClaudeAvailable()) {
      try {
        return await analyzeDocumentWithClaude(textSamples, options)
      } catch (error) {
        console.warn('[Provider] Claude failed, falling back to NLP:', error)
        return analyzeDocumentNLP(textSamples, options)
      }
    } else {
      console.warn('[Provider] Claude not available, using NLP')
      return analyzeDocumentNLP(textSamples, options)
    }
  }

  if (llmProvider === 'openai') {
    if (isOpenAILLMAvailable()) {
      try {
        return await analyzeDocumentWithOpenAI(textSamples, options)
      } catch (error) {
        console.warn('[Provider] OpenAI failed, falling back to NLP:', error)
        return analyzeDocumentNLP(textSamples, options)
      }
    } else {
      console.warn('[Provider] OpenAI not available, using NLP')
      return analyzeDocumentNLP(textSamples, options)
    }
  }

  // Auto mode: waterfall Claude → OpenAI → NLP
  if (llmProvider === 'auto') {
    // Try Claude first
    if (isClaudeAvailable()) {
      try {
        console.log('[Provider] Trying Claude...')
        return await analyzeDocumentWithClaude(textSamples, options)
      } catch (claudeError) {
        console.warn('[Provider] Claude failed, trying OpenAI...', claudeError)
      }
    }

    // Try OpenAI second
    if (isOpenAILLMAvailable()) {
      try {
        console.log('[Provider] Trying OpenAI...')
        return await analyzeDocumentWithOpenAI(textSamples, options)
      } catch (openaiError) {
        console.warn('[Provider] OpenAI failed, falling back to NLP...', openaiError)
      }
    }

    // Final fallback to NLP
    console.log('[Provider] Using NLP fallback')
    return analyzeDocumentNLP(textSamples, options)
  }

  // Default: NLP
  return analyzeDocumentNLP(textSamples, options)
}

/**
 * Analyze genre with provider waterfall
 */
export async function analyzeGenre(
  textSamples: string[],
  options: LLMAnalysisOptions = {}
): Promise<GenreAnalysisResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  if (!useLLM || llmProvider === 'nlp') {
    return analyzeGenreNLP(textSamples)
  }

  if (llmProvider === 'claude' && isClaudeAvailable()) {
    try {
      return await analyzeGenreWithClaude(textSamples)
    } catch (error) {
      console.warn('[Provider] Claude genre analysis failed, falling back to NLP')
      return analyzeGenreNLP(textSamples)
    }
  }

  if (llmProvider === 'openai' && isOpenAILLMAvailable()) {
    try {
      return await analyzeGenreWithOpenAI(textSamples)
    } catch (error) {
      console.warn('[Provider] OpenAI genre analysis failed, falling back to NLP')
      return analyzeGenreNLP(textSamples)
    }
  }

  // Auto waterfall
  if (llmProvider === 'auto') {
    if (isClaudeAvailable()) {
      try {
        return await analyzeGenreWithClaude(textSamples)
      } catch (error) {
        console.warn('[Provider] Claude failed, trying OpenAI...')
      }
    }

    if (isOpenAILLMAvailable()) {
      try {
        return await analyzeGenreWithOpenAI(textSamples)
      } catch (error) {
        console.warn('[Provider] OpenAI failed, falling back to NLP')
      }
    }
  }

  return analyzeGenreNLP(textSamples)
}

/**
 * Extract characters with provider waterfall
 */
export async function extractCharacters(
  textSamples: string[],
  options: LLMAnalysisOptions = {}
): Promise<CharacterExtractionResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  if (!useLLM || llmProvider === 'nlp') {
    return extractCharactersNLP(textSamples)
  }

  if (llmProvider === 'claude' && isClaudeAvailable()) {
    try {
      return await extractCharactersWithClaude(textSamples)
    } catch (error) {
      return extractCharactersNLP(textSamples)
    }
  }

  if (llmProvider === 'openai' && isOpenAILLMAvailable()) {
    try {
      return await extractCharactersWithOpenAI(textSamples)
    } catch (error) {
      return extractCharactersNLP(textSamples)
    }
  }

  // Auto waterfall
  if (llmProvider === 'auto') {
    if (isClaudeAvailable()) {
      try {
        return await extractCharactersWithClaude(textSamples)
      } catch (error) {
        // Fall through to OpenAI
      }
    }

    if (isOpenAILLMAvailable()) {
      try {
        return await extractCharactersWithOpenAI(textSamples)
      } catch (error) {
        // Fall through to NLP
      }
    }
  }

  return extractCharactersNLP(textSamples)
}

/**
 * Extract settings with provider waterfall
 */
export async function extractSettings(
  textSamples: string[],
  options: LLMAnalysisOptions = {}
): Promise<SettingExtractionResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  if (!useLLM || llmProvider === 'nlp') {
    return extractSettingsNLP(textSamples)
  }

  if (llmProvider === 'claude' && isClaudeAvailable()) {
    try {
      return await extractSettingsWithClaude(textSamples)
    } catch (error) {
      return extractSettingsNLP(textSamples)
    }
  }

  if (llmProvider === 'openai' && isOpenAILLMAvailable()) {
    try {
      return await extractSettingsWithOpenAI(textSamples)
    } catch (error) {
      return extractSettingsNLP(textSamples)
    }
  }

  // Auto waterfall
  if (llmProvider === 'auto') {
    if (isClaudeAvailable()) {
      try {
        return await extractSettingsWithClaude(textSamples)
      } catch (error) {
        // Fall through
      }
    }

    if (isOpenAILLMAvailable()) {
      try {
        return await extractSettingsWithOpenAI(textSamples)
      } catch (error) {
        // Fall through
      }
    }
  }

  return extractSettingsNLP(textSamples)
}

/**
 * Evaluate content worthiness with provider waterfall
 */
export async function evaluateWorthiness(
  content: string,
  options: LLMAnalysisOptions = {}
): Promise<WorthinessEvaluationResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  if (!useLLM || llmProvider === 'nlp') {
    return evaluateWorthinessNLP(content)
  }

  if (llmProvider === 'claude' && isClaudeAvailable()) {
    try {
      return await evaluateWorthinessWithClaude(content)
    } catch (error) {
      return evaluateWorthinessNLP(content)
    }
  }

  if (llmProvider === 'openai' && isOpenAILLMAvailable()) {
    try {
      return await evaluateWorthinessWithOpenAI(content)
    } catch (error) {
      return evaluateWorthinessNLP(content)
    }
  }

  // Auto waterfall
  if (llmProvider === 'auto') {
    if (isClaudeAvailable()) {
      try {
        return await evaluateWorthinessWithClaude(content)
      } catch (error) {
        // Fall through
      }
    }

    if (isOpenAILLMAvailable()) {
      try {
        return await evaluateWorthinessWithOpenAI(content)
      } catch (error) {
        // Fall through
      }
    }
  }

  return evaluateWorthinessNLP(content)
}

/**
 * Recommend style with provider waterfall
 */
export async function recommendStyle(
  genreResult: GenreAnalysisResult,
  options: LLMAnalysisOptions = {}
): Promise<StyleRecommendationResult> {
  const { useLLM = true, llmProvider = 'auto' } = options

  if (!useLLM || llmProvider === 'nlp') {
    return recommendStyleNLP(genreResult)
  }

  if (llmProvider === 'claude' && isClaudeAvailable()) {
    try {
      return await recommendStyleWithClaude(genreResult)
    } catch (error) {
      return recommendStyleNLP(genreResult)
    }
  }

  if (llmProvider === 'openai' && isOpenAILLMAvailable()) {
    try {
      return await recommendStyleWithOpenAI(genreResult)
    } catch (error) {
      return recommendStyleNLP(genreResult)
    }
  }

  // Auto waterfall
  if (llmProvider === 'auto') {
    if (isClaudeAvailable()) {
      try {
        return await recommendStyleWithClaude(genreResult)
      } catch (error) {
        // Fall through
      }
    }

    if (isOpenAILLMAvailable()) {
      try {
        return await recommendStyleWithOpenAI(genreResult)
      } catch (error) {
        // Fall through
      }
    }
  }

  return recommendStyleNLP(genreResult)
}
