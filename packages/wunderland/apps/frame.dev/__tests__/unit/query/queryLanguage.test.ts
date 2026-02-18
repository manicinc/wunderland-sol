/**
 * Query Language Parser Tests
 * @module tests/unit/query/queryLanguage
 *
 * Tests for the structured query language parser.
 */

import { describe, it, expect } from 'vitest'
import {
  parseQuery,
  serializeQuery,
  validateQuery,
  extractTags,
  extractTextTerms,
} from '@/lib/query/queryLanguage'

describe('Query Language Parser', () => {
  describe('parseQuery', () => {
    describe('text search', () => {
      it('should parse simple text search', () => {
        const result = parseQuery('hello world')
        expect(result.type).toBe('root')
        expect(result.children).toHaveLength(2)
        expect(result.children[0]).toMatchObject({
          type: 'text',
          value: 'hello',
        })
        expect(result.children[1]).toMatchObject({
          type: 'text',
          value: 'world',
        })
      })

      it('should parse quoted exact phrase', () => {
        const result = parseQuery('"react hooks"')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'text',
          value: 'react hooks',
          exact: true,
        })
      })

      it('should parse mixed quoted and unquoted', () => {
        const result = parseQuery('typescript "best practices"')
        expect(result.children).toHaveLength(2)
        expect(result.children[0]).toMatchObject({
          type: 'text',
          value: 'typescript',
        })
        expect(result.children[1]).toMatchObject({
          type: 'text',
          value: 'best practices',
          exact: true,
        })
      })
    })

    describe('tag filters', () => {
      it('should parse tag filter', () => {
        const result = parseQuery('#typescript')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'tag',
          tagName: 'typescript',
          exclude: false,
        })
      })

      it('should parse excluded tag', () => {
        const result = parseQuery('-#draft')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'tag',
          tagName: 'draft',
          exclude: true,
        })
      })

      it('should parse multiple tags', () => {
        const result = parseQuery('#react #typescript -#deprecated')
        expect(result.children).toHaveLength(3)
      })

      it('should parse tag with hyphen', () => {
        const result = parseQuery('#my-tag')
        expect(result.children[0]).toMatchObject({
          type: 'tag',
          tagName: 'my-tag',
        })
      })
    })

    describe('field queries', () => {
      it('should parse simple field query', () => {
        const result = parseQuery('weave:technology')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'field',
          field: 'weave',
          operator: '=',
          value: 'technology',
        })
      })

      it('should parse field query with greater than operator', () => {
        const result = parseQuery('worthiness:>0.7')
        expect(result.children[0]).toMatchObject({
          type: 'field',
          field: 'worthiness',
          operator: '>',
          value: 0.7,
        })
      })

      it('should parse field query with contains operator', () => {
        const result = parseQuery('title:~react')
        expect(result.children[0]).toMatchObject({
          type: 'field',
          field: 'title',
          operator: '~',
          value: 'react',
        })
      })

      it('should parse field query with starts with operator', () => {
        const result = parseQuery('path:^technology/')
        expect(result.children[0]).toMatchObject({
          type: 'field',
          field: 'path',
          operator: '^',
          value: 'technology/',
        })
      })
    })

    describe('type filters', () => {
      it('should parse type filter for code blocks', () => {
        const result = parseQuery('type:code')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'type',
          targetType: 'code',
        })
      })

      it('should parse type filter for headings', () => {
        const result = parseQuery('type:heading')
        expect(result.children[0]).toMatchObject({
          type: 'type',
          targetType: 'heading',
        })
      })
    })

    describe('date queries', () => {
      it('should parse created date query', () => {
        const result = parseQuery('created:>2024-01-01')
        expect(result.children[0]).toMatchObject({
          type: 'date',
          field: 'created',
          operator: '>',
          value: '2024-01-01',
        })
      })

      it('should parse updated date query', () => {
        const result = parseQuery('updated:<=2024-06-30')
        expect(result.children[0]).toMatchObject({
          type: 'date',
          field: 'updated',
          operator: '<=',
          value: '2024-06-30',
        })
      })
    })

    describe('supertag queries', () => {
      it('should parse supertag with field conditions', () => {
        const result = parseQuery('#task status:done')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'supertag',
          tagName: 'task',
          fields: [
            { name: 'status', operator: '=', value: 'done' },
          ],
        })
      })

      it('should parse supertag with multiple field conditions', () => {
        const result = parseQuery('#task status:done priority:high')
        expect(result.children[0]).toMatchObject({
          type: 'supertag',
          tagName: 'task',
          fields: [
            { name: 'status', operator: '=', value: 'done' },
            { name: 'priority', operator: '=', value: 'high' },
          ],
        })
      })
    })

    describe('boolean operators', () => {
      it('should parse AND expression', () => {
        const result = parseQuery('react AND typescript')
        expect(result.children).toHaveLength(1)
        expect(result.children[0]).toMatchObject({
          type: 'and',
          left: { type: 'text', value: 'react' },
          right: { type: 'text', value: 'typescript' },
        })
      })

      it('should parse OR expression', () => {
        const result = parseQuery('react OR vue')
        expect(result.children[0]).toMatchObject({
          type: 'or',
          left: { type: 'text', value: 'react' },
          right: { type: 'text', value: 'vue' },
        })
      })

      it('should parse NOT expression', () => {
        const result = parseQuery('NOT deprecated')
        expect(result.children[0]).toMatchObject({
          type: 'not',
          child: { type: 'text', value: 'deprecated' },
        })
      })

      it('should handle operator precedence', () => {
        const result = parseQuery('react OR vue AND frontend')
        // AND has higher precedence, so it should be: react OR (vue AND frontend)
        expect(result.children[0].type).toBe('or')
      })
    })

    describe('grouping', () => {
      it('should parse grouped expression', () => {
        const result = parseQuery('(react OR vue) AND frontend')
        expect(result.children[0]).toMatchObject({
          type: 'and',
          left: {
            type: 'group',
            child: {
              type: 'or',
            },
          },
          right: { type: 'text', value: 'frontend' },
        })
      })
    })

    describe('sort and pagination', () => {
      it('should parse sort directive', () => {
        const result = parseQuery('react @sort:updated desc')
        expect(result.sort).toMatchObject({
          field: 'updated',
          direction: 'desc',
        })
      })

      it('should parse limit directive', () => {
        const result = parseQuery('react @limit:20')
        expect(result.limit).toBe(20)
      })

      it('should parse offset directive', () => {
        const result = parseQuery('react @offset:10')
        expect(result.offset).toBe(10)
      })

      it('should parse all directives together', () => {
        const result = parseQuery('react @sort:updated desc @limit:20 @offset:10')
        expect(result.sort).toMatchObject({ field: 'updated', direction: 'desc' })
        expect(result.limit).toBe(20)
        expect(result.offset).toBe(10)
      })
    })

    describe('complex queries', () => {
      it('should parse complex query with multiple conditions', () => {
        const result = parseQuery('#typescript (react OR vue) weave:technology -#draft @sort:updated desc')
        expect(result.children.length).toBeGreaterThanOrEqual(1)
        expect(result.sort).toBeDefined()
      })

      it('should parse empty query', () => {
        const result = parseQuery('')
        expect(result.children).toHaveLength(0)
      })

      it('should parse query with only whitespace', () => {
        const result = parseQuery('   ')
        expect(result.children).toHaveLength(0)
      })
    })
  })

  describe('serializeQuery', () => {
    it('should serialize text node', () => {
      const query = parseQuery('hello')
      expect(serializeQuery(query)).toBe('hello')
    })

    it('should serialize quoted text', () => {
      const query = parseQuery('"exact phrase"')
      expect(serializeQuery(query)).toBe('"exact phrase"')
    })

    it('should serialize tag', () => {
      const query = parseQuery('#typescript')
      expect(serializeQuery(query)).toBe('#typescript')
    })

    it('should serialize excluded tag', () => {
      const query = parseQuery('-#draft')
      expect(serializeQuery(query)).toBe('-#draft')
    })

    it('should serialize field query', () => {
      const query = parseQuery('weave:technology')
      expect(serializeQuery(query)).toBe('weave:technology')
    })

    it('should serialize AND expression', () => {
      const query = parseQuery('react AND typescript')
      expect(serializeQuery(query)).toBe('react AND typescript')
    })

    it('should serialize OR expression', () => {
      const query = parseQuery('react OR vue')
      expect(serializeQuery(query)).toBe('react OR vue')
    })

    it('should serialize with sort and limit', () => {
      const query = parseQuery('react @sort:updated desc @limit:20')
      const serialized = serializeQuery(query)
      expect(serialized).toContain('react')
      expect(serialized).toContain('@sort:updated desc')
      expect(serialized).toContain('@limit:20')
    })
  })

  describe('validateQuery', () => {
    it('should validate valid query', () => {
      const result = validateQuery('#typescript react')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate empty query', () => {
      const result = validateQuery('')
      expect(result.valid).toBe(true)
    })

    it('should validate complex query', () => {
      const result = validateQuery('#task status:done AND (priority:high OR priority:medium)')
      expect(result.valid).toBe(true)
    })
  })

  describe('extractTags', () => {
    it('should extract tags from query', () => {
      const query = parseQuery('#react #typescript -#deprecated')
      const tags = extractTags(query)
      expect(tags).toContain('react')
      expect(tags).toContain('typescript')
      expect(tags).not.toContain('deprecated') // excluded tags not included
    })

    it('should extract tags from nested expressions', () => {
      const query = parseQuery('(#react OR #vue) AND #frontend')
      const tags = extractTags(query)
      expect(tags).toContain('react')
      expect(tags).toContain('vue')
      expect(tags).toContain('frontend')
    })

    it('should extract supertag names', () => {
      const query = parseQuery('#task status:done')
      const tags = extractTags(query)
      expect(tags).toContain('task')
    })
  })

  describe('extractTextTerms', () => {
    it('should extract text terms', () => {
      const query = parseQuery('react hooks tutorial')
      const terms = extractTextTerms(query)
      expect(terms).toContain('react')
      expect(terms).toContain('hooks')
      expect(terms).toContain('tutorial')
    })

    it('should extract exact phrases', () => {
      const query = parseQuery('"react hooks"')
      const terms = extractTextTerms(query)
      expect(terms).toContain('react hooks')
    })

    it('should not extract tags as text terms', () => {
      const query = parseQuery('#typescript react')
      const terms = extractTextTerms(query)
      expect(terms).toContain('react')
      expect(terms).not.toContain('typescript')
    })
  })
})
