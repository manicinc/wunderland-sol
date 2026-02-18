/**
 * Collections Index Tests
 * @module __tests__/unit/lib/collections/index.test
 *
 * Tests for collections module exports.
 */

import { describe, it, expect } from 'vitest'
import * as collections from '@/lib/collections'

describe('Collections Module', () => {
  describe('exports', () => {
    it('exports discoverConnections function', () => {
      expect(collections.discoverConnections).toBeDefined()
      expect(typeof collections.discoverConnections).toBe('function')
    })

    it('exports analyzeSharedTags function', () => {
      expect(collections.analyzeSharedTags).toBeDefined()
      expect(typeof collections.analyzeSharedTags).toBe('function')
    })

    it('exports analyzeSharedTopics function', () => {
      expect(collections.analyzeSharedTopics).toBeDefined()
      expect(typeof collections.analyzeSharedTopics).toBe('function')
    })

    it('exports useCollections hook', () => {
      expect(collections.useCollections).toBeDefined()
      expect(typeof collections.useCollections).toBe('function')
    })
  })

  describe('analyzeSharedTags', () => {
    it('returns empty map for empty strands', () => {
      const result = collections.analyzeSharedTags([])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('returns map with tags when strands have tags', () => {
      const strands = [
        { path: 'a.md', tags: ['tag1', 'tag2'] },
        { path: 'b.md', tags: ['tag2', 'tag3'] },
      ]
      const result = collections.analyzeSharedTags(strands)
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBeGreaterThan(0)
    })

    it('groups strands by shared tags', () => {
      const strands = [
        { path: 'a.md', tags: ['shared'] },
        { path: 'b.md', tags: ['shared'] },
        { path: 'c.md', tags: ['other'] },
      ]
      const result = collections.analyzeSharedTags(strands)
      expect(result.get('shared')).toContain('a.md')
      expect(result.get('shared')).toContain('b.md')
    })

    it('normalizes tag case', () => {
      const strands = [
        { path: 'a.md', tags: ['Tag'] },
        { path: 'b.md', tags: ['TAG'] },
      ]
      const result = collections.analyzeSharedTags(strands)
      expect(result.get('tag')?.length).toBe(2)
    })
  })

  describe('analyzeSharedTopics', () => {
    it('returns empty map for empty strands', () => {
      const result = collections.analyzeSharedTopics([])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('returns map with topics when strands have topics', () => {
      const strands = [
        { path: 'a.md', topics: ['topic1', 'topic2'] },
        { path: 'b.md', topics: ['topic2', 'topic3'] },
      ]
      const result = collections.analyzeSharedTopics(strands)
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBeGreaterThan(0)
    })

    it('groups strands by shared topics', () => {
      const strands = [
        { path: 'a.md', topics: ['shared'] },
        { path: 'b.md', topics: ['shared'] },
      ]
      const result = collections.analyzeSharedTopics(strands)
      expect(result.get('shared')).toContain('a.md')
      expect(result.get('shared')).toContain('b.md')
    })
  })

  describe('discoverConnections', () => {
    it('returns empty array for empty strands', () => {
      const result = collections.discoverConnections([])
      expect(result).toEqual([])
    })

    it('returns array of connections', () => {
      const strands = [
        { path: 'a.md', tags: ['shared'] },
        { path: 'b.md', tags: ['shared'] },
      ]
      const result = collections.discoverConnections(strands)
      expect(Array.isArray(result)).toBe(true)
    })

    it('discovers connections based on shared tags', () => {
      const strands = [
        { path: 'a.md', tags: ['test'] },
        { path: 'b.md', tags: ['test'] },
      ]
      const result = collections.discoverConnections(strands)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('sharedTags')
    })

    it('discovers connections based on shared topics', () => {
      const strands = [
        { path: 'a.md', topics: ['topic'] },
        { path: 'b.md', topics: ['topic'] },
      ]
      const result = collections.discoverConnections(strands)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('sharedTopics')
    })

    it('does not create duplicate connections', () => {
      const strands = [
        { path: 'a.md', tags: ['tag1', 'tag2'], topics: ['topic1'] },
        { path: 'b.md', tags: ['tag1', 'tag2'], topics: ['topic1'] },
      ]
      const result = collections.discoverConnections(strands)
      const keys = result.map(c => `${c.source}|${c.target}|${c.type}`)
      const uniqueKeys = new Set(keys)
      expect(keys.length).toBe(uniqueKeys.size)
    })
  })
})
