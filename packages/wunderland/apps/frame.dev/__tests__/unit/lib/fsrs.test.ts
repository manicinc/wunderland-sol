/**
 * FSRS (Free Spaced Repetition Scheduler) Tests
 * @module __tests__/unit/lib/fsrs.test
 *
 * Tests for spaced repetition scheduling algorithm.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateRetrievability,
  calculateInterval,
  createInitialFSRSState,
  processReview,
  previewNextIntervals,
  getDueCards,
  sortByPriority,
  calculateDeckStats,
  formatInterval,
  createReviewEntry,
} from '@/lib/fsrs'
import type { FSRSState, FlashcardRating } from '../../../types/openstrand'

// Helper to create a test FSRSState
function createTestState(overrides: Partial<FSRSState> = {}): FSRSState {
  return {
    difficulty: 5,
    stability: 10,
    retrievability: 0.9,
    lastReview: new Date('2024-01-01').toISOString(),
    nextReview: new Date('2024-01-11').toISOString(),
    reps: 3,
    lapses: 0,
    state: 'review',
    ...overrides,
  }
}

// ============================================================================
// calculateRetrievability
// ============================================================================

describe('calculateRetrievability', () => {
  it('returns 1 when elapsedDays is 0', () => {
    expect(calculateRetrievability(10, 0)).toBe(1)
  })

  it('returns 0 when stability is 0 or negative', () => {
    expect(calculateRetrievability(0, 5)).toBe(0)
    expect(calculateRetrievability(-5, 5)).toBe(0)
  })

  it('decreases as elapsed days increase', () => {
    const stability = 10
    const ret1 = calculateRetrievability(stability, 1)
    const ret5 = calculateRetrievability(stability, 5)
    const ret10 = calculateRetrievability(stability, 10)
    const ret30 = calculateRetrievability(stability, 30)

    expect(ret1).toBeGreaterThan(ret5)
    expect(ret5).toBeGreaterThan(ret10)
    expect(ret10).toBeGreaterThan(ret30)
  })

  it('is higher with higher stability', () => {
    const elapsed = 10
    const lowStability = calculateRetrievability(5, elapsed)
    const highStability = calculateRetrievability(20, elapsed)

    expect(highStability).toBeGreaterThan(lowStability)
  })

  it('returns approximately 0.9 at stability days for 90% retention', () => {
    // With stability S and target retention R=0.9,
    // the interval is S * 9 * (1/R - 1) = S * 9 * (10/9 - 1) = S * 9 * 1/9 = S
    // So at t=S, R(t) = (1 + S/(9*S))^-1 = (1 + 1/9)^-1 = (10/9)^-1 = 0.9
    const stability = 10
    const retrievability = calculateRetrievability(stability, stability)
    expect(retrievability).toBeCloseTo(0.9, 2)
  })
})

// ============================================================================
// calculateInterval
// ============================================================================

describe('calculateInterval', () => {
  it('returns 0 when stability is 0 or negative', () => {
    expect(calculateInterval(0)).toBe(0)
    expect(calculateInterval(-5)).toBe(0)
  })

  it('increases with higher stability', () => {
    const int5 = calculateInterval(5)
    const int10 = calculateInterval(10)
    const int20 = calculateInterval(20)

    expect(int10).toBeGreaterThan(int5)
    expect(int20).toBeGreaterThan(int10)
  })

  it('respects custom retention parameter', () => {
    const stability = 10
    const highRetention = calculateInterval(stability, 0.95) // Higher retention = shorter interval
    const lowRetention = calculateInterval(stability, 0.85) // Lower retention = longer interval

    expect(lowRetention).toBeGreaterThan(highRetention)
  })

  it('caps at maximum interval', () => {
    // Very high stability should not exceed maximum interval
    const interval = calculateInterval(100000)
    expect(interval).toBeLessThanOrEqual(36500) // 100 years
  })

  it('rounds to nearest integer', () => {
    const interval = calculateInterval(10)
    expect(Number.isInteger(interval)).toBe(true)
  })
})

// ============================================================================
// createInitialFSRSState
// ============================================================================

describe('createInitialFSRSState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates state with default difficulty of 5', () => {
    const state = createInitialFSRSState()
    expect(state.difficulty).toBe(5)
  })

  it('creates state with zero stability', () => {
    const state = createInitialFSRSState()
    expect(state.stability).toBe(0)
  })

  it('creates state in "new" state', () => {
    const state = createInitialFSRSState()
    expect(state.state).toBe('new')
  })

  it('sets nextReview to now (due immediately)', () => {
    const state = createInitialFSRSState()
    expect(state.nextReview).toBe('2024-06-15T12:00:00.000Z')
  })

  it('has null lastReview', () => {
    const state = createInitialFSRSState()
    expect(state.lastReview).toBeNull()
  })

  it('has zero reps and lapses', () => {
    const state = createInitialFSRSState()
    expect(state.reps).toBe(0)
    expect(state.lapses).toBe(0)
  })
})

// ============================================================================
// processReview
// ============================================================================

describe('processReview', () => {
  describe('new card first review', () => {
    it('rating "Again" keeps card in learning', () => {
      const initialState = createInitialFSRSState()
      const { newState } = processReview(initialState, 1)

      expect(newState.state).toBe('learning')
      expect(newState.lapses).toBe(1)
      expect(newState.reps).toBe(1)
    })

    it('rating "Good" graduates card to review', () => {
      const initialState = createInitialFSRSState()
      const { newState, scheduledDays } = processReview(initialState, 3)

      expect(newState.state).toBe('review')
      expect(newState.lapses).toBe(0)
      expect(scheduledDays).toBeGreaterThan(0)
    })

    it('rating "Easy" graduates with longer interval', () => {
      const initialState = createInitialFSRSState()
      const { scheduledDays: goodDays } = processReview(initialState, 3)
      const { scheduledDays: easyDays } = processReview(initialState, 4)

      expect(easyDays).toBeGreaterThan(goodDays)
    })

    it('updates lastReview to review date', () => {
      const initialState = createInitialFSRSState()
      const reviewDate = new Date('2024-06-15T14:00:00Z')
      const { newState } = processReview(initialState, 3, reviewDate)

      expect(newState.lastReview).toBe('2024-06-15T14:00:00.000Z')
    })
  })

  describe('review card', () => {
    it('rating "Again" causes lapse and moves to relearning', () => {
      const state = createTestState({ state: 'review' })
      const { newState } = processReview(state, 1)

      expect(newState.state).toBe('relearning')
      expect(newState.lapses).toBe(1)
    })

    it('rating "Good" updates stability and schedules next review', () => {
      const state = createTestState({ state: 'review', stability: 10 })
      const { newState, scheduledDays } = processReview(state, 3)

      expect(newState.state).toBe('review')
      expect(newState.stability).not.toBe(10) // Stability should change
      expect(scheduledDays).toBeGreaterThan(0)
    })

    it('rating "Hard" schedules shorter interval than "Good"', () => {
      const state = createTestState({ state: 'review', stability: 10 })
      const { scheduledDays: hardDays } = processReview(state, 2)
      const { scheduledDays: goodDays } = processReview(state, 3)

      expect(hardDays).toBeLessThan(goodDays)
    })

    it('rating "Easy" schedules longer interval than "Good"', () => {
      const state = createTestState({ state: 'review', stability: 10 })
      const { scheduledDays: goodDays } = processReview(state, 3)
      const { scheduledDays: easyDays } = processReview(state, 4)

      expect(easyDays).toBeGreaterThan(goodDays)
    })

    it('increments reps count', () => {
      const state = createTestState({ reps: 5 })
      const { newState } = processReview(state, 3)

      expect(newState.reps).toBe(6)
    })
  })

  describe('learning/relearning card', () => {
    it('rating "Good" graduates learning card to review', () => {
      const state = createTestState({ state: 'learning' })
      const { newState } = processReview(state, 3)

      expect(newState.state).toBe('review')
    })

    it('rating "Again" keeps card in learning', () => {
      const state = createTestState({ state: 'learning' })
      const { newState, scheduledDays } = processReview(state, 1)

      expect(newState.state).toBe('learning')
      expect(scheduledDays).toBe(0) // Due again immediately
    })

    it('rating "Again" on relearning card keeps it in relearning', () => {
      const state = createTestState({ state: 'relearning' })
      const { newState } = processReview(state, 1)

      expect(newState.state).toBe('relearning')
    })

    it('graduations from relearning goes to review', () => {
      const state = createTestState({ state: 'relearning' })
      const { newState } = processReview(state, 3)

      expect(newState.state).toBe('review')
    })
  })

  describe('difficulty updates', () => {
    it('difficulty stays within 1-10 bounds', () => {
      const easyState = createTestState({ difficulty: 1 })
      const hardState = createTestState({ difficulty: 10 })

      const { newState: afterEasy } = processReview(easyState, 4) // Easy
      const { newState: afterHard } = processReview(hardState, 1) // Again

      expect(afterEasy.difficulty).toBeGreaterThanOrEqual(1)
      expect(afterEasy.difficulty).toBeLessThanOrEqual(10)
      expect(afterHard.difficulty).toBeGreaterThanOrEqual(1)
      expect(afterHard.difficulty).toBeLessThanOrEqual(10)
    })
  })
})

// ============================================================================
// previewNextIntervals
// ============================================================================

describe('previewNextIntervals', () => {
  it('returns intervals for all four ratings', () => {
    const state = createTestState()
    const intervals = previewNextIntervals(state)

    expect(intervals).toHaveProperty('1')
    expect(intervals).toHaveProperty('2')
    expect(intervals).toHaveProperty('3')
    expect(intervals).toHaveProperty('4')
  })

  it('intervals increase from Again to Easy', () => {
    const state = createTestState({ state: 'review', stability: 10 })
    const intervals = previewNextIntervals(state)

    // Again always returns 0
    expect(intervals[1]).toBe(0)
    // Hard < Good < Easy
    expect(intervals[2]).toBeLessThan(intervals[3])
    expect(intervals[3]).toBeLessThan(intervals[4])
  })

  it('returns 0 for Again rating', () => {
    const state = createTestState()
    const intervals = previewNextIntervals(state)

    expect(intervals[1]).toBe(0)
  })
})

// ============================================================================
// getDueCards
// ============================================================================

describe('getDueCards', () => {
  const now = new Date('2024-06-15T12:00:00Z')

  it('returns cards with nextReview in the past', () => {
    const cards = [
      { id: 'a', fsrs: createTestState({ nextReview: '2024-06-14T12:00:00Z' }) },
      { id: 'b', fsrs: createTestState({ nextReview: '2024-06-16T12:00:00Z' }) },
    ]
    const due = getDueCards(cards, now)

    expect(due).toHaveLength(1)
    expect(due[0].id).toBe('a')
  })

  it('returns cards with nextReview equal to now', () => {
    const cards = [
      { id: 'a', fsrs: createTestState({ nextReview: '2024-06-15T12:00:00Z' }) },
    ]
    const due = getDueCards(cards, now)

    expect(due).toHaveLength(1)
  })

  it('returns empty array when no cards are due', () => {
    const cards = [
      { id: 'a', fsrs: createTestState({ nextReview: '2024-06-20T12:00:00Z' }) },
    ]
    const due = getDueCards(cards, now)

    expect(due).toHaveLength(0)
  })

  it('handles empty input', () => {
    expect(getDueCards([], now)).toEqual([])
  })
})

// ============================================================================
// sortByPriority
// ============================================================================

describe('sortByPriority', () => {
  const now = new Date('2024-06-15T12:00:00Z')

  it('places new cards last', () => {
    const cards = [
      { id: 'new', fsrs: createTestState({ state: 'new', nextReview: '2024-06-14T00:00:00Z' }) },
      { id: 'review', fsrs: createTestState({ state: 'review', nextReview: '2024-06-14T00:00:00Z' }) },
    ]
    const sorted = sortByPriority(cards, now)

    expect(sorted[0].id).toBe('review')
    expect(sorted[1].id).toBe('new')
  })

  it('sorts non-new cards by due date (oldest first)', () => {
    const cards = [
      { id: 'later', fsrs: createTestState({ nextReview: '2024-06-14T12:00:00Z' }) },
      { id: 'earlier', fsrs: createTestState({ nextReview: '2024-06-10T12:00:00Z' }) },
    ]
    const sorted = sortByPriority(cards, now)

    expect(sorted[0].id).toBe('earlier')
    expect(sorted[1].id).toBe('later')
  })

  it('does not modify original array', () => {
    const cards = [
      { id: 'a', fsrs: createTestState({ nextReview: '2024-06-14T12:00:00Z' }) },
      { id: 'b', fsrs: createTestState({ nextReview: '2024-06-10T12:00:00Z' }) },
    ]
    const sorted = sortByPriority(cards, now)

    expect(cards[0].id).toBe('a') // Original unchanged
    expect(sorted[0].id).toBe('b')
  })
})

// ============================================================================
// calculateDeckStats
// ============================================================================

describe('calculateDeckStats', () => {
  it('counts total cards', () => {
    const cards = [
      { fsrs: createTestState() },
      { fsrs: createTestState() },
      { fsrs: createTestState() },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.total).toBe(3)
  })

  it('counts new cards', () => {
    const cards = [
      { fsrs: createTestState({ state: 'new' }) },
      { fsrs: createTestState({ state: 'new' }) },
      { fsrs: createTestState({ state: 'review' }) },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.new).toBe(2)
  })

  it('counts learning cards (learning + relearning)', () => {
    const cards = [
      { fsrs: createTestState({ state: 'learning' }) },
      { fsrs: createTestState({ state: 'relearning' }) },
      { fsrs: createTestState({ state: 'review' }) },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.learning).toBe(2)
  })

  it('counts review cards', () => {
    const cards = [
      { fsrs: createTestState({ state: 'review' }) },
      { fsrs: createTestState({ state: 'review' }) },
      { fsrs: createTestState({ state: 'learning' }) },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.review).toBe(2)
  })

  it('counts suspended cards', () => {
    const cards = [
      { fsrs: createTestState(), suspended: true },
      { fsrs: createTestState(), suspended: true },
      { fsrs: createTestState(), suspended: false },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.suspended).toBe(2)
  })

  it('counts mature cards (stability > 21)', () => {
    const cards = [
      { fsrs: createTestState({ stability: 30 }) },
      { fsrs: createTestState({ stability: 25 }) },
      { fsrs: createTestState({ stability: 10 }) },
    ]
    const stats = calculateDeckStats(cards)

    expect(stats.mature).toBe(2)
  })

  it('excludes suspended cards from active counts', () => {
    const now = new Date('2024-06-15T12:00:00Z')
    const cards = [
      { fsrs: createTestState({ state: 'new', nextReview: '2024-06-10T00:00:00Z' }), suspended: true },
      { fsrs: createTestState({ state: 'review', nextReview: '2024-06-10T00:00:00Z' }), suspended: false },
    ]
    const stats = calculateDeckStats(cards, now)

    expect(stats.new).toBe(0) // Suspended new card not counted
    expect(stats.due).toBe(1) // Only non-suspended due card
  })

  it('handles empty deck', () => {
    const stats = calculateDeckStats([])

    expect(stats.total).toBe(0)
    expect(stats.averageStability).toBe(0)
    expect(stats.averageRetention).toBe(0)
  })
})

// ============================================================================
// formatInterval
// ============================================================================

describe('formatInterval', () => {
  it('returns "Now" for 0 days', () => {
    expect(formatInterval(0)).toBe('Now')
  })

  it('formats hours for less than 1 day', () => {
    expect(formatInterval(0.5)).toBe('12h')
    expect(formatInterval(0.25)).toBe('6h')
  })

  it('formats singular day', () => {
    expect(formatInterval(1)).toBe('1 day')
  })

  it('formats plural days', () => {
    expect(formatInterval(5)).toBe('5 days')
    expect(formatInterval(15)).toBe('15 days')
  })

  it('formats months for 30-365 days', () => {
    expect(formatInterval(30)).toBe('1 month')
    expect(formatInterval(60)).toBe('2 months')
    expect(formatInterval(180)).toBe('6 months')
  })

  it('formats years for 365+ days', () => {
    expect(formatInterval(365)).toBe('1 year')
    expect(formatInterval(730)).toBe('2 years')
    expect(formatInterval(548)).toBe('1.5 years')
  })
})

// ============================================================================
// createReviewEntry
// ============================================================================

describe('createReviewEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates entry with correct rating', () => {
    const previousState = createTestState()
    const newState = createTestState({ state: 'review' })
    const entry = createReviewEntry(3, previousState, newState, 10)

    expect(entry.rating).toBe(3)
  })

  it('creates entry with scheduled days', () => {
    const previousState = createTestState()
    const newState = createTestState()
    const entry = createReviewEntry(3, previousState, newState, 15)

    expect(entry.scheduledDays).toBe(15)
  })

  it('calculates elapsed days from lastReview', () => {
    // lastReview is '2024-01-01', now is '2024-06-15'
    // That's about 166 days
    const previousState = createTestState({ lastReview: '2024-01-01T00:00:00Z' })
    const newState = createTestState()
    const entry = createReviewEntry(3, previousState, newState, 10)

    expect(entry.elapsedDays).toBeGreaterThan(0)
  })

  it('returns 0 elapsed days when no lastReview', () => {
    const previousState = createTestState({ lastReview: null })
    const newState = createTestState()
    const entry = createReviewEntry(3, previousState, newState, 10)

    expect(entry.elapsedDays).toBe(0)
  })

  it('includes new state in entry', () => {
    const previousState = createTestState({ state: 'learning' })
    const newState = createTestState({ state: 'review' })
    const entry = createReviewEntry(3, previousState, newState, 10)

    expect(entry.state).toBe('review')
  })

  it('includes current date', () => {
    const previousState = createTestState()
    const newState = createTestState()
    const entry = createReviewEntry(3, previousState, newState, 10)

    expect(entry.date).toBe('2024-06-15T12:00:00.000Z')
  })
})
