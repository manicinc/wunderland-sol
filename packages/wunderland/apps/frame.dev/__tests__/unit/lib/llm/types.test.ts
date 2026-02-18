/**
 * LLM Types Tests
 * @module __tests__/unit/lib/llm/types.test
 *
 * Tests for LLM analysis types and error classes.
 */

import { describe, it, expect } from 'vitest'
import {
  LLMProviderError,
  type LLMProvider,
  type LLMAnalysisOptions,
  type GenreAnalysisResult,
  type CharacterExtractionResult,
  type SettingExtractionResult,
  type WorthinessEvaluationResult,
  type StyleRecommendationResult,
  type DocumentAnalysisResult,
} from '@/lib/llm/types'

describe('LLM Types', () => {
  // ============================================================================
  // LLMProvider type
  // ============================================================================

  describe('LLMProvider type', () => {
    it('accepts claude provider', () => {
      const provider: LLMProvider = 'claude'
      expect(provider).toBe('claude')
    })

    it('accepts openai provider', () => {
      const provider: LLMProvider = 'openai'
      expect(provider).toBe('openai')
    })

    it('accepts nlp provider', () => {
      const provider: LLMProvider = 'nlp'
      expect(provider).toBe('nlp')
    })
  })

  // ============================================================================
  // LLMAnalysisOptions interface
  // ============================================================================

  describe('LLMAnalysisOptions interface', () => {
    it('creates minimal options', () => {
      const options: LLMAnalysisOptions = {}
      expect(options.useLLM).toBeUndefined()
    })

    it('creates options with useLLM enabled', () => {
      const options: LLMAnalysisOptions = {
        useLLM: true,
      }
      expect(options.useLLM).toBe(true)
    })

    it('creates options with specific provider', () => {
      const options: LLMAnalysisOptions = {
        useLLM: true,
        llmProvider: 'claude',
      }
      expect(options.llmProvider).toBe('claude')
    })

    it('creates options with auto provider', () => {
      const options: LLMAnalysisOptions = {
        llmProvider: 'auto',
      }
      expect(options.llmProvider).toBe('auto')
    })

    it('creates options with timeout', () => {
      const options: LLMAnalysisOptions = {
        timeout: 30000,
      }
      expect(options.timeout).toBe(30000)
    })

    it('creates options with maxTokens', () => {
      const options: LLMAnalysisOptions = {
        maxTokens: 4096,
      }
      expect(options.maxTokens).toBe(4096)
    })

    it('creates full options', () => {
      const options: LLMAnalysisOptions = {
        useLLM: true,
        llmProvider: 'openai',
        timeout: 60000,
        maxTokens: 8192,
      }
      expect(options.useLLM).toBe(true)
      expect(options.llmProvider).toBe('openai')
      expect(options.timeout).toBe(60000)
      expect(options.maxTokens).toBe(8192)
    })
  })

  // ============================================================================
  // GenreAnalysisResult interface
  // ============================================================================

  describe('GenreAnalysisResult interface', () => {
    it('creates fiction result', () => {
      const result: GenreAnalysisResult = {
        genre: 'Fantasy',
        contentType: 'fiction',
        targetAudience: 'Young Adults',
        keyThemes: ['adventure', 'magic', 'friendship'],
        confidence: 0.95,
        method: 'claude',
      }
      expect(result.genre).toBe('Fantasy')
      expect(result.contentType).toBe('fiction')
      expect(result.keyThemes).toHaveLength(3)
    })

    it('creates non-fiction result', () => {
      const result: GenreAnalysisResult = {
        genre: 'Biography',
        contentType: 'non-fiction',
        targetAudience: 'General Adult',
        keyThemes: ['history', 'personal growth'],
        confidence: 0.88,
        method: 'openai',
      }
      expect(result.contentType).toBe('non-fiction')
    })

    it('creates technical result', () => {
      const result: GenreAnalysisResult = {
        genre: 'Programming Guide',
        contentType: 'technical',
        targetAudience: 'Software Developers',
        keyThemes: ['typescript', 'best practices'],
        confidence: 0.92,
        method: 'nlp',
      }
      expect(result.contentType).toBe('technical')
    })

    it('creates educational result', () => {
      const result: GenreAnalysisResult = {
        genre: 'Textbook',
        contentType: 'educational',
        targetAudience: 'College Students',
        keyThemes: ['physics', 'mathematics'],
        confidence: 0.9,
        method: 'claude',
      }
      expect(result.contentType).toBe('educational')
    })

    it('creates mixed result', () => {
      const result: GenreAnalysisResult = {
        genre: 'Creative Non-Fiction',
        contentType: 'mixed',
        targetAudience: 'General Reader',
        keyThemes: ['nature', 'science'],
        confidence: 0.75,
        method: 'openai',
      }
      expect(result.contentType).toBe('mixed')
    })

    it('includes optional narrative style', () => {
      const result: GenreAnalysisResult = {
        genre: 'Mystery',
        contentType: 'fiction',
        targetAudience: 'Adults',
        narrativeStyle: 'First Person',
        keyThemes: ['crime', 'detective'],
        confidence: 0.87,
        method: 'claude',
      }
      expect(result.narrativeStyle).toBe('First Person')
    })

    it('includes optional mood', () => {
      const result: GenreAnalysisResult = {
        genre: 'Horror',
        contentType: 'fiction',
        targetAudience: 'Adults',
        keyThemes: ['suspense', 'fear'],
        mood: 'dark and foreboding',
        confidence: 0.91,
        method: 'openai',
      }
      expect(result.mood).toBe('dark and foreboding')
    })
  })

  // ============================================================================
  // CharacterExtractionResult interface
  // ============================================================================

  describe('CharacterExtractionResult interface', () => {
    it('creates empty character list', () => {
      const result: CharacterExtractionResult = {
        characters: [],
        confidence: 0.5,
        method: 'nlp',
      }
      expect(result.characters).toHaveLength(0)
    })

    it('creates result with single character', () => {
      const result: CharacterExtractionResult = {
        characters: [
          {
            name: 'Alice',
            description: 'A curious young girl',
            visualTraits: ['blonde hair', 'blue dress'],
            role: 'protagonist',
            frequency: 50,
          },
        ],
        confidence: 0.92,
        method: 'claude',
      }
      expect(result.characters[0].name).toBe('Alice')
      expect(result.characters[0].visualTraits).toHaveLength(2)
    })

    it('creates result with multiple characters', () => {
      const result: CharacterExtractionResult = {
        characters: [
          {
            name: 'Hero',
            description: 'The main protagonist',
            visualTraits: ['tall', 'dark hair'],
            role: 'protagonist',
            frequency: 100,
          },
          {
            name: 'Villain',
            description: 'The antagonist',
            visualTraits: ['scarred', 'menacing'],
            role: 'antagonist',
            frequency: 30,
          },
          {
            name: 'Mentor',
            description: 'Wise guide',
            visualTraits: ['elderly', 'kind eyes'],
            role: 'supporting',
            frequency: 15,
          },
        ],
        confidence: 0.88,
        method: 'openai',
      }
      expect(result.characters).toHaveLength(3)
    })

    it('creates character without optional role', () => {
      const result: CharacterExtractionResult = {
        characters: [
          {
            name: 'Minor Character',
            description: 'Appears briefly',
            visualTraits: [],
            frequency: 2,
          },
        ],
        confidence: 0.6,
        method: 'nlp',
      }
      expect(result.characters[0].role).toBeUndefined()
    })
  })

  // ============================================================================
  // SettingExtractionResult interface
  // ============================================================================

  describe('SettingExtractionResult interface', () => {
    it('creates empty settings list', () => {
      const result: SettingExtractionResult = {
        settings: [],
        confidence: 0.5,
        method: 'nlp',
      }
      expect(result.settings).toHaveLength(0)
    })

    it('creates result with single setting', () => {
      const result: SettingExtractionResult = {
        settings: [
          {
            name: 'Castle',
            description: 'An ancient stone fortress',
            visualStyle: ['gothic', 'medieval'],
            timePeriod: 'Middle Ages',
            mood: 'mysterious',
            frequency: 25,
          },
        ],
        confidence: 0.89,
        method: 'claude',
      }
      expect(result.settings[0].name).toBe('Castle')
      expect(result.settings[0].visualStyle).toHaveLength(2)
    })

    it('creates setting without optional fields', () => {
      const result: SettingExtractionResult = {
        settings: [
          {
            name: 'Generic Room',
            description: 'A simple room',
            visualStyle: ['minimalist'],
            frequency: 5,
          },
        ],
        confidence: 0.7,
        method: 'nlp',
      }
      expect(result.settings[0].timePeriod).toBeUndefined()
      expect(result.settings[0].mood).toBeUndefined()
    })

    it('creates result with multiple settings', () => {
      const result: SettingExtractionResult = {
        settings: [
          {
            name: 'Forest',
            description: 'Dense woodland',
            visualStyle: ['natural', 'green'],
            mood: 'peaceful',
            frequency: 20,
          },
          {
            name: 'Village',
            description: 'Small rural community',
            visualStyle: ['rustic', 'cozy'],
            timePeriod: 'Victorian',
            frequency: 15,
          },
        ],
        confidence: 0.85,
        method: 'openai',
      }
      expect(result.settings).toHaveLength(2)
    })
  })

  // ============================================================================
  // WorthinessEvaluationResult interface
  // ============================================================================

  describe('WorthinessEvaluationResult interface', () => {
    it('creates positive worthiness result', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.95,
        reasoning: 'Contains vivid imagery suitable for illustration',
        visualConcepts: ['dramatic scene', 'character interaction'],
        method: 'claude',
      }
      expect(result.warrants).toBe(true)
      expect(result.visualConcepts).toHaveLength(2)
    })

    it('creates negative worthiness result', () => {
      const result: WorthinessEvaluationResult = {
        warrants: false,
        confidence: 0.8,
        reasoning: 'Abstract concepts without visual elements',
        visualConcepts: [],
        method: 'openai',
      }
      expect(result.warrants).toBe(false)
      expect(result.visualConcepts).toHaveLength(0)
    })

    it('creates result with scene suggestion', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.88,
        reasoning: 'Dramatic scene description',
        visualConcepts: ['battle', 'warriors'],
        suggestedType: 'scene',
        method: 'claude',
      }
      expect(result.suggestedType).toBe('scene')
    })

    it('creates result with character suggestion', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.9,
        reasoning: 'Detailed character description',
        visualConcepts: ['protagonist portrait'],
        suggestedType: 'character',
        method: 'openai',
      }
      expect(result.suggestedType).toBe('character')
    })

    it('creates result with diagram suggestion', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.85,
        reasoning: 'Technical concepts require visual explanation',
        visualConcepts: ['architecture', 'flow'],
        suggestedType: 'diagram',
        method: 'nlp',
      }
      expect(result.suggestedType).toBe('diagram')
    })

    it('creates result with process suggestion', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.82,
        reasoning: 'Step-by-step procedure',
        visualConcepts: ['workflow', 'steps'],
        suggestedType: 'process',
        method: 'claude',
      }
      expect(result.suggestedType).toBe('process')
    })

    it('creates result with setting suggestion', () => {
      const result: WorthinessEvaluationResult = {
        warrants: true,
        confidence: 0.87,
        reasoning: 'Vivid environmental description',
        visualConcepts: ['landscape', 'atmosphere'],
        suggestedType: 'setting',
        method: 'openai',
      }
      expect(result.suggestedType).toBe('setting')
    })
  })

  // ============================================================================
  // StyleRecommendationResult interface
  // ============================================================================

  describe('StyleRecommendationResult interface', () => {
    it('creates result with auto-detected colors', () => {
      const result: StyleRecommendationResult = {
        recommendedPresetId: 'fantasy-epic',
        reasoning: 'Matches the epic fantasy genre',
        colorPalette: {
          primary: ['#4A5568', '#2D3748'],
          accent: ['#ED8936', '#DD6B20'],
          mood: 'dramatic',
          source: 'auto-detected',
        },
        consistencyStrategy: 'seed',
        confidence: 0.92,
        method: 'claude',
      }
      expect(result.colorPalette.source).toBe('auto-detected')
      expect(result.consistencyStrategy).toBe('seed')
    })

    it('creates result with user-selected colors', () => {
      const result: StyleRecommendationResult = {
        recommendedPresetId: 'custom-theme',
        reasoning: 'User preference applied',
        colorPalette: {
          primary: ['#1A202C'],
          accent: ['#38B2AC'],
          mood: 'modern',
          source: 'user-selected',
        },
        consistencyStrategy: 'reference',
        confidence: 1.0,
        method: 'openai',
      }
      expect(result.colorPalette.source).toBe('user-selected')
      expect(result.consistencyStrategy).toBe('reference')
    })

    it('creates result with style-transfer strategy', () => {
      const result: StyleRecommendationResult = {
        recommendedPresetId: 'manga-style',
        reasoning: 'Anime/manga content detected',
        colorPalette: {
          primary: ['#FFFFFF', '#000000'],
          accent: ['#FF6B6B'],
          mood: 'dynamic',
          source: 'auto-detected',
        },
        consistencyStrategy: 'style-transfer',
        confidence: 0.88,
        method: 'claude',
      }
      expect(result.consistencyStrategy).toBe('style-transfer')
    })

    it('creates result with minimal colors', () => {
      const result: StyleRecommendationResult = {
        recommendedPresetId: 'minimalist',
        reasoning: 'Clean technical documentation',
        colorPalette: {
          primary: [],
          accent: [],
          mood: 'neutral',
          source: 'auto-detected',
        },
        consistencyStrategy: 'seed',
        confidence: 0.75,
        method: 'nlp',
      }
      expect(result.colorPalette.primary).toHaveLength(0)
    })
  })

  // ============================================================================
  // DocumentAnalysisResult interface
  // ============================================================================

  describe('DocumentAnalysisResult interface', () => {
    it('creates minimal analysis result', () => {
      const result: DocumentAnalysisResult = {
        genre: {
          genre: 'Unknown',
          contentType: 'mixed',
          targetAudience: 'General',
          keyThemes: [],
          confidence: 0.5,
          method: 'nlp',
        },
        styleRecommendation: {
          recommendedPresetId: 'default',
          reasoning: 'Default style applied',
          colorPalette: {
            primary: [],
            accent: [],
            mood: 'neutral',
            source: 'auto-detected',
          },
          consistencyStrategy: 'seed',
          confidence: 0.5,
          method: 'nlp',
        },
        method: 'nlp',
        analysisTime: 150,
      }
      expect(result.method).toBe('nlp')
      expect(result.analysisTime).toBe(150)
    })

    it('creates full analysis result with characters', () => {
      const result: DocumentAnalysisResult = {
        genre: {
          genre: 'Science Fiction',
          contentType: 'fiction',
          targetAudience: 'Adults',
          keyThemes: ['space', 'technology'],
          confidence: 0.9,
          method: 'claude',
        },
        characters: {
          characters: [
            {
              name: 'Captain',
              description: 'Ship commander',
              visualTraits: ['uniform', 'stern expression'],
              frequency: 45,
            },
          ],
          confidence: 0.85,
          method: 'claude',
        },
        styleRecommendation: {
          recommendedPresetId: 'sci-fi-retro',
          reasoning: 'Classic sci-fi aesthetic',
          colorPalette: {
            primary: ['#0D1B2A'],
            accent: ['#00FF00'],
            mood: 'futuristic',
            source: 'auto-detected',
          },
          consistencyStrategy: 'seed',
          confidence: 0.88,
          method: 'claude',
        },
        method: 'claude',
        analysisTime: 2500,
      }
      expect(result.characters).toBeDefined()
      expect(result.characters!.characters).toHaveLength(1)
    })

    it('creates full analysis result with settings', () => {
      const result: DocumentAnalysisResult = {
        genre: {
          genre: 'Historical Fiction',
          contentType: 'fiction',
          targetAudience: 'Adults',
          keyThemes: ['war', 'romance'],
          confidence: 0.92,
          method: 'openai',
        },
        settings: {
          settings: [
            {
              name: 'Battlefield',
              description: 'World War II setting',
              visualStyle: ['gritty', 'period accurate'],
              timePeriod: '1940s',
              frequency: 30,
            },
          ],
          confidence: 0.9,
          method: 'openai',
        },
        styleRecommendation: {
          recommendedPresetId: 'period-drama',
          reasoning: 'Historical accuracy focus',
          colorPalette: {
            primary: ['#5D4E37'],
            accent: ['#8B4513'],
            mood: 'dramatic',
            source: 'auto-detected',
          },
          consistencyStrategy: 'reference',
          confidence: 0.91,
          method: 'openai',
        },
        method: 'openai',
        analysisTime: 3200,
      }
      expect(result.settings).toBeDefined()
      expect(result.settings!.settings[0].timePeriod).toBe('1940s')
    })

    it('tracks analysis time correctly', () => {
      const result: DocumentAnalysisResult = {
        genre: {
          genre: 'Tutorial',
          contentType: 'technical',
          targetAudience: 'Developers',
          keyThemes: ['programming'],
          confidence: 0.95,
          method: 'claude',
        },
        styleRecommendation: {
          recommendedPresetId: 'technical-docs',
          reasoning: 'Code-focused content',
          colorPalette: {
            primary: ['#1E1E1E'],
            accent: ['#569CD6'],
            mood: 'professional',
            source: 'auto-detected',
          },
          consistencyStrategy: 'seed',
          confidence: 0.93,
          method: 'claude',
        },
        method: 'claude',
        analysisTime: 1850,
      }
      expect(result.analysisTime).toBeGreaterThan(0)
      expect(typeof result.analysisTime).toBe('number')
    })
  })

  // ============================================================================
  // LLMProviderError class
  // ============================================================================

  describe('LLMProviderError class', () => {
    it('creates error with provider prefix in message', () => {
      const error = new LLMProviderError('Request timeout', 'claude')
      expect(error.message).toBe('[claude] Request timeout')
      expect(error.provider).toBe('claude')
    })

    it('sets error name correctly', () => {
      const error = new LLMProviderError('API error', 'openai')
      expect(error.name).toBe('LLMProviderError')
    })

    it('is instanceof Error', () => {
      const error = new LLMProviderError('Test error', 'nlp')
      expect(error).toBeInstanceOf(Error)
    })

    it('stores original error', () => {
      const originalError = new Error('Network failure')
      const error = new LLMProviderError('Connection failed', 'claude', originalError)
      expect(error.originalError).toBe(originalError)
    })

    it('stores original error as string', () => {
      const error = new LLMProviderError('API failed', 'openai', 'Timeout occurred')
      expect(error.originalError).toBe('Timeout occurred')
    })

    it('stores original error as object', () => {
      const originalError = { code: 'RATE_LIMIT', retryAfter: 60 }
      const error = new LLMProviderError('Rate limited', 'claude', originalError)
      expect(error.originalError).toEqual({ code: 'RATE_LIMIT', retryAfter: 60 })
    })

    it('works without original error', () => {
      const error = new LLMProviderError('Unknown error', 'nlp')
      expect(error.originalError).toBeUndefined()
    })

    it('can be thrown and caught', () => {
      expect(() => {
        throw new LLMProviderError('Provider unavailable', 'openai')
      }).toThrow(LLMProviderError)
    })

    it('provides correct provider in catch block', () => {
      try {
        throw new LLMProviderError('Test error', 'claude')
      } catch (e) {
        if (e instanceof LLMProviderError) {
          expect(e.provider).toBe('claude')
        }
      }
    })

    it('works with different providers', () => {
      const providers: LLMProvider[] = ['claude', 'openai', 'nlp']
      providers.forEach((provider) => {
        const error = new LLMProviderError('Error', provider)
        expect(error.message).toContain('[' + provider + ']')
        expect(error.provider).toBe(provider)
      })
    })

    it('has proper stack trace', () => {
      const error = new LLMProviderError('Stack test', 'claude')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('LLMProviderError')
    })
  })

  // ============================================================================
  // Type consistency scenarios
  // ============================================================================

  describe('type consistency scenarios', () => {
    it('provider is consistent across result types', () => {
      const provider: LLMProvider = 'claude'

      const genre: GenreAnalysisResult = {
        genre: 'Test',
        contentType: 'fiction',
        targetAudience: 'Test',
        keyThemes: [],
        confidence: 0.9,
        method: provider,
      }

      const characters: CharacterExtractionResult = {
        characters: [],
        confidence: 0.9,
        method: provider,
      }

      expect(genre.method).toBe(characters.method)
    })

    it('confidence values are normalized 0-1', () => {
      const highConfidence: GenreAnalysisResult = {
        genre: 'High',
        contentType: 'fiction',
        targetAudience: 'Test',
        keyThemes: [],
        confidence: 0.99,
        method: 'claude',
      }

      const lowConfidence: GenreAnalysisResult = {
        genre: 'Low',
        contentType: 'fiction',
        targetAudience: 'Test',
        keyThemes: [],
        confidence: 0.1,
        method: 'nlp',
      }

      expect(highConfidence.confidence).toBeLessThanOrEqual(1)
      expect(lowConfidence.confidence).toBeGreaterThanOrEqual(0)
    })
  })
})
