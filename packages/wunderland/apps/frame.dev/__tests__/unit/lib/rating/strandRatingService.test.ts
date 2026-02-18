/**
 * Strand Rating Service Tests
 * @module __tests__/unit/lib/rating/strandRatingService.test
 *
 * Tests for rating utility functions (pure functions that don't require LLM).
 */

import { describe, it, expect } from 'vitest'
import {
  getRatingSummary,
  getRatingColor,
  getRatingBgColor,
  getDimensionScores,
  getAverageDimensionScore,
} from '@/lib/rating'
import type { LocalLLMStrandRating } from '@/lib/storage/localCodex'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRating(overrides: Partial<LocalLLMStrandRating> = {}): LocalLLMStrandRating {
  return {
    id: 'rating-1',
    strandId: 'strand-1',
    strandPath: 'weaves/wiki/strands/test',
    overallScore: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// getRatingSummary
// ============================================================================

describe('getRatingSummary', () => {
  it('returns "Exceptional" for score 9-10', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 10 }))).toBe('Exceptional')
    expect(getRatingSummary(createMockRating({ overallScore: 9 }))).toBe('Exceptional')
  })

  it('returns "Excellent" for score 8', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 8 }))).toBe('Excellent')
    expect(getRatingSummary(createMockRating({ overallScore: 8.5 }))).toBe('Excellent')
  })

  it('returns "Very Good" for score 7', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 7 }))).toBe('Very Good')
    expect(getRatingSummary(createMockRating({ overallScore: 7.9 }))).toBe('Very Good')
  })

  it('returns "Good" for score 6', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 6 }))).toBe('Good')
    expect(getRatingSummary(createMockRating({ overallScore: 6.5 }))).toBe('Good')
  })

  it('returns "Average" for score 5', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 5 }))).toBe('Average')
    expect(getRatingSummary(createMockRating({ overallScore: 5.9 }))).toBe('Average')
  })

  it('returns "Below Average" for score 4', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 4 }))).toBe('Below Average')
    expect(getRatingSummary(createMockRating({ overallScore: 4.5 }))).toBe('Below Average')
  })

  it('returns "Poor" for score 3', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 3 }))).toBe('Poor')
    expect(getRatingSummary(createMockRating({ overallScore: 3.9 }))).toBe('Poor')
  })

  it('returns "Very Poor" for scores below 3', () => {
    expect(getRatingSummary(createMockRating({ overallScore: 2 }))).toBe('Very Poor')
    expect(getRatingSummary(createMockRating({ overallScore: 1 }))).toBe('Very Poor')
    expect(getRatingSummary(createMockRating({ overallScore: 0 }))).toBe('Very Poor')
  })

  it('handles boundary scores correctly', () => {
    // At boundaries
    expect(getRatingSummary(createMockRating({ overallScore: 9 }))).toBe('Exceptional')
    expect(getRatingSummary(createMockRating({ overallScore: 8 }))).toBe('Excellent')
    expect(getRatingSummary(createMockRating({ overallScore: 7 }))).toBe('Very Good')
    expect(getRatingSummary(createMockRating({ overallScore: 6 }))).toBe('Good')
    expect(getRatingSummary(createMockRating({ overallScore: 5 }))).toBe('Average')
    expect(getRatingSummary(createMockRating({ overallScore: 4 }))).toBe('Below Average')
    expect(getRatingSummary(createMockRating({ overallScore: 3 }))).toBe('Poor')
  })
})

// ============================================================================
// getRatingColor
// ============================================================================

describe('getRatingColor', () => {
  it('returns emerald color for scores >= 8', () => {
    expect(getRatingColor(10)).toBe('text-emerald-500')
    expect(getRatingColor(9)).toBe('text-emerald-500')
    expect(getRatingColor(8)).toBe('text-emerald-500')
  })

  it('returns amber color for scores 6-7', () => {
    expect(getRatingColor(7)).toBe('text-amber-500')
    expect(getRatingColor(6)).toBe('text-amber-500')
    expect(getRatingColor(7.9)).toBe('text-amber-500')
  })

  it('returns orange color for scores 4-5', () => {
    expect(getRatingColor(5)).toBe('text-orange-500')
    expect(getRatingColor(4)).toBe('text-orange-500')
    expect(getRatingColor(5.9)).toBe('text-orange-500')
  })

  it('returns red color for scores < 4', () => {
    expect(getRatingColor(3)).toBe('text-red-500')
    expect(getRatingColor(2)).toBe('text-red-500')
    expect(getRatingColor(1)).toBe('text-red-500')
    expect(getRatingColor(0)).toBe('text-red-500')
  })

  it('handles decimal scores', () => {
    expect(getRatingColor(8.5)).toBe('text-emerald-500')
    expect(getRatingColor(6.5)).toBe('text-amber-500')
    expect(getRatingColor(4.5)).toBe('text-orange-500')
    expect(getRatingColor(2.5)).toBe('text-red-500')
  })
})

// ============================================================================
// getRatingBgColor
// ============================================================================

describe('getRatingBgColor', () => {
  it('returns emerald bg for scores >= 8', () => {
    expect(getRatingBgColor(10)).toBe('bg-emerald-500/20')
    expect(getRatingBgColor(9)).toBe('bg-emerald-500/20')
    expect(getRatingBgColor(8)).toBe('bg-emerald-500/20')
  })

  it('returns amber bg for scores 6-7', () => {
    expect(getRatingBgColor(7)).toBe('bg-amber-500/20')
    expect(getRatingBgColor(6)).toBe('bg-amber-500/20')
  })

  it('returns orange bg for scores 4-5', () => {
    expect(getRatingBgColor(5)).toBe('bg-orange-500/20')
    expect(getRatingBgColor(4)).toBe('bg-orange-500/20')
  })

  it('returns red bg for scores < 4', () => {
    expect(getRatingBgColor(3)).toBe('bg-red-500/20')
    expect(getRatingBgColor(2)).toBe('bg-red-500/20')
    expect(getRatingBgColor(1)).toBe('bg-red-500/20')
  })

  it('color and bg color are consistent', () => {
    const scores = [10, 8, 7, 6, 5, 4, 3, 2, 1]

    for (const score of scores) {
      const color = getRatingColor(score)
      const bgColor = getRatingBgColor(score)

      // Extract the color name (e.g., 'emerald' from 'text-emerald-500')
      const colorName = color.split('-')[1]
      expect(bgColor).toContain(colorName)
    }
  })
})

// ============================================================================
// getDimensionScores
// ============================================================================

describe('getDimensionScores', () => {
  it('returns empty array when no dimension scores', () => {
    const rating = createMockRating()
    const scores = getDimensionScores(rating)

    expect(scores).toHaveLength(0)
  })

  it('returns all dimension scores when all are present', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: 7,
      accuracyScore: 9,
      clarityScore: 6,
      relevanceScore: 8,
      depthScore: 7,
    })
    const scores = getDimensionScores(rating)

    expect(scores).toHaveLength(6)
  })

  it('returns correct dimension info', () => {
    const rating = createMockRating({ qualityScore: 8 })
    const scores = getDimensionScores(rating)

    expect(scores).toHaveLength(1)
    expect(scores[0].dimension).toBe('quality')
    expect(scores[0].score).toBe(8)
    expect(scores[0].label).toBe('Quality')
  })

  it('filters out undefined scores', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: undefined,
      accuracyScore: 9,
    })
    const scores = getDimensionScores(rating)

    expect(scores).toHaveLength(2)
    expect(scores.map((s) => s.dimension)).toContain('quality')
    expect(scores.map((s) => s.dimension)).toContain('accuracy')
    expect(scores.map((s) => s.dimension)).not.toContain('completeness')
  })

  it('filters out null scores', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: null as unknown as number,
    })
    const scores = getDimensionScores(rating)

    expect(scores).toHaveLength(1)
  })

  it('includes correct labels for all dimensions', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: 7,
      accuracyScore: 9,
      clarityScore: 6,
      relevanceScore: 8,
      depthScore: 7,
    })
    const scores = getDimensionScores(rating)

    const labels = scores.map((s) => s.label)
    expect(labels).toContain('Quality')
    expect(labels).toContain('Completeness')
    expect(labels).toContain('Accuracy')
    expect(labels).toContain('Clarity')
    expect(labels).toContain('Relevance')
    expect(labels).toContain('Depth')
  })
})

// ============================================================================
// getAverageDimensionScore
// ============================================================================

describe('getAverageDimensionScore', () => {
  it('returns null when no dimension scores', () => {
    const rating = createMockRating()
    const average = getAverageDimensionScore(rating)

    expect(average).toBeNull()
  })

  it('calculates average of all dimension scores', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: 6,
      accuracyScore: 10,
    })
    const average = getAverageDimensionScore(rating)

    expect(average).toBe(8) // (8 + 6 + 10) / 3 = 8
  })

  it('handles single dimension score', () => {
    const rating = createMockRating({ qualityScore: 7 })
    const average = getAverageDimensionScore(rating)

    expect(average).toBe(7)
  })

  it('handles all dimension scores', () => {
    const rating = createMockRating({
      qualityScore: 7,
      completenessScore: 8,
      accuracyScore: 9,
      clarityScore: 6,
      relevanceScore: 7,
      depthScore: 8,
    })
    const average = getAverageDimensionScore(rating)

    // (7 + 8 + 9 + 6 + 7 + 8) / 6 = 7.5
    expect(average).toBe(7.5)
  })

  it('handles decimal scores', () => {
    const rating = createMockRating({
      qualityScore: 7.5,
      completenessScore: 8.5,
    })
    const average = getAverageDimensionScore(rating)

    expect(average).toBe(8) // (7.5 + 8.5) / 2 = 8
  })

  it('ignores undefined dimension scores', () => {
    const rating = createMockRating({
      qualityScore: 10,
      completenessScore: undefined,
      accuracyScore: 6,
    })
    const average = getAverageDimensionScore(rating)

    expect(average).toBe(8) // (10 + 6) / 2 = 8
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('rating utility integration', () => {
  it('color matches summary severity', () => {
    // High scores should be green
    expect(getRatingColor(9)).toContain('emerald')
    expect(getRatingSummary(createMockRating({ overallScore: 9 }))).toBe('Exceptional')

    // Low scores should be red
    expect(getRatingColor(2)).toContain('red')
    expect(getRatingSummary(createMockRating({ overallScore: 2 }))).toBe('Very Poor')
  })

  it('average score can be used with color functions', () => {
    const rating = createMockRating({
      qualityScore: 8,
      completenessScore: 8,
      accuracyScore: 8,
    })
    const average = getAverageDimensionScore(rating)

    expect(average).toBe(8)
    expect(getRatingColor(average!)).toBe('text-emerald-500')
    expect(getRatingBgColor(average!)).toBe('bg-emerald-500/20')
  })
})
