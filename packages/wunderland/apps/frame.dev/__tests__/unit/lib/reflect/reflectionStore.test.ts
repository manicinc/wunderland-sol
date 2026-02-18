/**
 * Reflection Store Tests
 * @module __tests__/unit/lib/reflect/reflectionStore.test
 *
 * Tests for the reflection storage system including date utilities,
 * path utilities, templates, database operations, and relationship tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Reflection, ReflectionMetadata } from '@/lib/reflect/types'
import type { SyncStatus } from '@/lib/publish/types'

// Mock codexDatabase
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => null),
}))

// Mock localStorage
let mockStorage: Record<string, string>

describe('Reflection Store', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

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
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // Date Utilities
  // ============================================================================

  describe('formatDateKey', () => {
    it('formats date as YYYY-MM-DD', async () => {
      const { formatDateKey } = await import('@/lib/reflect/reflectionStore')
      // Use explicit year, month, day to avoid timezone issues
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      expect(formatDateKey(date)).toBe('2025-01-15')
    })

    it('pads single digit months', async () => {
      const { formatDateKey } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 2, 5) // March 5, 2025
      expect(formatDateKey(date)).toBe('2025-03-05')
    })

    it('pads single digit days', async () => {
      const { formatDateKey } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 11, 1) // Dec 1, 2025
      expect(formatDateKey(date)).toBe('2025-12-01')
    })
  })

  describe('formatDateDisplay', () => {
    it('formats date for display with full weekday', async () => {
      const { formatDateDisplay } = await import('@/lib/reflect/reflectionStore')
      // Use explicit year, month, day to avoid timezone issues
      const date = new Date(2025, 0, 15) // Jan 15, 2025 is a Wednesday
      const display = formatDateDisplay(date)

      expect(display).toContain('Wednesday')
      expect(display).toContain('January')
      expect(display).toContain('15')
      expect(display).toContain('2025')
    })
  })

  describe('formatDateTitle', () => {
    it('formats date for title without weekday', async () => {
      const { formatDateTitle } = await import('@/lib/reflect/reflectionStore')
      // Use explicit year, month, day to avoid timezone issues
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const title = formatDateTitle(date)

      expect(title).not.toContain('Wednesday')
      expect(title).toContain('January')
      expect(title).toContain('15')
      expect(title).toContain('2025')
    })
  })

  describe('parseDateKey', () => {
    it('parses YYYY-MM-DD to Date', async () => {
      const { parseDateKey } = await import('@/lib/reflect/reflectionStore')
      const date = parseDateKey('2025-01-15')

      expect(date.getFullYear()).toBe(2025)
      expect(date.getMonth()).toBe(0) // January is 0
      expect(date.getDate()).toBe(15)
    })

    it('handles December correctly', async () => {
      const { parseDateKey } = await import('@/lib/reflect/reflectionStore')
      const date = parseDateKey('2024-12-25')

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11) // December is 11
      expect(date.getDate()).toBe(25)
    })
  })

  describe('getTodayKey', () => {
    it('returns today date key', async () => {
      const { getTodayKey } = await import('@/lib/reflect/reflectionStore')
      expect(getTodayKey()).toBe('2025-01-15')
    })
  })

  describe('getRelativeDateKey', () => {
    it('returns yesterday for -1', async () => {
      const { getRelativeDateKey } = await import('@/lib/reflect/reflectionStore')
      expect(getRelativeDateKey(-1)).toBe('2025-01-14')
    })

    it('returns tomorrow for +1', async () => {
      const { getRelativeDateKey } = await import('@/lib/reflect/reflectionStore')
      expect(getRelativeDateKey(1)).toBe('2025-01-16')
    })

    it('returns last week for -7', async () => {
      const { getRelativeDateKey } = await import('@/lib/reflect/reflectionStore')
      expect(getRelativeDateKey(-7)).toBe('2025-01-08')
    })

    it('returns today for 0', async () => {
      const { getRelativeDateKey } = await import('@/lib/reflect/reflectionStore')
      expect(getRelativeDateKey(0)).toBe('2025-01-15')
    })
  })

  describe('getISOWeekNumber', () => {
    it('returns correct week number for mid-year date', async () => {
      const { getISOWeekNumber } = await import('@/lib/reflect/reflectionStore')
      const date = new Date('2025-01-15')
      const week = getISOWeekNumber(date)

      expect(week).toBeGreaterThan(0)
      expect(week).toBeLessThanOrEqual(53)
    })

    it('returns week 1 for first week of year', async () => {
      const { getISOWeekNumber } = await import('@/lib/reflect/reflectionStore')
      const date = new Date('2025-01-02') // First Thursday of 2025
      const week = getISOWeekNumber(date)

      expect(week).toBe(1)
    })
  })

  describe('getWeekDateRange', () => {
    it('returns start and end dates for a week', async () => {
      const { getWeekDateRange } = await import('@/lib/reflect/reflectionStore')
      const { start, end } = getWeekDateRange(2025, 3)

      expect(start).toBeInstanceOf(Date)
      expect(end).toBeInstanceOf(Date)
      expect(end.getTime()).toBeGreaterThan(start.getTime())
    })

    it('end is 6 days after start', async () => {
      const { getWeekDateRange } = await import('@/lib/reflect/reflectionStore')
      const { start, end } = getWeekDateRange(2025, 3)

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(6)
    })
  })

  describe('getMonthName', () => {
    it('returns January for 1', async () => {
      const { getMonthName } = await import('@/lib/reflect/reflectionStore')
      expect(getMonthName(1)).toBe('January')
    })

    it('returns December for 12', async () => {
      const { getMonthName } = await import('@/lib/reflect/reflectionStore')
      expect(getMonthName(12)).toBe('December')
    })

    it('returns June for 6', async () => {
      const { getMonthName } = await import('@/lib/reflect/reflectionStore')
      expect(getMonthName(6)).toBe('June')
    })
  })

  // ============================================================================
  // Path Utilities
  // ============================================================================

  describe('getReflectionPath', () => {
    it('returns correct path format', async () => {
      const { getReflectionPath } = await import('@/lib/reflect/reflectionStore')
      const path = getReflectionPath('2025-01-15')

      expect(path).toBe('weaves/reflections/2025-01-15')
    })
  })

  describe('getTodayReflectionPath', () => {
    it('returns today reflection path', async () => {
      const { getTodayReflectionPath } = await import('@/lib/reflect/reflectionStore')
      const path = getTodayReflectionPath()

      expect(path).toBe('weaves/reflections/2025-01-15')
    })
  })

  describe('isReflectionPath', () => {
    it('returns true for reflection paths', async () => {
      const { isReflectionPath } = await import('@/lib/reflect/reflectionStore')

      expect(isReflectionPath('weaves/reflections/2025-01-15')).toBe(true)
      expect(isReflectionPath('weaves/reflections/2024-12-25')).toBe(true)
    })

    it('returns false for non-reflection paths', async () => {
      const { isReflectionPath } = await import('@/lib/reflect/reflectionStore')

      expect(isReflectionPath('weaves/wiki/strands/test.md')).toBe(false)
      expect(isReflectionPath('weaves/other/2025-01-15')).toBe(false)
      expect(isReflectionPath('reflections/2025-01-15')).toBe(false)
    })
  })

  describe('getDateFromPath', () => {
    it('extracts date from reflection path', async () => {
      const { getDateFromPath } = await import('@/lib/reflect/reflectionStore')

      expect(getDateFromPath('weaves/reflections/2025-01-15')).toBe('2025-01-15')
      expect(getDateFromPath('weaves/reflections/2024-12-25')).toBe('2024-12-25')
    })

    it('returns null for non-reflection paths', async () => {
      const { getDateFromPath } = await import('@/lib/reflect/reflectionStore')

      expect(getDateFromPath('weaves/wiki/strands/test.md')).toBeNull()
      expect(getDateFromPath('invalid/path')).toBeNull()
    })
  })

  // ============================================================================
  // Template Generation
  // ============================================================================

  describe('getReflectionTemplate', () => {
    it('returns template with required fields', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date)

      expect(template.title).toBeDefined()
      expect(template.content).toBeDefined()
      expect(template.frontmatter).toBeDefined()
    })

    it('includes date in frontmatter', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date)

      expect(template.frontmatter.date).toBe('2025-01-15')
      expect(template.frontmatter.type).toBe('reflection')
    })

    it('includes reflection sections in content', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date)

      expect(template.content).toContain('## Morning Intentions')
      expect(template.content).toContain('## Notes & Thoughts')
      expect(template.content).toContain('## What Got Done')
      expect(template.content).toContain('## Evening Reflection')
    })

    it('includes planner section when requested', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date, { includePlanner: true })

      expect(template.content).toContain("## Today's Tasks")
      expect(template.content).toContain('## Events')
    })

    it('includes mood in frontmatter when provided', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date, { mood: 'energetic' })

      expect(template.frontmatter.mood).toBe('energetic')
    })

    it('includes created and updated timestamps', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date)

      expect(template.frontmatter.created).toBeDefined()
      expect(template.frontmatter.updated).toBeDefined()
    })

    it('includes reflection tag', async () => {
      const { getReflectionTemplate } = await import('@/lib/reflect/reflectionStore')
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const template = getReflectionTemplate(date)

      expect(template.frontmatter.tags).toContain('reflection')
    })
  })

  // ============================================================================
  // Database Operations (SSR Safety)
  // ============================================================================

  describe('database operations - SSR safety', () => {
    it('initReflectionsSchema handles no database', async () => {
      const { initReflectionsSchema } = await import('@/lib/reflect/reflectionStore')
      await expect(initReflectionsSchema()).resolves.not.toThrow()
    })

    it('getReflection returns null when no database', async () => {
      const { getReflection } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflection('2025-01-15')
      expect(result).toBeNull()
    })

    it('reflectionExists returns false when no database', async () => {
      const { reflectionExists } = await import('@/lib/reflect/reflectionStore')
      const result = await reflectionExists('2025-01-15')
      expect(result).toBe(false)
    })

    it('saveReflection handles no database', async () => {
      const { saveReflection } = await import('@/lib/reflect/reflectionStore')
      const reflection: Reflection = {
        date: '2025-01-15',
        strandPath: 'weaves/reflections/2025-01-15',
        title: 'January 15, 2025',
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await expect(saveReflection(reflection)).resolves.not.toThrow()
    })

    it('updateReflectionMetadata handles no database', async () => {
      const { updateReflectionMetadata } = await import('@/lib/reflect/reflectionStore')
      await expect(updateReflectionMetadata('2025-01-15', { mood: 'happy' })).resolves.not.toThrow()
    })

    it('setReflectionMood handles no database', async () => {
      const { setReflectionMood } = await import('@/lib/reflect/reflectionStore')
      await expect(setReflectionMood('2025-01-15', 'energetic')).resolves.not.toThrow()
    })

    it('setReflectionSleep handles no database', async () => {
      const { setReflectionSleep } = await import('@/lib/reflect/reflectionStore')
      await expect(setReflectionSleep('2025-01-15', 'good')).resolves.not.toThrow()
    })

    it('getRecentReflections returns empty when no database', async () => {
      const { getRecentReflections } = await import('@/lib/reflect/reflectionStore')
      const result = await getRecentReflections()
      expect(result).toEqual([])
    })

    it('getReflectionsInRange returns empty when no database', async () => {
      const { getReflectionsInRange } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionsInRange('2025-01-01', '2025-01-31')
      expect(result).toEqual([])
    })

    it('getCalendarMarkers returns markers with no reflections', async () => {
      const { getCalendarMarkers } = await import('@/lib/reflect/reflectionStore')
      const result = await getCalendarMarkers(2025, 1)

      expect(result.length).toBe(31) // January has 31 days
      result.forEach(marker => {
        expect(marker.hasReflection).toBe(false)
      })
    })

    it('searchReflections returns empty when no database', async () => {
      const { searchReflections } = await import('@/lib/reflect/reflectionStore')
      const result = await searchReflections('test')
      expect(result).toEqual([])
    })

    it('searchReflections returns empty for empty query', async () => {
      const { searchReflections } = await import('@/lib/reflect/reflectionStore')
      const result = await searchReflections('   ')
      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // getOrCreateReflection
  // ============================================================================

  describe('getOrCreateReflection', () => {
    it('creates new reflection when none exists', async () => {
      const { getOrCreateReflection } = await import('@/lib/reflect/reflectionStore')
      const result = await getOrCreateReflection('2025-01-15')

      expect(result.isNew).toBe(true)
      expect(result.reflection).toBeDefined()
      expect(result.template).toBeDefined()
      expect(result.content).toBeDefined()
    })

    it('sets mood in metadata when provided', async () => {
      const { getOrCreateReflection } = await import('@/lib/reflect/reflectionStore')
      const result = await getOrCreateReflection('2025-01-15', { mood: 'creative' })

      expect(result.reflection.metadata?.mood).toBe('creative')
    })
  })

  // ============================================================================
  // Hierarchy Queries
  // ============================================================================

  describe('getReflectionYears', () => {
    it('returns empty when no database', async () => {
      const { getReflectionYears } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionYears()
      expect(result).toEqual([])
    })
  })

  describe('getReflectionMonths', () => {
    it('returns empty when no database', async () => {
      const { getReflectionMonths } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionMonths(2025)
      expect(result).toEqual([])
    })
  })

  describe('getReflectionWeeks', () => {
    it('returns empty when no reflections', async () => {
      const { getReflectionWeeks } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionWeeks(2025, 1)
      expect(result).toEqual([])
    })
  })

  describe('getReflectionsByPeriod', () => {
    it('returns empty when no database', async () => {
      const { getReflectionsByPeriod } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionsByPeriod(2025)
      expect(result).toEqual([])
    })

    it('can query by month', async () => {
      const { getReflectionsByPeriod } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionsByPeriod(2025, 1)
      expect(result).toEqual([])
    })

    it('can query by week', async () => {
      const { getReflectionsByPeriod } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionsByPeriod(2025, 1, 3)
      expect(result).toEqual([])
    })
  })

  // ============================================================================
  // Analytics
  // ============================================================================

  describe('getReflectionStreak', () => {
    it('returns zero streak when no database', async () => {
      const { getReflectionStreak } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionStreak()

      expect(result.current).toBe(0)
      expect(result.longest).toBe(0)
      expect(result.thisWeek).toBe(0)
      expect(result.thisMonth).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getMoodTrend', () => {
    it('returns array of trend points', async () => {
      const { getMoodTrend } = await import('@/lib/reflect/reflectionStore')
      const result = await getMoodTrend(30)

      expect(result.length).toBe(31) // 30 days + today
      result.forEach(point => {
        expect(point.date).toBeDefined()
        expect(point.mood).toBeUndefined() // No reflections
      })
    })

    it('respects days parameter', async () => {
      const { getMoodTrend } = await import('@/lib/reflect/reflectionStore')
      const result = await getMoodTrend(7)

      expect(result.length).toBe(8) // 7 days + today
    })
  })

  // ============================================================================
  // Relationship Tracking
  // ============================================================================

  describe('getStoredRelationships', () => {
    it('returns empty array when no relationships stored', async () => {
      const { getStoredRelationships } = await import('@/lib/reflect/reflectionStore')
      const result = getStoredRelationships()
      expect(result).toEqual([])
    })

    it('returns stored relationships', async () => {
      const { getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      // Set up data after import - functions should read from localStorage on each call
      mockStorage['codex-relationships'] = JSON.stringify([
        { handle: 'johndoe', name: 'John Doe', mentionCount: 5 },
      ])
      const result = getStoredRelationships()

      expect(result).toHaveLength(1)
      expect(result[0].handle).toBe('johndoe')
    })

    it('handles invalid JSON gracefully', async () => {
      const { getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      mockStorage['codex-relationships'] = 'invalid-json'
      const result = getStoredRelationships()
      expect(result).toEqual([])
    })
  })

  describe('trackRelationshipMention', () => {
    it('adds new relationship', async () => {
      const { trackRelationshipMention, getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      trackRelationshipMention({ handle: 'janedoe' })
      const relationships = getStoredRelationships()

      expect(relationships).toHaveLength(1)
      expect(relationships[0].handle).toBe('janedoe')
      expect(relationships[0].mentionCount).toBe(1)
    })

    it('increments mention count for existing relationship', async () => {
      const { trackRelationshipMention, getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      // Set up initial data after import
      mockStorage['codex-relationships'] = JSON.stringify([
        {
          handle: 'johndoe',
          mentionCount: 5,
          firstMentioned: '2025-01-01T00:00:00Z',
          lastMentioned: '2025-01-01T00:00:00Z',
        },
      ])

      trackRelationshipMention({ handle: 'johndoe' })
      const relationships = getStoredRelationships()

      expect(relationships).toHaveLength(1)
      expect(relationships[0].mentionCount).toBe(6)
    })

    it('updates lastMentioned timestamp', async () => {
      const { trackRelationshipMention, getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      // Set up initial data after import
      mockStorage['codex-relationships'] = JSON.stringify([
        {
          handle: 'johndoe',
          mentionCount: 5,
          firstMentioned: '2025-01-01T00:00:00Z',
          lastMentioned: '2025-01-01T00:00:00Z',
        },
      ])

      trackRelationshipMention({ handle: 'johndoe' })
      const relationships = getStoredRelationships()

      expect(relationships[0].lastMentioned).toBe('2025-01-15T12:00:00.000Z')
    })

    it('can add name and category', async () => {
      const { trackRelationshipMention, getStoredRelationships } = await import('@/lib/reflect/reflectionStore')

      trackRelationshipMention({
        handle: 'newperson',
        name: 'New Person',
        category: 'work',
      })
      const relationships = getStoredRelationships()

      expect(relationships[0].name).toBe('New Person')
      expect(relationships[0].category).toBe('work')
    })
  })

  describe('getRelationshipSuggestions', () => {
    const setupRelationships = () => {
      mockStorage['codex-relationships'] = JSON.stringify([
        { handle: 'johndoe', name: 'John Doe', mentionCount: 10, firstMentioned: '', lastMentioned: '' },
        { handle: 'janedoe', name: 'Jane Doe', mentionCount: 5, firstMentioned: '', lastMentioned: '' },
        { handle: 'bobsmith', name: 'Bob Smith', mentionCount: 3, firstMentioned: '', lastMentioned: '' },
      ])
    }

    it('filters by prefix', async () => {
      const { getRelationshipSuggestions } = await import('@/lib/reflect/reflectionStore')
      setupRelationships()
      const result = getRelationshipSuggestions('john')

      expect(result).toHaveLength(1)
      expect(result[0].handle).toBe('johndoe')
    })

    it('filters by name', async () => {
      const { getRelationshipSuggestions } = await import('@/lib/reflect/reflectionStore')
      setupRelationships()
      const result = getRelationshipSuggestions('doe')

      expect(result).toHaveLength(2)
    })

    it('removes @ prefix from search', async () => {
      const { getRelationshipSuggestions } = await import('@/lib/reflect/reflectionStore')
      setupRelationships()
      const result = getRelationshipSuggestions('@john')

      expect(result).toHaveLength(1)
    })

    it('sorts by mention count', async () => {
      const { getRelationshipSuggestions } = await import('@/lib/reflect/reflectionStore')
      setupRelationships()
      const result = getRelationshipSuggestions('doe')

      expect(result[0].handle).toBe('johndoe') // Higher mention count
      expect(result[1].handle).toBe('janedoe')
    })

    it('limits to 10 results', async () => {
      const { getRelationshipSuggestions } = await import('@/lib/reflect/reflectionStore')
      // Add many relationships after import
      const manyRelationships = Array.from({ length: 20 }, (_, i) => ({
        handle: `person${i}`,
        mentionCount: 1,
        firstMentioned: '',
        lastMentioned: '',
      }))
      mockStorage['codex-relationships'] = JSON.stringify(manyRelationships)

      const result = getRelationshipSuggestions('person')

      expect(result.length).toBeLessThanOrEqual(10)
    })
  })

  // ============================================================================
  // SSR Safety - Relationships
  // ============================================================================

  describe('relationships - SSR safety', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined)
    })

    it('getStoredRelationships returns empty without window', async () => {
      vi.resetModules()
      const { getStoredRelationships } = await import('@/lib/reflect/reflectionStore')
      const result = getStoredRelationships()
      expect(result).toEqual([])
    })

    it('trackRelationshipMention does not throw without window', async () => {
      vi.resetModules()
      const { trackRelationshipMention } = await import('@/lib/reflect/reflectionStore')
      expect(() => trackRelationshipMention({ handle: 'test' })).not.toThrow()
    })
  })

  // ============================================================================
  // Sync Status Operations
  // ============================================================================

  describe('updateReflectionSyncStatus', () => {
    it('handles no database', async () => {
      const { updateReflectionSyncStatus } = await import('@/lib/reflect/reflectionStore')
      await expect(updateReflectionSyncStatus('2025-01-15', 'pending')).resolves.not.toThrow()
    })
  })

  describe('getPendingReflections', () => {
    it('returns empty when no database', async () => {
      const { getPendingReflections } = await import('@/lib/reflect/reflectionStore')
      const result = await getPendingReflections()
      expect(result).toEqual([])
    })
  })

  describe('getReflectionsBySyncStatus', () => {
    it('returns empty when no database', async () => {
      const { getReflectionsBySyncStatus } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionsBySyncStatus('synced')
      expect(result).toEqual([])
    })
  })

  describe('bulkUpdateReflectionSyncStatus', () => {
    it('handles no database', async () => {
      const { bulkUpdateReflectionSyncStatus } = await import('@/lib/reflect/reflectionStore')
      await expect(
        bulkUpdateReflectionSyncStatus(['2025-01-15', '2025-01-14'], 'syncing')
      ).resolves.not.toThrow()
    })

    it('handles empty dateKeys array', async () => {
      const { bulkUpdateReflectionSyncStatus } = await import('@/lib/reflect/reflectionStore')
      await expect(bulkUpdateReflectionSyncStatus([], 'synced')).resolves.not.toThrow()
    })
  })

  describe('markReflectionModified', () => {
    it('handles no database', async () => {
      const { markReflectionModified } = await import('@/lib/reflect/reflectionStore')
      await expect(markReflectionModified('2025-01-15')).resolves.not.toThrow()
    })
  })

  describe('getReflectionSyncCounts', () => {
    it('returns zero counts when no database', async () => {
      const { getReflectionSyncCounts } = await import('@/lib/reflect/reflectionStore')
      const result = await getReflectionSyncCounts()

      expect(result.local).toBe(0)
      expect(result.pending).toBe(0)
      expect(result.syncing).toBe(0)
      expect(result.synced).toBe(0)
      expect(result.modified).toBe(0)
      expect(result.conflict).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  // ============================================================================
  // Default Export
  // ============================================================================

  describe('default export', () => {
    it('exports all functions', async () => {
      const reflectionStore = await import('@/lib/reflect/reflectionStore')
      const defaultExport = reflectionStore.default

      // Date utilities
      expect(defaultExport.formatDateKey).toBeDefined()
      expect(defaultExport.formatDateDisplay).toBeDefined()
      expect(defaultExport.formatDateTitle).toBeDefined()
      expect(defaultExport.parseDateKey).toBeDefined()
      expect(defaultExport.getTodayKey).toBeDefined()
      expect(defaultExport.getRelativeDateKey).toBeDefined()
      expect(defaultExport.getISOWeekNumber).toBeDefined()
      expect(defaultExport.getWeekDateRange).toBeDefined()
      expect(defaultExport.getMonthName).toBeDefined()

      // Path utilities
      expect(defaultExport.getReflectionPath).toBeDefined()
      expect(defaultExport.getTodayReflectionPath).toBeDefined()
      expect(defaultExport.isReflectionPath).toBeDefined()
      expect(defaultExport.getDateFromPath).toBeDefined()

      // Templates
      expect(defaultExport.getReflectionTemplate).toBeDefined()

      // Database
      expect(defaultExport.initReflectionsSchema).toBeDefined()
      expect(defaultExport.getReflection).toBeDefined()
      expect(defaultExport.reflectionExists).toBeDefined()
      expect(defaultExport.saveReflection).toBeDefined()

      // Analytics
      expect(defaultExport.getReflectionStreak).toBeDefined()
      expect(defaultExport.getMoodTrend).toBeDefined()

      // Relationships
      expect(defaultExport.getStoredRelationships).toBeDefined()
      expect(defaultExport.trackRelationshipMention).toBeDefined()
      expect(defaultExport.getRelationshipSuggestions).toBeDefined()
    })
  })
})
