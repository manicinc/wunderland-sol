/**
 * Template Cache Tests
 * @module __tests__/unit/lib/templates/templateCache.test
 *
 * Tests for template cache pure utility functions.
 * Note: IndexedDB operations require mocking and are tested separately.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getTemplateCacheKey,
  isRegistryFresh,
  isRegistryUsable,
  isTemplateFresh,
  isTemplateUsable,
} from '@/lib/templates/templateCache'
import { CACHE_TTL } from '@/lib/templates/types'
import type {
  CachedRegistryEntry,
  CachedTemplateEntry,
  RemoteTemplateRegistry,
  RemoteTemplate,
} from '@/lib/templates/types'

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockRegistry(): RemoteTemplateRegistry {
  return {
    schemaVersion: '1.0',
    lastUpdated: new Date().toISOString(),
    repository: {
      name: 'Test Repo',
      description: 'Test Description',
      author: 'Test Author',
      license: 'MIT',
    },
    categories: [],
    templates: [],
  }
}

function createMockTemplate(): RemoteTemplate {
  return {
    id: 'test-template',
    source: 'remote',
    sourceId: 'test/repo',
    name: 'Test Template',
    description: 'A test template',
    shortDescription: 'Test',
    category: 'general',
    icon: 'file',
    difficulty: 'beginner',
    estimatedTime: '5 min',
    tags: ['test'],
    version: '1.0.0',
    author: 'Test',
    featured: false,
    fields: [],
    frontmatter: { enabled: true, fields: [] },
    template: '# Test',
    defaultData: {},
    remote: {
      path: 'templates/test.json',
      version: '1.0.0',
    },
  }
}

function createCachedRegistryEntry(
  overrides: Partial<CachedRegistryEntry> = {}
): CachedRegistryEntry {
  const now = Date.now()
  return {
    id: 'test/repo',
    registry: createMockRegistry(),
    cachedAt: now,
    expiresAt: now + CACHE_TTL.REGISTRY,
    ...overrides,
  }
}

function createCachedTemplateEntry(
  overrides: Partial<CachedTemplateEntry> = {}
): CachedTemplateEntry {
  const now = Date.now()
  return {
    id: 'test/repo:test-template',
    template: createMockTemplate(),
    cachedAt: now,
    expiresAt: now + CACHE_TTL.TEMPLATE,
    accessCount: 1,
    lastAccessed: now,
    ...overrides,
  }
}

// ============================================================================
// getTemplateCacheKey
// ============================================================================

describe('getTemplateCacheKey', () => {
  it('combines sourceId and templateId with colon', () => {
    const key = getTemplateCacheKey('org/repo', 'my-template')
    expect(key).toBe('org/repo:my-template')
  })

  it('handles empty strings', () => {
    const key = getTemplateCacheKey('', '')
    expect(key).toBe(':')
  })

  it('handles special characters in IDs', () => {
    const key = getTemplateCacheKey('org/my-repo', 'template-v1.0.0')
    expect(key).toBe('org/my-repo:template-v1.0.0')
  })

  it('produces unique keys for different inputs', () => {
    const key1 = getTemplateCacheKey('org1/repo', 'template')
    const key2 = getTemplateCacheKey('org2/repo', 'template')
    const key3 = getTemplateCacheKey('org1/repo', 'other-template')

    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
    expect(key2).not.toBe(key3)
  })
})

// ============================================================================
// isRegistryFresh
// ============================================================================

describe('isRegistryFresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when not expired', () => {
    const entry = createCachedRegistryEntry()
    expect(isRegistryFresh(entry)).toBe(true)
  })

  it('returns true when just cached', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now,
      expiresAt: now + CACHE_TTL.REGISTRY,
    })
    expect(isRegistryFresh(entry)).toBe(true)
  })

  it('returns false when expired', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.REGISTRY - 1000,
      expiresAt: now - 1000,
    })
    expect(isRegistryFresh(entry)).toBe(false)
  })

  it('returns false when exactly at expiry', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.REGISTRY,
      expiresAt: now,
    })
    expect(isRegistryFresh(entry)).toBe(false)
  })

  it('returns true when 1ms before expiry', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.REGISTRY + 1,
      expiresAt: now + 1,
    })
    expect(isRegistryFresh(entry)).toBe(true)
  })
})

// ============================================================================
// isRegistryUsable
// ============================================================================

describe('isRegistryUsable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when fresh', () => {
    const entry = createCachedRegistryEntry()
    expect(isRegistryUsable(entry)).toBe(true)
  })

  it('returns true when expired but within stale-while-revalidate window', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.REGISTRY - 1000, // Expired
      expiresAt: now - 1000,
    })
    expect(isRegistryUsable(entry)).toBe(true)
  })

  it('returns false when beyond stale-while-revalidate window', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE - 1000,
      expiresAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE + CACHE_TTL.REGISTRY - 1000,
    })
    expect(isRegistryUsable(entry)).toBe(false)
  })

  it('handles edge case at stale-while-revalidate boundary', () => {
    const now = Date.now()
    const entry = createCachedRegistryEntry({
      cachedAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE,
      expiresAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE + CACHE_TTL.REGISTRY,
    })
    // At exactly the boundary, should not be usable
    expect(isRegistryUsable(entry)).toBe(false)
  })
})

// ============================================================================
// isTemplateFresh
// ============================================================================

describe('isTemplateFresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when not expired', () => {
    const entry = createCachedTemplateEntry()
    expect(isTemplateFresh(entry)).toBe(true)
  })

  it('returns false when expired', () => {
    const now = Date.now()
    const entry = createCachedTemplateEntry({
      cachedAt: now - CACHE_TTL.TEMPLATE - 1000,
      expiresAt: now - 1000,
    })
    expect(isTemplateFresh(entry)).toBe(false)
  })

  it('returns true when halfway through TTL', () => {
    const now = Date.now()
    const entry = createCachedTemplateEntry({
      cachedAt: now - CACHE_TTL.TEMPLATE / 2,
      expiresAt: now + CACHE_TTL.TEMPLATE / 2,
    })
    expect(isTemplateFresh(entry)).toBe(true)
  })
})

// ============================================================================
// isTemplateUsable
// ============================================================================

describe('isTemplateUsable', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true when fresh', () => {
    const entry = createCachedTemplateEntry()
    expect(isTemplateUsable(entry)).toBe(true)
  })

  it('returns true when stale but usable', () => {
    const now = Date.now()
    const entry = createCachedTemplateEntry({
      cachedAt: now - CACHE_TTL.TEMPLATE - 1000, // Expired
      expiresAt: now - 1000,
    })
    // Still within stale-while-revalidate window
    expect(isTemplateUsable(entry)).toBe(true)
  })

  it('returns false when beyond stale-while-revalidate', () => {
    const now = Date.now()
    const entry = createCachedTemplateEntry({
      cachedAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE - 1000,
      expiresAt: now - CACHE_TTL.STALE_WHILE_REVALIDATE + CACHE_TTL.TEMPLATE - 1000,
    })
    expect(isTemplateUsable(entry)).toBe(false)
  })
})

// ============================================================================
// Combined Freshness/Usability Tests
// ============================================================================

describe('freshness and usability relationship', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('registry', () => {
    it('fresh implies usable', () => {
      const entry = createCachedRegistryEntry()
      if (isRegistryFresh(entry)) {
        expect(isRegistryUsable(entry)).toBe(true)
      }
    })

    it('usable does not imply fresh (stale entries can be usable)', () => {
      const now = Date.now()
      const entry = createCachedRegistryEntry({
        cachedAt: now - CACHE_TTL.REGISTRY - 1000,
        expiresAt: now - 1000,
      })

      expect(isRegistryFresh(entry)).toBe(false)
      expect(isRegistryUsable(entry)).toBe(true)
    })
  })

  describe('template', () => {
    it('fresh implies usable', () => {
      const entry = createCachedTemplateEntry()
      if (isTemplateFresh(entry)) {
        expect(isTemplateUsable(entry)).toBe(true)
      }
    })

    it('usable does not imply fresh (stale entries can be usable)', () => {
      const now = Date.now()
      const entry = createCachedTemplateEntry({
        cachedAt: now - CACHE_TTL.TEMPLATE - 1000,
        expiresAt: now - 1000,
      })

      expect(isTemplateFresh(entry)).toBe(false)
      expect(isTemplateUsable(entry)).toBe(true)
    })
  })
})
