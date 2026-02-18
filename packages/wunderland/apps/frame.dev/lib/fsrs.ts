/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 * 
 * Based on FSRS-5, the state-of-the-art spaced repetition algorithm
 * that outperforms SM-2 and other traditional algorithms.
 * 
 * @see https://github.com/open-spaced-repetition/fsrs4anki
 * @module lib/fsrs
 */

import type { FSRSState, FlashcardRating, ReviewEntry } from '../types/openstrand'
import { FSRS_PARAMETERS } from '../types/openstrand'

const { w, requestRetention, maximumInterval } = FSRS_PARAMETERS

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate retrievability (probability of recall) given stability and elapsed days
 * R(t) = (1 + t/(9*S))^(-1)
 */
export function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability <= 0) return 0
  return Math.pow(1 + elapsedDays / (9 * stability), -1)
}

/**
 * Calculate the number of days until retrievability drops to target retention
 * Solves: R(t) = requestRetention for t
 */
export function calculateInterval(stability: number, retention: number = requestRetention): number {
  if (stability <= 0) return 0
  const interval = stability * 9 * (Math.pow(1 / retention, 1) - 1)
  return Math.min(Math.round(interval), maximumInterval)
}

/**
 * Calculate initial difficulty from first rating
 * D0(G) = w[4] - (G-3) * w[5]
 */
function calculateInitialDifficulty(rating: FlashcardRating): number {
  const d0 = w[4] - (rating - 3) * w[5]
  return clamp(d0, 1, 10)
}

/**
 * Calculate initial stability from rating
 * S0(G) = w[G-1]
 */
function calculateInitialStability(rating: FlashcardRating): number {
  return w[rating - 1]
}

/**
 * Update difficulty after a review
 * D'(D,G) = w[7] * D0(G) + (1 - w[7]) * D
 */
function updateDifficulty(currentDifficulty: number, rating: FlashcardRating): number {
  const d0 = calculateInitialDifficulty(rating)
  const newDifficulty = w[7] * d0 + (1 - w[7]) * currentDifficulty
  return clamp(newDifficulty, 1, 10)
}

/**
 * Calculate recall stability after successful recall
 * S'_r(D,S,R,G) = S * (e^w[8] * (11-D) * S^(-w[9]) * (e^(w[10]*(1-R)) - 1) * hardPenalty * easyBonus + 1)
 */
function calculateRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: FlashcardRating
): number {
  const hardPenalty = rating === 2 ? w[15] : 1
  const easyBonus = rating === 4 ? w[16] : 1
  
  const newStability = stability * (
    Math.exp(w[8]) *
    (11 - difficulty) *
    Math.pow(stability, -w[9]) *
    (Math.exp(w[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus +
    1
  )
  
  return Math.min(Math.max(newStability, 0.1), maximumInterval)
}

/**
 * Calculate forget stability after a lapse
 * S'_f(D,S,R) = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * e^(w[14]*(1-R))
 */
function calculateForgetStability(
  difficulty: number,
  stability: number,
  retrievability: number
): number {
  const newStability = w[11] *
    Math.pow(difficulty, -w[12]) *
    (Math.pow(stability + 1, w[13]) - 1) *
    Math.exp(w[14] * (1 - retrievability))
  
  return Math.min(Math.max(newStability, 0.1), maximumInterval)
}

/**
 * Create initial FSRS state for a new card
 */
export function createInitialFSRSState(): FSRSState {
  const now = new Date().toISOString()
  return {
    difficulty: 5, // Default middle difficulty
    stability: 0,
    retrievability: 0,
    lastReview: null,
    nextReview: now, // Due immediately
    reps: 0,
    lapses: 0,
    state: 'new'
  }
}

/**
 * Process a review and update FSRS state
 */
export function processReview(
  currentState: FSRSState,
  rating: FlashcardRating,
  reviewDate: Date = new Date()
): { newState: FSRSState; scheduledDays: number } {
  const elapsedDays = currentState.lastReview
    ? Math.max(0, (reviewDate.getTime() - new Date(currentState.lastReview).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  let newState: FSRSState
  let scheduledDays: number

  if (currentState.state === 'new') {
    // First review of a new card
    const difficulty = calculateInitialDifficulty(rating)
    const stability = calculateInitialStability(rating)
    
    if (rating === 1) {
      // Again - stay in learning
      scheduledDays = 0 // Review again soon (minutes, handled by UI)
      newState = {
        difficulty,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: reviewDate.toISOString(),
        reps: 1,
        lapses: 1,
        state: 'learning'
      }
    } else {
      // Hard, Good, or Easy - graduate to review
      scheduledDays = calculateInterval(stability)
      const nextReview = new Date(reviewDate)
      nextReview.setDate(nextReview.getDate() + scheduledDays)
      
      newState = {
        difficulty,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: nextReview.toISOString(),
        reps: 1,
        lapses: 0,
        state: 'review'
      }
    }
  } else if (currentState.state === 'learning' || currentState.state === 'relearning') {
    // Card in learning/relearning phase
    const retrievability = calculateRetrievability(currentState.stability, elapsedDays)
    
    if (rating === 1) {
      // Again - reset learning
      const stability = calculateForgetStability(
        currentState.difficulty,
        currentState.stability,
        retrievability
      )
      scheduledDays = 0
      
      newState = {
        ...currentState,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: reviewDate.toISOString(),
        reps: currentState.reps + 1,
        lapses: currentState.lapses + 1,
        state: currentState.state === 'learning' ? 'learning' : 'relearning'
      }
    } else {
      // Graduate to review
      const difficulty = updateDifficulty(currentState.difficulty, rating)
      const stability = calculateRecallStability(
        currentState.difficulty,
        currentState.stability,
        retrievability,
        rating
      )
      scheduledDays = calculateInterval(stability)
      const nextReview = new Date(reviewDate)
      nextReview.setDate(nextReview.getDate() + scheduledDays)
      
      newState = {
        difficulty,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: nextReview.toISOString(),
        reps: currentState.reps + 1,
        lapses: currentState.lapses,
        state: 'review'
      }
    }
  } else {
    // Regular review
    const retrievability = calculateRetrievability(currentState.stability, elapsedDays)
    
    if (rating === 1) {
      // Lapse - forgot the card
      const difficulty = updateDifficulty(currentState.difficulty, rating)
      const stability = calculateForgetStability(
        currentState.difficulty,
        currentState.stability,
        retrievability
      )
      scheduledDays = 0
      
      newState = {
        difficulty,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: reviewDate.toISOString(),
        reps: currentState.reps + 1,
        lapses: currentState.lapses + 1,
        state: 'relearning'
      }
    } else {
      // Successful recall
      const difficulty = updateDifficulty(currentState.difficulty, rating)
      const stability = calculateRecallStability(
        currentState.difficulty,
        currentState.stability,
        retrievability,
        rating
      )
      scheduledDays = calculateInterval(stability)
      const nextReview = new Date(reviewDate)
      nextReview.setDate(nextReview.getDate() + scheduledDays)
      
      newState = {
        difficulty,
        stability,
        retrievability: 1,
        lastReview: reviewDate.toISOString(),
        nextReview: nextReview.toISOString(),
        reps: currentState.reps + 1,
        lapses: currentState.lapses,
        state: 'review'
      }
    }
  }

  return { newState, scheduledDays }
}

/**
 * Calculate what the next intervals would be for each rating option
 * Useful for showing users what happens with each choice
 */
export function previewNextIntervals(
  currentState: FSRSState
): Record<FlashcardRating, number> {
  const ratings: FlashcardRating[] = [1, 2, 3, 4]
  const intervals: Record<FlashcardRating, number> = {} as Record<FlashcardRating, number>
  
  for (const rating of ratings) {
    const { scheduledDays } = processReview(currentState, rating)
    intervals[rating] = scheduledDays
  }
  
  return intervals
}

/**
 * Get cards due for review
 */
export function getDueCards<T extends { fsrs: FSRSState }>(
  cards: T[],
  now: Date = new Date()
): T[] {
  return cards.filter(card => {
    const nextReview = new Date(card.fsrs.nextReview)
    return nextReview <= now
  })
}

/**
 * Sort cards by priority for review
 * Priority: overdue > due today > new cards
 */
export function sortByPriority<T extends { fsrs: FSRSState }>(
  cards: T[],
  now: Date = new Date()
): T[] {
  return [...cards].sort((a, b) => {
    // New cards last
    if (a.fsrs.state === 'new' && b.fsrs.state !== 'new') return 1
    if (a.fsrs.state !== 'new' && b.fsrs.state === 'new') return -1
    
    // Sort by due date
    const aDate = new Date(a.fsrs.nextReview)
    const bDate = new Date(b.fsrs.nextReview)
    
    // More overdue cards first
    return aDate.getTime() - bDate.getTime()
  })
}

/**
 * Calculate deck statistics
 */
export function calculateDeckStats<T extends { fsrs: FSRSState; suspended?: boolean }>(
  cards: T[],
  now: Date = new Date()
): {
  total: number
  new: number
  learning: number
  review: number
  due: number
  suspended: number
  mature: number
  averageStability: number
  averageRetention: number
} {
  const activeCards = cards.filter(c => !c.suspended)
  const dueCards = getDueCards(activeCards, now)
  
  const newCount = activeCards.filter(c => c.fsrs.state === 'new').length
  const learningCount = activeCards.filter(c => 
    c.fsrs.state === 'learning' || c.fsrs.state === 'relearning'
  ).length
  const reviewCount = activeCards.filter(c => c.fsrs.state === 'review').length
  const matureCount = activeCards.filter(c => c.fsrs.stability > 21).length
  const suspendedCount = cards.filter(c => c.suspended).length
  
  // Calculate average stability and retention
  const reviewCards = activeCards.filter(c => c.fsrs.state === 'review' && c.fsrs.stability > 0)
  const avgStability = reviewCards.length > 0
    ? reviewCards.reduce((sum, c) => sum + c.fsrs.stability, 0) / reviewCards.length
    : 0
  
  // Calculate current average retention
  const retentions = reviewCards.map(c => {
    const elapsed = c.fsrs.lastReview
      ? (now.getTime() - new Date(c.fsrs.lastReview).getTime()) / (1000 * 60 * 60 * 24)
      : 0
    return calculateRetrievability(c.fsrs.stability, elapsed)
  })
  const avgRetention = retentions.length > 0
    ? retentions.reduce((sum, r) => sum + r, 0) / retentions.length
    : 0

  return {
    total: cards.length,
    new: newCount,
    learning: learningCount,
    review: reviewCount,
    due: dueCards.length,
    suspended: suspendedCount,
    mature: matureCount,
    averageStability: Math.round(avgStability * 10) / 10,
    averageRetention: Math.round(avgRetention * 1000) / 10
  }
}

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days === 0) return 'Now'
  if (days < 1) return `${Math.round(days * 24)}h`
  if (days === 1) return '1 day'
  if (days < 30) return `${Math.round(days)} days`
  if (days < 365) {
    const months = Math.round(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }
  const years = Math.round(days / 365 * 10) / 10
  return years === 1 ? '1 year' : `${years} years`
}

/**
 * Create a review entry for history tracking
 */
export function createReviewEntry(
  rating: FlashcardRating,
  previousState: FSRSState,
  newState: FSRSState,
  scheduledDays: number
): ReviewEntry {
  const elapsedDays = previousState.lastReview
    ? Math.round((Date.now() - new Date(previousState.lastReview).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    date: new Date().toISOString(),
    rating,
    elapsedDays,
    scheduledDays,
    state: newState.state
  }
}





