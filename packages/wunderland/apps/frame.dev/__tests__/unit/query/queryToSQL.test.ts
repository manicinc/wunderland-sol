/**
 * Query to SQL Generator Tests
 * @module tests/unit/query/queryToSQL
 *
 * Tests for SQL generation from query AST.
 */

import { describe, it, expect } from 'vitest'
import { parseQuery } from '@/lib/query/queryLanguage'
import { queryToSQL } from '@/lib/query/queryToSQL'

describe('Query to SQL Generator', () => {
  describe('basic queries', () => {
    it('should generate SQL for text search', () => {
      const query = parseQuery('react')
      const { sql, params, isBlockQuery } = queryToSQL(query)

      expect(isBlockQuery).toBe(false)
      expect(sql).toContain('SELECT')
      expect(sql).toContain('FROM strands')
      expect(sql).toContain('LIKE')
      expect(params).toContain('%react%')
    })

    it('should generate SQL for exact phrase search', () => {
      const query = parseQuery('"react hooks"')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIKE')
      expect(params).toContain('%react hooks%')
    })

    it('should generate SQL for multiple text terms', () => {
      const query = parseQuery('react typescript')
      const { sql, params } = queryToSQL(query)

      expect(params.filter(p => typeof p === 'string' && p.includes('%'))).toHaveLength(4) // 2 terms * 2 fields (title + content)
    })
  })

  describe('tag queries', () => {
    it('should generate SQL for tag filter', () => {
      const query = parseQuery('#typescript')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIKE')
      expect(params.some(p => typeof p === 'string' && p.includes('typescript'))).toBe(true)
    })

    it('should generate SQL for excluded tag', () => {
      const query = parseQuery('-#draft')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('NOT LIKE')
    })
  })

  describe('field queries', () => {
    it('should generate SQL for weave field', () => {
      const query = parseQuery('weave:technology')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('w.slug')
      expect(params).toContain('technology')
    })

    it('should generate SQL for loom field', () => {
      const query = parseQuery('loom:programming')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('l.slug')
      expect(params).toContain('programming')
    })

    it('should generate SQL for contains operator', () => {
      const query = parseQuery('title:~react')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIKE')
      expect(params).toContain('%react%')
    })

    it('should generate SQL for greater than operator', () => {
      const query = parseQuery('word_count:>1000')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('>')
      expect(params).toContain(1000)
    })

    it('should generate SQL for starts with operator', () => {
      const query = parseQuery('path:^technology/')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIKE')
      expect(params).toContain('technology/%')
    })

    it('should generate SQL for ends with operator', () => {
      const query = parseQuery('path:$/intro')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIKE')
      expect(params).toContain('%/intro')
    })
  })

  describe('block-level queries', () => {
    it('should detect block query for type:code', () => {
      const query = parseQuery('type:code')
      const { isBlockQuery, sql } = queryToSQL(query)

      expect(isBlockQuery).toBe(true)
      expect(sql).toContain('FROM strand_blocks')
    })

    it('should detect block query for type:heading', () => {
      const query = parseQuery('type:heading')
      const { isBlockQuery } = queryToSQL(query)

      expect(isBlockQuery).toBe(true)
    })

    it('should detect block query for heading_level field', () => {
      const query = parseQuery('heading_level:>=2')
      const { isBlockQuery } = queryToSQL(query)

      expect(isBlockQuery).toBe(true)
    })

    it('should detect block query for worthiness field', () => {
      const query = parseQuery('worthiness:>0.7')
      const { isBlockQuery } = queryToSQL(query)

      expect(isBlockQuery).toBe(true)
    })

    it('should generate block-specific SQL', () => {
      const query = parseQuery('type:code')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('sb.id')
      expect(sql).toContain('sb.block_id')
      expect(sql).toContain('sb.block_type')
    })
  })

  describe('supertag queries', () => {
    it('should generate SQL for supertag query', () => {
      const query = parseQuery('#task status:done')
      const { sql, params, isBlockQuery } = queryToSQL(query)

      expect(isBlockQuery).toBe(true)
      expect(sql).toContain('EXISTS')
      expect(sql).toContain('supertag_field_values')
      expect(sql).toContain('supertag_schemas')
      expect(params).toContain('task')
    })

    it('should generate SQL for supertag with multiple conditions', () => {
      const query = parseQuery('#task status:done priority:high')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('AND')
      expect(params).toContain('task')
      expect(params).toContain('status')
      expect(params).toContain('priority')
    })
  })

  describe('boolean operators', () => {
    it('should generate SQL for AND expression', () => {
      const query = parseQuery('react AND typescript')
      const { sql } = queryToSQL(query)

      expect(sql).toContain(' AND ')
    })

    it('should generate SQL for OR expression', () => {
      const query = parseQuery('react OR vue')
      const { sql } = queryToSQL(query)

      expect(sql).toContain(' OR ')
    })

    it('should generate SQL for NOT expression', () => {
      const query = parseQuery('NOT deprecated')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('NOT')
    })

    it('should generate SQL for grouped expression', () => {
      const query = parseQuery('(react OR vue) AND frontend')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('(')
      expect(sql).toContain(')')
      expect(sql).toContain(' OR ')
      expect(sql).toContain(' AND ')
    })
  })

  describe('date queries', () => {
    it('should generate SQL for created date query', () => {
      const query = parseQuery('created:>2024-01-01')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('created_at')
      expect(sql).toContain('>')
      expect(params).toContain('2024-01-01')
    })

    it('should generate SQL for updated date query', () => {
      const query = parseQuery('updated:<=2024-06-30')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('updated_at')
      expect(sql).toContain('<=')
      expect(params).toContain('2024-06-30')
    })
  })

  describe('sorting and pagination', () => {
    it('should generate ORDER BY clause', () => {
      const query = parseQuery('react @sort:updated desc')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('ORDER BY')
      expect(sql).toContain('updated_at')
      expect(sql).toContain('DESC')
    })

    it('should generate default ORDER BY when no sort specified', () => {
      const query = parseQuery('react')
      const { sql } = queryToSQL(query)

      expect(sql).toContain('ORDER BY')
      expect(sql).toContain('updated_at DESC')
    })

    it('should generate LIMIT and OFFSET', () => {
      const query = parseQuery('react @limit:20 @offset:10')
      const { sql, params } = queryToSQL(query)

      expect(sql).toContain('LIMIT')
      expect(sql).toContain('OFFSET')
      expect(params).toContain(20)
      expect(params).toContain(10)
    })

    it('should apply default limit', () => {
      const query = parseQuery('react')
      const { params } = queryToSQL(query)

      // Default limit of 20 should be in params
      expect(params).toContain(20)
    })
  })

  describe('count query', () => {
    it('should generate count SQL', () => {
      const query = parseQuery('react #typescript')
      const { countSql } = queryToSQL(query)

      expect(countSql).toContain('COUNT(*)')
      expect(countSql).not.toContain('LIMIT')
      expect(countSql).not.toContain('OFFSET')
      expect(countSql).not.toContain('ORDER BY')
    })
  })

  describe('SQL injection prevention', () => {
    it('should use parameterized queries', () => {
      const query = parseQuery("'; DROP TABLE strands; --")
      const { sql, params } = queryToSQL(query)

      // SQL should use placeholders, not direct string interpolation
      expect(sql).toContain('?')
      expect(sql).not.toContain('DROP TABLE')
      expect(params.some(p => typeof p === 'string' && p.includes('DROP TABLE'))).toBe(false)
    })
  })
})
