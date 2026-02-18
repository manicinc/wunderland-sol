/**
 * Flashcard Generator Tests
 * @module __tests__/unit/flashcards/flashcardGenerator.test
 *
 * Tests for AI-powered flashcard generation from content and knowledge gaps.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock API key storage
const mockGetAPIKey = vi.fn()
vi.mock('@/lib/config/apiKeyStorage', () => ({
  getAPIKey: (provider: string) => mockGetAPIKey(provider),
}))

// Mock streaming
const mockStreamLLM = vi.fn()
vi.mock('@/lib/llm/streaming', () => ({
  streamLLM: (options: unknown) => mockStreamLLM(options),
}))

// Import after mocks
import {
  generateFlashcardsFromContent,
  generateFlashcardsFromGaps,
  generateFlashcardFromHighlight,
  isFlashcardGenerationAvailable,
  type Flashcard,
  type GenerateFlashcardsOptions,
} from '@/lib/flashcards/flashcardGenerator'

// ============================================================================
// TEST HELPERS
// ============================================================================

function resetAllMocks() {
  vi.clearAllMocks()
  mockGetAPIKey.mockReset()
  mockStreamLLM.mockReset()
}

async function* createMockStream(jsonResponse: string) {
  yield { type: 'text', content: jsonResponse }
}

// ============================================================================
// isFlashcardGenerationAvailable
// ============================================================================

describe('isFlashcardGenerationAvailable', () => {
  beforeEach(resetAllMocks)

  it('returns true when Anthropic API key is available', async () => {
    mockGetAPIKey.mockImplementation((provider: string) => {
      if (provider === 'anthropic') return { key: 'sk-ant-test' }
      return null
    })

    const available = await isFlashcardGenerationAvailable()

    expect(available).toBe(true)
    expect(mockGetAPIKey).toHaveBeenCalledWith('anthropic')
  })

  it('returns true when OpenAI API key is available', async () => {
    mockGetAPIKey.mockImplementation((provider: string) => {
      if (provider === 'anthropic') return null
      if (provider === 'openai') return { key: 'sk-openai-test' }
      return null
    })

    const available = await isFlashcardGenerationAvailable()

    expect(available).toBe(true)
    expect(mockGetAPIKey).toHaveBeenCalledWith('openai')
  })

  it('returns false when no API key is available', async () => {
    mockGetAPIKey.mockResolvedValue(null)

    const available = await isFlashcardGenerationAvailable()

    expect(available).toBe(false)
  })

  it('prefers Anthropic over OpenAI', async () => {
    mockGetAPIKey.mockImplementation((provider: string) => {
      if (provider === 'anthropic') return { key: 'sk-ant-test' }
      if (provider === 'openai') return { key: 'sk-openai-test' }
      return null
    })

    await isFlashcardGenerationAvailable()

    // Should only call Anthropic since it's checked first
    expect(mockGetAPIKey).toHaveBeenCalledWith('anthropic')
  })
})

// ============================================================================
// generateFlashcardsFromContent
// ============================================================================

describe('generateFlashcardsFromContent', () => {
  beforeEach(resetAllMocks)

  it('throws error when no API key is configured', async () => {
    mockGetAPIKey.mockResolvedValue(null)

    await expect(
      generateFlashcardsFromContent('Some content', 'Test Title')
    ).rejects.toThrow('No API key configured')
  })

  it('generates flashcards from content', async () => {
    mockGetAPIKey.mockImplementation((provider: string) => {
      if (provider === 'anthropic') return { key: 'sk-ant-test' }
      return null
    })

    const mockCards = [
      { front: 'What is X?', back: 'X is Y', difficulty: 'easy' },
      { front: 'Why is Z important?', back: 'Because...', difficulty: 'medium' },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromContent(
      'This is test content about X and Z',
      'Test Topic'
    )

    expect(flashcards).toHaveLength(2)
    expect(flashcards[0].front).toBe('What is X?')
    expect(flashcards[0].back).toBe('X is Y')
    expect(flashcards[0].difficulty).toBe('easy')
  })

  it('respects count option', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })

    const mockCards = [
      { front: 'Q1', back: 'A1', difficulty: 'easy' },
      { front: 'Q2', back: 'A2', difficulty: 'medium' },
      { front: 'Q3', back: 'A3', difficulty: 'hard' },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromContent(
      'Content',
      'Title',
      { count: 3 }
    )

    expect(flashcards).toHaveLength(3)
    // Check that streamLLM was called with a system prompt containing "3"
    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('3')
      })
    )
  })

  it('includes topic filter in prompt', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('[]'))

    await generateFlashcardsFromContent(
      'Content',
      'Title',
      { topics: ['JavaScript', 'React'] }
    )

    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('JavaScript')
      })
    )
  })

  it('handles difficulty option', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('[]'))

    await generateFlashcardsFromContent(
      'Content',
      'Title',
      { difficulty: 'hard' }
    )

    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('hard')
      })
    )
  })

  it('generates unique IDs for each flashcard', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards[0].id).not.toBe(flashcards[1].id)
    expect(flashcards[0].id).toMatch(/^fc-/)
    expect(flashcards[1].id).toMatch(/^fc-/)
  })

  it('returns empty array when no JSON found in response', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('Sorry, I cannot generate flashcards'))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toEqual([])
  })

  it('calls onProgress callback', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [{ front: 'Q', back: 'A' }]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const onProgress = vi.fn()
    await generateFlashcardsFromContent(
      'Content',
      'Title',
      { count: 5, onProgress }
    )

    expect(onProgress).toHaveBeenCalledWith(1, 5)
  })

  it('parses tags when includeTags is true', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [
      { front: 'Q', back: 'A', tags: ['concept', 'important'] },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromContent(
      'Content',
      'Title',
      { includeTags: true }
    )

    expect(flashcards[0].tags).toEqual(['concept', 'important'])
  })

  it('defaults difficulty to medium when not provided', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [{ front: 'Q', back: 'A' }]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards[0].difficulty).toBe('medium')
  })

  it('truncates long content to 4000 chars', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('[]'))

    const longContent = 'a'.repeat(10000)
    await generateFlashcardsFromContent(longContent, 'Title')

    const callArg = mockStreamLLM.mock.calls[0][0]
    expect(callArg.messages[0].content.length).toBeLessThan(5000)
  })
})

// ============================================================================
// generateFlashcardsFromGaps
// ============================================================================

describe('generateFlashcardsFromGaps', () => {
  beforeEach(resetAllMocks)

  it('throws error when no API key is configured', async () => {
    mockGetAPIKey.mockResolvedValue(null)

    await expect(
      generateFlashcardsFromGaps(['Gap 1', 'Gap 2'], 'Source content')
    ).rejects.toThrow('No API key configured')
  })

  it('generates flashcards from gaps', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [
      { front: 'Gap question', back: 'Gap answer', difficulty: 'medium' },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromGaps(
      ['Understanding X'],
      'Content about X'
    )

    expect(flashcards).toHaveLength(1)
    expect(flashcards[0].tags).toContain('gap-flashcard')
  })

  it('includes gap descriptions in prompt', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('[]'))

    await generateFlashcardsFromGaps(
      ['Understanding closures', 'Async/await patterns'],
      'JavaScript content'
    )

    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('closures')
      })
    )
    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Async/await')
      })
    )
  })

  it('defaults count to number of gaps', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' },
      { front: 'Q3', back: 'A3' },
    ]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromGaps(
      ['Gap 1', 'Gap 2', 'Gap 3'],
      'Content'
    )

    expect(flashcards).toHaveLength(3)
    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('3')
      })
    )
  })

  it('generates IDs with gap prefix', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [{ front: 'Q', back: 'A' }]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const flashcards = await generateFlashcardsFromGaps(['Gap'], 'Content')

    expect(flashcards[0].id).toMatch(/^fc-gap-/)
  })

  it('returns empty array when no JSON found', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('No cards generated'))

    const flashcards = await generateFlashcardsFromGaps(['Gap'], 'Content')

    expect(flashcards).toEqual([])
  })

  it('calls onProgress callback', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCards = [{ front: 'Q', back: 'A' }]
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCards)))

    const onProgress = vi.fn()
    await generateFlashcardsFromGaps(['Gap'], 'Content', { onProgress })

    expect(onProgress).toHaveBeenCalled()
  })
})

// ============================================================================
// generateFlashcardFromHighlight
// ============================================================================

describe('generateFlashcardFromHighlight', () => {
  beforeEach(resetAllMocks)

  it('returns null when no API key is configured', async () => {
    mockGetAPIKey.mockResolvedValue(null)

    const flashcard = await generateFlashcardFromHighlight(
      'highlighted text',
      'surrounding context'
    )

    expect(flashcard).toBeNull()
  })

  it('generates single flashcard from highlight', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCard = { front: 'Highlight question', back: 'Highlight answer' }
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCard)))

    const flashcard = await generateFlashcardFromHighlight(
      'Important concept',
      'This is the context'
    )

    expect(flashcard).not.toBeNull()
    expect(flashcard?.front).toBe('Highlight question')
    expect(flashcard?.back).toBe('Highlight answer')
  })

  it('includes highlight and context in prompt', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('{}'))

    await generateFlashcardFromHighlight(
      'The mitochondria is the powerhouse',
      'In biology, cells have organelles...'
    )

    expect(mockStreamLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('mitochondria')
          })
        ])
      })
    )
  })

  it('generates ID with highlight prefix', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCard = { front: 'Q', back: 'A' }
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCard)))

    const flashcard = await generateFlashcardFromHighlight('text', 'context')

    expect(flashcard?.id).toMatch(/^fc-highlight-/)
  })

  it('adds from-highlight tag', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCard = { front: 'Q', back: 'A' }
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCard)))

    const flashcard = await generateFlashcardFromHighlight('text', 'context')

    expect(flashcard?.tags).toContain('from-highlight')
  })

  it('returns null when no JSON found in response', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('Invalid response'))

    const flashcard = await generateFlashcardFromHighlight('text', 'context')

    expect(flashcard).toBeNull()
  })

  it('returns null on parsing error', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('{invalid json}'))

    const flashcard = await generateFlashcardFromHighlight('text', 'context')

    expect(flashcard).toBeNull()
  })

  it('sets default difficulty to medium', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const mockCard = { front: 'Q', back: 'A' }
    mockStreamLLM.mockReturnValue(createMockStream(JSON.stringify(mockCard)))

    const flashcard = await generateFlashcardFromHighlight('text', 'context')

    expect(flashcard?.difficulty).toBe('medium')
  })

  it('truncates long context to 500 chars', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('{}'))

    const longContext = 'a'.repeat(1000)
    await generateFlashcardFromHighlight('highlight', longContext)

    const callArg = mockStreamLLM.mock.calls[0][0]
    expect(callArg.messages[0].content.length).toBeLessThan(700)
  })
})

// ============================================================================
// JSON PARSING EDGE CASES
// ============================================================================

describe('JSON parsing edge cases', () => {
  beforeEach(resetAllMocks)

  it('handles JSON with extra text before/after', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const response = 'Here are the flashcards:\n[{"front": "Q", "back": "A"}]\nHope this helps!'
    mockStreamLLM.mockReturnValue(createMockStream(response))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toHaveLength(1)
  })

  it('handles multiline JSON', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    const response = `[
      {
        "front": "Question 1",
        "back": "Answer 1"
      }
    ]`
    mockStreamLLM.mockReturnValue(createMockStream(response))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toHaveLength(1)
    expect(flashcards[0].front).toBe('Question 1')
  })

  it('handles empty array response', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })
    mockStreamLLM.mockReturnValue(createMockStream('[]'))

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toEqual([])
  })
})

// ============================================================================
// STREAM HANDLING
// ============================================================================

describe('stream handling', () => {
  beforeEach(resetAllMocks)

  it('aggregates multiple chunks', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })

    async function* multiChunkStream() {
      yield { type: 'text', content: '[{"front": "Q"' }
      yield { type: 'text', content: ', "back": "A"}]' }
    }
    mockStreamLLM.mockReturnValue(multiChunkStream())

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toHaveLength(1)
    expect(flashcards[0].front).toBe('Q')
    expect(flashcards[0].back).toBe('A')
  })

  it('ignores non-text chunks', async () => {
    mockGetAPIKey.mockResolvedValue({ key: 'sk-test' })

    async function* mixedChunkStream() {
      yield { type: 'meta', content: 'ignored' }
      yield { type: 'text', content: '[{"front": "Q", "back": "A"}]' }
      yield { type: 'end' }
    }
    mockStreamLLM.mockReturnValue(mixedChunkStream())

    const flashcards = await generateFlashcardsFromContent('Content', 'Title')

    expect(flashcards).toHaveLength(1)
  })
})
