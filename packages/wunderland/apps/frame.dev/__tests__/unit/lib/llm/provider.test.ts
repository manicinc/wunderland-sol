/**
 * LLM Provider Tests
 * @module __tests__/unit/lib/llm/provider.test
 *
 * Tests for LLM provider waterfall chain.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock provider modules
vi.mock('@/lib/llm/claude', () => ({
  initClaude: vi.fn(),
  isClaudeAvailable: vi.fn(() => false),
  analyzeDocumentWithClaude: vi.fn(),
  analyzeGenreWithClaude: vi.fn(),
  extractCharactersWithClaude: vi.fn(),
  extractSettingsWithClaude: vi.fn(),
  evaluateWorthinessWithClaude: vi.fn(),
  recommendStyleWithClaude: vi.fn(),
}))

vi.mock('@/lib/llm/openai', () => ({
  initOpenAILLM: vi.fn(),
  isOpenAILLMAvailable: vi.fn(() => false),
  analyzeDocumentWithOpenAI: vi.fn(),
  analyzeGenreWithOpenAI: vi.fn(),
  extractCharactersWithOpenAI: vi.fn(),
  extractSettingsWithOpenAI: vi.fn(),
  evaluateWorthinessWithOpenAI: vi.fn(),
  recommendStyleWithOpenAI: vi.fn(),
}))

vi.mock('@/lib/llm/nlp', () => ({
  analyzeGenreNLP: vi.fn(() => ({
    genre: 'unknown',
    contentType: 'mixed',
    targetAudience: 'general',
    keyThemes: [],
    confidence: 0.5,
    method: 'nlp',
  })),
  extractCharactersNLP: vi.fn(() => ({
    characters: [],
    confidence: 0.5,
    method: 'nlp',
  })),
  extractSettingsNLP: vi.fn(() => ({
    settings: [],
    confidence: 0.5,
    method: 'nlp',
  })),
  evaluateWorthinessNLP: vi.fn(() => ({
    warrants: false,
    confidence: 0.5,
    reasoning: 'NLP evaluation',
    visualConcepts: [],
    method: 'nlp',
  })),
  recommendStyleNLP: vi.fn(() => ({
    recommendedPresetId: 'default',
    reasoning: 'NLP recommendation',
    colorPalette: {
      primary: ['#000'],
      accent: ['#fff'],
      mood: 'neutral',
      source: 'auto-detected',
    },
    consistencyStrategy: 'seed',
    confidence: 0.5,
    method: 'nlp',
  })),
  analyzeDocumentNLP: vi.fn(() => ({
    genre: {
      genre: 'unknown',
      contentType: 'mixed',
      targetAudience: 'general',
      keyThemes: [],
      confidence: 0.5,
      method: 'nlp',
    },
    styleRecommendation: {
      recommendedPresetId: 'default',
      reasoning: 'NLP recommendation',
      colorPalette: {
        primary: ['#000'],
        accent: ['#fff'],
        mood: 'neutral',
        source: 'auto-detected',
      },
      consistencyStrategy: 'seed',
      confidence: 0.5,
      method: 'nlp',
    },
    method: 'nlp',
    analysisTime: 100,
  })),
}))

// Import after mocking
import {
  getAvailableProviders,
  analyzeDocument,
  analyzeGenre,
  extractCharacters,
  extractSettings,
  evaluateWorthiness,
  recommendStyle,
} from '@/lib/llm/provider'

import { isClaudeAvailable } from '@/lib/llm/claude'
import { isOpenAILLMAvailable } from '@/lib/llm/openai'
import { analyzeGenreNLP, analyzeDocumentNLP } from '@/lib/llm/nlp'

// ============================================================================
// getAvailableProviders
// ============================================================================

describe('getAvailableProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('always includes nlp', () => {
    const providers = getAvailableProviders()

    expect(providers).toContain('nlp')
  })

  it('includes claude when available', () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(true)

    const providers = getAvailableProviders()

    expect(providers).toContain('claude')
  })

  it('excludes claude when not available', () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(false)

    const providers = getAvailableProviders()

    expect(providers).not.toContain('claude')
  })

  it('includes openai when available', () => {
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(true)

    const providers = getAvailableProviders()

    expect(providers).toContain('openai')
  })

  it('excludes openai when not available', () => {
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(false)

    const providers = getAvailableProviders()

    expect(providers).not.toContain('openai')
  })

  it('returns all providers when all available', () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(true)
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(true)

    const providers = getAvailableProviders()

    expect(providers).toEqual(['claude', 'openai', 'nlp'])
  })

  it('returns only nlp when no LLMs available', () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(false)
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(false)

    const providers = getAvailableProviders()

    expect(providers).toEqual(['nlp'])
  })
})

// ============================================================================
// analyzeDocument
// ============================================================================

describe('analyzeDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses NLP when useLLM is false', async () => {
    const result = await analyzeDocument(['test content'], { useLLM: false })

    expect(analyzeDocumentNLP).toHaveBeenCalled()
    expect(result.method).toBe('nlp')
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await analyzeDocument(['test content'], { llmProvider: 'nlp' })

    expect(analyzeDocumentNLP).toHaveBeenCalled()
    expect(result.method).toBe('nlp')
  })

  it('falls back to NLP when no LLM providers available', async () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(false)
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(false)

    const result = await analyzeDocument(['test content'])

    expect(result.method).toBe('nlp')
  })

  it('defaults to auto provider', async () => {
    const result = await analyzeDocument(['test content'])

    // With no providers available, should fall back to NLP
    expect(result).toBeDefined()
  })

  it('passes options to NLP function', async () => {
    const options = { useLLM: false, includeCharacters: true }

    await analyzeDocument(['test'], options)

    expect(analyzeDocumentNLP).toHaveBeenCalledWith(['test'], options)
  })
})

// ============================================================================
// analyzeGenre
// ============================================================================

describe('analyzeGenre', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses NLP when useLLM is false', async () => {
    const result = await analyzeGenre(['fiction content'], { useLLM: false })

    expect(analyzeGenreNLP).toHaveBeenCalled()
    expect(result.method).toBe('nlp')
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await analyzeGenre(['content'], { llmProvider: 'nlp' })

    expect(analyzeGenreNLP).toHaveBeenCalled()
    expect(result.method).toBe('nlp')
  })

  it('returns genre analysis result', async () => {
    const result = await analyzeGenre(['test'])

    expect(result).toHaveProperty('genre')
    expect(result).toHaveProperty('contentType')
    expect(result).toHaveProperty('targetAudience')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('method')
  })

  it('falls back to NLP in auto mode when no LLMs available', async () => {
    vi.mocked(isClaudeAvailable).mockReturnValue(false)
    vi.mocked(isOpenAILLMAvailable).mockReturnValue(false)

    const result = await analyzeGenre(['test'], { llmProvider: 'auto' })

    expect(result.method).toBe('nlp')
  })
})

// ============================================================================
// extractCharacters
// ============================================================================

describe('extractCharacters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses NLP when useLLM is false', async () => {
    const result = await extractCharacters(['story with characters'], { useLLM: false })

    expect(result.method).toBe('nlp')
  })

  it('returns character extraction result', async () => {
    const result = await extractCharacters(['test'])

    expect(result).toHaveProperty('characters')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('method')
    expect(Array.isArray(result.characters)).toBe(true)
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await extractCharacters(['content'], { llmProvider: 'nlp' })

    expect(result.method).toBe('nlp')
  })
})

// ============================================================================
// extractSettings
// ============================================================================

describe('extractSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses NLP when useLLM is false', async () => {
    const result = await extractSettings(['story with settings'], { useLLM: false })

    expect(result.method).toBe('nlp')
  })

  it('returns settings extraction result', async () => {
    const result = await extractSettings(['test'])

    expect(result).toHaveProperty('settings')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('method')
    expect(Array.isArray(result.settings)).toBe(true)
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await extractSettings(['content'], { llmProvider: 'nlp' })

    expect(result.method).toBe('nlp')
  })
})

// ============================================================================
// evaluateWorthiness
// ============================================================================

describe('evaluateWorthiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses NLP when useLLM is false', async () => {
    const result = await evaluateWorthiness('content to evaluate', { useLLM: false })

    expect(result.method).toBe('nlp')
  })

  it('returns worthiness evaluation result', async () => {
    const result = await evaluateWorthiness('test')

    expect(result).toHaveProperty('warrants')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('method')
    expect(typeof result.warrants).toBe('boolean')
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await evaluateWorthiness('content', { llmProvider: 'nlp' })

    expect(result.method).toBe('nlp')
  })
})

// ============================================================================
// recommendStyle
// ============================================================================

describe('recommendStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockGenreResult = {
    genre: 'fiction',
    contentType: 'fiction' as const,
    targetAudience: 'adults',
    keyThemes: ['adventure'],
    confidence: 0.8,
    method: 'nlp' as const,
  }

  it('uses NLP when useLLM is false', async () => {
    const result = await recommendStyle(mockGenreResult, { useLLM: false })

    expect(result.method).toBe('nlp')
  })

  it('returns style recommendation result', async () => {
    const result = await recommendStyle(mockGenreResult)

    expect(result).toHaveProperty('recommendedPresetId')
    expect(result).toHaveProperty('reasoning')
    expect(result).toHaveProperty('colorPalette')
    expect(result).toHaveProperty('consistencyStrategy')
    expect(result).toHaveProperty('confidence')
    expect(result).toHaveProperty('method')
  })

  it('uses NLP when llmProvider is nlp', async () => {
    const result = await recommendStyle(mockGenreResult, { llmProvider: 'nlp' })

    expect(result.method).toBe('nlp')
  })

  it('returns valid colorPalette structure', async () => {
    const result = await recommendStyle(mockGenreResult)

    expect(result.colorPalette).toHaveProperty('primary')
    expect(result.colorPalette).toHaveProperty('accent')
    expect(result.colorPalette).toHaveProperty('mood')
    expect(result.colorPalette).toHaveProperty('source')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles empty text samples', async () => {
    const result = await analyzeGenre([])

    expect(result).toBeDefined()
  })

  it('handles empty content for worthiness', async () => {
    const result = await evaluateWorthiness('')

    expect(result).toBeDefined()
  })

  it('handles default options when none provided', async () => {
    const result = await analyzeDocument(['test'])

    expect(result).toBeDefined()
    expect(result.method).toBe('nlp')
  })
})
