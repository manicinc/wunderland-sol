/**
 * Writing Timer Store Tests
 * @module __tests__/unit/lib/tracking/writingTimerStore.test
 *
 * Tests for writing timer persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DailyWritingSummary, StrandWritingStats } from '@/lib/tracking/writingTimerStore'

describe('writingTimerStore module', () => {
  // ============================================================================
  // Type exports
  // ============================================================================

  describe('DailyWritingSummary type', () => {
    it('has correct structure', () => {
      const summary: DailyWritingSummary = {
        date: '2025-01-15',
        totalActiveSeconds: 3600,
        totalSessions: 5,
        totalWordCount: 1000,
        strandIds: ['strand-1', 'strand-2'],
      }

      expect(summary.date).toBe('2025-01-15')
      expect(summary.totalActiveSeconds).toBe(3600)
      expect(summary.totalSessions).toBe(5)
      expect(summary.totalWordCount).toBe(1000)
      expect(summary.strandIds).toHaveLength(2)
    })

    it('can have empty strands array', () => {
      const summary: DailyWritingSummary = {
        date: '2025-01-01',
        totalActiveSeconds: 0,
        totalSessions: 0,
        totalWordCount: 0,
        strandIds: [],
      }

      expect(summary.strandIds).toEqual([])
    })
  })

  describe('StrandWritingStats type', () => {
    it('has correct structure', () => {
      const stats: StrandWritingStats = {
        strandId: 'doc-123',
        totalActiveSeconds: 7200,
        totalSessions: 10,
        lastSessionAt: '2025-01-15T14:30:00Z',
        averageSessionLength: 720,
      }

      expect(stats.strandId).toBe('doc-123')
      expect(stats.totalActiveSeconds).toBe(7200)
      expect(stats.averageSessionLength).toBe(720)
    })
  })

  // ============================================================================
  // WritingTimerStore class
  // ============================================================================

  describe('WritingTimerStore class', () => {
    let mockIndexedDB: any
    let mockDB: any
    let mockStore: any
    let mockTransaction: any

    beforeEach(() => {
      mockStore = {
        put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null }),
        get: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: null }),
        getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: [] }),
        index: vi.fn().mockReturnValue({
          getAll: vi.fn().mockReturnValue({ onsuccess: null, onerror: null, result: [] }),
        }),
        createIndex: vi.fn(),
      }

      mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockStore),
        oncomplete: null,
        onerror: null,
      }

      mockDB = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn().mockReturnValue(mockStore),
      }

      mockIndexedDB = {
        open: vi.fn().mockImplementation(() => {
          const request = {
            onsuccess: null as any,
            onerror: null as any,
            onupgradeneeded: null as any,
            result: mockDB,
            error: null,
          }
          // Simulate async success
          setTimeout(() => {
            if (request.onupgradeneeded) {
              request.onupgradeneeded({ target: request })
            }
            if (request.onsuccess) {
              request.onsuccess()
            }
          }, 0)
          return request
        }),
      }

      vi.stubGlobal('indexedDB', mockIndexedDB)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    it('can be instantiated', async () => {
      const { WritingTimerStore } = await import('@/lib/tracking/writingTimerStore')
      const store = new WritingTimerStore()
      expect(store).toBeDefined()
    })

    it('initializes database', async () => {
      const { WritingTimerStore } = await import('@/lib/tracking/writingTimerStore')
      const store = new WritingTimerStore()
      
      await store.init()
      
      expect(mockIndexedDB.open).toHaveBeenCalled()
    })

    it('handles missing indexedDB gracefully', async () => {
      vi.stubGlobal('indexedDB', undefined)
      vi.resetModules()
      
      const { WritingTimerStore } = await import('@/lib/tracking/writingTimerStore')
      const store = new WritingTimerStore()
      
      // Should not throw
      await store.init()
    })

    it('reuses init promise on multiple calls', async () => {
      const { WritingTimerStore } = await import('@/lib/tracking/writingTimerStore')
      const store = new WritingTimerStore()

      // Call init twice in quick succession
      const promise1 = store.init()
      const promise2 = store.init()

      // Both should resolve without error
      await promise1
      await promise2

      // Verify both succeeded
      expect(promise1).toBeInstanceOf(Promise)
      expect(promise2).toBeInstanceOf(Promise)
    })
  })

  // ============================================================================
  // getWritingTimerStore singleton
  // ============================================================================

  describe('getWritingTimerStore', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', undefined)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    it('returns singleton instance', async () => {
      // Import fresh module
      const module = await import('@/lib/tracking/writingTimerStore')
      const { getWritingTimerStore } = module

      // getWritingTimerStore is async, await both calls
      const store1 = await getWritingTimerStore()
      const store2 = await getWritingTimerStore()

      // Both calls should return the same WritingTimerStore instance
      expect(store1).toBeDefined()
      expect(store2).toBeDefined()
      expect(store1).toBe(store2)
    })
  })
})
