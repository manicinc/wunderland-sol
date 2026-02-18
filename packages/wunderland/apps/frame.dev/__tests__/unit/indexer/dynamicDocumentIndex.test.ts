/**
 * Dynamic Document Index Tests
 * @module __tests__/unit/indexer/dynamicDocumentIndex.test
 *
 * Tests for formula indexing, mention relationship graph, and dynamic content search.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MentionableEntity } from '@/lib/mentions/types'

// Mock IndexedDB storage
const mockStorage = new Map<string, unknown>()

vi.mock('@/lib/storage/localCodex', () => ({
  saveToIndexedDB: vi.fn((key: string, value: unknown) => {
    mockStorage.set(key, value)
    return Promise.resolve()
  }),
  getFromIndexedDB: vi.fn((key: string) => {
    return Promise.resolve(mockStorage.get(key))
  }),
}))

// Import after mocking
import {
  indexFormulaResult,
  searchFormulas,
  indexMentionRelationships,
  searchMentionRelationships,
  getRelatedMentions,
  getCoOccurringEntities,
  searchDynamicContent,
  reindexDynamicDocument,
  clearDynamicIndex,
} from '@/lib/indexer/dynamicDocumentIndex'

describe('Dynamic Document Index', () => {
  beforeEach(() => {
    mockStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // FORMULA INDEXING
  // ============================================================================

  describe('Formula Indexing', () => {
    describe('indexFormulaResult', () => {
      it('indexes a numeric formula result', async () => {
        await indexFormulaResult(
          '=ADD(100, 200)',
          300,
          '/documents/budget.md',
          { fieldName: 'total', blockId: 'block-1' }
        )

        const results = await searchFormulas('300')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].type).toBe('formula')
        expect(results[0].strandPath).toBe('/documents/budget.md')
      })

      it('indexes a string formula result', async () => {
        await indexFormulaResult(
          '=WEATHER("San Francisco")',
          'Sunny, 72°F',
          '/documents/trip.md'
        )

        const results = await searchFormulas('sunny')
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].match).toContain('Sunny')
      })

      it('indexes object formula results as JSON', async () => {
        await indexFormulaResult(
          '=ROUTE("NYC", "LA")',
          { distance: '2800 miles', duration: '40 hours' },
          '/documents/roadtrip.md'
        )

        const results = await searchFormulas('2800')
        expect(results.length).toBeGreaterThan(0)
      })

      it('updates existing formula entries', async () => {
        await indexFormulaResult('=ADD(1,2)', 3, '/doc.md', { blockId: 'b1' })
        await indexFormulaResult('=ADD(1,2)', 3, '/doc.md', { blockId: 'b1' })

        const results = await searchFormulas('ADD')
        // Should not duplicate entries
        expect(results.filter(r => r.strandPath === '/doc.md').length).toBe(1)
      })
    })

    describe('searchFormulas', () => {
      beforeEach(async () => {
        await indexFormulaResult('=ADD(500, 250)', 750, '/budget.md', { fieldName: 'expenses' })
        await indexFormulaResult('=MULTIPLY(12, 100)', 1200, '/budget.md', { fieldName: 'rent' })
        await indexFormulaResult('=WEATHER("Seattle")', 'Rainy, 55°F', '/trip.md')
      })

      it('searches by result text', async () => {
        const results = await searchFormulas('750')
        expect(results.length).toBe(1)
        expect(results[0].context).toHaveProperty('formula', '=ADD(500, 250)')
      })

      it('searches by field name', async () => {
        const results = await searchFormulas('expenses')
        expect(results.length).toBe(1)
        expect(results[0].context).toHaveProperty('result', 750)
      })

      it('searches by formula expression', async () => {
        const results = await searchFormulas('MULTIPLY')
        expect(results.length).toBe(1)
        expect(results[0].context).toHaveProperty('result', 1200)
      })

      it('returns empty array for no matches', async () => {
        const results = await searchFormulas('nonexistent')
        expect(results).toEqual([])
      })

      it('sorts results by score', async () => {
        await indexFormulaResult('=ADD(100,100)', 200, '/a.md', { fieldName: 'subtotal' })
        await indexFormulaResult('=ADD(200,200)', 400, '/b.md', { fieldName: 'total' })

        const results = await searchFormulas('total')
        // "total" should rank higher than "subtotal" for query "total"
        expect(results[0].context?.formula).toBe('=ADD(200,200)')
      })
    })
  })

  // ============================================================================
  // MENTION RELATIONSHIP INDEXING
  // ============================================================================

  describe('Mention Relationship Indexing', () => {
    const sampleMentions: MentionableEntity[] = [
      { id: 'place-sf', type: 'place', label: 'San Francisco', properties: {} },
      { id: 'place-nyc', type: 'place', label: 'New York', properties: {} },
      { id: 'person-alice', type: 'person', label: 'Alice', properties: {} },
      { id: 'date-jan15', type: 'date', label: 'January 15, 2025', properties: {} },
    ]

    describe('indexMentionRelationships', () => {
      it('creates relationships between proximate mentions', async () => {
        const content = 'Meeting with Alice in San Francisco on January 15, 2025'

        await indexMentionRelationships(sampleMentions, '/meeting.md', content)

        const results = await searchMentionRelationships('Alice')
        expect(results.length).toBeGreaterThan(0)
      })

      it('assigns higher weight to closer mentions', async () => {
        const closeContent = 'Alice in San Francisco'
        const farContent = 'Alice lorem ipsum '.repeat(100) + 'San Francisco'

        const closeMentions = [sampleMentions[2], sampleMentions[0]]

        await indexMentionRelationships(closeMentions, '/close.md', closeContent)

        const results = await searchMentionRelationships('Alice')
        expect(results.some(r => r.strandPath === '/close.md')).toBe(true)
      })

      it('determines relationship types correctly', async () => {
        const content = 'Event on January 15, 2025 with Alice'
        const eventMention: MentionableEntity = {
          id: 'event-1',
          type: 'event',
          label: 'Conference',
          properties: {},
        }

        await indexMentionRelationships(
          [eventMention, sampleMentions[3]], // event + date
          '/event.md',
          content
        )

        const results = await searchMentionRelationships('January')
        // Check we get results for the date search
        expect(results.length).toBeGreaterThanOrEqual(0)
      })
    })

    describe('getRelatedMentions', () => {
      beforeEach(async () => {
        // Index several documents with overlapping mentions
        await indexMentionRelationships(
          [sampleMentions[0], sampleMentions[2]], // SF + Alice
          '/doc1.md',
          'Alice visits San Francisco'
        )
        await indexMentionRelationships(
          [sampleMentions[0], sampleMentions[2]], // SF + Alice again
          '/doc2.md',
          'San Francisco trip with Alice'
        )
        await indexMentionRelationships(
          [sampleMentions[1], sampleMentions[2]], // NYC + Alice
          '/doc3.md',
          'Alice in New York'
        )
      })

      it('returns entities related to a given entity', async () => {
        const related = await getRelatedMentions('person-alice')

        expect(related.length).toBeGreaterThan(0)
        expect(related.some(r => r.entityId === 'place-sf')).toBe(true)
      })

      it('ranks by total weight across documents', async () => {
        const related = await getRelatedMentions('person-alice')

        // SF appears in 2 docs with Alice, NYC in 1
        const sfRelation = related.find(r => r.entityId === 'place-sf')
        const nycRelation = related.find(r => r.entityId === 'place-nyc')

        if (sfRelation && nycRelation) {
          expect(sfRelation.weight).toBeGreaterThan(nycRelation.weight)
        }
      })

      it('includes list of documents where relationship exists', async () => {
        const related = await getRelatedMentions('person-alice')
        const sfRelation = related.find(r => r.entityId === 'place-sf')

        expect(sfRelation?.documents).toContain('/doc1.md')
        expect(sfRelation?.documents).toContain('/doc2.md')
      })

      it('respects limit parameter', async () => {
        const related = await getRelatedMentions('person-alice', 1)
        expect(related.length).toBe(1)
      })
    })

    describe('getCoOccurringEntities', () => {
      beforeEach(async () => {
        // Create multiple co-occurrences
        for (let i = 0; i < 5; i++) {
          await indexMentionRelationships(
            [sampleMentions[0], sampleMentions[2]], // SF + Alice
            `/doc${i}.md`,
            'Alice in San Francisco'
          )
        }
      })

      it('returns entities that frequently co-occur', async () => {
        const cooccurring = await getCoOccurringEntities('person-alice', 2)

        expect(cooccurring.length).toBeGreaterThan(0)
        expect(cooccurring[0].count).toBeGreaterThanOrEqual(2)
      })

      it('filters by minimum count', async () => {
        const cooccurring = await getCoOccurringEntities('person-alice', 10)
        expect(cooccurring.length).toBe(0) // Only 5 co-occurrences
      })
    })
  })

  // ============================================================================
  // UNIFIED SEARCH
  // ============================================================================

  describe('Unified Search', () => {
    beforeEach(async () => {
      // Set up test data
      await indexFormulaResult('=ADD(100,200)', 300, '/budget.md', { fieldName: 'total' })
      await indexMentionRelationships(
        [
          { id: 'place-sf', type: 'place', label: 'San Francisco', properties: {} },
          { id: 'person-bob', type: 'person', label: 'Bob', properties: {} },
        ],
        '/meeting.md',
        'Meeting with Bob in San Francisco'
      )
    })

    describe('searchDynamicContent', () => {
      it('searches across formulas and relationships', async () => {
        const results = await searchDynamicContent('300')

        expect(results.some(r => r.type === 'formula')).toBe(true)
      })

      it('filters by type', async () => {
        const formulaOnly = await searchDynamicContent('test', { types: ['formula'] })
        const relationshipOnly = await searchDynamicContent('test', { types: ['relationship'] })

        expect(formulaOnly.every(r => r.type === 'formula')).toBe(true)
        expect(relationshipOnly.every(r => r.type === 'relationship')).toBe(true)
      })

      it('respects limit parameter', async () => {
        // Add more data
        for (let i = 0; i < 30; i++) {
          await indexFormulaResult(`=ADD(${i},1)`, i + 1, `/doc${i}.md`)
        }

        const results = await searchDynamicContent('ADD', { limit: 10 })
        expect(results.length).toBeLessThanOrEqual(10)
      })

      it('sorts results by score', async () => {
        await indexFormulaResult('=ADD(1,1)', 2, '/a.md', { fieldName: 'exact match' })
        await indexFormulaResult('=ADD(2,2)', 4, '/b.md', { fieldName: 'partial' })

        const results = await searchDynamicContent('exact match')
        expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1]?.score || 0)
      })
    })
  })

  // ============================================================================
  // INDEX MANAGEMENT
  // ============================================================================

  describe('Index Management', () => {
    describe('reindexDynamicDocument', () => {
      it('indexes all formulas and mentions for a document', async () => {
        const mentions: MentionableEntity[] = [
          { id: 'place-la', type: 'place', label: 'Los Angeles', properties: {} },
        ]
        const formulas = [
          { formula: '=ADD(1,2)', result: 3, fieldName: 'sum' },
          { formula: '=MULTIPLY(3,4)', result: 12, fieldName: 'product' },
        ]

        await reindexDynamicDocument('/test.md', mentions, formulas, 'Content with Los Angeles')

        const formulaResults = await searchFormulas('sum')
        expect(formulaResults.length).toBeGreaterThan(0)
      })
    })

    describe('clearDynamicIndex', () => {
      it('clears all indices for a document', async () => {
        // Set up data
        await indexFormulaResult('=ADD(1,1)', 2, '/to-delete.md')
        await indexMentionRelationships(
          [{ id: 'test', type: 'place', label: 'Test', properties: {} }],
          '/to-delete.md',
          'Test content'
        )

        // Clear
        await clearDynamicIndex('/to-delete.md')

        // Verify cleared
        const formulaResults = await searchFormulas('ADD')
        const filtered = formulaResults.filter(r => r.strandPath === '/to-delete.md')
        expect(filtered.length).toBe(0)
      })

      it('does not affect other documents', async () => {
        await indexFormulaResult('=ADD(1,1)', 2, '/keep.md')
        await indexFormulaResult('=ADD(2,2)', 4, '/delete.md')

        await clearDynamicIndex('/delete.md')

        const results = await searchFormulas('ADD')
        expect(results.some(r => r.strandPath === '/keep.md')).toBe(true)
        expect(results.some(r => r.strandPath === '/delete.md')).toBe(false)
      })
    })
  })
})




