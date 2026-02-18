/**
 * Connection Discovery Tests
 * @module __tests__/unit/lib/collections/connectionDiscovery.test
 *
 * Tests for automatic relationship discovery between strands.
 */

import { describe, it, expect } from 'vitest'
import {
  discoverConnections,
  analyzeSharedTags,
  analyzeSharedTopics,
  toCollectionConnections,
  type StrandForDiscovery,
  type DiscoveredConnection,
} from '@/lib/collections/connectionDiscovery'

// ============================================================================
// Test Fixtures
// ============================================================================

const createStrand = (overrides: Partial<StrandForDiscovery> = {}): StrandForDiscovery => ({
  path: '/test/strand',
  ...overrides,
})

// ============================================================================
// discoverConnections
// ============================================================================

describe('discoverConnections', () => {
  describe('shared tags', () => {
    it('discovers connections from shared tags', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['javascript', 'react'] }),
        createStrand({ path: '/b', tags: ['javascript', 'vue'] }),
      ]

      const connections = discoverConnections(strands)

      expect(connections.length).toBeGreaterThan(0)
      const tagConnection = connections.find(c => c.type === 'sharedTags')
      expect(tagConnection).toBeDefined()
      expect(tagConnection?.sharedItems).toContain('javascript')
    })

    it('calculates strength based on number of shared tags', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['js', 'react', 'ts'] }),
        createStrand({ path: '/b', tags: ['js', 'react', 'ts'] }),
      ]

      const connections = discoverConnections(strands)
      const tagConnection = connections.find(c => c.type === 'sharedTags')

      // 3 shared tags = max strength (1)
      expect(tagConnection?.strength).toBe(1)
    })

    it('calculates lower strength for fewer shared tags', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['js'] }),
        createStrand({ path: '/b', tags: ['js'] }),
      ]

      const connections = discoverConnections(strands)
      const tagConnection = connections.find(c => c.type === 'sharedTags')

      // 1 shared tag = 1/3 strength
      expect(tagConnection?.strength).toBeCloseTo(0.333, 2)
    })

    it('is case insensitive for tag matching', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['JavaScript'] }),
        createStrand({ path: '/b', tags: ['javascript'] }),
      ]

      const connections = discoverConnections(strands)
      const tagConnection = connections.find(c => c.type === 'sharedTags')

      expect(tagConnection).toBeDefined()
    })
  })

  describe('shared topics', () => {
    it('discovers connections from shared topics', () => {
      const strands = [
        createStrand({ path: '/a', topics: ['machine learning'] }),
        createStrand({ path: '/b', topics: ['machine learning', 'ai'] }),
      ]

      const connections = discoverConnections(strands)
      const topicConnection = connections.find(c => c.type === 'sharedTopics')

      expect(topicConnection).toBeDefined()
      expect(topicConnection?.sharedItems).toContain('machine learning')
    })

    it('discovers connections from shared subjects', () => {
      const strands = [
        createStrand({ path: '/a', subjects: ['mathematics'] }),
        createStrand({ path: '/b', subjects: ['mathematics'] }),
      ]

      const connections = discoverConnections(strands)
      const connection = connections.find(c => c.sharedItems?.includes('mathematics'))

      expect(connection).toBeDefined()
    })
  })

  describe('same loom', () => {
    it('discovers connections for same loom', () => {
      const strands = [
        createStrand({ path: '/a', loomSlug: 'tutorials' }),
        createStrand({ path: '/b', loomSlug: 'tutorials' }),
      ]

      const connections = discoverConnections(strands)
      const loomConnection = connections.find(c => c.type === 'sameLoom')

      expect(loomConnection).toBeDefined()
      expect(loomConnection?.strength).toBe(0.6)
      expect(loomConnection?.reason).toContain('tutorials')
    })

    it('does not create connection for different looms', () => {
      const strands = [
        createStrand({ path: '/a', loomSlug: 'tutorials' }),
        createStrand({ path: '/b', loomSlug: 'guides' }),
      ]

      const connections = discoverConnections(strands)
      const loomConnection = connections.find(c => c.type === 'sameLoom')

      expect(loomConnection).toBeUndefined()
    })
  })

  describe('same weave', () => {
    it('discovers connections for same weave with different looms', () => {
      const strands = [
        createStrand({ path: '/a', weaveSlug: 'programming', loomSlug: 'js' }),
        createStrand({ path: '/b', weaveSlug: 'programming', loomSlug: 'python' }),
      ]

      const connections = discoverConnections(strands)
      const weaveConnection = connections.find(c => c.type === 'sameWeave')

      expect(weaveConnection).toBeDefined()
      expect(weaveConnection?.strength).toBe(0.3)
    })

    it('does not create sameWeave when looms are the same', () => {
      const strands = [
        createStrand({ path: '/a', weaveSlug: 'programming', loomSlug: 'js' }),
        createStrand({ path: '/b', weaveSlug: 'programming', loomSlug: 'js' }),
      ]

      const connections = discoverConnections(strands)
      const weaveConnection = connections.find(c => c.type === 'sameWeave')

      expect(weaveConnection).toBeUndefined()
      // Should have sameLoom instead
      expect(connections.find(c => c.type === 'sameLoom')).toBeDefined()
    })
  })

  describe('explicit references', () => {
    it('discovers references from frontmatter', () => {
      const strands = [
        createStrand({ path: '/a', relationships: { references: ['/b'] } }),
        createStrand({ path: '/b' }),
      ]

      const connections = discoverConnections(strands)
      const refConnection = connections.find(c => c.type === 'references')

      expect(refConnection).toBeDefined()
      expect(refConnection?.source).toBe('/a')
      expect(refConnection?.target).toBe('/b')
      expect(refConnection?.strength).toBe(0.9)
    })

    it('handles bidirectional references with deduplication', () => {
      const strands = [
        createStrand({ path: '/a', relationships: { references: ['/b'] } }),
        createStrand({ path: '/b', relationships: { references: ['/a'] } }),
      ]

      const connections = discoverConnections(strands)
      const refConnections = connections.filter(c => c.type === 'references')

      // Deduplication keeps only one connection per pair per type
      expect(refConnections.length).toBe(1)
    })
  })

  describe('prerequisites', () => {
    it('discovers prerequisite relationships', () => {
      const strands = [
        createStrand({ path: '/advanced', relationships: { prerequisites: ['/basics'] } }),
        createStrand({ path: '/basics' }),
      ]

      const connections = discoverConnections(strands)
      const prereqConnection = connections.find(c => c.type === 'prerequisites')

      expect(prereqConnection).toBeDefined()
      expect(prereqConnection?.source).toBe('/advanced')
      expect(prereqConnection?.target).toBe('/basics')
      expect(prereqConnection?.strength).toBe(1.0)
    })
  })

  describe('see also', () => {
    it('discovers see-also relationships', () => {
      const strands = [
        createStrand({ path: '/a', relationships: { seeAlso: ['/b'] } }),
        createStrand({ path: '/b' }),
      ]

      const connections = discoverConnections(strands)
      const seeAlsoConnection = connections.find(c => c.type === 'seeAlso')

      expect(seeAlsoConnection).toBeDefined()
      expect(seeAlsoConnection?.strength).toBe(0.7)
    })
  })

  describe('backlinks', () => {
    it('discovers backlinks from content', () => {
      const strands = [
        createStrand({ path: '/a', content: 'Check out /b for more info.' }),
        createStrand({ path: '/b' }),
      ]

      const connections = discoverConnections(strands)
      const backlink = connections.find(c => c.type === 'backlink')

      expect(backlink).toBeDefined()
      expect(backlink?.source).toBe('/a')
      expect(backlink?.target).toBe('/b')
      expect(backlink?.strength).toBe(0.8)
    })

    it('handles bidirectional backlinks with deduplication', () => {
      const strands = [
        createStrand({ path: '/a', content: 'See /b' }),
        createStrand({ path: '/b', content: 'Related: /a' }),
      ]

      const connections = discoverConnections(strands)
      const backlinks = connections.filter(c => c.type === 'backlink')

      // Deduplication keeps only one connection per pair per type
      expect(backlinks.length).toBe(1)
    })
  })

  describe('deduplication', () => {
    it('does not create duplicate connections', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['shared'] }),
        createStrand({ path: '/b', tags: ['shared'] }),
      ]

      const connections = discoverConnections(strands)
      const tagConnections = connections.filter(c => c.type === 'sharedTags')

      expect(tagConnections.length).toBe(1)
    })

    it('deduplicates reverse connections', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['x'], loomSlug: 'same' }),
        createStrand({ path: '/b', tags: ['x'], loomSlug: 'same' }),
      ]

      const connections = discoverConnections(strands)

      // Each type should appear at most once per pair
      const byType = new Map<string, number>()
      for (const c of connections) {
        byType.set(c.type, (byType.get(c.type) || 0) + 1)
      }

      for (const count of byType.values()) {
        expect(count).toBe(1)
      }
    })
  })

  describe('sorting', () => {
    it('sorts connections by strength (strongest first)', () => {
      const strands = [
        createStrand({
          path: '/a',
          tags: ['tag'], // strength 0.33
          relationships: { prerequisites: ['/b'] }, // strength 1.0
        }),
        createStrand({ path: '/b', tags: ['tag'] }),
      ]

      const connections = discoverConnections(strands)

      expect(connections.length).toBeGreaterThan(1)
      for (let i = 1; i < connections.length; i++) {
        expect(connections[i - 1].strength).toBeGreaterThanOrEqual(connections[i].strength || 0)
      }
    })
  })

  describe('edge cases', () => {
    it('handles empty strand array', () => {
      const connections = discoverConnections([])
      expect(connections).toEqual([])
    })

    it('handles single strand', () => {
      const connections = discoverConnections([createStrand({ path: '/a' })])
      expect(connections).toEqual([])
    })

    it('handles strands with no shared properties', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['x'] }),
        createStrand({ path: '/b', tags: ['y'] }),
      ]

      const connections = discoverConnections(strands)
      expect(connections).toEqual([])
    })

    it('handles multiple strands', () => {
      const strands = [
        createStrand({ path: '/a', tags: ['shared'] }),
        createStrand({ path: '/b', tags: ['shared'] }),
        createStrand({ path: '/c', tags: ['shared'] }),
      ]

      const connections = discoverConnections(strands)
      // Should have connections between all pairs: a-b, a-c, b-c
      expect(connections.length).toBe(3)
    })
  })
})

// ============================================================================
// analyzeSharedTags
// ============================================================================

describe('analyzeSharedTags', () => {
  it('returns map of shared tags to strand paths', () => {
    const strands = [
      createStrand({ path: '/a', tags: ['javascript', 'react'] }),
      createStrand({ path: '/b', tags: ['javascript', 'vue'] }),
      createStrand({ path: '/c', tags: ['python'] }),
    ]

    const result = analyzeSharedTags(strands)

    expect(result.has('javascript')).toBe(true)
    expect(result.get('javascript')).toEqual(['/a', '/b'])
    expect(result.has('react')).toBe(false) // Only 1 strand has it
    expect(result.has('python')).toBe(false) // Only 1 strand has it
  })

  it('normalizes tags to lowercase', () => {
    const strands = [
      createStrand({ path: '/a', tags: ['JavaScript'] }),
      createStrand({ path: '/b', tags: ['javascript'] }),
    ]

    const result = analyzeSharedTags(strands)

    expect(result.has('javascript')).toBe(true)
    expect(result.get('javascript')?.length).toBe(2)
  })

  it('filters to only tags with 2+ strands', () => {
    const strands = [
      createStrand({ path: '/a', tags: ['unique'] }),
      createStrand({ path: '/b', tags: ['other'] }),
    ]

    const result = analyzeSharedTags(strands)

    expect(result.size).toBe(0)
  })

  it('handles strands without tags', () => {
    const strands = [
      createStrand({ path: '/a' }),
      createStrand({ path: '/b', tags: ['test'] }),
    ]

    const result = analyzeSharedTags(strands)

    expect(result.size).toBe(0)
  })

  it('handles empty strands array', () => {
    const result = analyzeSharedTags([])
    expect(result.size).toBe(0)
  })
})

// ============================================================================
// analyzeSharedTopics
// ============================================================================

describe('analyzeSharedTopics', () => {
  it('returns map of shared topics to strand paths', () => {
    const strands = [
      createStrand({ path: '/a', topics: ['ai', 'ml'] }),
      createStrand({ path: '/b', topics: ['ai', 'robotics'] }),
    ]

    const result = analyzeSharedTopics(strands)

    expect(result.has('ai')).toBe(true)
    expect(result.get('ai')).toEqual(['/a', '/b'])
  })

  it('includes subjects in topic analysis', () => {
    const strands = [
      createStrand({ path: '/a', subjects: ['mathematics'] }),
      createStrand({ path: '/b', subjects: ['mathematics'] }),
    ]

    const result = analyzeSharedTopics(strands)

    expect(result.has('mathematics')).toBe(true)
  })

  it('combines topics and subjects', () => {
    const strands = [
      createStrand({ path: '/a', topics: ['physics'] }),
      createStrand({ path: '/b', subjects: ['physics'] }),
    ]

    const result = analyzeSharedTopics(strands)

    expect(result.has('physics')).toBe(true)
    expect(result.get('physics')?.length).toBe(2)
  })

  it('normalizes topics to lowercase', () => {
    const strands = [
      createStrand({ path: '/a', topics: ['AI'] }),
      createStrand({ path: '/b', topics: ['ai'] }),
    ]

    const result = analyzeSharedTopics(strands)

    expect(result.has('ai')).toBe(true)
  })

  it('handles empty arrays', () => {
    const strands = [
      createStrand({ path: '/a', topics: [], subjects: [] }),
      createStrand({ path: '/b' }),
    ]

    const result = analyzeSharedTopics(strands)

    expect(result.size).toBe(0)
  })
})

// ============================================================================
// toCollectionConnections
// ============================================================================

describe('toCollectionConnections', () => {
  it('converts discovered connections to collection format', () => {
    const discovered: DiscoveredConnection[] = [
      {
        source: '/a',
        target: '/b',
        type: 'sharedTags',
        strength: 0.5,
        reason: 'Shared tags: javascript',
        sharedItems: ['javascript'],
      },
    ]

    const result = toCollectionConnections(discovered)

    expect(result.length).toBe(1)
    expect(result[0]).toEqual({
      source: '/a',
      target: '/b',
      type: 'sharedTags',
      discovered: true,
      strength: 0.5,
      label: 'Shared tags: javascript',
    })
  })

  it('converts multiple connections', () => {
    const discovered: DiscoveredConnection[] = [
      { source: '/a', target: '/b', type: 'sharedTags', strength: 0.5, reason: 'Tags' },
      { source: '/b', target: '/c', type: 'sameLoom', strength: 0.6, reason: 'Loom' },
    ]

    const result = toCollectionConnections(discovered)

    expect(result.length).toBe(2)
    expect(result[0].discovered).toBe(true)
    expect(result[1].discovered).toBe(true)
  })

  it('handles empty array', () => {
    const result = toCollectionConnections([])
    expect(result).toEqual([])
  })

  it('uses reason as label', () => {
    const discovered: DiscoveredConnection[] = [
      { source: '/a', target: '/b', type: 'references', strength: 0.9, reason: 'Custom reason' },
    ]

    const result = toCollectionConnections(discovered)

    expect(result[0].label).toBe('Custom reason')
  })
})
