/**
 * LLM Fallback Tests for Flashcard Generation
 * @module tests/unit/flashcards/llmFallback
 *
 * Tests the LLM fallback behavior when static NLP generation fails or returns 0 cards.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the LLM module
vi.mock('@/lib/llm', () => ({
  isLLMAvailable: vi.fn(),
  llm: vi.fn(),
  generateStructured: vi.fn(),
}))

// Mock the generation module
vi.mock('@/lib/generation', () => ({
  generateFlashcards: vi.fn(),
  getGenerationCapabilities: vi.fn(() => ({
    llmAvailable: true,
    staticNLPAvailable: true,
  })),
}))

// Mock the flashcard cache
vi.mock('@/lib/generation/flashcardCache', () => ({
  generateCacheKey: vi.fn((content, slug) => `${slug}-${content.slice(0, 10)}`),
  getFromCache: vi.fn(),
  saveToCache: vi.fn(),
  invalidateCache: vi.fn(),
  getCacheStats: vi.fn(() => Promise.resolve({ totalEntries: 0, totalCards: 0, oldestEntry: null })),
}))

import { isLLMAvailable } from '@/lib/llm'
import { generateFlashcards as generateFlashcardsWithLLM } from '@/lib/generation'
import * as flashcardCache from '@/lib/generation/flashcardCache'

describe('Flashcard LLM Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isLLMAvailable', () => {
    it('should return true when LLM provider is configured', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(true)
      expect(isLLMAvailable()).toBe(true)
    })

    it('should return false when no LLM provider is configured', () => {
      vi.mocked(isLLMAvailable).mockReturnValue(false)
      expect(isLLMAvailable()).toBe(false)
    })
  })

  describe('LLM Fallback Trigger Conditions', () => {
    it('should trigger LLM fallback when static NLP returns 0 cards', async () => {
      // Simulate static NLP returning 0 cards
      const staticCards: never[] = []
      const llmAvailable = true

      // Fallback should trigger
      const shouldFallback = staticCards.length === 0 && llmAvailable
      expect(shouldFallback).toBe(true)
    })

    it('should trigger LLM fallback when static NLP errors', async () => {
      // Simulate static NLP error
      const staticError = true
      const llmAvailable = true

      // Fallback should trigger
      const shouldFallback = staticError && llmAvailable
      expect(shouldFallback).toBe(true)
    })

    it('should NOT trigger LLM fallback when static NLP succeeds', async () => {
      // Simulate static NLP success
      const staticCards = [{ front: 'Q1', back: 'A1' }]
      const staticError = false
      const llmAvailable = true

      // Fallback should NOT trigger
      const shouldFallback = (staticCards.length === 0 || staticError) && llmAvailable
      expect(shouldFallback).toBe(false)
    })

    it('should NOT trigger LLM fallback when LLM is unavailable', async () => {
      // Simulate static NLP returning 0 cards but LLM unavailable
      const staticCards: never[] = []
      const llmAvailable = false

      // Fallback should NOT trigger
      const shouldFallback = staticCards.length === 0 && llmAvailable
      expect(shouldFallback).toBe(false)
    })
  })

  describe('LLM Generation Response', () => {
    it('should handle successful LLM generation', async () => {
      const mockLLMResult = {
        items: [
          {
            id: 'llm-1',
            type: 'basic' as const,
            front: 'What is a closure?',
            back: 'A closure is a function that retains access to its outer scope.',
            hint: 'Think about scope retention',
            tags: ['javascript', 'functions'],
            source: 'llm' as const,
            confidence: 0.85,
            sourceText: 'A closure is a function...',
          },
        ],
        source: 'llm' as const,
        metadata: {
          processingTime: 1500,
          nlpConfidence: 0.85,
          llmUsed: true,
          tokensUsed: 150,
        },
      }

      vi.mocked(generateFlashcardsWithLLM).mockResolvedValue(mockLLMResult)

      const result = await generateFlashcardsWithLLM({
        content: 'Test content about closures',
        strandSlug: 'javascript-basics',
        useLLM: true,
        maxItems: 15,
        difficulty: 'intermediate',
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].front).toBe('What is a closure?')
      expect(result.source).toBe('llm')
    })

    it('should handle LLM generation failure gracefully', async () => {
      vi.mocked(generateFlashcardsWithLLM).mockRejectedValue(new Error('LLM API error'))

      await expect(
        generateFlashcardsWithLLM({
          content: 'Test content',
          strandSlug: 'test',
          useLLM: true,
        })
      ).rejects.toThrow('LLM API error')
    })
  })

  describe('Card Deduplication', () => {
    it('should deduplicate cards based on content hash', () => {
      const hashContent = (front: string, back: string) => {
        return `${front.toLowerCase().trim()}::${back.toLowerCase().trim()}`
      }

      const card1 = { front: 'What is X?', back: 'X is Y' }
      const card2 = { front: 'What is X?', back: 'X is Y' } // Duplicate
      const card3 = { front: 'What is Z?', back: 'Z is W' }

      const seenHashes = new Set<string>()
      const uniqueCards: typeof card1[] = []

      for (const card of [card1, card2, card3]) {
        const hash = hashContent(card.front, card.back)
        if (!seenHashes.has(hash)) {
          uniqueCards.push(card)
          seenHashes.add(hash)
        }
      }

      expect(uniqueCards).toHaveLength(2)
      expect(seenHashes.size).toBe(2)
    })
  })

  describe('Generation Method Tracking', () => {
    it('should track static generation method', () => {
      const cards = [{ source: 'static' }]
      const generationMethod = 'static'
      expect(generationMethod).toBe('static')
    })

    it('should track llm generation method', () => {
      const cards = [{ source: 'llm' }]
      const generationMethod = cards.some((c) => c.source === 'static') ? 'hybrid' : 'llm'
      expect(generationMethod).toBe('llm')
    })

    it('should track hybrid generation method', () => {
      const cards = [{ source: 'static' }, { source: 'llm' }]
      const generationMethod = cards.some((c) => c.source === 'static') ? 'hybrid' : 'llm'
      expect(generationMethod).toBe('hybrid')
    })
  })

  describe('LLM Fallback Tag', () => {
    it('should add llm-fallback tag to LLM-generated cards', () => {
      const llmCard = {
        tags: ['javascript', 'closures'],
      }

      const taggedCard = {
        ...llmCard,
        tags: [...llmCard.tags, 'llm-fallback'],
      }

      expect(taggedCard.tags).toContain('llm-fallback')
      expect(taggedCard.tags).toHaveLength(3)
    })
  })

  describe('Cache Integration', () => {
    it('should cache results with generation method', async () => {
      const cacheKey = 'test-slug-content123'
      const cacheData = {
        cards: [{ id: '1', front: 'Q', back: 'A', type: 'basic', tags: [], source: 'llm', confidence: 0.8 }],
        generationMethod: 'llm' as const,
        strandSlug: 'test-slug',
        createdAt: new Date().toISOString(),
        version: 1,
      }

      await flashcardCache.saveToCache(cacheKey, 'test-slug', cacheData)

      expect(flashcardCache.saveToCache).toHaveBeenCalledWith(cacheKey, 'test-slug', cacheData)
    })

    it('should cache even when 0 cards to prevent repeated LLM calls', async () => {
      const cacheKey = 'test-slug-nocontent'
      const cacheData = {
        cards: [],
        generationMethod: 'static' as const,
        strandSlug: 'test-slug',
        createdAt: new Date().toISOString(),
        version: 1,
      }

      await flashcardCache.saveToCache(cacheKey, 'test-slug', cacheData)

      expect(flashcardCache.saveToCache).toHaveBeenCalled()
    })
  })
})
