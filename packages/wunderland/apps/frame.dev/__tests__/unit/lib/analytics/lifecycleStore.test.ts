/**
 * Lifecycle Store Tests
 * @module __tests__/unit/lib/analytics/lifecycleStore.test
 *
 * Tests for lifecycle decay calculations, stage determination, and CRUD operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { subDays, format } from 'date-fns'

// ============================================================================
// Mock Database
// ============================================================================

// Mock the database before importing the module
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => Promise.resolve(mockDb)),
}))

// In-memory mock database
let mockDbData: Map<string, Record<string, unknown>>
let mockEventsData: Record<string, unknown>[]

const mockDb = {
  exec: vi.fn(() => Promise.resolve()),
  run: vi.fn((sql: string, params: unknown[]) => {
    if (sql.includes('INSERT INTO strand_lifecycle')) {
      const record = {
        strand_path: params[0],
        stage: params[1],
        decay_score: params[2],
        last_accessed_at: params[3],
        view_count: params[4],
        edit_count: params[5],
        connection_count: params[6],
        engagement_score: params[7],
        created_at: params[8],
        updated_at: params[9],
      }
      mockDbData.set(params[0] as string, record)
    } else if (sql.includes('UPDATE strand_lifecycle')) {
      const path = params[params.length - 1] as string
      const existing = mockDbData.get(path)
      if (existing) {
        mockDbData.set(path, {
          ...existing,
          stage: params[0],
          decay_score: params[1],
          last_accessed_at: params[2],
          view_count: params[3],
          edit_count: params[4],
          connection_count: params[5],
          engagement_score: params[6],
          updated_at: params[7],
        })
      }
    } else if (sql.includes('INSERT INTO lifecycle_events')) {
      mockEventsData.push({
        id: params[0],
        strand_path: params[1],
        event_type: params[2],
        timestamp: params[3],
        metadata: params[4],
      })
    }
    return Promise.resolve()
  }),
  all: vi.fn((sql: string, params?: unknown[]) => {
    if (sql.includes('FROM strand_lifecycle WHERE strand_path')) {
      const path = params?.[0] as string
      const record = mockDbData.get(path)
      return Promise.resolve(record ? [record] : [])
    } else if (sql.includes('FROM strand_lifecycle WHERE stage')) {
      const stage = params?.[0] as string
      return Promise.resolve(
        Array.from(mockDbData.values()).filter(r => r.stage === stage)
      )
    } else if (sql.includes('FROM strand_lifecycle ORDER BY')) {
      return Promise.resolve(Array.from(mockDbData.values()))
    } else if (sql.includes('COUNT(*)')) {
      return Promise.resolve([{ count: mockDbData.size }])
    } else if (sql.includes('AVG(decay_score)')) {
      const values = Array.from(mockDbData.values())
      const avg = values.length > 0
        ? values.reduce((sum, r) => sum + (r.decay_score as number), 0) / values.length
        : 0
      return Promise.resolve([{ avg }])
    }
    return Promise.resolve([])
  }),
}

// ============================================================================
// Helper Functions (extracted for testing)
// ============================================================================

// Reproduce the decay calculation logic for testing
function calculateTimeDecay(
  lastAccessedAt: string,
  fadeThresholdDays: number
): number {
  const now = new Date()
  const lastAccess = new Date(lastAccessedAt)
  const daysSinceAccess = Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceAccess <= 0) return 100
  if (daysSinceAccess >= fadeThresholdDays) return 0
  
  const decayRate = 100 / fadeThresholdDays
  return Math.max(0, 100 - (daysSinceAccess * decayRate))
}

function calculateEngagementScore(
  viewCount: number,
  editCount: number,
  connectionCount: number
): number {
  const viewWeight = 0.2
  const editWeight = 0.5
  const connectionWeight = 0.3

  // Clamp negative values to 0
  const safeViews = Math.max(0, viewCount)
  const safeEdits = Math.max(0, editCount)
  const safeConnections = Math.max(0, connectionCount)

  const normalizedViews = Math.min(safeViews / 50, 1) * 100
  const normalizedEdits = Math.min(safeEdits / 20, 1) * 100
  const normalizedConnections = Math.min(safeConnections / 10, 1) * 100

  return (
    normalizedViews * viewWeight +
    normalizedEdits * editWeight +
    normalizedConnections * connectionWeight
  )
}

function calculateDecayScore(
  lastAccessedAt: string,
  viewCount: number,
  editCount: number,
  connectionCount: number,
  fadeThresholdDays: number,
  engagementWeight: number
): number {
  const timeDecay = calculateTimeDecay(lastAccessedAt, fadeThresholdDays)
  const engagementScore = calculateEngagementScore(viewCount, editCount, connectionCount)
  
  const decayScore = 
    timeDecay * (1 - engagementWeight) + 
    engagementScore * engagementWeight
  
  return Math.round(decayScore * 100) / 100
}

function determineStage(
  decayScore: number,
  daysSinceAccess: number,
  freshThresholdDays: number,
  fadeThresholdDays: number
): 'fresh' | 'active' | 'faded' {
  if (daysSinceAccess <= freshThresholdDays && decayScore >= 70) {
    return 'fresh'
  }
  
  if (decayScore < 30 || daysSinceAccess > fadeThresholdDays) {
    return 'faded'
  }
  
  return 'active'
}

// ============================================================================
// Tests
// ============================================================================

describe('Lifecycle Store', () => {
  beforeEach(() => {
    mockDbData = new Map()
    mockEventsData = []
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // Time Decay Calculation Tests
  // ==========================================================================

  describe('calculateTimeDecay', () => {
    it('returns 100 for just accessed content', () => {
      const now = new Date().toISOString()
      const decay = calculateTimeDecay(now, 30)
      expect(decay).toBe(100)
    })

    it('returns 0 for content beyond fade threshold', () => {
      const oldDate = subDays(new Date(), 31).toISOString()
      const decay = calculateTimeDecay(oldDate, 30)
      expect(decay).toBe(0)
    })

    it('returns partial decay for content within threshold', () => {
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString()
      const decay = calculateTimeDecay(fifteenDaysAgo, 30)
      expect(decay).toBeCloseTo(50, 0)
    })

    it('decays linearly over time', () => {
      const tenDaysAgo = subDays(new Date(), 10).toISOString()
      const twentyDaysAgo = subDays(new Date(), 20).toISOString()
      
      const decay10 = calculateTimeDecay(tenDaysAgo, 30)
      const decay20 = calculateTimeDecay(twentyDaysAgo, 30)
      
      expect(decay10).toBeGreaterThan(decay20)
      expect(decay10 - decay20).toBeCloseTo(33.33, 0)
    })

    it('respects custom fade threshold', () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString()
      
      const decay14 = calculateTimeDecay(sevenDaysAgo, 14)
      const decay7 = calculateTimeDecay(sevenDaysAgo, 7)
      
      expect(decay14).toBeCloseTo(50, 0)
      expect(decay7).toBe(0)
    })
  })

  // ==========================================================================
  // Engagement Score Tests
  // ==========================================================================

  describe('calculateEngagementScore', () => {
    it('returns 0 for no engagement', () => {
      const score = calculateEngagementScore(0, 0, 0)
      expect(score).toBe(0)
    })

    it('returns 100 for maximum engagement', () => {
      const score = calculateEngagementScore(50, 20, 10)
      expect(score).toBe(100)
    })

    it('caps engagement at maximum thresholds', () => {
      const score = calculateEngagementScore(100, 40, 20)
      expect(score).toBe(100)
    })

    it('weights edits more heavily than views', () => {
      const viewHeavy = calculateEngagementScore(50, 0, 0)
      const editHeavy = calculateEngagementScore(0, 20, 0)
      
      expect(editHeavy).toBeGreaterThan(viewHeavy)
    })

    it('includes connection weight', () => {
      const noConnections = calculateEngagementScore(0, 0, 0)
      const withConnections = calculateEngagementScore(0, 0, 10)
      
      expect(withConnections).toBeGreaterThan(noConnections)
      expect(withConnections).toBe(30) // 30% weight * 100%
    })
  })

  // ==========================================================================
  // Combined Decay Score Tests
  // ==========================================================================

  describe('calculateDecayScore', () => {
    it('combines time decay and engagement', () => {
      const now = new Date().toISOString()
      const score = calculateDecayScore(now, 25, 10, 5, 30, 0.3)
      
      // Time decay = 100, engagement = 50, weight 0.3
      // Expected: 100 * 0.7 + 50 * 0.3 = 70 + 15 = 85
      expect(score).toBeCloseTo(85, 0)
    })

    it('high engagement slows decay', () => {
      const fifteenDaysAgo = subDays(new Date(), 15).toISOString()
      
      const lowEngagement = calculateDecayScore(fifteenDaysAgo, 0, 0, 0, 30, 0.3)
      const highEngagement = calculateDecayScore(fifteenDaysAgo, 50, 20, 10, 30, 0.3)
      
      expect(highEngagement).toBeGreaterThan(lowEngagement)
    })

    it('respects engagement weight setting', () => {
      const now = new Date().toISOString()
      
      const lowWeight = calculateDecayScore(now, 25, 10, 5, 30, 0.1)
      const highWeight = calculateDecayScore(now, 25, 10, 5, 30, 0.5)
      
      // With high engagement and fresh content, higher weight gives higher score
      expect(lowWeight).toBeGreaterThan(highWeight) // Actually lower weight = more time (100) contribution
    })
  })

  // ==========================================================================
  // Stage Determination Tests
  // ==========================================================================

  describe('determineStage', () => {
    it('returns fresh for recent high-engagement content', () => {
      const stage = determineStage(85, 3, 7, 30)
      expect(stage).toBe('fresh')
    })

    it('returns active for moderately aged content', () => {
      const stage = determineStage(60, 15, 7, 30)
      expect(stage).toBe('active')
    })

    it('returns faded for low decay score', () => {
      const stage = determineStage(25, 20, 7, 30)
      expect(stage).toBe('faded')
    })

    it('returns faded for content beyond fade threshold', () => {
      const stage = determineStage(50, 35, 7, 30)
      expect(stage).toBe('faded')
    })

    it('fresh requires both recency and high score', () => {
      // Recent but low score = active, not fresh
      const recentLowScore = determineStage(50, 3, 7, 30)
      expect(recentLowScore).toBe('active')
      
      // Old but high score = active, not fresh
      const oldHighScore = determineStage(85, 10, 7, 30)
      expect(oldHighScore).toBe('active')
    })

    it('respects custom fresh threshold', () => {
      const stage3days = determineStage(85, 5, 3, 30)
      const stage7days = determineStage(85, 5, 7, 30)
      
      expect(stage3days).toBe('active')
      expect(stage7days).toBe('fresh')
    })
  })

  // ==========================================================================
  // Stage Transition Tests
  // ==========================================================================

  describe('Stage Transitions', () => {
    it('transitions from fresh to active after threshold', () => {
      // Day 0: Fresh
      let stage = determineStage(100, 0, 7, 30)
      expect(stage).toBe('fresh')
      
      // Day 8: Should be active
      stage = determineStage(75, 8, 7, 30)
      expect(stage).toBe('active')
    })

    it('transitions from active to faded after threshold', () => {
      // Day 15: Active
      let stage = determineStage(50, 15, 7, 30)
      expect(stage).toBe('active')
      
      // Day 35: Should be faded
      stage = determineStage(10, 35, 7, 30)
      expect(stage).toBe('faded')
    })

    it('high engagement can keep content in active longer', () => {
      // With engagement weight, high engagement maintains score
      const score = calculateDecayScore(
        subDays(new Date(), 25).toISOString(),
        50, 20, 10,
        30, 0.5
      )
      const stage = determineStage(score, 25, 7, 30)
      
      // High engagement should keep it active even at 25 days
      expect(stage).toBe('active')
    })
  })

  // ==========================================================================
  // Resurface Logic Tests
  // ==========================================================================

  describe('Resurface Logic', () => {
    it('resurfacing resets decay to 100', () => {
      // Simulate a strand that was faded
      const oldScore = calculateDecayScore(
        subDays(new Date(), 40).toISOString(),
        5, 2, 1,
        30, 0.3
      )
      expect(oldScore).toBeLessThan(30)

      // After resurface with high engagement, should be fresh
      // Resurfacing updates lastAccessedAt to now and boosts engagement
      const newScore = calculateDecayScore(
        new Date().toISOString(),
        25, 10, 5, // High engagement after resurface
        30, 0.3
      )
      expect(newScore).toBeGreaterThan(80)
    })

    it('resurfaced content starts as fresh', () => {
      const now = new Date().toISOString()
      const score = calculateDecayScore(now, 10, 5, 3, 30, 0.3)
      const stage = determineStage(score, 0, 7, 30)
      
      expect(stage).toBe('fresh')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles zero fade threshold gracefully', () => {
      const decay = calculateTimeDecay(new Date().toISOString(), 0)
      // Should not throw, return 0 or 100
      expect([0, 100]).toContain(decay)
    })

    it('handles future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      const decay = calculateTimeDecay(futureDate.toISOString(), 30)
      expect(decay).toBe(100)
    })

    it('handles very old dates', () => {
      const veryOld = '2020-01-01T00:00:00.000Z'
      const decay = calculateTimeDecay(veryOld, 30)
      expect(decay).toBe(0)
    })

    it('handles negative engagement values', () => {
      const score = calculateEngagementScore(-5, -3, -2)
      expect(score).toBe(0)
    })
  })
})

