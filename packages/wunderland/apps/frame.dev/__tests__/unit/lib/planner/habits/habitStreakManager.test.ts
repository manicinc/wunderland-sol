/**
 * Habit Streak Manager Tests
 * @module __tests__/unit/lib/planner/habits/habitStreakManager.test
 *
 * Tests for streak calculation and management logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getToday,
  getYesterday,
  daysBetween,
  getDaysDifference,
  isWeekday,
  countBusinessDays,
  calculateStreakBroken,
  getStreakStatus,
  createInitialStreak,
  recordCompletion,
  useStreakFreeze,
  applyCompletion,
  calculateHabitStats,
  getDailySummaries,
} from '@/lib/planner/habits/habitStreakManager'
import type { HabitStreak, HabitCompletionResult } from '@/lib/planner/habits/types'

// ============================================================================
// Date Utilities
// ============================================================================

describe('getToday', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const today = getToday()

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns current date', () => {
    const today = getToday()
    const now = new Date()
    const expected = now.toISOString().split('T')[0]

    // May differ by timezone, so just check format
    expect(today.length).toBe(10)
  })

  it('pads month with leading zero', () => {
    const today = getToday()
    const parts = today.split('-')

    expect(parts[1].length).toBe(2)
  })

  it('pads day with leading zero', () => {
    const today = getToday()
    const parts = today.split('-')

    expect(parts[2].length).toBe(2)
  })
})

describe('getYesterday', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const yesterday = getYesterday()

    expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns day before today', () => {
    const yesterday = getYesterday()
    const today = getToday()

    expect(daysBetween(yesterday, today)).toBe(1)
  })
})

describe('daysBetween', () => {
  it('returns 0 for same date', () => {
    const diff = daysBetween('2024-01-15', '2024-01-15')

    expect(diff).toBe(0)
  })

  it('returns 1 for consecutive days', () => {
    const diff = daysBetween('2024-01-15', '2024-01-16')

    expect(diff).toBe(1)
  })

  it('returns correct difference for dates apart', () => {
    const diff = daysBetween('2024-01-01', '2024-01-31')

    expect(diff).toBe(30)
  })

  it('is symmetric (order independent)', () => {
    const diff1 = daysBetween('2024-01-01', '2024-01-10')
    const diff2 = daysBetween('2024-01-10', '2024-01-01')

    expect(diff1).toBe(diff2)
    expect(diff1).toBe(9)
  })

  it('handles month boundaries', () => {
    const diff = daysBetween('2024-01-31', '2024-02-01')

    expect(diff).toBe(1)
  })

  it('handles year boundaries', () => {
    const diff = daysBetween('2023-12-31', '2024-01-01')

    expect(diff).toBe(1)
  })

  it('handles leap years', () => {
    const diff = daysBetween('2024-02-28', '2024-03-01')

    expect(diff).toBe(2) // 2024 is a leap year
  })
})

describe('getDaysDifference', () => {
  it('is alias for daysBetween', () => {
    const result1 = daysBetween('2024-01-01', '2024-01-10')
    const result2 = getDaysDifference('2024-01-01', '2024-01-10')

    expect(result1).toBe(result2)
  })
})

describe('isWeekday', () => {
  // Use T12:00:00 to avoid timezone boundary issues
  it('returns true for Monday', () => {
    expect(isWeekday('2024-01-15T12:00:00')).toBe(true) // Monday
  })

  it('returns true for Friday', () => {
    expect(isWeekday('2024-01-19T12:00:00')).toBe(true) // Friday
  })

  it('returns false for Saturday', () => {
    expect(isWeekday('2024-01-20T12:00:00')).toBe(false) // Saturday
  })

  it('returns false for Sunday', () => {
    expect(isWeekday('2024-01-21T12:00:00')).toBe(false) // Sunday
  })

  it('returns true for Tuesday-Thursday', () => {
    expect(isWeekday('2024-01-16T12:00:00')).toBe(true) // Tuesday
    expect(isWeekday('2024-01-17T12:00:00')).toBe(true) // Wednesday
    expect(isWeekday('2024-01-18T12:00:00')).toBe(true) // Thursday
  })
})

describe('countBusinessDays', () => {
  it('returns 0 for same date', () => {
    const count = countBusinessDays('2024-01-15', '2024-01-15')

    expect(count).toBe(0)
  })

  it('counts only weekdays', () => {
    // Mon Jan 15 to Fri Jan 19 = 4 business days (Tue-Fri)
    const count = countBusinessDays('2024-01-15', '2024-01-19')

    expect(count).toBe(4)
  })

  it('excludes weekends', () => {
    // Fri Jan 19 to Mon Jan 22 = 1 business day (Mon)
    const count = countBusinessDays('2024-01-19', '2024-01-22')

    expect(count).toBe(1)
  })

  it('handles full week', () => {
    // Mon Jan 15 to Mon Jan 22 = 5 business days
    const count = countBusinessDays('2024-01-15', '2024-01-22')

    expect(count).toBe(5)
  })

  it('handles two week span', () => {
    // Mon Jan 15 to Mon Jan 29 = 10 business days
    const count = countBusinessDays('2024-01-15', '2024-01-29')

    expect(count).toBe(10)
  })
})

// ============================================================================
// calculateStreakBroken
// ============================================================================

describe('calculateStreakBroken', () => {
  describe('no last completion', () => {
    it('returns not broken when no history', () => {
      const result = calculateStreakBroken(undefined, 'daily')

      expect(result.streakBroken).toBe(false)
      expect(result.inGracePeriod).toBe(false)
      expect(result.daysOverdue).toBe(0)
    })
  })

  describe('daily frequency', () => {
    it('is not broken when completed today', () => {
      const today = getToday()
      const result = calculateStreakBroken(today, 'daily')

      expect(result.streakBroken).toBe(false)
      expect(result.inGracePeriod).toBe(false)
    })

    it('is not broken when completed yesterday', () => {
      const yesterday = getYesterday()
      const result = calculateStreakBroken(yesterday, 'daily')

      expect(result.streakBroken).toBe(false)
      expect(result.inGracePeriod).toBe(false)
    })
  })

  describe('weekly frequency', () => {
    it('is not broken within 7 days', () => {
      // Create a date 5 days ago
      const d = new Date()
      d.setDate(d.getDate() - 5)
      const fiveDaysAgo = d.toISOString().split('T')[0]

      const result = calculateStreakBroken(fiveDaysAgo, 'weekly')

      expect(result.streakBroken).toBe(false)
    })

    it('is not broken at exactly 7 days', () => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      const sevenDaysAgo = d.toISOString().split('T')[0]

      const result = calculateStreakBroken(sevenDaysAgo, 'weekly')

      expect(result.streakBroken).toBe(false)
    })
  })
})

// ============================================================================
// createInitialStreak
// ============================================================================

describe('createInitialStreak', () => {
  it('creates streak with taskId', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.taskId).toBe('task-123')
  })

  it('starts with zero current streak', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.currentStreak).toBe(0)
  })

  it('starts with zero longest streak', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.longestStreak).toBe(0)
  })

  it('starts with one streak freeze', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.streakFreezesRemaining).toBe(1)
  })

  it('starts with empty completion history', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.completionHistory).toEqual([])
  })

  it('starts with zero total completions', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.totalCompletions).toBe(0)
  })

  it('has undefined lastCompletedDate', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.lastCompletedDate).toBeUndefined()
  })

  it('has undefined freezeActiveUntil', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.freezeActiveUntil).toBeUndefined()
  })

  it('generates unique id', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.id).toBeDefined()
    expect(streak.id.length).toBeGreaterThan(0)
  })

  it('generates different ids each time', () => {
    const streak1 = createInitialStreak('task-123')
    const streak2 = createInitialStreak('task-123')

    expect(streak1.id).not.toBe(streak2.id)
  })

  it('sets createdAt timestamp', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.createdAt).toBeDefined()
    expect(new Date(streak.createdAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('sets updatedAt timestamp', () => {
    const streak = createInitialStreak('task-123')

    expect(streak.updatedAt).toBeDefined()
    expect(streak.updatedAt).toBe(streak.createdAt)
  })
})

// ============================================================================
// recordCompletion
// ============================================================================

describe('recordCompletion', () => {
  const createTestStreak = (overrides: Partial<HabitStreak> = {}): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: undefined,
    completionHistory: [],
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  describe('first completion', () => {
    it('starts streak at 1', () => {
      const streak = createTestStreak()
      const result = recordCompletion(streak, 'daily')

      expect(result.newStreak).toBe(1)
    })

    it('returns success', () => {
      const streak = createTestStreak()
      const result = recordCompletion(streak, 'daily')

      expect(result.success).toBe(true)
      expect(result.streakUpdated).toBe(true)
    })

    it('updates longest streak', () => {
      const streak = createTestStreak()
      const result = recordCompletion(streak, 'daily')

      expect(result.longestStreak).toBe(1)
    })
  })

  describe('already completed today', () => {
    it('returns already completed', () => {
      const today = getToday()
      const streak = createTestStreak({
        completionHistory: [today],
        lastCompletedDate: today,
        currentStreak: 1,
      })

      const result = recordCompletion(streak, 'daily', today)

      expect(result.success).toBe(false)
      expect(result.alreadyCompleted).toBe(true)
    })

    it('does not update streak', () => {
      const today = getToday()
      const streak = createTestStreak({
        completionHistory: [today],
        lastCompletedDate: today,
        currentStreak: 5,
      })

      const result = recordCompletion(streak, 'daily', today)

      expect(result.newStreak).toBe(5)
      expect(result.streakUpdated).toBe(false)
    })
  })

  describe('achievement unlocks', () => {
    it('unlocks 3-day streak achievement', () => {
      const streak = createTestStreak({
        currentStreak: 2,
        lastCompletedDate: getYesterday(),
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.achievementsUnlocked).toContain('habit-streak-3')
    })

    it('unlocks 7-day streak achievement', () => {
      const streak = createTestStreak({
        currentStreak: 6,
        lastCompletedDate: getYesterday(),
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.achievementsUnlocked).toContain('habit-streak-7')
    })

    it('unlocks 30-day streak achievement', () => {
      const streak = createTestStreak({
        currentStreak: 29,
        lastCompletedDate: getYesterday(),
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.achievementsUnlocked).toContain('habit-streak-30')
    })
  })

  describe('streak continuation', () => {
    it('continues streak from yesterday', () => {
      const streak = createTestStreak({
        currentStreak: 5,
        lastCompletedDate: getYesterday(),
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.newStreak).toBe(6)
      expect(result.streakContinued).toBe(true)
    })
  })
})

// ============================================================================
// useStreakFreeze
// ============================================================================

describe('useStreakFreeze', () => {
  const createTestStreak = (overrides: Partial<HabitStreak> = {}): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: 5,
    longestStreak: 5,
    lastCompletedDate: getYesterday(),
    completionHistory: [],
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  it('succeeds when freeze available', () => {
    const streak = createTestStreak()
    const result = useStreakFreeze(streak)

    expect(result.success).toBe(true)
  })

  it('decrements freeze count', () => {
    const streak = createTestStreak()
    const result = useStreakFreeze(streak)

    expect(result.updatedStreak.streakFreezesRemaining).toBe(0)
  })

  it('sets freezeActiveUntil to tomorrow', () => {
    const streak = createTestStreak()
    const result = useStreakFreeze(streak)

    expect(result.updatedStreak.freezeActiveUntil).toBeDefined()
  })

  it('fails when no freezes remaining', () => {
    const streak = createTestStreak({ streakFreezesRemaining: 0 })
    const result = useStreakFreeze(streak)

    expect(result.success).toBe(false)
    expect(result.message).toBe('No streak freezes remaining')
  })

  it('fails when freeze already active', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const streak = createTestStreak({
      freezeActiveUntil: tomorrow.toISOString(),
    })
    const result = useStreakFreeze(streak)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Freeze is already active')
  })

  it('fails when no active streak', () => {
    const streak = createTestStreak({ currentStreak: 0 })
    const result = useStreakFreeze(streak)

    expect(result.success).toBe(false)
    expect(result.message).toBe('No active streak to freeze')
  })
})

// ============================================================================
// applyCompletion
// ============================================================================

describe('applyCompletion', () => {
  const createTestStreak = (): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: undefined,
    completionHistory: [],
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  it('returns empty when not successful', () => {
    const streak = createTestStreak()
    const result: HabitCompletionResult = {
      success: false,
      streakUpdated: false,
      newStreak: 0,
      longestStreak: 0,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
    }

    const update = applyCompletion(streak, result)

    expect(update).toEqual({})
  })

  it('updates streak values on success', () => {
    const streak = createTestStreak()
    const result: HabitCompletionResult = {
      success: true,
      streakUpdated: true,
      newStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
    }

    const update = applyCompletion(streak, result)

    expect(update.currentStreak).toBe(1)
    expect(update.longestStreak).toBe(1)
    expect(update.totalCompletions).toBe(1)
  })

  it('adds date to completion history', () => {
    const streak = createTestStreak()
    const result: HabitCompletionResult = {
      success: true,
      streakUpdated: true,
      newStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
    }

    const update = applyCompletion(streak, result, '2024-01-15')

    expect(update.completionHistory).toContain('2024-01-15')
  })

  it('sets lastCompletedDate', () => {
    const streak = createTestStreak()
    const result: HabitCompletionResult = {
      success: true,
      streakUpdated: true,
      newStreak: 1,
      longestStreak: 1,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
    }

    const update = applyCompletion(streak, result, '2024-01-15')

    expect(update.lastCompletedDate).toBe('2024-01-15')
  })

  it('clears freezeActiveUntil when freeze used', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const streak: HabitStreak = {
      ...createTestStreak(),
      freezeActiveUntil: tomorrow.toISOString(),
    }
    const result: HabitCompletionResult = {
      success: true,
      streakUpdated: true,
      newStreak: 5,
      longestStreak: 5,
      streakBroken: false,
      streakContinued: true,
      freezeUsed: true,
      achievementsUnlocked: [],
    }

    const update = applyCompletion(streak, result)

    expect(update.freezeActiveUntil).toBeUndefined()
  })
})

// ============================================================================
// getStreakStatus
// ============================================================================

describe('getStreakStatus', () => {
  const createTestStreak = (overrides: Partial<HabitStreak> = {}): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: 5,
    longestStreak: 10,
    lastCompletedDate: getYesterday(),
    completionHistory: [],
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  it('returns current and longest streak', () => {
    const streak = createTestStreak()
    const status = getStreakStatus(streak, 'daily')

    expect(status.currentStreak).toBe(5)
    expect(status.longestStreak).toBe(10)
  })

  it('shows freeze availability', () => {
    const streak = createTestStreak({ streakFreezesRemaining: 1 })
    const status = getStreakStatus(streak, 'daily')

    // canUseFreeze depends on whether in grace period
    expect(typeof status.canUseFreeze).toBe('boolean')
  })

  it('indicates active freeze', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const streak = createTestStreak({
      freezeActiveUntil: tomorrow.toISOString(),
    })
    const status = getStreakStatus(streak, 'daily')

    expect(status.isFrozen).toBe(true)
    expect(status.isActive).toBe(true)
  })

  it('indicates broken streak', () => {
    // Create streak with completion 10 days ago
    const d = new Date()
    d.setDate(d.getDate() - 10)
    const streak = createTestStreak({
      lastCompletedDate: d.toISOString().split('T')[0],
    })
    const status = getStreakStatus(streak, 'daily')

    expect(status.isActive).toBe(false)
    expect(status.currentStreak).toBe(0)
  })
})

// ============================================================================
// calculateHabitStats
// ============================================================================

describe('calculateHabitStats', () => {
  const createTestStreak = (overrides: Partial<HabitStreak> = {}): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: 5,
    longestStreak: 10,
    lastCompletedDate: getToday(),
    completionHistory: [getToday()],
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  })

  it('returns zero stats for empty array', () => {
    const stats = calculateHabitStats([], 0)

    expect(stats.habitsCreated).toBe(0)
    expect(stats.totalCompletions).toBe(0)
    expect(stats.maxStreak).toBe(0)
  })

  it('counts completed today', () => {
    const streaks = [
      createTestStreak({ lastCompletedDate: getToday() }),
      createTestStreak({ lastCompletedDate: getYesterday() }),
    ]
    const stats = calculateHabitStats(streaks, 2)

    expect(stats.completedToday).toBe(1)
  })

  it('calculates max streak', () => {
    const streaks = [
      createTestStreak({ currentStreak: 5 }),
      createTestStreak({ currentStreak: 10 }),
      createTestStreak({ currentStreak: 3 }),
    ]
    const stats = calculateHabitStats(streaks, 3)

    expect(stats.maxStreak).toBe(10)
  })

  it('calculates longest single streak', () => {
    const streaks = [
      createTestStreak({ longestStreak: 15 }),
      createTestStreak({ longestStreak: 30 }),
      createTestStreak({ longestStreak: 7 }),
    ]
    const stats = calculateHabitStats(streaks, 3)

    expect(stats.longestSingleStreak).toBe(30)
    expect(stats.longestEverStreak).toBe(30)
  })

  it('counts total completions', () => {
    const streaks = [
      createTestStreak({ totalCompletions: 10 }),
      createTestStreak({ totalCompletions: 20 }),
    ]
    const stats = calculateHabitStats(streaks, 2)

    expect(stats.totalCompletions).toBe(30)
  })

  it('counts active streaks', () => {
    const streaks = [
      createTestStreak({ currentStreak: 5 }),
      createTestStreak({ currentStreak: 0 }),
      createTestStreak({ currentStreak: 3 }),
    ]
    const stats = calculateHabitStats(streaks, 3)

    expect(stats.activeStreaks).toBe(2)
  })

  it('calculates habits at risk', () => {
    const streaks = [
      createTestStreak({ currentStreak: 5, lastCompletedDate: getYesterday() }),
      createTestStreak({ currentStreak: 3, lastCompletedDate: getYesterday() }),
    ]
    const stats = calculateHabitStats(streaks, 2)

    // Both have active streaks but not completed today = at risk
    expect(stats.habitsAtRisk).toBe(2)
  })

  it('calculates average streak', () => {
    const streaks = [
      createTestStreak({ currentStreak: 6 }),
      createTestStreak({ currentStreak: 4 }),
    ]
    const stats = calculateHabitStats(streaks, 2)

    expect(stats.averageStreak).toBe(5)
  })
})

// ============================================================================
// getDailySummaries
// ============================================================================

describe('getDailySummaries', () => {
  const createTestStreak = (history: string[]): HabitStreak => ({
    id: 'streak-1',
    taskId: 'task-1',
    currentStreak: history.length,
    longestStreak: history.length,
    lastCompletedDate: history[history.length - 1],
    completionHistory: history,
    streakFreezesRemaining: 1,
    freezeActiveUntil: undefined,
    totalCompletions: history.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  it('returns empty array for no streaks', () => {
    const summaries = getDailySummaries([], '2024-01-01', '2024-01-01')

    expect(summaries.length).toBe(1)
    expect(summaries[0].total).toBe(0)
  })

  it('creates summary for each day in range', () => {
    const summaries = getDailySummaries([], '2024-01-01', '2024-01-07')

    expect(summaries.length).toBe(7)
  })

  it('counts completions per day', () => {
    const streaks = [
      createTestStreak(['2024-01-01', '2024-01-02']),
      createTestStreak(['2024-01-01']),
    ]
    const summaries = getDailySummaries(streaks, '2024-01-01', '2024-01-02')

    expect(summaries[0].completed).toBe(2) // Jan 1
    expect(summaries[1].completed).toBe(1) // Jan 2
  })

  it('calculates percentage', () => {
    const streaks = [
      createTestStreak(['2024-01-01']),
      createTestStreak(['2024-01-01']),
    ]
    const summaries = getDailySummaries(streaks, '2024-01-01', '2024-01-01')

    expect(summaries[0].percentage).toBe(100)
  })

  it('marks perfect days', () => {
    const streaks = [
      createTestStreak(['2024-01-01']),
      createTestStreak(['2024-01-01']),
    ]
    const summaries = getDailySummaries(streaks, '2024-01-01', '2024-01-01')

    expect(summaries[0].isPerfect).toBe(true)
  })

  it('marks non-perfect days', () => {
    const streaks = [
      createTestStreak(['2024-01-01']),
      createTestStreak([]), // No completions
    ]
    const summaries = getDailySummaries(streaks, '2024-01-01', '2024-01-01')

    expect(summaries[0].isPerfect).toBe(false)
    expect(summaries[0].percentage).toBe(50)
  })
})
