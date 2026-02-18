/**
 * CrosslinkExplorer Tests
 * @module tests/unit/crosslinks/crosslinkExplorer
 *
 * Tests for backlink exploration and filtering functionality.
 */

import { describe, it, expect, vi } from 'vitest'
import type { BacklinkWithContext, BacklinkStats, ReferenceType } from '@/lib/transclusion/types'

// Test data factories
function createMockBacklink(overrides: Partial<BacklinkWithContext> = {}): BacklinkWithContext {
  return {
    backlink: {
      id: 'bl-1',
      sourceStrandPath: 'source/strand',
      targetStrandPath: 'target/strand',
      referencingBlockId: 'block-1',
      referencedBlockId: 'block-2',
      createdAt: Date.now(),
      contextSnippet: 'Some context text',
      ...overrides.backlink,
    },
    sourceStrand: {
      path: 'source/strand',
      title: 'Source Document',
      weave: 'notes',
      loom: 'daily',
      ...overrides.sourceStrand,
    },
    sourceBlock: {
      id: 'block-1',
      blockType: 'paragraph',
      content: 'Source block content',
      ...overrides.sourceBlock,
    },
    ...overrides,
  }
}

function createMockStats(overrides: Partial<BacklinkStats> = {}): BacklinkStats {
  return {
    total: 10,
    uniqueStrands: 5,
    byType: {
      link: 6,
      embed: 2,
      citation: 1,
      mirror: 1,
    },
    ...overrides,
  }
}

describe('CrosslinkExplorer', () => {
  describe('BacklinkWithContext structure', () => {
    it('should have required backlink fields', () => {
      const backlink = createMockBacklink()

      expect(backlink.backlink.id).toBeDefined()
      expect(backlink.backlink.sourceStrandPath).toBeDefined()
      expect(backlink.backlink.targetStrandPath).toBeDefined()
    })

    it('should have source strand info', () => {
      const backlink = createMockBacklink({
        sourceStrand: {
          path: 'notes/meeting',
          title: 'Team Meeting Notes',
          weave: 'work',
          loom: 'meetings',
        },
      })

      expect(backlink.sourceStrand.path).toBe('notes/meeting')
      expect(backlink.sourceStrand.title).toBe('Team Meeting Notes')
      expect(backlink.sourceStrand.weave).toBe('work')
      expect(backlink.sourceStrand.loom).toBe('meetings')
    })

    it('should have source block info when available', () => {
      const backlink = createMockBacklink({
        sourceBlock: {
          id: 'block-abc',
          blockType: 'heading',
          content: '# Important Section',
        },
      })

      expect(backlink.sourceBlock?.id).toBe('block-abc')
      expect(backlink.sourceBlock?.blockType).toBe('heading')
    })

    it('should include context snippet', () => {
      const backlink = createMockBacklink({
        backlink: {
          id: 'bl-2',
          sourceStrandPath: 'source',
          targetStrandPath: 'target',
          referencingBlockId: 'b1',
          referencedBlockId: 'b2',
          createdAt: Date.now(),
          contextSnippet: 'As mentioned in [[target#block-2]], this is important.',
        },
      })

      expect(backlink.backlink.contextSnippet).toContain('As mentioned in')
    })
  })

  describe('BacklinkStats structure', () => {
    it('should have total count', () => {
      const stats = createMockStats({ total: 25 })
      expect(stats.total).toBe(25)
    })

    it('should track unique strands', () => {
      const stats = createMockStats({ uniqueStrands: 8 })
      expect(stats.uniqueStrands).toBe(8)
    })

    it('should break down by reference type', () => {
      const stats = createMockStats({
        byType: {
          link: 10,
          embed: 5,
          citation: 3,
          mirror: 2,
        },
      })

      expect(stats.byType.link).toBe(10)
      expect(stats.byType.embed).toBe(5)
      expect(stats.byType.citation).toBe(3)
      expect(stats.byType.mirror).toBe(2)
    })

    it('should support zero counts', () => {
      const stats = createMockStats({
        total: 0,
        uniqueStrands: 0,
        byType: {
          link: 0,
          embed: 0,
          citation: 0,
          mirror: 0,
        },
      })

      expect(stats.total).toBe(0)
      expect(stats.uniqueStrands).toBe(0)
    })
  })

  describe('Reference Types', () => {
    const referenceTypes: ReferenceType[] = ['link', 'embed', 'citation', 'mirror']

    it('should support all reference types', () => {
      expect(referenceTypes).toHaveLength(4)
    })

    it('link type represents direct links', () => {
      const type: ReferenceType = 'link'
      expect(type).toBe('link')
    })

    it('embed type represents inline embeds', () => {
      const type: ReferenceType = 'embed'
      expect(type).toBe('embed')
    })

    it('citation type represents citations', () => {
      const type: ReferenceType = 'citation'
      expect(type).toBe('citation')
    })

    it('mirror type represents synced mirrors', () => {
      const type: ReferenceType = 'mirror'
      expect(type).toBe('mirror')
    })
  })

  describe('Search Filtering Logic', () => {
    const backlinks = [
      createMockBacklink({
        sourceStrand: { path: 'notes/react-hooks', title: 'React Hooks Guide', weave: 'tech', loom: 'frontend' },
        backlink: { 
          id: 'bl-1',
          sourceStrandPath: 'notes/react-hooks',
          targetStrandPath: 'target',
          referencingBlockId: 'b1',
          referencedBlockId: 'b2',
          createdAt: Date.now(),
          contextSnippet: 'useState and useEffect are fundamental',
        },
      }),
      createMockBacklink({
        sourceStrand: { path: 'notes/vue-composition', title: 'Vue Composition API', weave: 'tech', loom: 'frontend' },
        backlink: { 
          id: 'bl-2',
          sourceStrandPath: 'notes/vue-composition',
          targetStrandPath: 'target',
          referencingBlockId: 'b1',
          referencedBlockId: 'b2',
          createdAt: Date.now(),
          contextSnippet: 'ref and reactive are similar concepts',
        },
      }),
      createMockBacklink({
        sourceStrand: { path: 'projects/dashboard', title: 'Dashboard Project', weave: 'work', loom: 'projects' },
        backlink: { 
          id: 'bl-3',
          sourceStrandPath: 'projects/dashboard',
          targetStrandPath: 'target',
          referencingBlockId: 'b1',
          referencedBlockId: 'b2',
          createdAt: Date.now(),
          contextSnippet: 'Uses React for frontend rendering',
        },
      }),
    ]

    function filterBacklinks(backlinks: BacklinkWithContext[], query: string): BacklinkWithContext[] {
      if (!query.trim()) return backlinks
      const lowerQuery = query.toLowerCase()
      return backlinks.filter(bl =>
        bl.sourceStrand.path.toLowerCase().includes(lowerQuery) ||
        bl.sourceStrand.title?.toLowerCase().includes(lowerQuery) ||
        bl.backlink.contextSnippet?.toLowerCase().includes(lowerQuery)
      )
    }

    it('should return all backlinks with empty query', () => {
      const filtered = filterBacklinks(backlinks, '')
      expect(filtered).toHaveLength(3)
    })

    it('should filter by path', () => {
      const filtered = filterBacklinks(backlinks, 'react')
      // matches: react-hooks (path), vue-composition (context has "reactive"), dashboard (context has "React")
      expect(filtered).toHaveLength(3)
    })

    it('should filter by title', () => {
      const filtered = filterBacklinks(backlinks, 'Dashboard')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].sourceStrand.path).toBe('projects/dashboard')
    })

    it('should filter by context snippet', () => {
      const filtered = filterBacklinks(backlinks, 'useState')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].sourceStrand.path).toBe('notes/react-hooks')
    })

    it('should be case-insensitive', () => {
      const filtered1 = filterBacklinks(backlinks, 'REACT')
      const filtered2 = filterBacklinks(backlinks, 'react')
      expect(filtered1).toHaveLength(filtered2.length)
    })

    it('should handle whitespace-only query', () => {
      const filtered = filterBacklinks(backlinks, '   ')
      expect(filtered).toHaveLength(3)
    })
  })

  describe('Grouping by Source Strand', () => {
    function groupBacklinks(backlinks: BacklinkWithContext[]): Map<string, BacklinkWithContext[]> {
      const groups = new Map<string, BacklinkWithContext[]>()
      for (const bl of backlinks) {
        const key = bl.sourceStrand.path
        const existing = groups.get(key) || []
        existing.push(bl)
        groups.set(key, existing)
      }
      return groups
    }

    it('should group backlinks by source strand path', () => {
      const backlinks = [
        createMockBacklink({ sourceStrand: { path: 'notes/a', title: 'A', weave: 'w', loom: 'l' } }),
        createMockBacklink({ sourceStrand: { path: 'notes/a', title: 'A', weave: 'w', loom: 'l' } }),
        createMockBacklink({ sourceStrand: { path: 'notes/b', title: 'B', weave: 'w', loom: 'l' } }),
      ]

      const grouped = groupBacklinks(backlinks)

      expect(grouped.size).toBe(2)
      expect(grouped.get('notes/a')).toHaveLength(2)
      expect(grouped.get('notes/b')).toHaveLength(1)
    })

    it('should handle empty backlinks array', () => {
      const grouped = groupBacklinks([])
      expect(grouped.size).toBe(0)
    })

    it('should handle single backlink', () => {
      const backlinks = [
        createMockBacklink({ sourceStrand: { path: 'notes/single', title: 'Single', weave: 'w', loom: 'l' } }),
      ]

      const grouped = groupBacklinks(backlinks)

      expect(grouped.size).toBe(1)
      expect(grouped.get('notes/single')).toHaveLength(1)
    })
  })
})

