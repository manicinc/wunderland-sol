/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Tests
 * @module tests/unit/learning/fsrsAlgorithm
 *
 * Tests for the spaced repetition algorithm including:
 * - Stability and difficulty calculations
 * - Interval scheduling
 * - Rating effects
 * - Card state transitions
 */

import { describe, it, expect, beforeEach } from 'vitest'

// ============================================================================
// FSRS TYPES
// ============================================================================

type Rating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy

interface FSRSCard {
  stability: number // S: memory stability in days
  difficulty: number // D: difficulty level 0-1
  elapsedDays: number // Days since last review
  scheduledDays: number // Days until next review
  reps: number // Total review count
  lapses: number // Failed review count
  state: 'new' | 'learning' | 'review' | 'relearning'
  lastReview: Date | null
}

interface FSRSParameters {
  requestRetention: number // Target retention rate (e.g., 0.9 = 90%)
  maximumInterval: number // Max days between reviews
  w: number[] // Model weights
}

// ============================================================================
// FSRS IMPLEMENTATION (simplified for testing)
// ============================================================================

const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
}

function createNewCard(): FSRSCard {
  return {
    stability: 0,
    difficulty: 0.5, // Middle of [0, 1] scale
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: null,
  }
}

function calculateInitialStability(rating: Rating): number {
  const w = DEFAULT_PARAMETERS.w
  return w[rating - 1]
}

function calculateInitialDifficulty(rating: Rating): number {
  // Simplified: rating 1 = 0.7, rating 4 = 0.1 (easier = lower difficulty)
  const base = 0.5
  const adjustment = (3 - rating) * 0.2
  return Math.min(1, Math.max(0, base + adjustment))
}

function calculateNextDifficulty(d: number, rating: Rating): number {
  // Simplified difficulty adjustment clamped to 0-1
  const adjustment = (3 - rating) * 0.1 // Again increases, Easy decreases
  const newD = d + adjustment
  return Math.min(1, Math.max(0, newD))
}

function calculateNextStability(s: number, _d: number, rating: Rating, _elapsedDays: number): number {
  // Simplified stability calculation for testing
  if (rating === 1) {
    // Lapse: stability decreases significantly
    return Math.max(0.1, s * 0.5)
  } else {
    // Success: stability increases based on rating
    const multipliers = { 2: 1.2, 3: 1.5, 4: 2.0 }
    const multiplier = multipliers[rating as 2 | 3 | 4]
    return s * multiplier
  }
}

function calculateInterval(s: number): number {
  const { requestRetention, maximumInterval } = DEFAULT_PARAMETERS
  const interval = Math.round(s * Math.log(requestRetention) / Math.log(0.9))
  return Math.min(maximumInterval, Math.max(1, interval))
}

function reviewCard(card: FSRSCard, rating: Rating): FSRSCard {
  const now = new Date()
  const elapsedDays = card.lastReview
    ? Math.max(0, (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  let newCard = { ...card }
  newCard.reps += 1
  newCard.lastReview = now

  if (card.state === 'new') {
    // First review
    newCard.stability = calculateInitialStability(rating)
    newCard.difficulty = calculateInitialDifficulty(rating)
    newCard.state = rating === 1 ? 'relearning' : 'review'
  } else {
    // Subsequent reviews
    newCard.stability = Math.max(0.1, calculateNextStability(
      card.stability,
      card.difficulty,
      rating,
      elapsedDays
    ))
    newCard.difficulty = calculateNextDifficulty(card.difficulty, rating)
    
    if (rating === 1) {
      newCard.lapses += 1
      newCard.state = 'relearning'
    } else {
      newCard.state = 'review'
    }
  }

  newCard.elapsedDays = 0
  newCard.scheduledDays = calculateInterval(newCard.stability)

  return newCard
}

// ============================================================================
// TESTS
// ============================================================================

describe('FSRS Algorithm', () => {
  let newCard: FSRSCard

  beforeEach(() => {
    newCard = createNewCard()
  })

  describe('New Card Creation', () => {
    it('should create card with initial state', () => {
      expect(newCard.state).toBe('new')
      expect(newCard.reps).toBe(0)
      expect(newCard.lapses).toBe(0)
      expect(newCard.lastReview).toBeNull()
    })

    it('should have zero stability initially', () => {
      expect(newCard.stability).toBe(0)
    })

    it('should have default difficulty', () => {
      expect(newCard.difficulty).toBeGreaterThan(0)
      expect(newCard.difficulty).toBeLessThan(1)
    })
  })

  describe('Initial Stability', () => {
    it('should calculate higher stability for easy rating', () => {
      const stabilityAgain = calculateInitialStability(1)
      const stabilityEasy = calculateInitialStability(4)
      expect(stabilityEasy).toBeGreaterThan(stabilityAgain)
    })

    it('should return positive values for all ratings', () => {
      for (let rating = 1; rating <= 4; rating++) {
        const stability = calculateInitialStability(rating as Rating)
        expect(stability).toBeGreaterThan(0)
      }
    })
  })

  describe('Initial Difficulty', () => {
    it('should calculate lower difficulty for easy rating', () => {
      const difficultyAgain = calculateInitialDifficulty(1)
      const difficultyEasy = calculateInitialDifficulty(4)
      expect(difficultyEasy).toBeLessThan(difficultyAgain)
    })

    it('should keep difficulty between 0 and 1', () => {
      for (let rating = 1; rating <= 4; rating++) {
        const difficulty = calculateInitialDifficulty(rating as Rating)
        expect(difficulty).toBeGreaterThanOrEqual(0)
        expect(difficulty).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Card Review', () => {
    it('should increment reps on review', () => {
      const reviewed = reviewCard(newCard, 3)
      expect(reviewed.reps).toBe(1)
    })

    it('should set lastReview date', () => {
      const reviewed = reviewCard(newCard, 3)
      expect(reviewed.lastReview).not.toBeNull()
    })

    it('should transition from new to review state', () => {
      const reviewed = reviewCard(newCard, 3)
      expect(reviewed.state).toBe('review')
    })

    it('should transition to relearning on fail', () => {
      const reviewed = reviewCard(newCard, 1)
      expect(reviewed.state).toBe('relearning')
    })

    it('should increment lapses on fail', () => {
      const afterFirst = reviewCard(newCard, 3)
      const afterFail = reviewCard(afterFirst, 1)
      expect(afterFail.lapses).toBe(1)
    })
  })

  describe('Interval Calculation', () => {
    it('should return positive interval', () => {
      const interval = calculateInterval(5)
      expect(interval).toBeGreaterThan(0)
    })

    it('should respect maximum interval', () => {
      const interval = calculateInterval(100000)
      expect(interval).toBeLessThanOrEqual(DEFAULT_PARAMETERS.maximumInterval)
    })

    it('should return at least 1 day', () => {
      const interval = calculateInterval(0.01)
      expect(interval).toBeGreaterThanOrEqual(1)
    })

    it('should increase with higher stability', () => {
      const lowStability = calculateInterval(5)
      const highStability = calculateInterval(50)
      expect(highStability).toBeGreaterThan(lowStability)
    })
  })

  describe('Rating Effects', () => {
    it('should increase stability more for higher ratings', () => {
      const afterGood = reviewCard(newCard, 3)
      const afterEasy = reviewCard(newCard, 4)
      expect(afterEasy.stability).toBeGreaterThan(afterGood.stability)
    })

    it('should schedule longer interval for higher ratings', () => {
      const afterGood = reviewCard(newCard, 3)
      const afterEasy = reviewCard(newCard, 4)
      expect(afterEasy.scheduledDays).toBeGreaterThan(afterGood.scheduledDays)
    })

    it('should decrease stability on "Again" rating', () => {
      // First learn the card
      let card = reviewCard(newCard, 3)
      card = reviewCard(card, 3)
      const stabilityBefore = card.stability
      
      // Fail the card
      const afterFail = reviewCard(card, 1)
      expect(afterFail.stability).toBeLessThan(stabilityBefore)
    })
  })

  describe('Difficulty Adjustment', () => {
    it('should decrease difficulty on Easy rating', () => {
      const reviewed = reviewCard(newCard, 4)
      expect(reviewed.difficulty).toBeLessThan(newCard.difficulty)
    })

    it('should increase difficulty on Again rating', () => {
      const reviewed = reviewCard(newCard, 1)
      expect(reviewed.difficulty).toBeGreaterThan(newCard.difficulty)
    })

    it('should keep difficulty in valid range after many reviews', () => {
      let card = newCard
      // Simulate many "Again" reviews
      for (let i = 0; i < 20; i++) {
        card = reviewCard(card, 1)
      }
      expect(card.difficulty).toBeLessThanOrEqual(1)
      expect(card.difficulty).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Learning Progression', () => {
    it('should build up stability over successful reviews', () => {
      let card = newCard
      const stabilities: number[] = []
      
      for (let i = 0; i < 5; i++) {
        card = reviewCard(card, 3)
        stabilities.push(card.stability)
      }
      
      // Each stability should be greater than the last
      for (let i = 1; i < stabilities.length; i++) {
        expect(stabilities[i]).toBeGreaterThan(stabilities[i - 1])
      }
    })

    it('should extend intervals over time', () => {
      let card = newCard
      const intervals: number[] = []
      
      for (let i = 0; i < 5; i++) {
        card = reviewCard(card, 3)
        intervals.push(card.scheduledDays)
      }
      
      // Intervals should generally increase
      expect(intervals[4]).toBeGreaterThan(intervals[0])
    })
  })
})

describe('FSRS Edge Cases', () => {
  it('should handle very low stability gracefully', () => {
    const card = createNewCard()
    card.stability = 0.001
    const interval = calculateInterval(card.stability)
    expect(interval).toBeGreaterThanOrEqual(1)
  })

  it('should handle difficulty at boundaries', () => {
    const card = createNewCard()
    card.difficulty = 0
    const reviewed = reviewCard(card, 1)
    expect(reviewed.difficulty).toBeGreaterThanOrEqual(0)
    expect(reviewed.difficulty).toBeLessThanOrEqual(1)
  })

  it('should handle rapid successive reviews', () => {
    let card = createNewCard()
    // Review immediately multiple times
    for (let i = 0; i < 10; i++) {
      card = reviewCard(card, 3)
    }
    // Should still have valid state
    expect(card.stability).toBeGreaterThan(0)
    expect(card.reps).toBe(10)
  })
})

