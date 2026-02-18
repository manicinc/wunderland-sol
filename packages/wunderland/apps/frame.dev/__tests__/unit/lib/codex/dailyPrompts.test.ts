/**
 * Daily Prompts Tests
 * @module __tests__/unit/lib/codex/dailyPrompts.test
 *
 * Tests for the daily prompt selection system with alternatives and decay.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DailyPromptState, DailyPromptResult } from '@/lib/codex/dailyPrompts'

// Mock localStorage
let mockStorage: Record<string, string>

describe('Daily Prompts', () => {
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
  // Type Validation
  // ============================================================================

  describe('DailyPromptState type', () => {
    it('can create valid state object', () => {
      const state: DailyPromptState = {
        date: '2025-01-15',
        primaryId: 'prompt-1',
        alternativeIds: ['prompt-2', 'prompt-3', 'prompt-4'],
        selectedId: 'prompt-1',
        recentlyShownIds: ['prompt-1'],
      }

      expect(state.date).toBe('2025-01-15')
      expect(state.primaryId).toBe('prompt-1')
      expect(state.alternativeIds).toHaveLength(3)
      expect(state.selectedId).toBe('prompt-1')
    })

    it('supports selecting an alternative', () => {
      const state: DailyPromptState = {
        date: '2025-01-15',
        primaryId: 'prompt-1',
        alternativeIds: ['prompt-2', 'prompt-3'],
        selectedId: 'prompt-2', // Alternative selected
        recentlyShownIds: ['prompt-1', 'prompt-2'],
      }

      expect(state.selectedId).not.toBe(state.primaryId)
    })
  })

  describe('DailyPromptResult type', () => {
    it('can create valid result object', () => {
      const result: DailyPromptResult = {
        primary: { id: 'prompt-1', text: 'Write about...', category: 'reflection' } as any,
        alternatives: [
          { id: 'prompt-2', text: 'Describe...', category: 'creative' } as any,
        ],
        selected: { id: 'prompt-1', text: 'Write about...', category: 'reflection' } as any,
        isAlternativeSelected: false,
        decayCount: 5,
      }

      expect(result.isAlternativeSelected).toBe(false)
      expect(result.decayCount).toBe(5)
    })

    it('can indicate alternative selection', () => {
      const result: DailyPromptResult = {
        primary: { id: 'prompt-1', text: 'Write about...', category: 'reflection' } as any,
        alternatives: [
          { id: 'prompt-2', text: 'Describe...', category: 'creative' } as any,
        ],
        selected: { id: 'prompt-2', text: 'Describe...', category: 'creative' } as any,
        isAlternativeSelected: true,
        decayCount: 6,
      }

      expect(result.isAlternativeSelected).toBe(true)
    })
  })

  // ============================================================================
  // getDailyPrompts
  // ============================================================================

  describe('getDailyPrompts', () => {
    it('returns a result object', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      const result = getDailyPrompts()

      expect(result).toBeDefined()
      expect(result.primary).toBeDefined()
      expect(result.alternatives).toBeDefined()
      expect(result.selected).toBeDefined()
      expect(typeof result.isAlternativeSelected).toBe('boolean')
      expect(typeof result.decayCount).toBe('number')
    })

    it('returns primary prompt', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      const result = getDailyPrompts()

      expect(result.primary).toBeDefined()
      expect(result.primary.id).toBeDefined()
      expect(result.primary.text).toBeDefined()
    })

    it('returns alternatives', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      const result = getDailyPrompts()

      expect(Array.isArray(result.alternatives)).toBe(true)
    })

    it('selected defaults to primary', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      const result = getDailyPrompts()

      expect(result.selected.id).toBe(result.primary.id)
      expect(result.isAlternativeSelected).toBe(false)
    })

    it('returns consistent results for same day', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      const result1 = getDailyPrompts()
      const result2 = getDailyPrompts()

      expect(result1.primary.id).toBe(result2.primary.id)
    })

    it('stores state in localStorage', async () => {
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      getDailyPrompts()

      const stored = mockStorage['fabric_daily_prompts_state']
      expect(stored).toBeDefined()

      const state = JSON.parse(stored)
      expect(state.date).toBeDefined()
      expect(state.primaryId).toBeDefined()
    })
  })

  // ============================================================================
  // selectAlternativePrompt
  // ============================================================================

  describe('selectAlternativePrompt', () => {
    it('returns null when no state exists', async () => {
      const { selectAlternativePrompt } = await import('@/lib/codex/dailyPrompts')
      const result = selectAlternativePrompt('prompt-123')

      expect(result).toBeNull()
    })

    it('returns null for invalid prompt ID', async () => {
      const { getDailyPrompts, selectAlternativePrompt } = await import('@/lib/codex/dailyPrompts')

      // Initialize state
      getDailyPrompts()

      const result = selectAlternativePrompt('invalid-id')
      expect(result).toBeNull()
    })

    it('updates selection to alternative', async () => {
      const { getDailyPrompts, selectAlternativePrompt } = await import('@/lib/codex/dailyPrompts')

      const initial = getDailyPrompts()

      if (initial.alternatives.length > 0) {
        const altId = initial.alternatives[0].id
        const result = selectAlternativePrompt(altId)

        expect(result).not.toBeNull()
        expect(result?.isAlternativeSelected).toBe(true)
        expect(result?.selected.id).toBe(altId)
      }
    })

    it('can select primary prompt', async () => {
      const { getDailyPrompts, selectAlternativePrompt } = await import('@/lib/codex/dailyPrompts')

      const initial = getDailyPrompts()
      const result = selectAlternativePrompt(initial.primary.id)

      expect(result).not.toBeNull()
      expect(result?.isAlternativeSelected).toBe(false)
    })
  })

  // ============================================================================
  // resetDailyPrompts
  // ============================================================================

  describe('resetDailyPrompts', () => {
    it('clears stored state', async () => {
      const { getDailyPrompts, resetDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      getDailyPrompts()
      expect(mockStorage['fabric_daily_prompts_state']).toBeDefined()

      resetDailyPrompts()
      expect(mockStorage['fabric_daily_prompts_state']).toBeUndefined()
    })

    it('does not throw in SSR mode', async () => {
      vi.stubGlobal('localStorage', undefined)
      const { resetDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      expect(() => resetDailyPrompts()).not.toThrow()
    })
  })

  // ============================================================================
  // getRecentlyShownIds
  // ============================================================================

  describe('getRecentlyShownIds', () => {
    it('returns empty array when no state', async () => {
      const { getRecentlyShownIds } = await import('@/lib/codex/dailyPrompts')
      const result = getRecentlyShownIds()

      expect(result).toEqual([])
    })

    it('returns recently shown IDs after getting prompts', async () => {
      const { getDailyPrompts, getRecentlyShownIds } = await import('@/lib/codex/dailyPrompts')

      getDailyPrompts()
      const result = getRecentlyShownIds()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // forceRegenerateDailyPrompts
  // ============================================================================

  describe('forceRegenerateDailyPrompts', () => {
    it('generates new prompts', async () => {
      const { getDailyPrompts, forceRegenerateDailyPrompts, resetDailyPrompts } = await import(
        '@/lib/codex/dailyPrompts'
      )

      getDailyPrompts()
      resetDailyPrompts()

      const result = forceRegenerateDailyPrompts()
      expect(result).toBeDefined()
      expect(result.primary).toBeDefined()
    })

    it('accepts mood parameter', async () => {
      const { forceRegenerateDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      const result = forceRegenerateDailyPrompts('creative')
      expect(result).toBeDefined()
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR safety', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', undefined)
    })

    it('getDailyPrompts works without localStorage', async () => {
      vi.resetModules()
      const { getDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      const result = getDailyPrompts()
      expect(result).toBeDefined()
      expect(result.primary).toBeDefined()
    })

    it('selectAlternativePrompt returns null without localStorage', async () => {
      vi.resetModules()
      const { selectAlternativePrompt } = await import('@/lib/codex/dailyPrompts')

      const result = selectAlternativePrompt('any-id')
      expect(result).toBeNull()
    })

    it('getRecentlyShownIds returns empty without localStorage', async () => {
      vi.resetModules()
      const { getRecentlyShownIds } = await import('@/lib/codex/dailyPrompts')

      const result = getRecentlyShownIds()
      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // Decay System
  // ============================================================================

  describe('decay system', () => {
    it('tracks recently shown prompts', async () => {
      const { getDailyPrompts, getRecentlyShownIds } = await import('@/lib/codex/dailyPrompts')

      getDailyPrompts()
      const shown = getRecentlyShownIds()

      expect(shown.length).toBeGreaterThan(0)
    })

    it('limits decay list size', async () => {
      const { getRecentlyShownIds, getDailyPrompts } = await import('@/lib/codex/dailyPrompts')

      // Simulate many days worth of prompts
      mockStorage['fabric_daily_prompts_state'] = JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        primaryId: 'p1',
        alternativeIds: [],
        selectedId: 'p1',
        recentlyShownIds: Array.from({ length: 50 }, (_, i) => `prompt-${i}`),
      })

      const { forceRegenerateDailyPrompts } = await import('@/lib/codex/dailyPrompts')
      forceRegenerateDailyPrompts()

      const shown = getRecentlyShownIds()
      expect(shown.length).toBeLessThanOrEqual(30)
    })
  })
})
