/**
 * Accomplishment Tracking Module
 * @module lib/accomplishment
 *
 * Provides accomplishment tracking, statistics, and reflection integration.
 *
 * @example
 * ```typescript
 * import { getAccomplishmentsForDate, getTaskCompletionStreak } from '@/lib/accomplishment'
 *
 * const today = await getAccomplishmentsForDate('2024-01-15')
 * console.log(`Completed ${today.stats.total} items today`)
 *
 * const streak = await getTaskCompletionStreak()
 * console.log(`Current streak: ${streak.current} days`)
 * ```
 */

// Types
export type {
  AccomplishmentType,
  TimePeriod,
  AccomplishmentItem,
  AccomplishmentStats,
  TimeSeriesPoint,
  DailyAccomplishments,
  WeeklyAccomplishments,
  MonthlyAccomplishments,
  AccomplishmentSyncConfig,
  AccomplishmentCompletedEvent,
  AccomplishmentCallback,
  TaskCompletionStreak,
  AccomplishmentQueryOptions,
} from './types'

// Constants
export { DEFAULT_SYNC_CONFIG } from './types'

// Service functions
export {
  getAccomplishmentsInRange,
  getAccomplishmentsForDate,
  getAccomplishmentsForWeek,
  getAccomplishmentsForMonth,
  getAccomplishmentStats,
  getTaskCompletionStreak,
  getCompletionTrend,
  generateWhatGotDoneMarkdown,
  subscribeToCompletions,
  emitCompletionEvent,
} from './accomplishmentService'
