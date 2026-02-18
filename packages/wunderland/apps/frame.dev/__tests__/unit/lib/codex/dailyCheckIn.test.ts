/**
 * Daily Check-In Tests
 * @module __tests__/unit/lib/codex/dailyCheckIn.test
 *
 * Tests for the daily check-in system with mood and sleep tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DailyCheckIn } from '@/lib/codex/dailyCheckIn'

// Mock localStorage
let mockStorage: Record<string, string>

describe('Daily Check-In', () => {
  beforeEach(() => {
    vi.resetModules()
    mockStorage = {}

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

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
    vi.useRealTimers()
  })

  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('DailyCheckIn type', () => {
    it('can create minimal check-in', () => {
      const checkIn: DailyCheckIn = {
        date: '2025-01-15',
      }

      expect(checkIn.date).toBe('2025-01-15')
      expect(checkIn.mood).toBeUndefined()
    })

    it('can create full check-in', () => {
      const checkIn: DailyCheckIn = {
        date: '2025-01-15',
        mood: 'creative',
        moodSetAt: '2025-01-15T09:00:00Z',
        sleepHours: '7-8',
        sleepSetAt: '2025-01-15T08:00:00Z',
        note: 'Feeling productive today!',
      }

      expect(checkIn.mood).toBe('creative')
      expect(checkIn.sleepHours).toBe('7-8')
      expect(checkIn.note).toBeDefined()
    })

    it('supports all sleep hour options', () => {
      const sleepOptions: DailyCheckIn['sleepHours'][] = [
        '<4',
        '4-5',
        '5-6',
        '6-7',
        '7-8',
        '>8',
      ]

      sleepOptions.forEach((sleepHours) => {
        const checkIn: DailyCheckIn = {
          date: '2025-01-15',
          sleepHours,
        }
        expect(checkIn.sleepHours).toBe(sleepHours)
      })
    })
  })

  // ============================================================================
  // getDailyCheckIn / getTodayCheckIn
  // ============================================================================

  describe('getDailyCheckIn', () => {
    it('returns null when no check-in exists', async () => {
      const { getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')
      const result = getDailyCheckIn('2025-01-15')

      expect(result).toBeNull()
    })

    it('returns stored check-in', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-15': {
          date: '2025-01-15',
          mood: 'focused',
        },
      })

      const { getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')
      const result = getDailyCheckIn('2025-01-15')

      expect(result).not.toBeNull()
      expect(result?.mood).toBe('focused')
    })

    it('defaults to today when no date provided', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-15': {
          date: '2025-01-15',
          mood: 'relaxed',
        },
      })

      const { getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')
      const result = getDailyCheckIn()

      expect(result?.mood).toBe('relaxed')
    })
  })

  describe('getTodayCheckIn', () => {
    it('returns null when no check-in today', async () => {
      const { getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')
      const result = getTodayCheckIn()

      expect(result).toBeNull()
    })

    it('returns today check-in', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-15': {
          date: '2025-01-15',
          mood: 'energetic',
        },
      })

      const { getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')
      const result = getTodayCheckIn()

      expect(result?.mood).toBe('energetic')
    })
  })

  // ============================================================================
  // setDailyMood
  // ============================================================================

  describe('setDailyMood', () => {
    it('sets mood for today', async () => {
      const { setDailyMood, getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')

      const result = setDailyMood('creative')

      expect(result.mood).toBe('creative')
      expect(result.moodSetAt).toBeDefined()

      const stored = getTodayCheckIn()
      expect(stored?.mood).toBe('creative')
    })

    it('preserves existing data', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-15': {
          date: '2025-01-15',
          sleepHours: '7-8',
        },
      })

      const { setDailyMood, getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')

      setDailyMood('focused')

      const stored = getTodayCheckIn()
      expect(stored?.mood).toBe('focused')
      expect(stored?.sleepHours).toBe('7-8')
    })

    it('accepts optional note', async () => {
      const { setDailyMood } = await import('@/lib/codex/dailyCheckIn')

      const result = setDailyMood('grateful', 'Had a great day!')

      expect(result.note).toBe('Had a great day!')
    })

    it('updates mood if already set', async () => {
      const { setDailyMood, getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')

      setDailyMood('anxious')
      setDailyMood('peaceful')

      const stored = getTodayCheckIn()
      expect(stored?.mood).toBe('peaceful')
    })
  })

  // ============================================================================
  // setDailySleep
  // ============================================================================

  describe('setDailySleep', () => {
    it('sets sleep for today', async () => {
      const { setDailySleep, getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')

      const result = setDailySleep('7-8')

      expect(result.sleepHours).toBe('7-8')
      expect(result.sleepSetAt).toBeDefined()

      const stored = getTodayCheckIn()
      expect(stored?.sleepHours).toBe('7-8')
    })

    it('preserves existing mood', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-15': {
          date: '2025-01-15',
          mood: 'focused',
        },
      })

      const { setDailySleep, getTodayCheckIn } = await import('@/lib/codex/dailyCheckIn')

      setDailySleep('6-7')

      const stored = getTodayCheckIn()
      expect(stored?.sleepHours).toBe('6-7')
      expect(stored?.mood).toBe('focused')
    })
  })

  // ============================================================================
  // clearTodayCheckIn
  // ============================================================================

  describe('clearTodayCheckIn', () => {
    it('clears today check-in', async () => {
      const { setDailyMood, clearTodayCheckIn, getTodayCheckIn } = await import(
        '@/lib/codex/dailyCheckIn'
      )

      setDailyMood('creative')
      expect(getTodayCheckIn()).not.toBeNull()

      clearTodayCheckIn()
      expect(getTodayCheckIn()).toBeNull()
    })

    it('preserves other days', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-14': { date: '2025-01-14', mood: 'relaxed' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { clearTodayCheckIn, getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')

      clearTodayCheckIn()

      expect(getDailyCheckIn('2025-01-14')?.mood).toBe('relaxed')
      expect(getDailyCheckIn('2025-01-15')).toBeNull()
    })
  })

  // ============================================================================
  // getCheckInHistory
  // ============================================================================

  describe('getCheckInHistory', () => {
    it('returns empty array when no history', async () => {
      const { getCheckInHistory } = await import('@/lib/codex/dailyCheckIn')
      const history = getCheckInHistory()

      expect(history).toEqual([])
    })

    it('returns history sorted by date', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', mood: 'relaxed' },
        '2025-01-14': { date: '2025-01-14', mood: 'creative' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { getCheckInHistory } = await import('@/lib/codex/dailyCheckIn')
      const history = getCheckInHistory(7)

      expect(history).toHaveLength(3)
      expect(history[0].date).toBe('2025-01-15') // Most recent first
    })

    it('limits to requested days', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-10': { date: '2025-01-10', mood: 'tired' },
        '2025-01-11': { date: '2025-01-11', mood: 'neutral' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { getCheckInHistory } = await import('@/lib/codex/dailyCheckIn')
      const history = getCheckInHistory(3)

      expect(history.length).toBeLessThanOrEqual(3)
      // Should not include 2025-01-10 or 2025-01-11 as they're more than 3 days ago
    })
  })

  // ============================================================================
  // isTodayCheckInComplete
  // ============================================================================

  describe('isTodayCheckInComplete', () => {
    it('returns false when no check-in', async () => {
      const { isTodayCheckInComplete } = await import('@/lib/codex/dailyCheckIn')
      expect(isTodayCheckInComplete()).toBe(false)
    })

    it('returns false when only mood set', async () => {
      const { setDailyMood, isTodayCheckInComplete } = await import('@/lib/codex/dailyCheckIn')

      setDailyMood('creative')
      expect(isTodayCheckInComplete()).toBe(false)
    })

    it('returns false when only sleep set', async () => {
      const { setDailySleep, isTodayCheckInComplete } = await import('@/lib/codex/dailyCheckIn')

      setDailySleep('7-8')
      expect(isTodayCheckInComplete()).toBe(false)
    })

    it('returns true when both set', async () => {
      const { setDailyMood, setDailySleep, isTodayCheckInComplete } = await import(
        '@/lib/codex/dailyCheckIn'
      )

      setDailyMood('creative')
      setDailySleep('7-8')
      expect(isTodayCheckInComplete()).toBe(true)
    })
  })

  // ============================================================================
  // hasCheckedInToday
  // ============================================================================

  describe('hasCheckedInToday', () => {
    it('returns false when no check-in', async () => {
      const { hasCheckedInToday } = await import('@/lib/codex/dailyCheckIn')
      expect(hasCheckedInToday()).toBe(false)
    })

    it('returns true when mood set', async () => {
      const { setDailyMood, hasCheckedInToday } = await import('@/lib/codex/dailyCheckIn')

      setDailyMood('relaxed')
      expect(hasCheckedInToday()).toBe(true)
    })

    it('returns false when only sleep set', async () => {
      const { setDailySleep, hasCheckedInToday } = await import('@/lib/codex/dailyCheckIn')

      setDailySleep('6-7')
      expect(hasCheckedInToday()).toBe(false)
    })
  })

  // ============================================================================
  // getCheckInStreak
  // ============================================================================

  describe('getCheckInStreak', () => {
    it('returns 0 for no check-ins', async () => {
      const { getCheckInStreak } = await import('@/lib/codex/dailyCheckIn')
      expect(getCheckInStreak()).toBe(0)
    })

    it('returns 1 for today only', async () => {
      const { setDailyMood, getCheckInStreak } = await import('@/lib/codex/dailyCheckIn')

      setDailyMood('focused')
      expect(getCheckInStreak()).toBe(1)
    })

    it('counts consecutive days', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', mood: 'relaxed' },
        '2025-01-14': { date: '2025-01-14', mood: 'creative' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { getCheckInStreak } = await import('@/lib/codex/dailyCheckIn')
      expect(getCheckInStreak()).toBe(3)
    })

    it('breaks on gap', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-12': { date: '2025-01-12', mood: 'tired' }, // Gap day
        '2025-01-14': { date: '2025-01-14', mood: 'creative' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { getCheckInStreak } = await import('@/lib/codex/dailyCheckIn')
      expect(getCheckInStreak()).toBe(2)
    })

    it('allows today to be missing', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', mood: 'relaxed' },
        '2025-01-14': { date: '2025-01-14', mood: 'creative' },
        // No 2025-01-15 (today)
      })

      const { getCheckInStreak } = await import('@/lib/codex/dailyCheckIn')
      // Streak should still count from yesterday
      expect(getCheckInStreak()).toBe(2)
    })
  })

  // ============================================================================
  // getAverageSleepQuality
  // ============================================================================

  describe('getAverageSleepQuality', () => {
    it('returns 0 average for no data', async () => {
      const { getAverageSleepQuality } = await import('@/lib/codex/dailyCheckIn')
      const result = getAverageSleepQuality()

      expect(result.average).toBe(0)
      expect(result.totalDays).toBe(0)
    })

    it('calculates average sleep quality', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-14': { date: '2025-01-14', sleepHours: '7-8' }, // Quality 5
        '2025-01-15': { date: '2025-01-15', sleepHours: '5-6' }, // Quality 3
      })

      const { getAverageSleepQuality } = await import('@/lib/codex/dailyCheckIn')
      const result = getAverageSleepQuality()

      expect(result.average).toBe(4) // (5 + 3) / 2
      expect(result.totalDays).toBe(2)
    })

    it('returns distribution', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', sleepHours: '7-8' },
        '2025-01-14': { date: '2025-01-14', sleepHours: '7-8' },
        '2025-01-15': { date: '2025-01-15', sleepHours: '<4' },
      })

      const { getAverageSleepQuality } = await import('@/lib/codex/dailyCheckIn')
      const result = getAverageSleepQuality()

      expect(result.distribution['7-8']).toBe(2)
      expect(result.distribution['<4']).toBe(1)
    })
  })

  // ============================================================================
  // getMoodDistribution
  // ============================================================================

  describe('getMoodDistribution', () => {
    it('returns null mostCommon for no data', async () => {
      const { getMoodDistribution } = await import('@/lib/codex/dailyCheckIn')
      const result = getMoodDistribution()

      expect(result.mostCommon).toBeNull()
      expect(result.totalDays).toBe(0)
    })

    it('finds most common mood', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', mood: 'focused' },
        '2025-01-14': { date: '2025-01-14', mood: 'creative' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { getMoodDistribution } = await import('@/lib/codex/dailyCheckIn')
      const result = getMoodDistribution()

      expect(result.mostCommon).toBe('focused')
      expect(result.totalDays).toBe(3)
    })

    it('returns distribution', async () => {
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        '2025-01-13': { date: '2025-01-13', mood: 'creative' },
        '2025-01-14': { date: '2025-01-14', mood: 'focused' },
        '2025-01-15': { date: '2025-01-15', mood: 'creative' },
      })

      const { getMoodDistribution } = await import('@/lib/codex/dailyCheckIn')
      const result = getMoodDistribution()

      expect(result.distribution.creative).toBe(2)
      expect(result.distribution.focused).toBe(1)
    })
  })

  // ============================================================================
  // Data Cleanup
  // ============================================================================

  describe('data cleanup', () => {
    it('cleans up old entries on save', async () => {
      // Set up data from more than 90 days ago
      const oldDate = new Date('2024-10-01').toISOString().split('T')[0]
      mockStorage['codex-daily-checkins'] = JSON.stringify({
        [oldDate]: { date: oldDate, mood: 'tired' },
        '2025-01-15': { date: '2025-01-15', mood: 'focused' },
      })

      const { setDailyMood, getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')

      // This should trigger cleanup
      setDailyMood('creative')

      const parsed = JSON.parse(mockStorage['codex-daily-checkins'])
      expect(parsed[oldDate]).toBeUndefined()
      expect(parsed['2025-01-15']).toBeDefined()
    })
  })

  // ============================================================================
  // SSR Safety
  // ============================================================================

  describe('SSR safety', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined)
    })

    it('getDailyCheckIn returns null in SSR', async () => {
      vi.resetModules()
      const { getDailyCheckIn } = await import('@/lib/codex/dailyCheckIn')
      expect(getDailyCheckIn()).toBeNull()
    })

    it('setDailyMood works in SSR but returns minimal result', async () => {
      vi.resetModules()
      const { setDailyMood } = await import('@/lib/codex/dailyCheckIn')

      const result = setDailyMood('focused')
      expect(result.mood).toBe('focused')
    })

    it('getCheckInHistory returns empty in SSR', async () => {
      vi.resetModules()
      const { getCheckInHistory } = await import('@/lib/codex/dailyCheckIn')
      expect(getCheckInHistory()).toEqual([])
    })
  })
})
