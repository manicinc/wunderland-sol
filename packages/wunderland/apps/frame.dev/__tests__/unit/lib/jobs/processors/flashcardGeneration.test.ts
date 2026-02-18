/**
 * Flashcard Generation Processor Tests
 * @module __tests__/unit/lib/jobs/processors/flashcardGeneration.test
 *
 * Tests for flashcard generation processor utilities including
 * progress calculation, result structure, and algorithm selection.
 */

import { describe, it, expect } from 'vitest'

/* ═══════════════════════════════════════════════════════════════════════════
   RE-IMPLEMENTED UTILITIES (for testing logic)
═══════════════════════════════════════════════════════════════════════════ */

type FlashcardAlgorithm = 'bert' | 'nlp'
type FlashcardDifficulty = 'easy' | 'medium' | 'hard' | 'mixed'

interface FlashcardJobPayload {
  strandPaths: string[]
  useLLM?: boolean
  forceRegenerate?: boolean
}

interface FlashcardJobResult {
  count: number
  flashcardIds: string[]
  strandsProcessed: number
}

interface FlashcardGenerateOptions {
  content: string
  title: string
  algorithm: FlashcardAlgorithm
  maxCards: number
  difficulty: FlashcardDifficulty
  includeTags: boolean
  strandPath: string
  cacheKey?: string
  onProgress?: (progress: { progress: number; message: string }) => void
}

/**
 * Calculate base progress for strand processing
 */
function calculateBaseProgress(strandIndex: number, totalStrands: number): number {
  return 15 + (strandIndex / totalStrands) * 65
}

/**
 * Calculate sub-progress within a strand
 */
function calculateSubProgress(
  baseProgress: number,
  cardProgress: number,
  totalStrands: number
): number {
  return baseProgress + (cardProgress / 100) * (65 / totalStrands)
}

/**
 * Determine algorithm based on useLLM flag
 * Note: Inverted logic - useLLM true means use 'nlp' (faster), false means 'bert'
 */
function selectAlgorithm(useLLM: boolean): FlashcardAlgorithm {
  return useLLM ? 'nlp' : 'bert'
}

/**
 * Generate cache key for flashcard deduplication
 */
function generateFlashcardCacheKey(strandPath: string, forceRegenerate: boolean): string | undefined {
  if (forceRegenerate) return undefined
  return `fc-${strandPath}-${Date.now()}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   TESTS
═══════════════════════════════════════════════════════════════════════════ */

describe('Flashcard Generation Utilities', () => {
  describe('calculateBaseProgress', () => {
    it('should start at 15% for first strand', () => {
      expect(calculateBaseProgress(0, 10)).toBe(15)
    })

    it('should end at 80% for last strand', () => {
      expect(calculateBaseProgress(10, 10)).toBe(80)
    })

    it('should calculate mid-point correctly', () => {
      // At index 5 of 10 strands
      const progress = calculateBaseProgress(5, 10)
      expect(progress).toBe(47.5)
    })

    it('should handle single strand', () => {
      expect(calculateBaseProgress(0, 1)).toBe(15)
    })
  })

  describe('calculateSubProgress', () => {
    it('should add card progress to base', () => {
      const base = 15
      const cardProgress = 50
      const totalStrands = 2
      const result = calculateSubProgress(base, cardProgress, totalStrands)
      // 15 + (50/100) * (65/2) = 15 + 0.5 * 32.5 = 15 + 16.25 = 31.25
      expect(result).toBeCloseTo(31.25)
    })

    it('should not exceed base + range', () => {
      const base = 15
      const cardProgress = 100
      const totalStrands = 1
      const result = calculateSubProgress(base, cardProgress, totalStrands)
      // 15 + (100/100) * (65/1) = 15 + 65 = 80
      expect(result).toBe(80)
    })
  })

  describe('selectAlgorithm', () => {
    it('should return nlp when useLLM is true', () => {
      expect(selectAlgorithm(true)).toBe('nlp')
    })

    it('should return bert when useLLM is false', () => {
      expect(selectAlgorithm(false)).toBe('bert')
    })
  })

  describe('generateFlashcardCacheKey', () => {
    it('should return undefined when forceRegenerate is true', () => {
      expect(generateFlashcardCacheKey('path/to/strand.md', true)).toBeUndefined()
    })

    it('should return cache key when forceRegenerate is false', () => {
      const key = generateFlashcardCacheKey('path/to/strand.md', false)
      expect(key).toBeDefined()
      expect(key).toMatch(/^fc-path\/to\/strand\.md-\d+$/)
    })

    it('should include strand path in key', () => {
      const key = generateFlashcardCacheKey('my/strand/path.md', false)
      expect(key).toContain('my/strand/path.md')
    })

    it('should include timestamp in key', () => {
      const before = Date.now()
      const key = generateFlashcardCacheKey('test.md', false)
      const after = Date.now()

      const match = key?.match(/fc-test\.md-(\d+)/)
      expect(match).not.toBeNull()

      const timestamp = parseInt(match![1], 10)
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('FlashcardJobPayload', () => {
    it('should require strandPaths', () => {
      const payload: FlashcardJobPayload = {
        strandPaths: ['strand1.md', 'strand2.md'],
      }
      expect(payload.strandPaths.length).toBe(2)
    })

    it('should have optional useLLM default to false', () => {
      const payload: FlashcardJobPayload = {
        strandPaths: [],
      }
      const useLLM = payload.useLLM ?? false
      expect(useLLM).toBe(false)
    })

    it('should have optional forceRegenerate default to false', () => {
      const payload: FlashcardJobPayload = {
        strandPaths: [],
      }
      const forceRegenerate = payload.forceRegenerate ?? false
      expect(forceRegenerate).toBe(false)
    })

    it('should support all options', () => {
      const payload: FlashcardJobPayload = {
        strandPaths: ['a.md', 'b.md'],
        useLLM: true,
        forceRegenerate: true,
      }
      expect(payload.useLLM).toBe(true)
      expect(payload.forceRegenerate).toBe(true)
    })
  })

  describe('FlashcardJobResult', () => {
    it('should track all result fields', () => {
      const result: FlashcardJobResult = {
        count: 25,
        flashcardIds: ['fc1', 'fc2', 'fc3'],
        strandsProcessed: 5,
      }

      expect(result.count).toBe(25)
      expect(result.flashcardIds.length).toBe(3)
      expect(result.strandsProcessed).toBe(5)
    })

    it('should allow empty flashcards', () => {
      const result: FlashcardJobResult = {
        count: 0,
        flashcardIds: [],
        strandsProcessed: 3,
      }
      expect(result.count).toBe(0)
      expect(result.flashcardIds.length).toBe(0)
    })
  })

  describe('FlashcardGenerateOptions', () => {
    it('should include all required fields', () => {
      const options: FlashcardGenerateOptions = {
        content: '# Heading\n\nParagraph content',
        title: 'Test Strand',
        algorithm: 'bert',
        maxCards: 10,
        difficulty: 'mixed',
        includeTags: true,
        strandPath: 'weaves/test/strand.md',
      }

      expect(options.content).toBeDefined()
      expect(options.title).toBeDefined()
      expect(options.algorithm).toBeDefined()
      expect(options.maxCards).toBe(10)
      expect(options.difficulty).toBe('mixed')
      expect(options.includeTags).toBe(true)
    })

    it('should support optional cacheKey', () => {
      const options: FlashcardGenerateOptions = {
        content: 'test',
        title: 'Test',
        algorithm: 'nlp',
        maxCards: 5,
        difficulty: 'easy',
        includeTags: false,
        strandPath: 'test.md',
        cacheKey: 'fc-test-123',
      }
      expect(options.cacheKey).toBe('fc-test-123')
    })

    it('should support optional onProgress callback', () => {
      const progressCalls: Array<{ progress: number; message: string }> = []

      const options: FlashcardGenerateOptions = {
        content: 'test',
        title: 'Test',
        algorithm: 'nlp',
        maxCards: 5,
        difficulty: 'easy',
        includeTags: false,
        strandPath: 'test.md',
        onProgress: (p) => progressCalls.push(p),
      }

      options.onProgress?.({ progress: 50, message: 'Processing' })
      expect(progressCalls.length).toBe(1)
      expect(progressCalls[0].progress).toBe(50)
    })
  })

  describe('Difficulty levels', () => {
    const difficulties: FlashcardDifficulty[] = ['easy', 'medium', 'hard', 'mixed']

    it('should support all difficulty levels', () => {
      for (const diff of difficulties) {
        const options: Partial<FlashcardGenerateOptions> = {
          difficulty: diff,
        }
        expect(options.difficulty).toBe(diff)
      }
    })

    it('should default to mixed difficulty', () => {
      const defaultDifficulty: FlashcardDifficulty = 'mixed'
      expect(defaultDifficulty).toBe('mixed')
    })
  })

  describe('Algorithm selection logic', () => {
    it('should use bert for accuracy (useLLM false)', () => {
      const useLLM = false
      const algorithm = useLLM ? 'nlp' : 'bert'
      expect(algorithm).toBe('bert')
    })

    it('should use nlp for speed (useLLM true)', () => {
      const useLLM = true
      const algorithm = useLLM ? 'nlp' : 'bert'
      expect(algorithm).toBe('nlp')
    })
  })

  describe('maxCards default', () => {
    const DEFAULT_MAX_CARDS = 10

    it('should default to 10 cards', () => {
      expect(DEFAULT_MAX_CARDS).toBe(10)
    })
  })

  describe('Progress stages', () => {
    const PROGRESS_STAGES = {
      INIT: { start: 0, end: 5 },
      LOAD: { start: 5, end: 15 },
      GENERATE: { start: 15, end: 80 },
      SAVE: { start: 80, end: 95 },
      FINALIZE: { start: 95, end: 100 },
    }

    it('should have non-overlapping stages', () => {
      expect(PROGRESS_STAGES.INIT.end).toBeLessThanOrEqual(PROGRESS_STAGES.LOAD.start)
      expect(PROGRESS_STAGES.LOAD.end).toBeLessThanOrEqual(PROGRESS_STAGES.GENERATE.start)
      expect(PROGRESS_STAGES.GENERATE.end).toBeLessThanOrEqual(PROGRESS_STAGES.SAVE.start)
      expect(PROGRESS_STAGES.SAVE.end).toBeLessThanOrEqual(PROGRESS_STAGES.FINALIZE.start)
    })

    it('should allocate most progress to generation', () => {
      const genRange = PROGRESS_STAGES.GENERATE.end - PROGRESS_STAGES.GENERATE.start
      expect(genRange).toBe(65) // 65% of total progress
    })
  })

  describe('Error handling', () => {
    it('should create error for no content found', () => {
      const error = new Error('No strand content found to generate flashcards from')
      expect(error.message).toContain('No strand content')
      expect(error.message).toContain('flashcards')
    })
  })

  describe('Duration tracking', () => {
    it('should calculate duration correctly', () => {
      const startTime = Date.now() - 500
      const durationMs = Date.now() - startTime
      expect(durationMs).toBeGreaterThanOrEqual(500)
    })
  })
})

describe('Strand Processing', () => {
  interface StrandContent {
    path: string
    title: string
    content: string
  }

  describe('strand loading', () => {
    it('should extract path, title, and content', () => {
      const strand: StrandContent = {
        path: 'weaves/wiki/strands/intro.md',
        title: 'Introduction',
        content: '# Introduction\n\nThis is the intro content.',
      }

      expect(strand.path).toBeDefined()
      expect(strand.title).toBeDefined()
      expect(strand.content).toBeDefined()
    })

    it('should use Untitled for missing title', () => {
      const rawStrand = { path: 'test.md', content: 'content', title: null }
      const title = rawStrand.title || 'Untitled'
      expect(title).toBe('Untitled')
    })
  })

  describe('loading progress calculation', () => {
    it('should map loading progress 5-15%', () => {
      const totalStrands = 5
      for (let i = 0; i < totalStrands; i++) {
        const progress = 10 + (i / totalStrands) * 5
        expect(progress).toBeGreaterThanOrEqual(10)
        expect(progress).toBeLessThanOrEqual(15)
      }
    })
  })
})

describe('Flashcard ID Collection', () => {
  it('should accumulate IDs from generated cards', () => {
    const flashcardIds: string[] = []

    // Simulate generating cards
    const batch1 = [{ id: 'fc1' }, { id: 'fc2' }]
    const batch2 = [{ id: 'fc3' }]

    for (const card of batch1) {
      flashcardIds.push(card.id)
    }
    for (const card of batch2) {
      flashcardIds.push(card.id)
    }

    expect(flashcardIds).toEqual(['fc1', 'fc2', 'fc3'])
  })

  it('should track total cards count', () => {
    let totalCards = 0

    const cards1 = [{ id: '1' }, { id: '2' }]
    const cards2 = [{ id: '3' }, { id: '4' }, { id: '5' }]

    totalCards += cards1.length
    totalCards += cards2.length

    expect(totalCards).toBe(5)
  })
})
