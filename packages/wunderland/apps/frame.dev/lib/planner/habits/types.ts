/**
 * Habit Tracking Type Definitions
 *
 * Types for habit tracking with gamification:
 * - Habit streaks
 * - Habit templates
 * - Completion tracking
 * - Achievement integration
 *
 * @module lib/planner/habits/types
 */

import type { Task, RecurrenceRule } from '../types'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type HabitFrequency = 'daily' | 'weekly' | 'weekdays' | 'custom'

export const HABIT_FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: 'Every day',
  weekly: 'Once a week',
  weekdays: 'Weekdays only',
  custom: 'Custom schedule',
}

export const HABIT_FREQUENCY_COLORS: Record<HabitFrequency, string> = {
  daily: '#22c55e',   // green
  weekly: '#3b82f6',  // blue
  weekdays: '#8b5cf6', // purple
  custom: '#71717a',  // gray
}

// ============================================================================
// HABIT STREAK
// ============================================================================

/**
 * Habit streak tracking record (stored in habit_streaks table)
 */
export interface HabitStreak {
  id: string
  taskId: string
  currentStreak: number
  longestStreak: number
  lastCompletedDate?: string  // ISO date (YYYY-MM-DD)
  completionHistory: string[] // Array of ISO dates
  streakFreezesRemaining: number
  freezeActiveUntil?: string  // ISO date
  totalCompletions: number
  createdAt: string
  updatedAt: string
}

/**
 * Result of completing a habit
 */
export interface HabitCompletionResult {
  success: boolean
  streakUpdated: boolean
  newStreak: number
  longestStreak: number
  streakBroken: boolean
  streakContinued: boolean
  freezeUsed: boolean
  achievementsUnlocked: string[]
  alreadyCompleted?: boolean
  message?: string
}

/**
 * Status check for a habit streak
 */
export interface StreakStatus {
  isActive: boolean
  daysUntilBreak: number
  inGracePeriod: boolean
  canUseFreeze: boolean
  currentStreak: number
  longestStreak: number
  isFrozen: boolean
}

// ============================================================================
// HABIT TEMPLATE
// ============================================================================

/**
 * Pre-built habit template
 */
export interface HabitTemplate {
  id: string
  name: string
  description?: string
  category: 'daily' | 'weekly'
  icon?: string
  color?: string
  defaultTime?: string       // HH:mm for suggested time
  defaultDuration?: number   // Minutes
  recurrenceRule: RecurrenceRule
  supertagValues?: Record<string, unknown>
  sortOrder: number
}

// ============================================================================
// HABIT STATS
// ============================================================================

/**
 * Aggregated habit statistics for gamification
 * All fields are optional as different contexts compute different subsets
 */
export interface HabitStats {
  // Core stats
  habitsCreated?: number
  habitsCompleted?: number
  activeHabits?: number
  activeStreaks?: number
  completedToday?: number
  totalToday?: number
  maxStreak?: number
  totalStreakDays?: number
  perfectWeeks?: number
  streakFreezesUsed?: number
  longestSingleStreak?: number
  // UI aliases
  longestEverStreak?: number
  totalCompletions?: number
  habitsAtRisk?: number
  // Hook-specific stats
  totalHabits?: number
  averageStreak?: number
  longestCurrentStreak?: number
}

/**
 * Daily habit summary
 */
export interface DailyHabitSummary {
  date: string
  completed: number
  total: number
  percentage: number
  isPerfect: boolean
}

// ============================================================================
// HABIT WITH STREAK (Combined)
// ============================================================================

/**
 * Task with habit streak data attached
 */
export interface HabitWithStreak extends Task {
  streak: HabitStreak
  frequency: HabitFrequency
  targetCount: number
  preferredTime?: string
  templateId?: string
}

// ============================================================================
// HABIT INPUT TYPES
// ============================================================================

/**
 * Input for creating a habit
 */
export interface CreateHabitInput {
  title: string
  description?: string
  frequency: HabitFrequency
  targetCount?: number
  preferredTime?: string
  recurrenceRule?: RecurrenceRule
  tags?: string[]
  templateId?: string
}

/**
 * Input for recording a habit completion
 */
export interface RecordCompletionInput {
  taskId: string
  date?: string        // ISO date, defaults to today
  count?: number       // For target_count > 1 habits
  notes?: string
}

// ============================================================================
// GRACE PERIOD CONFIGURATION
// ============================================================================

/**
 * Grace period settings per frequency
 */
export const GRACE_PERIODS: Record<HabitFrequency, number> = {
  daily: 1,      // 1 day grace for daily habits
  weekly: 3,     // 3 days grace for weekly habits
  weekdays: 1,   // 1 day grace for weekday habits
  custom: 2,     // 2 days default grace for custom
}

// ============================================================================
// ACHIEVEMENT TRIGGERS
// ============================================================================

/**
 * Habit-related achievement IDs
 */
export const HABIT_ACHIEVEMENT_IDS = {
  FIRST_HABIT: 'first-habit',
  STREAK_3: 'habit-streak-3',
  STREAK_7: 'habit-streak-7',
  STREAK_30: 'habit-streak-30',
  PERFECT_WEEK: 'perfect-week',
  HABIT_BUILDER: 'habit-builder',
  PHOENIX_RISE: 'phoenix-rise',
} as const

export type HabitAchievementId = typeof HABIT_ACHIEVEMENT_IDS[keyof typeof HABIT_ACHIEVEMENT_IDS]
