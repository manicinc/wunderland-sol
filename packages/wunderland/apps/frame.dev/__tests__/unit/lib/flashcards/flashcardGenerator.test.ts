/**
 * Flashcard Generator Tests
 * @module __tests__/unit/lib/flashcards/flashcardGenerator.test
 *
 * Tests for AI-powered flashcard generation functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock functions using vi.hoisted
const { mockStreamLLM, mockGetAPIKey } = vi.hoisted(() => {
  const mockStreamLLM = vi.fn()
  const mockGetAPIKey = vi.fn()
  return { mockStreamLLM, mockGetAPIKey }
})

// Mock dependencies
vi.mock('@/lib/llm/streaming', () => ({
  streamLLM: mockStreamLLM,
}))

vi.mock('@/lib/config/apiKeyStorage', () => ({
  getAPIKey: mockGetAPIKey,
}))

import {
  generateFlashcardsFromContent,
  generateFlashcardsFromGaps,
  generateFlashcardFromHighlight,
  isFlashcardGenerationAvailable,
  type Flashcard,
  type GenerateFlashcardsOptions,
} from '@/lib/flashcards/flashcardGenerator'

// ============================================================================
// Test Helpers
// ============================================================================

function createMockStream(responseText: string) {
  return async function* () {
    yield { type: 'text', content: responseText }
  }
}

function createMockFlashcardResponse(cards: Array<{ front: string; back: string; difficulty?: string; tags?: string[] }>) {
  return JSON.stringify(cards.map((c) => ({
    front: c.front,
    back: c.back,
    difficulty: c.difficulty || 'medium',
    tags: c.tags,
  })))
}

// ============================================================================
// Test Setup
// ============================================================================

describe('Flashcard Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Flashcard Type Tests
  // ============================================================================

  describe('Flashcard type', () => {
    it('creates flashcard with required fields', () => {
      const card: Flashcard = {
        id: 'fc-123',
        front: 'What is TypeScript?',
        back: 'A typed superset of JavaScript',
      }

      expect(card.id).toBe('fc-123')
      expect(card.front).toBeDefined()
      expect(card.back).toBeDefined()
    })

    it('creates flashcard with optional fields', () => {
      const card: Flashcard = {
        id: 'fc-456',
        front: 'Define monorepo',
        back: 'A repository containing multiple projects',
        tags: ['architecture'],
        difficulty: 'easy',
      }

      expect(card.tags).toEqual(['architecture'])
      expect(card.difficulty).toBe('easy')
    })

    it('accepts all difficulty levels', () => {
      const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']

      difficulties.forEach((diff) => {
        const card: Flashcard = {
          id: `fc-${diff}`,
          front: 'Q',
          back: 'A',
          difficulty: diff,
        }
        expect(card.difficulty).toBe(diff)
      })
    })
  })

  // ============================================================================
  // GenerateFlashcardsOptions Type Tests
  // ============================================================================

  describe('GenerateFlashcardsOptions type', () => {
    it('creates options with all fields', () => {
      const options: GenerateFlashcardsOptions = {
        count: 5,
        topics: ['typescript', 'generics'],
        includeTags: true,
        difficulty: 'medium',
        signal: new AbortController().signal,
        onProgress: (current, total) => { /* progress handler */ },
      }

      expect(options.count).toBe(5)
      expect(options.topics).toHaveLength(2)
      expect(options.includeTags).toBe(true)
      expect(options.difficulty).toBe('medium')
      expect(options.signal).toBeDefined()
      expect(options.onProgress).toBeDefined()
    })

    it('accepts mixed difficulty option', () => {
      const options: GenerateFlashcardsOptions = {
        difficulty: 'mixed',
      }

      expect(options.difficulty).toBe('mixed')
    })
  })

  // ============================================================================
  // isFlashcardGenerationAvailable
  // ============================================================================

  describe('isFlashcardGenerationAvailable', () => {
    it('returns true when anthropic key is available', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'anthropic') return { key: 'sk-ant-test', provider: 'anthropic' }
        return null
      })

      const available = await isFlashcardGenerationAvailable()
      expect(available).toBe(true)
    })

    it('returns true when openai key is available', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'openai') return { key: 'sk-test', provider: 'openai' }
        return null
      })

      const available = await isFlashcardGenerationAvailable()
      expect(available).toBe(true)
    })

    it('returns false when no API keys available', async () => {
      mockGetAPIKey.mockResolvedValue(null)

      const available = await isFlashcardGenerationAvailable()
      expect(available).toBe(false)
    })

    it('prefers anthropic over openai', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'anthropic') return { key: 'sk-ant-test', provider: 'anthropic' }
        if (provider === 'openai') return { key: 'sk-test', provider: 'openai' }
        return null
      })

      const available = await isFlashcardGenerationAvailable()
      expect(available).toBe(true)
      // Anthropic should be checked first
      expect(mockGetAPIKey).toHaveBeenCalledWith('anthropic')
    })
  })

  // ============================================================================
  // generateFlashcardsFromContent
  // ============================================================================

  describe('generateFlashcardsFromContent', () => {
    it('throws error when no API key available', async () => {
      mockGetAPIKey.mockResolvedValue(null)

      await expect(
        generateFlashcardsFromContent('Test content', 'Test Title')
      ).rejects.toThrow('No API key configured')
    })

    it('generates flashcards from content', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'anthropic') return { key: 'sk-ant-test', provider: 'anthropic' }
        return null
      })

      const mockResponse = createMockFlashcardResponse([
        { front: 'What is TypeScript?', back: 'A typed superset of JavaScript', difficulty: 'easy' },
        { front: 'What are generics?', back: 'Type parameters for reusable code', difficulty: 'medium' },
      ])

      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromContent(
        'TypeScript is a typed superset of JavaScript. Generics allow type parameters.',
        'TypeScript Basics'
      )

      expect(flashcards).toHaveLength(2)
      expect(flashcards[0].front).toBe('What is TypeScript?')
      expect(flashcards[0].back).toBe('A typed superset of JavaScript')
      expect(flashcards[0].id).toMatch(/^fc-/)
    })

    it('uses default count of 5', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title')

      // Check that the system prompt mentions count of 5
      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('5 flashcards'),
        })
      )
    })

    it('respects count option', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title', { count: 10 })

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('10 flashcards'),
        })
      )
    })

    it('includes difficulty in prompt', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title', { difficulty: 'hard' })

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('hard'),
        })
      )
    })

    it('includes topics in prompt', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title', { topics: ['react', 'hooks'] })

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('react, hooks'),
        })
      )
    })

    it('calls onProgress callback', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const onProgress = vi.fn()
      await generateFlashcardsFromContent('Content', 'Title', {
        count: 5,
        onProgress,
      })

      expect(onProgress).toHaveBeenCalledWith(2, 5)
    })

    it('returns empty array when no JSON found in response', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockReturnValue(createMockStream('Invalid response without JSON')())

      const flashcards = await generateFlashcardsFromContent('Content', 'Title')
      expect(flashcards).toEqual([])
    })

    it('passes abort signal to stream', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const controller = new AbortController()
      await generateFlashcardsFromContent('Content', 'Title', { signal: controller.signal })

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal,
        })
      )
    })

    it('truncates long content', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const longContent = 'A'.repeat(5000)
      await generateFlashcardsFromContent(longContent, 'Title')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining('A'.repeat(5000)),
            }),
          ]),
        })
      )
    })

    it('includes tags when includeTags is true', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q', back: 'A', tags: ['tag1', 'tag2'] },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromContent('Content', 'Title', { includeTags: true })

      expect(flashcards[0].tags).toEqual(['tag1', 'tag2'])
    })

    it('sets default difficulty to medium when not in response', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromContent('Content', 'Title')

      expect(flashcards[0].difficulty).toBe('medium')
    })

    it('generates unique IDs for each card', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
        { front: 'Q3', back: 'A3' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromContent('Content', 'Title')

      const ids = flashcards.map((f) => f.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  // ============================================================================
  // generateFlashcardsFromGaps
  // ============================================================================

  describe('generateFlashcardsFromGaps', () => {
    it('throws error when no API key available', async () => {
      mockGetAPIKey.mockResolvedValue(null)

      await expect(
        generateFlashcardsFromGaps(['Gap 1'], 'Content')
      ).rejects.toThrow('No API key configured')
    })

    it('generates flashcards from knowledge gaps', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'What is X?', back: 'X is...', tags: ['gap-addressed'] },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const gaps = ['Understanding of X', 'Knowledge of Y']
      const flashcards = await generateFlashcardsFromGaps(gaps, 'Source content about X and Y')

      expect(flashcards).toHaveLength(1)
      expect(flashcards[0].tags).toContain('gap-flashcard')
    })

    it('includes gaps in system prompt', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const gaps = ['Understanding loops', 'Using functions']
      await generateFlashcardsFromGaps(gaps, 'Content')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Understanding loops'),
        })
      )
      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Using functions'),
        })
      )
    })

    it('defaults count to number of gaps', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
        { front: 'Q3', back: 'A3' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const gaps = ['Gap 1', 'Gap 2', 'Gap 3']
      await generateFlashcardsFromGaps(gaps, 'Content')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('3 flashcards'),
        })
      )
    })

    it('adds gap-flashcard tag to all cards', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q', back: 'A', tags: ['custom-tag'] },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromGaps(['Gap'], 'Content')

      expect(flashcards[0].tags).toContain('gap-flashcard')
      expect(flashcards[0].tags).toContain('custom-tag')
    })

    it('generates unique gap IDs', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcards = await generateFlashcardsFromGaps(['Gap 1', 'Gap 2'], 'Content')

      expect(flashcards[0].id).toMatch(/^fc-gap-/)
      expect(flashcards[1].id).toMatch(/^fc-gap-/)
      expect(flashcards[0].id).not.toBe(flashcards[1].id)
    })

    it('truncates long strand content', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const longContent = 'B'.repeat(4000)
      await generateFlashcardsFromGaps(['Gap'], longContent)

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining('B'.repeat(4000)),
            }),
          ]),
        })
      )
    })

    it('returns empty array when no JSON found', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockReturnValue(createMockStream('No JSON here')())

      const flashcards = await generateFlashcardsFromGaps(['Gap'], 'Content')
      expect(flashcards).toEqual([])
    })

    it('calls onProgress callback', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1' },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const onProgress = vi.fn()
      await generateFlashcardsFromGaps(['Gap 1', 'Gap 2'], 'Content', { onProgress })

      expect(onProgress).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // generateFlashcardFromHighlight
  // ============================================================================

  describe('generateFlashcardFromHighlight', () => {
    it('returns null when no API key available', async () => {
      mockGetAPIKey.mockResolvedValue(null)

      const flashcard = await generateFlashcardFromHighlight('Highlight text', 'Context')
      expect(flashcard).toBeNull()
    })

    it('generates flashcard from highlight', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({
        front: 'What is the significance of X?',
        back: 'X represents...',
      })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcard = await generateFlashcardFromHighlight(
        'X is a fundamental concept',
        'In this chapter, we explore X and its implications...'
      )

      expect(flashcard).not.toBeNull()
      expect(flashcard!.front).toBe('What is the significance of X?')
      expect(flashcard!.back).toBe('X represents...')
    })

    it('includes highlight in prompt', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardFromHighlight('Important highlight', 'Context here')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Important highlight'),
            }),
          ]),
        })
      )
    })

    it('adds from-highlight tag', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcard = await generateFlashcardFromHighlight('Highlight', 'Context')

      expect(flashcard!.tags).toContain('from-highlight')
    })

    it('sets difficulty to medium', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcard = await generateFlashcardFromHighlight('Highlight', 'Context')

      expect(flashcard!.difficulty).toBe('medium')
    })

    it('generates ID with highlight prefix', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcard = await generateFlashcardFromHighlight('Highlight', 'Context')

      expect(flashcard!.id).toMatch(/^fc-highlight-/)
    })

    it('truncates long context', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const longContext = 'C'.repeat(600)
      await generateFlashcardFromHighlight('Highlight', longContext)

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining('C'.repeat(600)),
            }),
          ]),
        })
      )
    })

    it('returns null when no JSON found', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockReturnValue(createMockStream('Not valid JSON')())

      const flashcard = await generateFlashcardFromHighlight('Highlight', 'Context')
      expect(flashcard).toBeNull()
    })

    it('returns null on error', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockImplementation(() => {
        throw new Error('Stream error')
      })

      const flashcard = await generateFlashcardFromHighlight('Highlight', 'Context')
      expect(flashcard).toBeNull()
    })

    it('passes abort signal to stream', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({ front: 'Q', back: 'A' })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const controller = new AbortController()
      await generateFlashcardFromHighlight('Highlight', 'Context', controller.signal)

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          signal: controller.signal,
        })
      )
    })
  })

  // ============================================================================
  // Provider Selection Tests
  // ============================================================================

  describe('provider selection', () => {
    it('uses anthropic when both keys available', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'anthropic') return { key: 'sk-ant-test', provider: 'anthropic' }
        if (provider === 'openai') return { key: 'sk-openai-test', provider: 'openai' }
        return null
      })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
        })
      )
    })

    it('falls back to openai when anthropic unavailable', async () => {
      mockGetAPIKey.mockImplementation(async (provider: string) => {
        if (provider === 'openai') return { key: 'sk-openai-test', provider: 'openai' }
        return null
      })

      const mockResponse = createMockFlashcardResponse([{ front: 'Q', back: 'A' }])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      await generateFlashcardsFromContent('Content', 'Title')

      expect(mockStreamLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4o-mini',
        })
      )
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('throws on stream error in generateFlashcardsFromContent', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockImplementation(() => {
        throw new Error('API error')
      })

      await expect(
        generateFlashcardsFromContent('Content', 'Title')
      ).rejects.toThrow('API error')
    })

    it('throws on stream error in generateFlashcardsFromGaps', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockImplementation(() => {
        throw new Error('Gap API error')
      })

      await expect(
        generateFlashcardsFromGaps(['Gap'], 'Content')
      ).rejects.toThrow('Gap API error')
    })

    it('handles malformed JSON gracefully', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      mockStreamLLM.mockReturnValue(createMockStream('[{invalid json}]')())

      await expect(
        generateFlashcardsFromContent('Content', 'Title')
      ).rejects.toThrow()
    })
  })

  // ============================================================================
  // Integration Pattern Tests
  // ============================================================================

  describe('integration patterns', () => {
    it('complete flashcard generation workflow', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'Q1', back: 'A1', difficulty: 'easy', tags: ['tag1'] },
        { front: 'Q2', back: 'A2', difficulty: 'medium' },
        { front: 'Q3', back: 'A3', difficulty: 'hard', tags: ['tag2', 'tag3'] },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const progressUpdates: Array<[number, number]> = []
      const flashcards = await generateFlashcardsFromContent(
        'Long content about TypeScript...',
        'TypeScript Guide',
        {
          count: 3,
          difficulty: 'mixed',
          includeTags: true,
          onProgress: (current, total) => progressUpdates.push([current, total]),
        }
      )

      // Verify flashcards
      expect(flashcards).toHaveLength(3)
      expect(flashcards[0].difficulty).toBe('easy')
      expect(flashcards[2].tags).toEqual(['tag2', 'tag3'])

      // Verify progress was reported
      expect(progressUpdates.length).toBeGreaterThan(0)
    })

    it('gap-based learning workflow', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = createMockFlashcardResponse([
        { front: 'What is recursion?', back: 'A function calling itself', tags: ['addressed'] },
        { front: 'What is iteration?', back: 'Looping through elements', tags: ['addressed'] },
      ])
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const gaps = ['Understanding recursion', 'Difference between loops and recursion']
      const flashcards = await generateFlashcardsFromGaps(gaps, 'Chapter on algorithms...')

      // All cards should have gap-flashcard tag
      flashcards.forEach((card) => {
        expect(card.tags).toContain('gap-flashcard')
      })

      // Cards should address the gaps
      expect(flashcards).toHaveLength(2)
    })

    it('highlight annotation workflow', async () => {
      mockGetAPIKey.mockResolvedValue({ key: 'sk-ant-test', provider: 'anthropic' })

      const mockResponse = JSON.stringify({
        front: 'Why is pure function important?',
        back: 'No side effects, easier to test and reason about',
      })
      mockStreamLLM.mockReturnValue(createMockStream(mockResponse)())

      const flashcard = await generateFlashcardFromHighlight(
        'Pure functions have no side effects',
        'In functional programming, functions should be pure...'
      )

      expect(flashcard).not.toBeNull()
      expect(flashcard!.tags).toContain('from-highlight')
      expect(flashcard!.id).toMatch(/^fc-highlight-/)
    })
  })
})
