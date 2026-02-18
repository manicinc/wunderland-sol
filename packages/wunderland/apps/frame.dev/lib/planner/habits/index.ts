/**
 * Habits Module
 *
 * Comprehensive habit tracking system with:
 * - Streak management with grace periods
 * - Recurring task generation
 * - Gamification integration
 * - Template-based habit creation
 *
 * @module lib/planner/habits
 */

// Types
export type {
  HabitFrequency,
  HabitStreak,
  HabitCompletionResult,
  StreakStatus,
  HabitTemplate,
  HabitStats,
  HabitWithStreak,
} from './types'

export {
  GRACE_PERIODS,
  HABIT_ACHIEVEMENT_IDS,
} from './types'

// Streak Manager
export {
  createInitialStreak,
  getToday,
  getDaysDifference,
  calculateStreakBroken,
  getStreakStatus,
  recordCompletion,
  useStreakFreeze,
  calculateHabitStats,
} from './habitStreakManager'

// Recurrence Generator
export {
  frequencyToRecurrenceRule,
  recurrenceRuleToFrequency,
  isOccurrenceDate,
  generateOccurrences,
  getNextOccurrence,
  getPreviousOccurrence,
  isTodayOccurrence,
  countOccurrences,
  getNextWeekday,
  getWeekdaysInRange,
  describeRecurrence,
} from './recurrenceGenerator'

// Database Operations
export {
  createHabitStreak,
  getHabitStreak,
  getHabitStreakById,
  getAllHabitStreaks,
  updateHabitStreak,
  deleteHabitStreak,
  getOrCreateStreak,
  getHabitTasks,
  getHabitsWithStreaks,
  getTodayHabits,
  getCompletedTodayHabits,
  getHabitStats,
  getTopStreaks,
  getHabitsAtRisk,
  getHabitsNeedingRecovery,
  initializeMissingStreaks,
  cleanupOrphanedStreaks,
} from './database'

// Templates
export {
  DAILY_HABITS,
  WEEKLY_HABITS,
  WEEKDAY_HABITS,
  getAllTemplates,
  getFeaturedTemplates,
  getTemplatesByCategory,
  getTemplatesByFrequency,
  getTemplateById,
  getCategoryInfo,
  searchTemplates,
} from './templates'

export type {
  HabitCategory,
  HabitTemplate as HabitTemplateType,
} from './templates'

// Hooks
export {
  useHabits,
  useHabit,
  useHabitStreak,
} from './useHabits'

export type {
  UseHabitsOptions,
  UseHabitsReturn,
  CreateHabitInput,
} from './useHabits'
