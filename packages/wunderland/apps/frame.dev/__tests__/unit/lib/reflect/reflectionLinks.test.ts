/**
 * Reflection Links Tests
 * @module __tests__/unit/lib/reflect/reflectionLinks.test
 *
 * Tests for bidirectional link detection between reflections and strands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectLinks,
  type ReflectionLink,
  type DetectedLink,
  type Backlink,
  type LinkSourceType,
  type LinkTargetType,
} from '@/lib/reflect/reflectionLinks'

// Mock codexDatabase
vi.mock('@/lib/codexDatabase', () => ({
  getDatabase: vi.fn(() => null),
}))

describe('Reflection Links', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Type Validation
  // ============================================================================

  describe('ReflectionLink type', () => {
    it('can create valid link', () => {
      const link: ReflectionLink = {
        id: 'link-1',
        sourceType: 'reflection',
        sourceId: '2025-01-15',
        targetType: 'strand',
        targetId: 'weaves/wiki/strands/test.md',
        linkText: 'test document',
        context: '...see [[test document]] for more...',
        createdAt: '2025-01-15T12:00:00Z',
      }

      expect(link.id).toBe('link-1')
      expect(link.sourceType).toBe('reflection')
      expect(link.targetType).toBe('strand')
    })

    it('can create link without optional fields', () => {
      const link: ReflectionLink = {
        id: 'link-2',
        sourceType: 'strand',
        sourceId: 'weaves/wiki/strands/doc.md',
        targetType: 'reflection',
        targetId: '2025-01-14',
        createdAt: '2025-01-15T12:00:00Z',
      }

      expect(link.linkText).toBeUndefined()
      expect(link.context).toBeUndefined()
    })

    it('supports all source types', () => {
      const sourceTypes: LinkSourceType[] = ['reflection', 'strand']
      sourceTypes.forEach((type) => {
        const link: ReflectionLink = {
          id: 'test',
          sourceType: type,
          sourceId: 'test-id',
          targetType: 'reflection',
          targetId: '2025-01-15',
          createdAt: new Date().toISOString(),
        }
        expect(link.sourceType).toBe(type)
      })
    })

    it('supports all target types', () => {
      const targetTypes: LinkTargetType[] = ['reflection', 'strand']
      targetTypes.forEach((type) => {
        const link: ReflectionLink = {
          id: 'test',
          sourceType: 'reflection',
          sourceId: '2025-01-15',
          targetType: type,
          targetId: 'test-id',
          createdAt: new Date().toISOString(),
        }
        expect(link.targetType).toBe(type)
      })
    })
  })

  describe('DetectedLink type', () => {
    it('can create reflection link', () => {
      const link: DetectedLink = {
        type: 'reflection',
        targetId: '2025-01-14',
        text: 'yesterday',
        context: 'As I mentioned yesterday...',
        startIndex: 20,
        endIndex: 29,
      }

      expect(link.type).toBe('reflection')
      expect(link.targetId).toBe('2025-01-14')
    })

    it('can create strand link', () => {
      const link: DetectedLink = {
        type: 'strand',
        targetId: 'my-notes',
        text: 'my notes',
        context: 'See [[my notes]] for details',
        startIndex: 4,
        endIndex: 18,
      }

      expect(link.type).toBe('strand')
    })

    it('can create person link', () => {
      const link: DetectedLink = {
        type: 'person',
        targetId: 'johndoe',
        text: '@johndoe',
        context: 'Discussed with @johndoe',
        startIndex: 15,
        endIndex: 23,
      }

      expect(link.type).toBe('person')
    })
  })

  describe('Backlink type', () => {
    it('can create valid backlink', () => {
      const backlink: Backlink = {
        sourceType: 'reflection',
        sourceId: '2025-01-15',
        sourceTitle: 'January 15 Reflection',
        linkText: 'project',
        context: '...working on [[project]]...',
        createdAt: '2025-01-15T12:00:00Z',
      }

      expect(backlink.sourceType).toBe('reflection')
      expect(backlink.sourceTitle).toBeDefined()
    })
  })

  // ============================================================================
  // detectLinks - Date References
  // ============================================================================

  describe('detectLinks - date references', () => {
    it('detects "today" reference', () => {
      const links = detectLinks('I worked on this today.')
      const todayLink = links.find((l) => l.type === 'reflection')

      expect(todayLink).toBeDefined()
      expect(todayLink?.targetId).toBe('2025-01-15')
      expect(todayLink?.text.toLowerCase()).toBe('today')
    })

    it('detects "yesterday" reference', () => {
      const links = detectLinks('As mentioned yesterday, the project is on track.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2025-01-14')
    })

    it('detects "tomorrow" reference', () => {
      const links = detectLinks('Will continue tomorrow.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2025-01-16')
    })

    it('detects "last week" reference', () => {
      const links = detectLinks('Last week was productive.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2025-01-08')
    })

    it('detects "last Monday" reference', () => {
      const links = detectLinks('Met with team last Monday.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      // Last Monday before 2025-01-15 (Wednesday) is 2025-01-13
      expect(link?.targetId).toBe('2025-01-13')
    })

    it('detects explicit date "December 25, 2024"', () => {
      const links = detectLinks('Celebrated on December 25, 2024')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2024-12-25')
    })

    it('detects short month "Jan 10"', () => {
      const links = detectLinks('Started on Jan 10.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2025-01-10')
    })

    it('detects ISO date "2024-12-25"', () => {
      const links = detectLinks('Entry from 2024-12-25.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('2024-12-25')
    })

    it('detects date with ordinal "March 3rd"', () => {
      const links = detectLinks('Due on March 3rd.')
      const link = links.find((l) => l.type === 'reflection')

      expect(link).toBeDefined()
    })

    it('deduplicates same date references', () => {
      const links = detectLinks('Today I worked. Also today I rested.')
      const todayLinks = links.filter(
        (l) => l.type === 'reflection' && l.targetId === '2025-01-15'
      )

      expect(todayLinks.length).toBe(1)
    })
  })

  // ============================================================================
  // detectLinks - Wiki Links
  // ============================================================================

  describe('detectLinks - wiki links', () => {
    it('detects [[simple link]]', () => {
      const links = detectLinks('See [[my-notes]] for details.')
      const link = links.find((l) => l.type === 'strand')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('my-notes')
      expect(link?.text).toBe('my-notes')
    })

    it('detects [[link|display text]]', () => {
      const links = detectLinks('Check [[path/to/doc|the documentation]].')
      const link = links.find((l) => l.type === 'strand')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('path/to/doc')
      expect(link?.text).toBe('the documentation')
    })

    it('detects multiple wiki links', () => {
      const links = detectLinks('See [[doc1]] and [[doc2]] for more.')
      const strandLinks = links.filter((l) => l.type === 'strand')

      expect(strandLinks.length).toBe(2)
      expect(strandLinks.map((l) => l.targetId)).toContain('doc1')
      expect(strandLinks.map((l) => l.targetId)).toContain('doc2')
    })

    it('handles link with spaces', () => {
      const links = detectLinks('See [[My Document Title]] for info.')
      const link = links.find((l) => l.type === 'strand')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('My Document Title')
    })

    it('deduplicates same strand references', () => {
      const links = detectLinks('See [[doc]] and also [[doc]] again.')
      const strandLinks = links.filter((l) => l.type === 'strand')

      expect(strandLinks.length).toBe(1)
    })
  })

  // ============================================================================
  // detectLinks - Person Mentions
  // ============================================================================

  describe('detectLinks - person mentions', () => {
    it('detects @handle', () => {
      const links = detectLinks('Talked to @johndoe about the project.')
      const link = links.find((l) => l.type === 'person')

      expect(link).toBeDefined()
      expect(link?.targetId).toBe('johndoe')
      expect(link?.text).toBe('@johndoe')
    })

    it('detects multiple @handles', () => {
      const links = detectLinks('Met with @alice and @bob.')
      const personLinks = links.filter((l) => l.type === 'person')

      expect(personLinks.length).toBe(2)
      expect(personLinks.map((l) => l.targetId)).toContain('alice')
      expect(personLinks.map((l) => l.targetId)).toContain('bob')
    })

    it('deduplicates same person references', () => {
      const links = detectLinks('@john mentioned @john earlier.')
      const personLinks = links.filter((l) => l.type === 'person')

      expect(personLinks.length).toBe(1)
    })
  })

  // ============================================================================
  // detectLinks - Context
  // ============================================================================

  describe('detectLinks - context extraction', () => {
    it('extracts surrounding context', () => {
      const links = detectLinks('Before the link [[important doc]] after the link.')
      const link = links.find((l) => l.type === 'strand')

      expect(link?.context).toBeDefined()
      expect(link?.context).toContain('Before')
      expect(link?.context).toContain('after')
    })

    it('includes ellipsis for truncated context', () => {
      const longText =
        'A'.repeat(100) + ' [[doc]] ' + 'B'.repeat(100)
      const links = detectLinks(longText)
      const link = links.find((l) => l.type === 'strand')

      expect(link?.context).toContain('...')
    })

    it('tracks start and end indices', () => {
      const text = 'See [[doc]] here.'
      const links = detectLinks(text)
      const link = links.find((l) => l.type === 'strand')

      expect(link?.startIndex).toBe(4)
      expect(link?.endIndex).toBe(11)
    })
  })

  // ============================================================================
  // detectLinks - Mixed Content
  // ============================================================================

  describe('detectLinks - mixed content', () => {
    it('detects all link types in one text', () => {
      const text =
        'Yesterday @alice shared [[project-plan]] and we discussed it today.'
      const links = detectLinks(text)

      const dateLinks = links.filter((l) => l.type === 'reflection')
      const strandLinks = links.filter((l) => l.type === 'strand')
      const personLinks = links.filter((l) => l.type === 'person')

      expect(dateLinks.length).toBeGreaterThan(0)
      expect(strandLinks.length).toBe(1)
      expect(personLinks.length).toBe(1)
    })

    it('returns links sorted by position', () => {
      const text = '@bob [[doc]] yesterday'
      const links = detectLinks(text)

      for (let i = 1; i < links.length; i++) {
        expect(links[i].startIndex).toBeGreaterThanOrEqual(links[i - 1].startIndex)
      }
    })

    it('returns empty array for no links', () => {
      const links = detectLinks('Just plain text with no links.')
      expect(links.length).toBe(0)
    })
  })

  // ============================================================================
  // Database Operations (SSR Safety)
  // ============================================================================

  describe('database operations - SSR safety', () => {
    it('initReflectionLinksSchema handles no database', async () => {
      const { initReflectionLinksSchema } = await import('@/lib/reflect/reflectionLinks')
      await expect(initReflectionLinksSchema()).resolves.not.toThrow()
    })

    it('saveLink handles no database', async () => {
      const { saveLink } = await import('@/lib/reflect/reflectionLinks')
      const link: ReflectionLink = {
        id: 'test',
        sourceType: 'reflection',
        sourceId: '2025-01-15',
        targetType: 'strand',
        targetId: 'test',
        createdAt: new Date().toISOString(),
      }
      await expect(saveLink(link)).resolves.not.toThrow()
    })

    it('deleteLinksFromSource handles no database', async () => {
      const { deleteLinksFromSource } = await import('@/lib/reflect/reflectionLinks')
      await expect(deleteLinksFromSource('reflection', '2025-01-15')).resolves.not.toThrow()
    })

    it('getLinksFromSource returns empty when no database', async () => {
      const { getLinksFromSource } = await import('@/lib/reflect/reflectionLinks')
      const result = await getLinksFromSource('reflection', '2025-01-15')
      expect(result).toEqual([])
    })

    it('getBacklinks returns empty when no database', async () => {
      const { getBacklinks } = await import('@/lib/reflect/reflectionLinks')
      const result = await getBacklinks('strand', 'test.md')
      expect(result).toEqual([])
    })

    it('updateReflectionLinks handles no database', async () => {
      const { updateReflectionLinks } = await import('@/lib/reflect/reflectionLinks')
      const result = await updateReflectionLinks('2025-01-15', 'See [[test]]')

      // Should still detect links even without database
      expect(result.length).toBeGreaterThan(0)
    })

    it('updateStrandLinks handles no database', async () => {
      const { updateStrandLinks } = await import('@/lib/reflect/reflectionLinks')
      const result = await updateStrandLinks('weaves/test.md', 'Mentioned yesterday')

      expect(result.length).toBeGreaterThan(0)
    })
  })
})
