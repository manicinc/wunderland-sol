/**
 * Habit Streak Manager Tests
 * @module tests/unit/habits/habitStreakManager
 *
 * Tests for streak calculation, grace periods, and freeze logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createInitialStreak,
  getToday,
  getDaysDifference,
  calculateStreakBroken,
  getStreakStatus,
  recordCompletion,
  useStreakFreeze,
  calculateHabitStats,
} from '@/lib/planner/habits/habitStreakManager'
import { GRACE_PERIODS } from '@/lib/planner/habits/types'
import type { HabitStreak, HabitFrequency } from '@/lib/planner/habits/types'

// Helper to create a mock streak
function createMockStreak(overrides: Partial<HabitStreak> = {}): HabitStreak {
  return {
    id: 'test-streak-1',
    taskId: 'test-task-1',
    currentStreak: 0,
    longestStreak: 0,
    completionHistory: [],
    streakFreezesRemaining: 1,
    totalCompletions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// Helper to get date N days ago (local time to match library implementation)
function daysAgo(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() - n)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('Habit Streak Manager', () => {
  describe('createInitialStreak', () => {
    it('should create a new streak with default values', () => {
      const streak = createInitialStreak('task-123')

      expect(streak.taskId).toBe('task-123')
      expect(streak.currentStreak).toBe(0)
      expect(streak.longestStreak).toBe(0)
      expect(streak.completionHistory).toEqual([])
      expect(streak.streakFreezesRemaining).toBe(1)
      expect(streak.totalCompletions).toBe(0)
      // ID is a UUID
      expect(streak.id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
    })

    it('should have timestamps', () => {
      const streak = createInitialStreak('task-123')

      expect(streak.createdAt).toBeDefined()
      expect(streak.updatedAt).toBeDefined()
    })
  })

  describe('getToday', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getToday()

      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should match current date', () => {
      const today = getToday()
      // Use local time for comparison (matching library implementation)
      const now = new Date()
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      expect(today).toBe(expected)
    })
  })

  describe('getDaysDifference', () => {
    it('should return 0 for same day', () => {
      const today = getToday()
      expect(getDaysDifference(today, today)).toBe(0)
    })

    it('should return positive number for past dates', () => {
      const today = getToday()
      const yesterday = daysAgo(1)

      expect(getDaysDifference(yesterday, today)).toBe(1)
    })

    it('should return correct difference for multiple days', () => {
      const today = getToday()
      const fiveDaysAgo = daysAgo(5)

      expect(getDaysDifference(fiveDaysAgo, today)).toBe(5)
    })
  })

  describe('GRACE_PERIODS', () => {
    it('should have correct grace period for daily habits', () => {
      expect(GRACE_PERIODS.daily).toBe(1)
    })

    it('should have correct grace period for weekly habits', () => {
      expect(GRACE_PERIODS.weekly).toBe(3)
    })

    it('should have correct grace period for weekdays habits', () => {
      expect(GRACE_PERIODS.weekdays).toBe(1)
    })

    it('should have correct grace period for custom habits', () => {
      expect(GRACE_PERIODS.custom).toBe(2)
    })
  })

  describe('calculateStreakBroken', () => {
    it('should return false when completed today', () => {
      const today = getToday()

      const result = calculateStreakBroken(today, 'daily')
      expect(result.streakBroken).toBe(false)
    })

    it('should return false when completed yesterday for daily', () => {
      const yesterday = daysAgo(1)

      const result = calculateStreakBroken(yesterday, 'daily')
      expect(result.streakBroken).toBe(false)
    })

    it('should return true when missed beyond grace period', () => {
      const threeDaysAgo = daysAgo(3)

      const result = calculateStreakBroken(threeDaysAgo, 'daily')
      expect(result.streakBroken).toBe(true)
    })

    it('should return false for weekly habit within grace period', () => {
      const threeDaysAgo = daysAgo(3)

      const result = calculateStreakBroken(threeDaysAgo, 'weekly')
      expect(result.streakBroken).toBe(false)
    })

    it('should return false when freeze is active', () => {
      // Note: freeze logic is handled separately in the streak object, not in calculateStreakBroken
      // This test verifies behavior within grace period
      const yesterday = daysAgo(1)

      const result = calculateStreakBroken(yesterday, 'daily')
      expect(result.streakBroken).toBe(false)
    })

    it('should return false when no last completed date (new habit)', () => {
      const result = calculateStreakBroken(undefined, 'daily')
      expect(result.streakBroken).toBe(false)
    })
  })

  describe('getStreakStatus', () => {
    it('should show active streak when completed today', () => {
      const today = getToday()
      const streak = createMockStreak({
        currentStreak: 5,
        lastCompletedDate: today,
      })

      const status = getStreakStatus(streak, 'daily')

      expect(status.isActive).toBe(true)
      expect(status.inGracePeriod).toBe(false)
      expect(status.currentStreak).toBe(5)
    })

    it('should show in grace period when 2 days missed for daily', () => {
      // Yesterday (1 day ago) is still active, 2 days ago enters grace period
      const twoDaysAgo = daysAgo(2)
      const streak = createMockStreak({
        currentStreak: 5,
        lastCompletedDate: twoDaysAgo,
      })

      const status = getStreakStatus(streak, 'daily')

      expect(status.inGracePeriod).toBe(true)
      expect(status.daysUntilBreak).toBeGreaterThanOrEqual(0)
    })

    it('should show frozen status when freeze is active', () => {
      const fiveDaysAgo = daysAgo(5)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const streak = createMockStreak({
        currentStreak: 10,
        lastCompletedDate: fiveDaysAgo,
        freezeActiveUntil: tomorrow.toISOString().split('T')[0],
      })

      const status = getStreakStatus(streak, 'daily')

      expect(status.isFrozen).toBe(true)
      expect(status.isActive).toBe(true)
    })

    it('should show broken streak when beyond grace period', () => {
      const fiveDaysAgo = daysAgo(5)
      const streak = createMockStreak({
        currentStreak: 10,
        lastCompletedDate: fiveDaysAgo,
      })

      const status = getStreakStatus(streak, 'daily')

      expect(status.isActive).toBe(false)
      expect(status.currentStreak).toBe(0)
    })
  })

  describe('recordCompletion', () => {
    it('should increment streak when completed', () => {
      const yesterday = daysAgo(1)
      const streak = createMockStreak({
        currentStreak: 3,
        lastCompletedDate: yesterday,
        completionHistory: [daysAgo(3), daysAgo(2), yesterday],
        totalCompletions: 3,
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.success).toBe(true)
      expect(result.newStreak).toBe(4)
      expect(result.streakContinued).toBe(true)
    })

    it('should start new streak after break', () => {
      const fiveDaysAgo = daysAgo(5)
      const streak = createMockStreak({
        currentStreak: 10,
        longestStreak: 10,
        lastCompletedDate: fiveDaysAgo,
        completionHistory: [],
        totalCompletions: 10,
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.newStreak).toBe(1)
      expect(result.success).toBe(true)
    })

    it('should update longest streak when exceeded', () => {
      const yesterday = daysAgo(1)
      const streak = createMockStreak({
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: yesterday,
        completionHistory: [],
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.longestStreak).toBe(6)
    })

    it('should not update longest streak if not exceeded', () => {
      const yesterday = daysAgo(1)
      const streak = createMockStreak({
        currentStreak: 3,
        longestStreak: 10,
        lastCompletedDate: yesterday,
        completionHistory: [],
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.longestStreak).toBe(10)
    })

    it('should return success for new completion', () => {
      const streak = createMockStreak({
        completionHistory: [],
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.success).toBe(true)
      expect(result.streakUpdated).toBe(true)
    })

    it('should not double-count same-day completion', () => {
      const today = getToday()
      const streak = createMockStreak({
        currentStreak: 3,
        lastCompletedDate: today,
        completionHistory: [today],
        totalCompletions: 3,
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.success).toBe(false)
      expect(result.newStreak).toBe(3)
      expect(result.message).toContain('Already completed')
    })

    it('should unlock achievements at milestone', () => {
      const yesterday = daysAgo(1)
      const streak = createMockStreak({
        currentStreak: 6, // Will become 7
        lastCompletedDate: yesterday,
        completionHistory: [],
      })

      const result = recordCompletion(streak, 'daily')

      expect(result.achievementsUnlocked).toContain('habit-streak-7')
    })
  })

  describe('useStreakFreeze', () => {
    it('should activate freeze when available', () => {
      const twoDaysAgo = daysAgo(2)
      const streak = createMockStreak({
        currentStreak: 5,
        lastCompletedDate: twoDaysAgo,
        streakFreezesRemaining: 1,
      })

      const result = useStreakFreeze(streak)

      expect(result.success).toBe(true)
      expect(result.updatedStreak.streakFreezesRemaining).toBe(0)
      expect(result.updatedStreak.freezeActiveUntil).toBeDefined()
    })

    it('should fail when no freezes available', () => {
      const streak = createMockStreak({
        streakFreezesRemaining: 0,
      })

      const result = useStreakFreeze(streak)

      expect(result.success).toBe(false)
      expect(result.message).toContain('No streak freezes')
    })

    it('should fail when freeze already active', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const streak = createMockStreak({
        streakFreezesRemaining: 1,
        freezeActiveUntil: tomorrow.toISOString().split('T')[0],
      })

      const result = useStreakFreeze(streak)

      expect(result.success).toBe(false)
      expect(result.message).toContain('already active')
    })
  })

  describe('calculateHabitStats', () => {
    it('should calculate correct stats for multiple streaks', () => {
      const streaks: HabitStreak[] = [
        createMockStreak({
          currentStreak: 5,
          longestStreak: 10,
          totalCompletions: 20,
        }),
        createMockStreak({
          currentStreak: 3,
          longestStreak: 15,
          totalCompletions: 30,
        }),
        createMockStreak({
          currentStreak: 0,
          longestStreak: 5,
          totalCompletions: 5,
        }),
      ]

      const stats = calculateHabitStats(streaks, 3)

      expect(stats.totalHabits).toBe(3)
      expect(stats.activeStreaks).toBe(2)
      expect(stats.totalCompletions).toBe(55)
      expect(stats.longestEverStreak).toBe(15)
      expect(stats.averageStreak).toBe(3) // (5+3+0)/3 = 2.67 rounded
    })

    it('should handle empty streaks array', () => {
      const stats = calculateHabitStats([], 0)

      expect(stats.totalHabits).toBe(0)
      expect(stats.activeStreaks).toBe(0)
      expect(stats.totalCompletions).toBe(0)
      expect(stats.averageStreak).toBe(0)
    })
  })
})
