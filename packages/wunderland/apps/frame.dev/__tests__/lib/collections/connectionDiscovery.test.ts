/**
 * Tests for connectionDiscovery module
 * @module __tests__/lib/collections/connectionDiscovery
 */

import { describe, it, expect } from 'vitest'
import {
  discoverConnections,
  analyzeSharedTags,
  analyzeSharedTopics,
  type StrandForDiscovery,
} from '@/lib/collections/connectionDiscovery'

describe('connectionDiscovery', () => {
  describe('discoverConnections', () => {
    it('should discover shared tags connections', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['react', 'typescript'] },
        { path: 'b.md', tags: ['react', 'javascript'] },
        { path: 'c.md', tags: ['python'] },
      ]

      const connections = discoverConnections(strands)

      // Should find connection between a.md and b.md (shared 'react' tag)
      const reactConnection = connections.find(
        (c) => c.type === 'sharedTags' &&
          ((c.source === 'a.md' && c.target === 'b.md') ||
           (c.source === 'b.md' && c.target === 'a.md'))
      )

      expect(reactConnection).toBeDefined()
      expect(reactConnection?.sharedItems).toContain('react')
    })

    it('should discover shared topics connections', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', topics: ['machine-learning', 'ai'] },
        { path: 'b.md', topics: ['machine-learning', 'data-science'] },
      ]

      const connections = discoverConnections(strands)

      const mlConnection = connections.find((c) => c.type === 'sharedTopics')

      expect(mlConnection).toBeDefined()
      expect(mlConnection?.sharedItems).toContain('machine-learning')
    })

    it('should discover same loom connections', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', loomSlug: 'react-basics', weaveSlug: 'technology' },
        { path: 'b.md', loomSlug: 'react-basics', weaveSlug: 'technology' },
      ]

      const connections = discoverConnections(strands)

      const loomConnection = connections.find((c) => c.type === 'sameLoom')

      expect(loomConnection).toBeDefined()
      expect(loomConnection?.strength).toBe(0.6)
    })

    it('should discover same weave connections (different looms)', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', loomSlug: 'react-basics', weaveSlug: 'technology' },
        { path: 'b.md', loomSlug: 'typescript-basics', weaveSlug: 'technology' },
      ]

      const connections = discoverConnections(strands)

      const weaveConnection = connections.find((c) => c.type === 'sameWeave')

      expect(weaveConnection).toBeDefined()
      expect(weaveConnection?.strength).toBe(0.3)
    })

    it('should discover explicit references', () => {
      const strands: StrandForDiscovery[] = [
        {
          path: 'a.md',
          relationships: { references: ['b.md'] },
        },
        { path: 'b.md' },
      ]

      const connections = discoverConnections(strands)

      const refConnection = connections.find((c) => c.type === 'references')

      expect(refConnection).toBeDefined()
      expect(refConnection?.strength).toBe(0.9)
      expect(refConnection?.source).toBe('a.md')
      expect(refConnection?.target).toBe('b.md')
    })

    it('should discover prerequisite relationships', () => {
      const strands: StrandForDiscovery[] = [
        {
          path: 'advanced.md',
          relationships: { prerequisites: ['basics.md'] },
        },
        { path: 'basics.md' },
      ]

      const connections = discoverConnections(strands)

      const prereqConnection = connections.find((c) => c.type === 'prerequisites')

      expect(prereqConnection).toBeDefined()
      expect(prereqConnection?.strength).toBe(1.0)
    })

    it('should discover seeAlso relationships', () => {
      const strands: StrandForDiscovery[] = [
        {
          path: 'a.md',
          relationships: { seeAlso: ['related.md'] },
        },
        { path: 'related.md' },
      ]

      const connections = discoverConnections(strands)

      const seeAlsoConnection = connections.find((c) => c.type === 'seeAlso')

      expect(seeAlsoConnection).toBeDefined()
      expect(seeAlsoConnection?.strength).toBe(0.7)
    })

    it('should discover backlinks in content', () => {
      const strands: StrandForDiscovery[] = [
        {
          path: 'a.md',
          content: 'See also b.md for more details',
        },
        { path: 'b.md' },
      ]

      const connections = discoverConnections(strands)

      const backlinkConnection = connections.find((c) => c.type === 'backlink')

      expect(backlinkConnection).toBeDefined()
      expect(backlinkConnection?.strength).toBe(0.8)
    })

    it('should not create duplicate connections', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['react'] },
        { path: 'b.md', tags: ['react'] },
      ]

      const connections = discoverConnections(strands)

      // Should only have one sharedTags connection, not two
      const tagConnections = connections.filter((c) => c.type === 'sharedTags')
      expect(tagConnections).toHaveLength(1)
    })

    it('should sort connections by strength (strongest first)', () => {
      const strands: StrandForDiscovery[] = [
        {
          path: 'a.md',
          tags: ['react'],
          relationships: { prerequisites: ['b.md'] },
        },
        { path: 'b.md', tags: ['react'] },
      ]

      const connections = discoverConnections(strands)

      // Prerequisites (1.0) should come before sharedTags (0.33)
      expect(connections[0].type).toBe('prerequisites')
    })

    it('should return empty array for single strand', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['react'] },
      ]

      const connections = discoverConnections(strands)

      expect(connections).toHaveLength(0)
    })

    it('should return empty array for strands with no connections', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['react'] },
        { path: 'b.md', tags: ['python'] },
      ]

      const connections = discoverConnections(strands)

      expect(connections).toHaveLength(0)
    })
  })

  describe('analyzeSharedTags', () => {
    it('should find tags shared by 2+ strands', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['react', 'typescript'] },
        { path: 'b.md', tags: ['react', 'javascript'] },
        { path: 'c.md', tags: ['typescript', 'node'] },
      ]

      const sharedTags = analyzeSharedTags(strands)

      expect(sharedTags.has('react')).toBe(true)
      expect(sharedTags.get('react')).toContain('a.md')
      expect(sharedTags.get('react')).toContain('b.md')

      expect(sharedTags.has('typescript')).toBe(true)
      expect(sharedTags.get('typescript')).toContain('a.md')
      expect(sharedTags.get('typescript')).toContain('c.md')
    })

    it('should not include tags used by only one strand', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['unique-tag'] },
        { path: 'b.md', tags: ['another-tag'] },
      ]

      const sharedTags = analyzeSharedTags(strands)

      expect(sharedTags.size).toBe(0)
    })

    it('should handle case-insensitive tag matching', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['React'] },
        { path: 'b.md', tags: ['react'] },
      ]

      const sharedTags = analyzeSharedTags(strands)

      expect(sharedTags.has('react')).toBe(true)
    })

    it('should handle strands without tags', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md' },
        { path: 'b.md', tags: ['react'] },
      ]

      const sharedTags = analyzeSharedTags(strands)

      expect(sharedTags.size).toBe(0)
    })
  })

  describe('analyzeSharedTopics', () => {
    it('should combine topics and subjects', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', topics: ['machine-learning'], subjects: ['ai'] },
        { path: 'b.md', topics: ['machine-learning'], subjects: ['data-science'] },
      ]

      const sharedTopics = analyzeSharedTopics(strands)

      expect(sharedTopics.has('machine-learning')).toBe(true)
    })

    it('should find shared subjects', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', subjects: ['technology'] },
        { path: 'b.md', subjects: ['technology'] },
      ]

      const sharedTopics = analyzeSharedTopics(strands)

      expect(sharedTopics.has('technology')).toBe(true)
      expect(sharedTopics.get('technology')).toHaveLength(2)
    })

    it('should handle case-insensitive matching', () => {
      const strands: StrandForDiscovery[] = [
        { path: 'a.md', topics: ['AI'] },
        { path: 'b.md', topics: ['ai'] },
      ]

      const sharedTopics = analyzeSharedTopics(strands)

      expect(sharedTopics.has('ai')).toBe(true)
    })
  })

  describe('connection strength calculations', () => {
    it('should calculate tag strength based on count', () => {
      // 1 shared tag = 0.33, 2 = 0.66, 3+ = 1.0
      const strands1: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['a'] },
        { path: 'b.md', tags: ['a'] },
      ]

      const connections1 = discoverConnections(strands1)
      expect(connections1[0]?.strength).toBeCloseTo(0.33, 1)

      const strands3: StrandForDiscovery[] = [
        { path: 'a.md', tags: ['a', 'b', 'c', 'd'] },
        { path: 'b.md', tags: ['a', 'b', 'c', 'd'] },
      ]

      const connections3 = discoverConnections(strands3)
      expect(connections3[0]?.strength).toBe(1)
    })
  })
})
