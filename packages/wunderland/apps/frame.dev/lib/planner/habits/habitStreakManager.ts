/**
 * Habit Streak Manager
 *
 * Core streak calculation and management logic:
 * - Streak continuation/break detection
 * - Grace period handling
 * - Streak freeze mechanics
 * - Completion recording
 *
 * @module lib/planner/habits/habitStreakManager
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  HabitStreak,
  HabitCompletionResult,
  StreakStatus,
  HabitFrequency,
  HabitStats,
  DailyHabitSummary,
} from './types'
import { GRACE_PERIODS, HABIT_ACHIEVEMENT_IDS } from './types'

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format (local time)
 */
export function getToday(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get yesterday's date in YYYY-MM-DD format (local time)
 */
export function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculate days between two ISO dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Alias for daysBetween for backwards compatibility
 */
export const getDaysDifference = daysBetween

/**
 * Check if date is a weekday (Mon-Fri)
 */
export function isWeekday(date: string): boolean {
  const d = new Date(date)
  const day = d.getDay()
  return day !== 0 && day !== 6
}

/**
 * Count business days between two dates
 */
export function countBusinessDays(startDate: string, endDate: string): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current < end) {
    current.setDate(current.getDate() + 1)
    if (isWeekday(current.toISOString().split('T')[0])) {
      count++
    }
  }

  return count
}

// ============================================================================
// STREAK STATUS CALCULATION
// ============================================================================

/**
 * Calculate if streak is broken based on last completion and frequency
 */
export function calculateStreakBroken(
  lastCompletedDate: string | undefined,
  frequency: HabitFrequency
): { streakBroken: boolean; inGracePeriod: boolean; daysOverdue: number } {
  if (!lastCompletedDate) {
    return { streakBroken: false, inGracePeriod: false, daysOverdue: 0 }
  }

  const today = getToday()
  const gracePeriod = GRACE_PERIODS[frequency]
  let daysDiff: number

  if (frequency === 'weekdays') {
    // For weekdays, only count business days
    daysDiff = countBusinessDays(lastCompletedDate, today)
  } else if (frequency === 'weekly') {
    // For weekly, allow more flexibility
    daysDiff = daysBetween(lastCompletedDate, today)
    // Streak continues if completed within the same week or next occurrence window
    if (daysDiff <= 7) {
      return { streakBroken: false, inGracePeriod: false, daysOverdue: 0 }
    }
  } else {
    daysDiff = daysBetween(lastCompletedDate, today)
  }

  // Check for completed today or yesterday (streak active)
  if (daysDiff <= 1) {
    return { streakBroken: false, inGracePeriod: false, daysOverdue: 0 }
  }

  // Check grace period
  const totalAllowed = 1 + gracePeriod
  if (daysDiff <= totalAllowed) {
    return {
      streakBroken: false,
      inGracePeriod: true,
      daysOverdue: daysDiff - 1,
    }
  }

  // Streak is broken
  return {
    streakBroken: true,
    inGracePeriod: false,
    daysOverdue: daysDiff - 1,
  }
}

/**
 * Get full streak status for a habit
 */
export function getStreakStatus(
  streak: HabitStreak,
  frequency: HabitFrequency
): StreakStatus {
  const { streakBroken, inGracePeriod, daysOverdue } = calculateStreakBroken(
    streak.lastCompletedDate,
    frequency
  )

  // Check if freeze is active
  const freezeActive =
    streak.freezeActiveUntil && new Date(streak.freezeActiveUntil) >= new Date()

  // If freeze is active, streak is protected
  if (freezeActive) {
    return {
      isActive: true,
      daysUntilBreak: 1 + GRACE_PERIODS[frequency],
      inGracePeriod: false,
      canUseFreeze: false,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      isFrozen: true,
    }
  }

  if (streakBroken) {
    return {
      isActive: false,
      daysUntilBreak: 0,
      inGracePeriod: false,
      canUseFreeze: streak.streakFreezesRemaining > 0 && streak.currentStreak > 0,
      currentStreak: 0, // Streak is broken
      longestStreak: streak.longestStreak,
      isFrozen: false,
    }
  }

  return {
    isActive: streak.currentStreak > 0 || streak.lastCompletedDate === getToday(),
    daysUntilBreak: inGracePeriod ? GRACE_PERIODS[frequency] - daysOverdue : GRACE_PERIODS[frequency] + 1,
    inGracePeriod,
    canUseFreeze: streak.streakFreezesRemaining > 0 && inGracePeriod,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    isFrozen: false,
  }
}

// ============================================================================
// STREAK OPERATIONS
// ============================================================================

/**
 * Create initial streak record for a new habit
 */
export function createInitialStreak(taskId: string): HabitStreak {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    taskId,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: undefined,
    completionHistory: [],
    streakFreezesRemaining: 1, // Start with 1 free freeze
    freezeActiveUntil: undefined,
    totalCompletions: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Record a habit completion and update streak
 */
export function recordCompletion(
  streak: HabitStreak,
  frequency: HabitFrequency,
  date: string = getToday()
): HabitCompletionResult {
  const achievementsUnlocked: string[] = []

  // Check if already completed today
  if (streak.completionHistory.includes(date)) {
    return {
      success: false,
      streakUpdated: false,
      newStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
      alreadyCompleted: true,
      message: 'Already completed today',
    }
  }

  const { streakBroken, inGracePeriod } = calculateStreakBroken(
    streak.lastCompletedDate,
    frequency
  )

  let newStreak = streak.currentStreak
  let streakContinued = false
  let freezeUsed = false

  if (streakBroken) {
    // Streak was broken, check if freeze was active
    if (streak.freezeActiveUntil && new Date(streak.freezeActiveUntil) >= new Date(date)) {
      // Freeze protected the streak
      newStreak = streak.currentStreak + 1
      streakContinued = true
      freezeUsed = true
    } else {
      // Start fresh
      newStreak = 1
    }
  } else if (streak.lastCompletedDate === getYesterday() || !streak.lastCompletedDate) {
    // Perfect continuation or first completion
    newStreak = streak.currentStreak + 1
    streakContinued = !streak.lastCompletedDate ? false : true
  } else if (streak.lastCompletedDate === date) {
    // Already completed today (shouldn't reach here due to check above)
    return {
      success: false,
      streakUpdated: false,
      newStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      streakBroken: false,
      streakContinued: false,
      freezeUsed: false,
      achievementsUnlocked: [],
      message: 'Already completed today',
    }
  } else if (inGracePeriod) {
    // In grace period, streak continues
    newStreak = streak.currentStreak + 1
    streakContinued = true
  } else {
    // Completing for a day that's not yesterday (catching up)
    newStreak = streak.currentStreak + 1
    streakContinued = true
  }

  // Update longest streak
  const longestStreak = Math.max(streak.longestStreak, newStreak)

  // Check achievements
  if (newStreak === 3) achievementsUnlocked.push(HABIT_ACHIEVEMENT_IDS.STREAK_3)
  if (newStreak === 7) achievementsUnlocked.push(HABIT_ACHIEVEMENT_IDS.STREAK_7)
  if (newStreak === 30) achievementsUnlocked.push(HABIT_ACHIEVEMENT_IDS.STREAK_30)

  return {
    success: true,
    streakUpdated: true,
    newStreak,
    longestStreak,
    streakBroken: false,
    streakContinued,
    freezeUsed,
    achievementsUnlocked,
  }
}

/**
 * Apply streak freeze to protect current streak
 */
export function useStreakFreeze(streak: HabitStreak): {
  success: boolean
  updatedStreak: Partial<HabitStreak>
  message: string
} {
  if (streak.streakFreezesRemaining <= 0) {
    return {
      success: false,
      updatedStreak: {},
      message: 'No streak freezes remaining',
    }
  }

  // Check if freeze is already active
  if (streak.freezeActiveUntil && new Date(streak.freezeActiveUntil) >= new Date()) {
    return {
      success: false,
      updatedStreak: {},
      message: 'Freeze is already active',
    }
  }

  if (streak.currentStreak === 0) {
    return {
      success: false,
      updatedStreak: {},
      message: 'No active streak to freeze',
    }
  }

  // Freeze protects for 1 additional day
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    success: true,
    updatedStreak: {
      streakFreezesRemaining: streak.streakFreezesRemaining - 1,
      freezeActiveUntil: tomorrow.toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    },
    message: 'Streak freeze activated! Your streak is protected for today.',
  }
}

/**
 * Apply completion to streak record (returns updated fields)
 */
export function applyCompletion(
  streak: HabitStreak,
  result: HabitCompletionResult,
  date: string = getToday()
): Partial<HabitStreak> {
  if (!result.success) return {}

  return {
    currentStreak: result.newStreak,
    longestStreak: result.longestStreak,
    lastCompletedDate: date,
    completionHistory: [...streak.completionHistory, date],
    totalCompletions: streak.totalCompletions + 1,
    freezeActiveUntil: result.freezeUsed ? undefined : streak.freezeActiveUntil,
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// STATS AGGREGATION
// ============================================================================

/**
 * Calculate aggregate habit stats from multiple streaks
 */
export function calculateHabitStats(
  streaks: HabitStreak[],
  activeHabitCount: number
): HabitStats {
  const today = getToday()

  let completedToday = 0
  let maxStreak = 0
  let totalStreakDays = 0
  let longestSingleStreak = 0
  let streakFreezesUsed = 0
  let activeStreaks = 0
  let habitsAtRisk = 0
  let totalCompletions = 0

  for (const streak of streaks) {
    totalCompletions += streak.totalCompletions
    if (streak.lastCompletedDate === today) {
      completedToday++
    } else if (streak.currentStreak > 0) {
      // Habit has a streak but not completed today - at risk
      habitsAtRisk++
    }
    if (streak.currentStreak > 0) {
      activeStreaks++
    }
    maxStreak = Math.max(maxStreak, streak.currentStreak)
    totalStreakDays += streak.currentStreak
    longestSingleStreak = Math.max(longestSingleStreak, streak.longestStreak)
    // Count used freezes (assuming started with 1)
    if (streak.streakFreezesRemaining === 0) {
      streakFreezesUsed++
    }
  }

  // Calculate perfect weeks (simplified - check last 7 days)
  const perfectWeeks = calculatePerfectWeeks(streaks)

  // Calculate average streak
  const averageStreak = streaks.length > 0
    ? Math.round(totalStreakDays / streaks.length)
    : 0

  return {
    habitsCreated: streaks.length,
    habitsCompleted: totalCompletions,
    activeHabits: activeHabitCount,
    activeStreaks,
    completedToday,
    totalToday: activeHabitCount,
    maxStreak,
    totalStreakDays,
    perfectWeeks,
    streakFreezesUsed,
    longestSingleStreak,
    // UI aliases
    longestEverStreak: longestSingleStreak,
    totalCompletions,
    habitsAtRisk,
    totalHabits: streaks.length,
    averageStreak,
    longestCurrentStreak: maxStreak,
  }
}

/**
 * Calculate number of perfect weeks (all habits completed for 7 consecutive days)
 */
function calculatePerfectWeeks(streaks: HabitStreak[]): number {
  if (streaks.length === 0) return 0

  // Get all unique completion dates across all habits
  const allDates = new Set<string>()
  for (const streak of streaks) {
    for (const date of streak.completionHistory) {
      allDates.add(date)
    }
  }

  // Check each 7-day window where all habits were completed
  const sortedDates = Array.from(allDates).sort()
  let perfectWeeks = 0

  for (let i = 0; i <= sortedDates.length - 7; i++) {
    const weekDates = sortedDates.slice(i, i + 7)
    // Check if these 7 dates are consecutive
    let isConsecutive = true
    for (let j = 1; j < 7; j++) {
      if (daysBetween(weekDates[j - 1], weekDates[j]) !== 1) {
        isConsecutive = false
        break
      }
    }

    if (isConsecutive) {
      // Check if all habits were completed on all 7 days
      let allCompleted = true
      for (const date of weekDates) {
        for (const streak of streaks) {
          if (!streak.completionHistory.includes(date)) {
            allCompleted = false
            break
          }
        }
        if (!allCompleted) break
      }

      if (allCompleted) {
        perfectWeeks++
        i += 6 // Skip ahead to avoid counting overlapping weeks
      }
    }
  }

  return perfectWeeks
}

/**
 * Get daily summary for a date range
 */
export function getDailySummaries(
  streaks: HabitStreak[],
  startDate: string,
  endDate: string
): DailyHabitSummary[] {
  const summaries: DailyHabitSummary[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  const total = streaks.length

  while (current <= end) {
    const date = current.toISOString().split('T')[0]
    let completed = 0

    for (const streak of streaks) {
      if (streak.completionHistory.includes(date)) {
        completed++
      }
    }

    summaries.push({
      date,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      isPerfect: completed === total && total > 0,
    })

    current.setDate(current.getDate() + 1)
  }

  return summaries
}
