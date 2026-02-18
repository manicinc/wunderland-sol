/**
 * Tracking Module
 * @module lib/tracking
 *
 * Time and activity tracking utilities.
 */

export {
  WritingTimer,
  formatTime,
  formatDuration,
  type WritingSession,
  type WritingTimerConfig,
  type TimerState,
  type TimerEventListener,
} from './writingTimer'

export {
  WritingTimerStore,
  getWritingTimerStore,
  type DailyWritingSummary,
  type StrandWritingStats,
} from './writingTimerStore'
