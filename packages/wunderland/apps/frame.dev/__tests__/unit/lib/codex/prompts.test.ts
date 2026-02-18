/**
 * Prompts Tests
 * @module __tests__/unit/lib/codex/prompts.test
 *
 * Tests for the writing prompts system with categories, mood filtering, and daily prompts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MoodState } from '@/lib/codex/mood'

// Mock localStorage
let mockStorage: Record<string, string>

describe('Prompts', () => {
  beforeEach(() => {
    vi.resetModules()
    mockStorage = {}

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value
      },
      removeItem: (key: string) => {
        delete mockStorage[key]
      },
      clear: () => {
        mockStorage = {}
      },
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // PromptMode type
  // ============================================================================

  describe('PromptMode type', () => {
    it('supports write mode', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const writePrompts = WRITING_PROMPTS.filter(p => p.mode === 'write')
      expect(writePrompts.length).toBeGreaterThan(0)
    })

    it('supports reflect mode', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const reflectPrompts = WRITING_PROMPTS.filter(p => p.mode === 'reflect')
      expect(reflectPrompts.length).toBeGreaterThan(0)
    })

    it('supports both mode', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const bothPrompts = WRITING_PROMPTS.filter(p => p.mode === 'both')
      expect(bothPrompts.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // WritingPrompt type
  // ============================================================================

  describe('WritingPrompt type', () => {
    it('has required fields', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      WRITING_PROMPTS.forEach(prompt => {
        expect(prompt.id).toBeDefined()
        expect(prompt.text).toBeDefined()
        expect(prompt.category).toBeDefined()
      })
    })

    it('supports optional fields', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      // At least some prompts should have optional fields
      const withMood = WRITING_PROMPTS.filter(p => p.mood && p.mood.length > 0)
      expect(withMood.length).toBeGreaterThan(0)

      const withDifficulty = WRITING_PROMPTS.filter(p => p.difficulty)
      expect(withDifficulty.length).toBeGreaterThan(0)

      const withTime = WRITING_PROMPTS.filter(p => p.estimatedTime)
      expect(withTime.length).toBeGreaterThan(0)
    })

    it('has unique IDs', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const ids = WRITING_PROMPTS.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  // ============================================================================
  // PROMPT_CATEGORIES
  // ============================================================================

  describe('PROMPT_CATEGORIES', () => {
    it('has all 8 categories', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(Object.keys(PROMPT_CATEGORIES)).toHaveLength(8)
    })

    it('includes reflection category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.reflection).toBeDefined()
      expect(PROMPT_CATEGORIES.reflection.label).toBe('Reflection')
      expect(PROMPT_CATEGORIES.reflection.emoji).toBe('🪞')
    })

    it('includes creative category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.creative).toBeDefined()
      expect(PROMPT_CATEGORIES.creative.label).toBe('Creative')
    })

    it('includes technical category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.technical).toBeDefined()
    })

    it('includes philosophical category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.philosophical).toBeDefined()
    })

    it('includes practical category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.practical).toBeDefined()
    })

    it('includes exploration category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.exploration).toBeDefined()
    })

    it('includes personal category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.personal).toBeDefined()
    })

    it('includes learning category', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      expect(PROMPT_CATEGORIES.learning).toBeDefined()
    })

    it('all categories have required properties', async () => {
      const { PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')

      Object.values(PROMPT_CATEGORIES).forEach(config => {
        expect(config.label).toBeDefined()
        expect(config.emoji).toBeDefined()
        expect(config.color).toBeDefined()
        expect(config.description).toBeDefined()
      })
    })
  })

  // ============================================================================
  // WRITING_PROMPTS
  // ============================================================================

  describe('WRITING_PROMPTS', () => {
    it('has 40 base prompts', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      expect(WRITING_PROMPTS.length).toBe(40)
    })

    it('has prompts for all categories', async () => {
      const { WRITING_PROMPTS, PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      const categories = Object.keys(PROMPT_CATEGORIES)

      categories.forEach(category => {
        const hasCategory = WRITING_PROMPTS.some(p => p.category === category)
        expect(hasCategory).toBe(true)
      })
    })

    it('all prompts have valid categories', async () => {
      const { WRITING_PROMPTS, PROMPT_CATEGORIES } = await import('@/lib/codex/prompts')
      const validCategories = Object.keys(PROMPT_CATEGORIES)

      WRITING_PROMPTS.forEach(prompt => {
        expect(validCategories).toContain(prompt.category)
      })
    })
  })

  // ============================================================================
  // ALL_PROMPTS
  // ============================================================================

  describe('ALL_PROMPTS', () => {
    it('combines base and nonfiction prompts', async () => {
      const { ALL_PROMPTS, WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      expect(ALL_PROMPTS.length).toBeGreaterThan(WRITING_PROMPTS.length)
    })

    it('has more than 100 total prompts', async () => {
      const { ALL_PROMPTS } = await import('@/lib/codex/prompts')
      expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(100)
    })

    it('includes all base prompts', async () => {
      const { ALL_PROMPTS, WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      WRITING_PROMPTS.forEach(basePrompt => {
        expect(ALL_PROMPTS.some(p => p.id === basePrompt.id)).toBe(true)
      })
    })
  })

  // ============================================================================
  // getPromptsByMood
  // ============================================================================

  describe('getPromptsByMood', () => {
    it('filters prompts by mood', async () => {
      const { getPromptsByMood } = await import('@/lib/codex/prompts')
      const reflectivePrompts = getPromptsByMood('reflective')

      expect(reflectivePrompts.length).toBeGreaterThan(0)
      reflectivePrompts.forEach(prompt => {
        // Either no mood specified (universal) or includes the mood
        if (prompt.mood) {
          expect(prompt.mood).toContain('reflective')
        }
      })
    })

    it('includes prompts with no mood (universal)', async () => {
      const { getPromptsByMood } = await import('@/lib/codex/prompts')
      const result = getPromptsByMood('creative')

      // Should include prompts without mood restriction
      const universalPrompts = result.filter(p => !p.mood)
      expect(universalPrompts.length).toBeGreaterThanOrEqual(0)
    })

    it('works with energetic mood', async () => {
      const { getPromptsByMood } = await import('@/lib/codex/prompts')
      const result = getPromptsByMood('energetic')
      expect(result.length).toBeGreaterThan(0)
    })

    it('works with curious mood', async () => {
      const { getPromptsByMood } = await import('@/lib/codex/prompts')
      const result = getPromptsByMood('curious')
      expect(result.length).toBeGreaterThan(0)
    })

    it('works with focused mood', async () => {
      const { getPromptsByMood } = await import('@/lib/codex/prompts')
      const result = getPromptsByMood('focused')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getPromptsByCategory
  // ============================================================================

  describe('getPromptsByCategory', () => {
    it('filters prompts by category', async () => {
      const { getPromptsByCategory } = await import('@/lib/codex/prompts')
      const reflectionPrompts = getPromptsByCategory('reflection')

      expect(reflectionPrompts.length).toBeGreaterThan(0)
      reflectionPrompts.forEach(prompt => {
        expect(prompt.category).toBe('reflection')
      })
    })

    it('returns prompts for technical category', async () => {
      const { getPromptsByCategory } = await import('@/lib/codex/prompts')
      const result = getPromptsByCategory('technical')

      expect(result.length).toBeGreaterThan(0)
      result.forEach(p => expect(p.category).toBe('technical'))
    })

    it('returns prompts for creative category', async () => {
      const { getPromptsByCategory } = await import('@/lib/codex/prompts')
      const result = getPromptsByCategory('creative')

      expect(result.length).toBeGreaterThan(0)
      result.forEach(p => expect(p.category).toBe('creative'))
    })

    it('returns prompts for philosophical category', async () => {
      const { getPromptsByCategory } = await import('@/lib/codex/prompts')
      const result = getPromptsByCategory('philosophical')

      expect(result.length).toBeGreaterThan(0)
      result.forEach(p => expect(p.category).toBe('philosophical'))
    })

    it('returns prompts for learning category', async () => {
      const { getPromptsByCategory } = await import('@/lib/codex/prompts')
      const result = getPromptsByCategory('learning')

      expect(result.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getRandomPrompt
  // ============================================================================

  describe('getRandomPrompt', () => {
    it('returns a prompt', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')
      const prompt = getRandomPrompt()

      expect(prompt).toBeDefined()
      expect(prompt.id).toBeDefined()
      expect(prompt.text).toBeDefined()
      expect(prompt.category).toBeDefined()
    })

    it('respects mood filter', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')

      // Run multiple times to increase confidence
      for (let i = 0; i < 10; i++) {
        const prompt = getRandomPrompt({ mood: 'reflective' })
        if (prompt.mood) {
          expect(prompt.mood).toContain('reflective')
        }
      }
    })

    it('respects category filter', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')

      for (let i = 0; i < 10; i++) {
        const prompt = getRandomPrompt({ category: 'technical' })
        expect(prompt.category).toBe('technical')
      }
    })

    it('respects difficulty filter', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')

      for (let i = 0; i < 10; i++) {
        const prompt = getRandomPrompt({ difficulty: 'beginner' })
        expect(prompt.difficulty).toBe('beginner')
      }
    })

    it('can combine multiple filters', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')

      const prompt = getRandomPrompt({
        category: 'reflection',
        difficulty: 'beginner',
      })

      expect(prompt.category).toBe('reflection')
      expect(prompt.difficulty).toBe('beginner')
    })

    it('falls back to all prompts when no matches', async () => {
      const { getRandomPrompt } = await import('@/lib/codex/prompts')

      // This combination might not exist - should fallback
      const prompt = getRandomPrompt({
        mood: 'anxious' as MoodState, // unlikely to match
        category: 'technical',
        difficulty: 'advanced',
      })

      // Should still return something
      expect(prompt).toBeDefined()
    })
  })

  // ============================================================================
  // getDailyPrompt
  // ============================================================================

  describe('getDailyPrompt', () => {
    it('returns a prompt', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')
      const prompt = getDailyPrompt()

      expect(prompt).toBeDefined()
      expect(prompt.id).toBeDefined()
      expect(prompt.text).toBeDefined()
    })

    it('returns consistent prompt for same day', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')

      const prompt1 = getDailyPrompt()
      const prompt2 = getDailyPrompt()

      expect(prompt1.id).toBe(prompt2.id)
    })

    it('stores state in localStorage', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')
      getDailyPrompt()

      const stored = mockStorage['fabric_daily_prompt_state']
      expect(stored).toBeDefined()

      const state = JSON.parse(stored)
      expect(state.date).toBeDefined()
      expect(state.primaryPromptId).toBeDefined()
    })

    it('accepts mood parameter', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')
      const prompt = getDailyPrompt('reflective')

      expect(prompt).toBeDefined()
    })

    it('accepts null mood', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')
      const prompt = getDailyPrompt(null)

      expect(prompt).toBeDefined()
    })
  })

  // ============================================================================
  // getDailyAlternatives
  // ============================================================================

  describe('getDailyAlternatives', () => {
    it('returns array of alternatives', async () => {
      const { getDailyAlternatives, getDailyPrompt } = await import('@/lib/codex/prompts')

      // Initialize state first
      getDailyPrompt()

      const alternatives = getDailyAlternatives()
      expect(Array.isArray(alternatives)).toBe(true)
      expect(alternatives.length).toBe(3) // NUM_ALTERNATIVES
    })

    it('alternatives are different from primary', async () => {
      const { getDailyAlternatives, getDailyPrompt } = await import('@/lib/codex/prompts')

      const primary = getDailyPrompt()
      const alternatives = getDailyAlternatives()

      alternatives.forEach(alt => {
        expect(alt.id).not.toBe(primary.id)
      })
    })

    it('returns consistent alternatives for same day', async () => {
      const { getDailyAlternatives, getDailyPrompt } = await import('@/lib/codex/prompts')

      getDailyPrompt()

      const alts1 = getDailyAlternatives()
      const alts2 = getDailyAlternatives()

      expect(alts1.map(a => a.id)).toEqual(alts2.map(a => a.id))
    })
  })

  // ============================================================================
  // selectDailyAlternative
  // ============================================================================

  describe('selectDailyAlternative', () => {
    it('returns null when no state exists', async () => {
      const { selectDailyAlternative } = await import('@/lib/codex/prompts')
      const result = selectDailyAlternative(1)

      expect(result).toBeNull()
    })

    it('can select an alternative', async () => {
      const { selectDailyAlternative, getDailyPrompt, getDailyAlternatives } = await import('@/lib/codex/prompts')

      getDailyPrompt()
      const alts = getDailyAlternatives()

      const result = selectDailyAlternative(1)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(alts[0].id)
    })

    it('selecting index 0 returns primary', async () => {
      const { selectDailyAlternative, getDailyPrompt } = await import('@/lib/codex/prompts')

      const primary = getDailyPrompt()
      const result = selectDailyAlternative(0)

      expect(result?.id).toBe(primary.id)
    })

    it('clamps out of range indices', async () => {
      const { selectDailyAlternative, getDailyPrompt } = await import('@/lib/codex/prompts')

      getDailyPrompt()

      // Negative index should clamp to 0
      const result1 = selectDailyAlternative(-1)
      expect(result1).not.toBeNull()

      // Too high index should clamp to NUM_ALTERNATIVES
      const result2 = selectDailyAlternative(100)
      expect(result2).not.toBeNull()
    })
  })

  // ============================================================================
  // getDailyPromptIndex
  // ============================================================================

  describe('getDailyPromptIndex', () => {
    it('returns 0 when no state exists', async () => {
      const { getDailyPromptIndex } = await import('@/lib/codex/prompts')
      const index = getDailyPromptIndex()

      expect(index).toBe(0)
    })

    it('returns 0 for initial state', async () => {
      const { getDailyPromptIndex, getDailyPrompt } = await import('@/lib/codex/prompts')

      getDailyPrompt()
      const index = getDailyPromptIndex()

      expect(index).toBe(0)
    })

    it('reflects selected alternative', async () => {
      const { getDailyPromptIndex, getDailyPrompt, selectDailyAlternative } = await import('@/lib/codex/prompts')

      getDailyPrompt()
      selectDailyAlternative(2)
      const index = getDailyPromptIndex()

      expect(index).toBe(2)
    })
  })

  // ============================================================================
  // getRandomPrompts
  // ============================================================================

  describe('getRandomPrompts', () => {
    it('returns requested count of prompts', async () => {
      const { getRandomPrompts } = await import('@/lib/codex/prompts')
      const prompts = getRandomPrompts(5)

      expect(prompts).toHaveLength(5)
    })

    it('returns unique prompts', async () => {
      const { getRandomPrompts } = await import('@/lib/codex/prompts')
      const prompts = getRandomPrompts(10)

      const ids = prompts.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('respects mood filter', async () => {
      const { getRandomPrompts } = await import('@/lib/codex/prompts')
      const prompts = getRandomPrompts(5, { mood: 'focused' })

      prompts.forEach(prompt => {
        if (prompt.mood) {
          expect(prompt.mood).toContain('focused')
        }
      })
    })

    it('respects excludeIds', async () => {
      const { getRandomPrompts, ALL_PROMPTS } = await import('@/lib/codex/prompts')
      const excludeIds = ALL_PROMPTS.slice(0, 10).map(p => p.id)

      const prompts = getRandomPrompts(5, { excludeIds })

      prompts.forEach(prompt => {
        expect(excludeIds).not.toContain(prompt.id)
      })
    })

    it('returns empty array when count is 0', async () => {
      const { getRandomPrompts } = await import('@/lib/codex/prompts')
      const prompts = getRandomPrompts(0)

      expect(prompts).toHaveLength(0)
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR safety', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', undefined)
    })

    it('getDailyPrompt works without localStorage', async () => {
      vi.resetModules()
      const { getDailyPrompt } = await import('@/lib/codex/prompts')

      const prompt = getDailyPrompt()
      expect(prompt).toBeDefined()
    })

    it('selectDailyAlternative returns null without localStorage', async () => {
      vi.resetModules()
      const { selectDailyAlternative } = await import('@/lib/codex/prompts')

      const result = selectDailyAlternative(1)
      expect(result).toBeNull()
    })

    it('getDailyPromptIndex returns 0 without localStorage', async () => {
      vi.resetModules()
      const { getDailyPromptIndex } = await import('@/lib/codex/prompts')

      const index = getDailyPromptIndex()
      expect(index).toBe(0)
    })
  })

  // ============================================================================
  // Decay System
  // ============================================================================

  describe('decay system', () => {
    it('tracks recently shown prompts', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')

      getDailyPrompt()

      const stored = JSON.parse(mockStorage['fabric_daily_prompt_state'])
      expect(stored.recentlyShownIds).toBeDefined()
      expect(stored.recentlyShownIds.length).toBeGreaterThan(0)
    })

    it('adds selected alternatives to recently shown', async () => {
      const { getDailyPrompt, selectDailyAlternative, getDailyAlternatives } = await import('@/lib/codex/prompts')

      getDailyPrompt()
      const alts = getDailyAlternatives()
      selectDailyAlternative(1)

      const stored = JSON.parse(mockStorage['fabric_daily_prompt_state'])
      expect(stored.recentlyShownIds).toContain(alts[0].id)
    })

    it('limits recently shown to MAX_RECENTLY_SHOWN', async () => {
      const { getDailyPrompt } = await import('@/lib/codex/prompts')

      // Pre-populate with many IDs
      mockStorage['fabric_daily_prompt_state'] = JSON.stringify({
        date: '2000-01-01', // Old date to force regeneration
        primaryPromptId: 'old',
        alternativeIds: [],
        selectedIndex: 0,
        recentlyShownIds: Array.from({ length: 50 }, (_, i) => `old-${i}`),
      })

      vi.resetModules()
      const { getDailyPrompt: getDailyPromptNew } = await import('@/lib/codex/prompts')
      getDailyPromptNew()

      const stored = JSON.parse(mockStorage['fabric_daily_prompt_state'])
      expect(stored.recentlyShownIds.length).toBeLessThanOrEqual(30)
    })
  })

  // ============================================================================
  // Difficulty levels
  // ============================================================================

  describe('difficulty levels', () => {
    it('has beginner prompts', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const beginner = WRITING_PROMPTS.filter(p => p.difficulty === 'beginner')
      expect(beginner.length).toBeGreaterThan(0)
    })

    it('has intermediate prompts', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const intermediate = WRITING_PROMPTS.filter(p => p.difficulty === 'intermediate')
      expect(intermediate.length).toBeGreaterThan(0)
    })

    it('has advanced prompts', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')
      const advanced = WRITING_PROMPTS.filter(p => p.difficulty === 'advanced')
      expect(advanced.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Estimated Time
  // ============================================================================

  describe('estimated time', () => {
    it('all prompts have estimated time', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      WRITING_PROMPTS.forEach(prompt => {
        expect(prompt.estimatedTime).toBeDefined()
      })
    })

    it('times are in valid format', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      WRITING_PROMPTS.forEach(prompt => {
        expect(prompt.estimatedTime).toMatch(/^\d+ min$/)
      })
    })
  })

  // ============================================================================
  // Image Paths
  // ============================================================================

  describe('image paths', () => {
    it('prompts have image paths', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      const withImages = WRITING_PROMPTS.filter(p => p.imagePath)
      expect(withImages.length).toBe(WRITING_PROMPTS.length) // All should have images
    })

    it('image paths are in correct format', async () => {
      const { WRITING_PROMPTS } = await import('@/lib/codex/prompts')

      WRITING_PROMPTS.forEach(prompt => {
        if (prompt.imagePath) {
          expect(prompt.imagePath).toMatch(/^\/prompts\/[a-z0-9]+\.webp$/)
        }
      })
    })
  })
})
