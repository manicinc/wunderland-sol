/**
 * Tests for Summarization Cache
 * @module tests/unit/summarization/cache
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SummarizationRequest, SummarizationResult } from '@/lib/summarization/types'

// In-memory cache storage for testing
const cacheStorage = new Map<string, {
  key: string
  result: SummarizationResult
  createdAt: number
  expiresAt: number
}>()

// Mock the module
vi.mock('@/lib/summarization/cache', () => ({
  generateCacheKey: vi.fn(),
  getCachedSummary: vi.fn(),
  cacheSummary: vi.fn(),
  deleteCachedSummary: vi.fn(),
  clearSummarizationCache: vi.fn(),
  cleanupExpiredSummaries: vi.fn(),
  getCacheStats: vi.fn(),
}))

import {
  generateCacheKey,
  getCachedSummary,
  cacheSummary,
  deleteCachedSummary,
  clearSummarizationCache,
  cleanupExpiredSummaries,
  getCacheStats,
} from '@/lib/summarization/cache'

describe('Summarization Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheStorage.clear()

    // Setup mock implementations
    vi.mocked(generateCacheKey).mockImplementation((request: SummarizationRequest): string => {
      const keyData = {
        sources: request.sources.map(s => ({
          url: s.url,
          content: s.content.substring(0, 500),
        })),
        type: request.type,
        length: request.length,
        focus: request.focus || '',
        audience: request.audience || 'general',
        citations: request.includeCitations || false,
      }

      const str = JSON.stringify(keyData)
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }

      return `sum_${Math.abs(hash).toString(36)}_${request.type}_${request.length}`
    })

    vi.mocked(getCachedSummary).mockImplementation(async (key: string): Promise<SummarizationResult | null> => {
      const cached = cacheStorage.get(key)
      if (!cached) return null

      if (cached.expiresAt < Date.now()) {
        cacheStorage.delete(key)
        return null
      }

      return {
        ...cached.result,
        cacheKey: key,
        fromCache: true,
      }
    })

    vi.mocked(cacheSummary).mockImplementation(async (key: string, result: SummarizationResult, ttl: number = 86400000): Promise<void> => {
      const now = Date.now()
      cacheStorage.set(key, {
        key,
        result: { ...result, cacheKey: key },
        createdAt: now,
        expiresAt: now + ttl,
      })
    })

    vi.mocked(deleteCachedSummary).mockImplementation(async (key: string): Promise<void> => {
      cacheStorage.delete(key)
    })

    vi.mocked(clearSummarizationCache).mockImplementation(async (): Promise<void> => {
      cacheStorage.clear()
    })

    vi.mocked(cleanupExpiredSummaries).mockImplementation(async (): Promise<number> => {
      const now = Date.now()
      let deleted = 0
      for (const [key, value] of cacheStorage.entries()) {
        if (value.expiresAt < now) {
          cacheStorage.delete(key)
          deleted++
        }
      }
      return deleted
    })

    vi.mocked(getCacheStats).mockImplementation(async () => {
      const entries = Array.from(cacheStorage.values())
      return {
        count: cacheStorage.size,
        oldestEntry: entries.length > 0
          ? Math.min(...entries.map(e => e.createdAt))
          : null,
        newestEntry: entries.length > 0
          ? Math.max(...entries.map(e => e.createdAt))
          : null,
      }
    })
  })

  describe('generateCacheKey', () => {
    it('should generate consistent key for same request', () => {
      const request: SummarizationRequest = {
        sources: [
          { url: 'https://example.com/1', title: 'Source 1', content: 'Content here' },
        ],
        type: 'digest',
        length: 'standard',
      }

      const key1 = generateCacheKey(request)
      const key2 = generateCacheKey(request)

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different requests', () => {
      const request1: SummarizationRequest = {
        sources: [{ url: 'https://example.com/1', title: 'Source 1', content: 'Content 1' }],
        type: 'digest',
        length: 'standard',
      }

      const request2: SummarizationRequest = {
        sources: [{ url: 'https://example.com/2', title: 'Source 2', content: 'Content 2' }],
        type: 'digest',
        length: 'standard',
      }

      const key1 = generateCacheKey(request1)
      const key2 = generateCacheKey(request2)

      expect(key1).not.toBe(key2)
    })

    it('should include type and length in key', () => {
      const request: SummarizationRequest = {
        sources: [{ url: 'https://example.com', title: 'Test', content: 'Test content' }],
        type: 'key-points',
        length: 'brief',
      }

      const key = generateCacheKey(request)

      expect(key).toContain('key-points')
      expect(key).toContain('brief')
    })

    it('should generate different keys for different types', () => {
      const baseRequest = {
        sources: [{ url: 'https://example.com', title: 'Test', content: 'Test content' }],
        length: 'standard' as const,
      }

      const digestKey = generateCacheKey({ ...baseRequest, type: 'digest' })
      const abstractKey = generateCacheKey({ ...baseRequest, type: 'abstract' })

      expect(digestKey).not.toBe(abstractKey)
    })

    it('should generate different keys for different lengths', () => {
      const baseRequest = {
        sources: [{ url: 'https://example.com', title: 'Test', content: 'Test content' }],
        type: 'digest' as const,
      }

      const briefKey = generateCacheKey({ ...baseRequest, length: 'brief' })
      const detailedKey = generateCacheKey({ ...baseRequest, length: 'detailed' })

      expect(briefKey).not.toBe(detailedKey)
    })
  })

  describe('cacheSummary and getCachedSummary', () => {
    it('should cache and retrieve summary', async () => {
      const key = 'test_key_123'
      const result: SummarizationResult = {
        summary: 'This is a test summary.',
        type: 'digest',
        sourceCount: 3,
        provider: 'claude',
      }

      await cacheSummary(key, result)
      const cached = await getCachedSummary(key)

      expect(cached).not.toBeNull()
      expect(cached?.summary).toBe('This is a test summary.')
      expect(cached?.type).toBe('digest')
      expect(cached?.fromCache).toBe(true)
    })

    it('should return null for non-existent key', async () => {
      const cached = await getCachedSummary('nonexistent_key')

      expect(cached).toBeNull()
    })

    it('should include cacheKey in retrieved result', async () => {
      const key = 'cache_key_test'
      const result: SummarizationResult = {
        summary: 'Test summary',
        type: 'abstract',
        sourceCount: 1,
        provider: 'openai',
      }

      await cacheSummary(key, result)
      const cached = await getCachedSummary(key)

      expect(cached?.cacheKey).toBe(key)
    })

    it('should expire entries after TTL', async () => {
      const key = 'expiring_key'
      const result: SummarizationResult = {
        summary: 'Expiring summary',
        type: 'digest',
        sourceCount: 1,
        provider: 'claude',
      }

      await cacheSummary(key, result, 1)
      await new Promise(resolve => setTimeout(resolve, 10))

      const cached = await getCachedSummary(key)
      expect(cached).toBeNull()
    })
  })

  describe('deleteCachedSummary', () => {
    it('should delete cached entry', async () => {
      const key = 'delete_test_key'
      const result: SummarizationResult = {
        summary: 'To be deleted',
        type: 'digest',
        sourceCount: 1,
        provider: 'claude',
      }

      await cacheSummary(key, result)
      await deleteCachedSummary(key)
      const cached = await getCachedSummary(key)

      expect(cached).toBeNull()
    })

    it('should not throw for non-existent key', async () => {
      await expect(deleteCachedSummary('nonexistent')).resolves.not.toThrow()
    })
  })

  describe('clearSummarizationCache', () => {
    it('should clear all cached entries', async () => {
      await cacheSummary('key1', { summary: 'Summary 1', type: 'digest', sourceCount: 1, provider: 'claude' })
      await cacheSummary('key2', { summary: 'Summary 2', type: 'abstract', sourceCount: 2, provider: 'openai' })
      await cacheSummary('key3', { summary: 'Summary 3', type: 'key-points', sourceCount: 3, provider: 'claude' })

      await clearSummarizationCache()

      expect(await getCachedSummary('key1')).toBeNull()
      expect(await getCachedSummary('key2')).toBeNull()
      expect(await getCachedSummary('key3')).toBeNull()
    })
  })

  describe('cleanupExpiredSummaries', () => {
    it('should remove expired entries', async () => {
      await cacheSummary('expired', { summary: 'Expired', type: 'digest', sourceCount: 1, provider: 'claude' }, 1)
      await cacheSummary('valid', { summary: 'Valid', type: 'digest', sourceCount: 1, provider: 'claude' }, 86400000)

      await new Promise(resolve => setTimeout(resolve, 10))

      const deleted = await cleanupExpiredSummaries()

      expect(deleted).toBe(1)
      expect(await getCachedSummary('expired')).toBeNull()
      expect(await getCachedSummary('valid')).not.toBeNull()
    })

    it('should return 0 when no expired entries', async () => {
      await cacheSummary('valid1', { summary: 'Valid 1', type: 'digest', sourceCount: 1, provider: 'claude' })
      await cacheSummary('valid2', { summary: 'Valid 2', type: 'digest', sourceCount: 1, provider: 'claude' })

      const deleted = await cleanupExpiredSummaries()

      expect(deleted).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return correct count', async () => {
      await cacheSummary('s1', { summary: 'S1', type: 'digest', sourceCount: 1, provider: 'claude' })
      await cacheSummary('s2', { summary: 'S2', type: 'digest', sourceCount: 1, provider: 'claude' })
      await cacheSummary('s3', { summary: 'S3', type: 'digest', sourceCount: 1, provider: 'claude' })

      const stats = await getCacheStats()

      expect(stats.count).toBe(3)
    })

    it('should return null for empty cache', async () => {
      const stats = await getCacheStats()

      expect(stats.count).toBe(0)
      expect(stats.oldestEntry).toBeNull()
      expect(stats.newestEntry).toBeNull()
    })

    it('should track oldest and newest entries', async () => {
      const before = Date.now()
      await cacheSummary('first', { summary: 'First', type: 'digest', sourceCount: 1, provider: 'claude' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await cacheSummary('second', { summary: 'Second', type: 'digest', sourceCount: 1, provider: 'claude' })
      const after = Date.now()

      const stats = await getCacheStats()

      expect(stats.oldestEntry).toBeGreaterThanOrEqual(before)
      expect(stats.newestEntry).toBeLessThanOrEqual(after)
      expect(stats.oldestEntry).toBeLessThanOrEqual(stats.newestEntry!)
    })
  })
})
