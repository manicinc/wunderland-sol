/**
 * Cost Tracking Service Tests
 * @module __tests__/unit/lib/costs/costTrackingService.test
 *
 * Tests for LLM API usage recording and cost aggregation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UsageRecord, ImageUsageRecord, CostSummary, DailyCostEntry, MonthlyProjection } from '@/lib/costs/costTrackingService'

// Mock the database
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => null),
}))

describe('Cost Tracking Service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // UsageRecord type
  // ============================================================================

  describe('UsageRecord type', () => {
    it('can create valid usage record', () => {
      const record: UsageRecord = {
        id: 'usage_123',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'openai',
        model: 'gpt-4o-mini',
        operationType: 'chat',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        costUsd: 0.0015,
        success: true,
      }

      expect(record.id).toBe('usage_123')
      expect(record.provider).toBe('openai')
      expect(record.costUsd).toBe(0.0015)
    })

    it('supports optional context fields', () => {
      const record: UsageRecord = {
        id: 'usage_456',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        operationType: 'completion',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        costUsd: 0.003,
        requestContext: {
          feature: 'abstractive-summary',
          strandPath: 'weaves/wiki/strands/test.md',
          sessionId: 'session-123',
        },
        durationMs: 1500,
        success: true,
      }

      expect(record.requestContext?.feature).toBe('abstractive-summary')
      expect(record.durationMs).toBe(1500)
    })

    it('supports all operation types', () => {
      const opTypes: UsageRecord['operationType'][] = ['chat', 'completion', 'embedding', 'image', 'vision']

      opTypes.forEach((opType) => {
        const record: UsageRecord = {
          id: 'test',
          timestamp: new Date().toISOString(),
          provider: 'openai',
          model: 'test',
          operationType: opType,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          success: true,
        }
        expect(record.operationType).toBe(opType)
      })
    })

    it('can record failed requests', () => {
      const record: UsageRecord = {
        id: 'usage_789',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'openai',
        model: 'gpt-4o',
        operationType: 'chat',
        promptTokens: 100,
        completionTokens: 0,
        totalTokens: 100,
        costUsd: 0,
        success: false,
        errorMessage: 'Rate limit exceeded',
      }

      expect(record.success).toBe(false)
      expect(record.errorMessage).toBe('Rate limit exceeded')
    })
  })

  // ============================================================================
  // ImageUsageRecord type
  // ============================================================================

  describe('ImageUsageRecord type', () => {
    it('can create valid image usage record', () => {
      const record: ImageUsageRecord = {
        id: 'img_123',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        count: 1,
        costUsd: 0.04,
        success: true,
      }

      expect(record.model).toBe('dall-e-3')
      expect(record.quality).toBe('standard')
      expect(record.count).toBe(1)
    })

    it('supports hd quality', () => {
      const record: ImageUsageRecord = {
        id: 'img_456',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'openai',
        model: 'dall-e-3',
        size: '1792x1024',
        quality: 'hd',
        count: 2,
        costUsd: 0.16,
        success: true,
      }

      expect(record.quality).toBe('hd')
      expect(record.count).toBe(2)
    })

    it('supports request context', () => {
      const record: ImageUsageRecord = {
        id: 'img_789',
        timestamp: '2025-01-15T12:00:00Z',
        provider: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        count: 1,
        costUsd: 0.04,
        requestContext: {
          feature: 'illustration-generation',
          strandPath: 'weaves/wiki/strands/art.md',
        },
        success: true,
      }

      expect(record.requestContext?.feature).toBe('illustration-generation')
    })
  })

  // ============================================================================
  // CostSummary type
  // ============================================================================

  describe('CostSummary type', () => {
    it('can create valid cost summary', () => {
      const summary: CostSummary = {
        totalCost: 5.25,
        totalRequests: 100,
        totalTokens: 50000,
        byProvider: {
          openai: {
            cost: 3.25,
            requests: 60,
            tokens: 30000,
            models: {
              'gpt-4o-mini': { cost: 1.25, requests: 40, tokens: 20000 },
              'gpt-4o': { cost: 2.0, requests: 20, tokens: 10000 },
            },
          },
          anthropic: {
            cost: 2.0,
            requests: 40,
            tokens: 20000,
            models: {
              'claude-3-haiku-20240307': { cost: 2.0, requests: 40, tokens: 20000 },
            },
          },
        },
        byDay: [
          { date: '2025-01-14', cost: 2.0, requests: 40, tokens: 20000 },
          { date: '2025-01-15', cost: 3.25, requests: 60, tokens: 30000 },
        ],
        period: {
          start: '2025-01-01T00:00:00Z',
          end: '2025-01-15T23:59:59Z',
          type: 'month',
        },
      }

      expect(summary.totalCost).toBe(5.25)
      expect(summary.byProvider.openai.cost).toBe(3.25)
      expect(summary.byDay).toHaveLength(2)
      expect(summary.period.type).toBe('month')
    })

    it('supports all period types', () => {
      const types: CostSummary['period']['type'][] = ['day', 'week', 'month', 'year', 'all']

      types.forEach((periodType) => {
        const summary: CostSummary = {
          totalCost: 0,
          totalRequests: 0,
          totalTokens: 0,
          byProvider: {},
          byDay: [],
          period: {
            start: '2025-01-01T00:00:00Z',
            end: '2025-01-15T23:59:59Z',
            type: periodType,
          },
        }
        expect(summary.period.type).toBe(periodType)
      })
    })
  })

  // ============================================================================
  // DailyCostEntry type
  // ============================================================================

  describe('DailyCostEntry type', () => {
    it('can create valid daily cost entry', () => {
      const entry: DailyCostEntry = {
        date: '2025-01-15',
        cost: 1.50,
        requests: 25,
        tokens: 12500,
        byProvider: {
          openai: 1.0,
          anthropic: 0.5,
        },
      }

      expect(entry.date).toBe('2025-01-15')
      expect(entry.cost).toBe(1.50)
      expect(entry.byProvider.openai).toBe(1.0)
    })
  })

  // ============================================================================
  // MonthlyProjection type
  // ============================================================================

  describe('MonthlyProjection type', () => {
    it('can create valid monthly projection', () => {
      const projection: MonthlyProjection = {
        currentSpend: 15.00,
        daysElapsed: 15,
        daysRemaining: 16,
        projectedMonthly: 31.00,
        averageDailyCost: 1.00,
      }

      expect(projection.currentSpend).toBe(15.00)
      expect(projection.daysElapsed + projection.daysRemaining).toBe(31)
      expect(projection.projectedMonthly).toBe(31.00)
    })
  })

  // ============================================================================
  // resetInMemoryStorage
  // ============================================================================

  describe('resetInMemoryStorage', () => {
    it('resets in-memory storage', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )

      // Record some usage
      await recordTokenUsage('openai', 'gpt-4o-mini', {
        promptTokens: 100,
        completionTokens: 50,
      })

      // Check it's recorded
      const summaryBefore = await getCostSummary('month')
      expect(summaryBefore.totalRequests).toBeGreaterThan(0)

      // Reset
      resetInMemoryStorage()

      // Check it's cleared
      const summaryAfter = await getCostSummary('month')
      expect(summaryAfter.totalRequests).toBe(0)
    })
  })

  // ============================================================================
  // recordTokenUsage
  // ============================================================================

  describe('recordTokenUsage', () => {
    it('records token usage', async () => {
      const { resetInMemoryStorage, recordTokenUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordTokenUsage('openai', 'gpt-4o-mini', {
        promptTokens: 100,
        completionTokens: 50,
      })

      expect(id).toBeDefined()
      expect(id).toMatch(/^usage_/)
    })

    it('calculates total tokens automatically', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', {
        promptTokens: 100,
        completionTokens: 50,
        // No totalTokens provided
      })

      const summary = await getCostSummary('day')
      expect(summary.totalTokens).toBe(150)
    })

    it('accepts explicit total tokens', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 175, // Explicit total (maybe includes padding)
      })

      const summary = await getCostSummary('day')
      expect(summary.totalTokens).toBe(175)
    })

    it('records with options', async () => {
      const { resetInMemoryStorage, recordTokenUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordTokenUsage(
        'anthropic',
        'claude-3-haiku-20240307',
        { promptTokens: 200, completionTokens: 100 },
        {
          operationType: 'completion',
          context: { feature: 'teach-mode', sessionId: 'test-123' },
          durationMs: 1200,
          success: true,
        }
      )

      expect(id).toBeDefined()
    })

    it('records failed requests', async () => {
      const { resetInMemoryStorage, recordTokenUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordTokenUsage(
        'openai',
        'gpt-4o',
        { promptTokens: 100, completionTokens: 0 },
        {
          success: false,
          errorMessage: 'API rate limit',
        }
      )

      expect(id).toBeDefined()
    })

    it('works without window (SSR)', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { recordTokenUsage } = await import('@/lib/costs/costTrackingService')

      const id = await recordTokenUsage('openai', 'gpt-4o-mini', {
        promptTokens: 100,
        completionTokens: 50,
      })

      expect(id).toBeDefined()
    })
  })

  // ============================================================================
  // recordImageUsage
  // ============================================================================

  describe('recordImageUsage', () => {
    it('records image usage', async () => {
      const { resetInMemoryStorage, recordImageUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordImageUsage('openai', 'dall-e-3', '1024x1024')

      expect(id).toBeDefined()
      expect(id).toMatch(/^img_/)
    })

    it('records with quality and count', async () => {
      const { resetInMemoryStorage, recordImageUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordImageUsage('openai', 'dall-e-3', '1792x1024', 'hd', 3)

      expect(id).toBeDefined()
    })

    it('records with context options', async () => {
      const { resetInMemoryStorage, recordImageUsage } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const id = await recordImageUsage('openai', 'dall-e-3', '1024x1024', 'standard', 1, {
        context: { feature: 'cover-image' },
        success: true,
      })

      expect(id).toBeDefined()
    })
  })

  // ============================================================================
  // getCostSummary
  // ============================================================================

  describe('getCostSummary', () => {
    it('returns empty summary when no data', async () => {
      const { resetInMemoryStorage, getCostSummary } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const summary = await getCostSummary('month')

      expect(summary.totalCost).toBe(0)
      expect(summary.totalRequests).toBe(0)
      expect(summary.totalTokens).toBe(0)
      expect(summary.byDay).toEqual([])
    })

    it('calculates summary for day range', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })

      const summary = await getCostSummary('day')

      expect(summary.totalRequests).toBe(1)
      expect(summary.period.type).toBe('day')
    })

    it('calculates summary for week range', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('anthropic', 'claude-3-haiku-20240307', {
        promptTokens: 200,
        completionTokens: 100,
      })

      const summary = await getCostSummary('week')

      expect(summary.period.type).toBe('week')
    })

    it('calculates summary for month range', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o', { promptTokens: 500, completionTokens: 300 })
      await recordTokenUsage('anthropic', 'claude-3-haiku-20240307', {
        promptTokens: 200,
        completionTokens: 100,
      })

      const summary = await getCostSummary('month')

      expect(summary.totalRequests).toBe(2)
      expect(Object.keys(summary.byProvider)).toContain('openai')
      expect(Object.keys(summary.byProvider)).toContain('anthropic')
    })

    it('calculates summary for year range', async () => {
      const { resetInMemoryStorage, getCostSummary } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const summary = await getCostSummary('year')

      expect(summary.period.type).toBe('year')
    })

    it('calculates summary for all time', async () => {
      const { resetInMemoryStorage, getCostSummary } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const summary = await getCostSummary('all')

      expect(summary.period.type).toBe('all')
    })

    it('aggregates by provider correctly', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      // Multiple requests to same provider
      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })
      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })

      const summary = await getCostSummary('month')

      expect(summary.byProvider.openai.requests).toBe(2)
    })

    it('aggregates by model correctly', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCostSummary } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })
      await recordTokenUsage('openai', 'gpt-4o', { promptTokens: 100, completionTokens: 50 })

      const summary = await getCostSummary('month')

      expect(summary.byProvider.openai.models['gpt-4o-mini']).toBeDefined()
      expect(summary.byProvider.openai.models['gpt-4o']).toBeDefined()
    })
  })

  // ============================================================================
  // getDailyCosts
  // ============================================================================

  describe('getDailyCosts', () => {
    it('returns empty array when no data', async () => {
      const { resetInMemoryStorage, getDailyCosts } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const costs = await getDailyCosts()

      expect(costs).toEqual([])
    })

    it('returns daily costs', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getDailyCosts } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })

      const costs = await getDailyCosts()

      expect(costs.length).toBe(1)
      expect(costs[0].date).toBe('2025-01-15')
      expect(costs[0].requests).toBe(1)
    })

    it('accepts custom day count', async () => {
      const { resetInMemoryStorage, getDailyCosts } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const costs = await getDailyCosts(7) // Last 7 days

      expect(costs).toBeDefined()
    })

    it('aggregates costs by provider', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getDailyCosts } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })
      await recordTokenUsage('anthropic', 'claude-3-haiku-20240307', {
        promptTokens: 200,
        completionTokens: 100,
      })

      const costs = await getDailyCosts()

      expect(costs[0].byProvider.openai).toBeDefined()
      expect(costs[0].byProvider.anthropic).toBeDefined()
    })
  })

  // ============================================================================
  // getCurrentMonthProjection
  // ============================================================================

  describe('getCurrentMonthProjection', () => {
    it('returns projection with zero spend', async () => {
      const { resetInMemoryStorage, getCurrentMonthProjection } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      const projection = await getCurrentMonthProjection()

      expect(projection.currentSpend).toBe(0)
      expect(projection.daysElapsed).toBe(15) // Jan 15
      expect(projection.daysRemaining).toBe(16) // 31 - 15
      expect(projection.averageDailyCost).toBe(0)
      expect(projection.projectedMonthly).toBe(0)
    })

    it('calculates projection based on spend', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getCurrentMonthProjection } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      // Add some usage
      await recordTokenUsage('openai', 'gpt-4o', { promptTokens: 1000, completionTokens: 500 })
      await recordTokenUsage('openai', 'gpt-4o', { promptTokens: 1000, completionTokens: 500 })

      const projection = await getCurrentMonthProjection()

      expect(projection.currentSpend).toBeGreaterThan(0)
      expect(projection.averageDailyCost).toBeGreaterThan(0)
      expect(projection.projectedMonthly).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // getProviderBreakdown
  // ============================================================================

  describe('getProviderBreakdown', () => {
    it('returns empty breakdown when no data', async () => {
      const { resetInMemoryStorage, getProviderBreakdown } = await import('@/lib/costs/costTrackingService')
      resetInMemoryStorage()

      const breakdown = await getProviderBreakdown()

      expect(Object.keys(breakdown)).toHaveLength(0)
    })

    it('returns breakdown by provider', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getProviderBreakdown } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })
      await recordTokenUsage('anthropic', 'claude-3-haiku-20240307', {
        promptTokens: 200,
        completionTokens: 100,
      })

      const breakdown = await getProviderBreakdown()

      expect(breakdown.openai).toBeDefined()
      expect(breakdown.anthropic).toBeDefined()
      expect(breakdown.openai.cost).toBeGreaterThan(0)
      expect(breakdown.openai.percentage).toBeGreaterThan(0)
      expect(breakdown.openai.requests).toBe(1)
    })

    it('calculates percentages correctly', async () => {
      const { resetInMemoryStorage, recordTokenUsage, getProviderBreakdown } = await import(
        '@/lib/costs/costTrackingService'
      )
      resetInMemoryStorage()

      // Record equal usage
      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })
      await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 100, completionTokens: 50 })

      const breakdown = await getProviderBreakdown()

      expect(breakdown.openai.percentage).toBe(100)
    })
  })

  // ============================================================================
  // formatCost (re-exported from pricingModels)
  // ============================================================================

  describe('formatCost export', () => {
    it('exports formatCost function', async () => {
      const { formatCost } = await import('@/lib/costs/costTrackingService')

      expect(formatCost).toBeDefined()
      expect(typeof formatCost).toBe('function')
    })
  })

  // ============================================================================
  // Memory limits
  // ============================================================================

  describe('memory limits', () => {
    it('limits in-memory storage to 1000 records', async () => {
      vi.stubGlobal('window', undefined)
      vi.resetModules()

      const { recordTokenUsage, getCostSummary } = await import('@/lib/costs/costTrackingService')

      // Record 1100 requests
      for (let i = 0; i < 1100; i++) {
        await recordTokenUsage('openai', 'gpt-4o-mini', { promptTokens: 10, completionTokens: 5 })
      }

      const summary = await getCostSummary('all')

      // Should have at most 1000 records (older ones trimmed)
      expect(summary.totalRequests).toBeLessThanOrEqual(1000)
    })
  })
})
