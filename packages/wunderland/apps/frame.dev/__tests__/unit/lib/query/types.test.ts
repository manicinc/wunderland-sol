/**
 * Query Types Tests
 * @module __tests__/unit/lib/query/types.test
 *
 * Tests for query system types and configuration.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_QUERY_CONFIG,
  type QueryConfig,
  type QueryNodeType,
  type ComparisonOperator,
  type QueryField,
  type SortDirection,
  type ResultType,
  type RootQueryNode,
  type TextQueryNode,
  type TagQueryNode,
  type FieldQueryNode,
  type AndQueryNode,
  type OrQueryNode,
  type NotQueryNode,
  type DateQueryNode,
  type PathQueryNode,
  type TypeQueryNode,
  type SupertagQueryNode,
  type StrandSearchResult,
  type BlockSearchResult,
  type QueryResult,
  type FacetCount,
  type QueryFacets,
  type SavedQuery,
} from '@/lib/query/types'

// ============================================================================
// DEFAULT_QUERY_CONFIG
// ============================================================================

describe('DEFAULT_QUERY_CONFIG', () => {
  it('is defined', () => {
    expect(DEFAULT_QUERY_CONFIG).toBeDefined()
  })

  describe('cache settings', () => {
    it('enables caching by default', () => {
      expect(DEFAULT_QUERY_CONFIG.enableCache).toBe(true)
    })

    it('has 1 minute cache TTL', () => {
      expect(DEFAULT_QUERY_CONFIG.cacheTTL).toBe(60000)
    })
  })

  describe('limit settings', () => {
    it('has default limit of 20', () => {
      expect(DEFAULT_QUERY_CONFIG.defaultLimit).toBe(20)
    })

    it('has max limit of 100', () => {
      expect(DEFAULT_QUERY_CONFIG.maxLimit).toBe(100)
    })

    it('default limit is less than max limit', () => {
      expect(DEFAULT_QUERY_CONFIG.defaultLimit).toBeLessThan(DEFAULT_QUERY_CONFIG.maxLimit)
    })
  })

  describe('feature flags', () => {
    it('enables facets by default', () => {
      expect(DEFAULT_QUERY_CONFIG.enableFacets).toBe(true)
    })

    it('enables highlights by default', () => {
      expect(DEFAULT_QUERY_CONFIG.enableHighlights).toBe(true)
    })

    it('has highlight max length of 200', () => {
      expect(DEFAULT_QUERY_CONFIG.highlightMaxLength).toBe(200)
    })
  })

  it('has all required properties', () => {
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('enableCache')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('cacheTTL')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('defaultLimit')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('maxLimit')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('enableFacets')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('enableHighlights')
    expect(DEFAULT_QUERY_CONFIG).toHaveProperty('highlightMaxLength')
  })

  it('can be spread and modified', () => {
    const custom: QueryConfig = {
      ...DEFAULT_QUERY_CONFIG,
      cacheTTL: 120000,
      maxLimit: 200,
    }
    expect(custom.cacheTTL).toBe(120000)
    expect(custom.maxLimit).toBe(200)
    expect(DEFAULT_QUERY_CONFIG.cacheTTL).toBe(60000)
  })
})

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('QueryNodeType', () => {
  it('includes all expected node types', () => {
    const nodeTypes: QueryNodeType[] = [
      'root',
      'and',
      'or',
      'not',
      'group',
      'text',
      'tag',
      'field',
      'supertag',
      'type',
      'path',
      'date',
    ]
    expect(nodeTypes).toHaveLength(12)
  })
})

describe('ComparisonOperator', () => {
  it('includes all expected operators', () => {
    const operators: ComparisonOperator[] = [
      '=',
      '!=',
      '>',
      '<',
      '>=',
      '<=',
      '~',
      '!~',
      '^',
      '$',
    ]
    expect(operators).toHaveLength(10)
  })

  describe('operator semantics', () => {
    const operatorTests: Array<{ op: ComparisonOperator; desc: string }> = [
      { op: '=', desc: 'equals' },
      { op: '!=', desc: 'not equals' },
      { op: '>', desc: 'greater than' },
      { op: '<', desc: 'less than' },
      { op: '>=', desc: 'greater than or equal' },
      { op: '<=', desc: 'less than or equal' },
      { op: '~', desc: 'contains/fuzzy' },
      { op: '!~', desc: 'does not contain' },
      { op: '^', desc: 'starts with' },
      { op: '$', desc: 'ends with' },
    ]

    operatorTests.forEach(({ op, desc }) => {
      it(`supports ${op} (${desc})`, () => {
        expect(op).toBeDefined()
      })
    })
  })
})

describe('QueryField', () => {
  it('includes content fields', () => {
    const contentFields: QueryField[] = ['title', 'content', 'summary']
    expect(contentFields).toHaveLength(3)
  })

  it('includes taxonomy fields', () => {
    const taxonomyFields: QueryField[] = ['tag', 'tags', 'subject', 'subjects', 'topic', 'topics']
    expect(taxonomyFields).toHaveLength(6)
  })

  it('includes hierarchy fields', () => {
    const hierarchyFields: QueryField[] = ['weave', 'loom', 'path']
    expect(hierarchyFields).toHaveLength(3)
  })

  it('includes block fields', () => {
    const blockFields: QueryField[] = ['type', 'block_type', 'heading_level', 'worthiness']
    expect(blockFields).toHaveLength(4)
  })

  it('includes metadata fields', () => {
    const metadataFields: QueryField[] = ['difficulty', 'status', 'version']
    expect(metadataFields).toHaveLength(3)
  })

  it('includes date fields', () => {
    const dateFields: QueryField[] = ['created', 'created_at', 'updated', 'updated_at']
    expect(dateFields).toHaveLength(4)
  })
})

describe('SortDirection', () => {
  it('supports ascending and descending', () => {
    const directions: SortDirection[] = ['asc', 'desc']
    expect(directions).toHaveLength(2)
  })
})

describe('ResultType', () => {
  it('supports strand and block results', () => {
    const types: ResultType[] = ['strand', 'block']
    expect(types).toHaveLength(2)
  })
})

// ============================================================================
// AST Node Structure Tests
// ============================================================================

describe('RootQueryNode', () => {
  it('can represent a query root', () => {
    const root: RootQueryNode = {
      type: 'root',
      children: [],
    }
    expect(root.type).toBe('root')
    expect(root.children).toEqual([])
  })

  it('can include sort clause', () => {
    const root: RootQueryNode = {
      type: 'root',
      children: [],
      sort: { field: 'title', direction: 'asc' },
    }
    expect(root.sort?.field).toBe('title')
    expect(root.sort?.direction).toBe('asc')
  })

  it('can include pagination', () => {
    const root: RootQueryNode = {
      type: 'root',
      children: [],
      limit: 20,
      offset: 40,
    }
    expect(root.limit).toBe(20)
    expect(root.offset).toBe(40)
  })
})

describe('TextQueryNode', () => {
  it('can represent text search', () => {
    const node: TextQueryNode = {
      type: 'text',
      value: 'search term',
    }
    expect(node.type).toBe('text')
    expect(node.value).toBe('search term')
    expect(node.exact).toBeUndefined()
  })

  it('can represent exact phrase search', () => {
    const node: TextQueryNode = {
      type: 'text',
      value: 'exact phrase',
      exact: true,
    }
    expect(node.exact).toBe(true)
  })
})

describe('TagQueryNode', () => {
  it('can represent tag inclusion', () => {
    const node: TagQueryNode = {
      type: 'tag',
      tagName: 'javascript',
    }
    expect(node.type).toBe('tag')
    expect(node.tagName).toBe('javascript')
    expect(node.exclude).toBeUndefined()
  })

  it('can represent tag exclusion', () => {
    const node: TagQueryNode = {
      type: 'tag',
      tagName: 'deprecated',
      exclude: true,
    }
    expect(node.exclude).toBe(true)
  })
})

describe('FieldQueryNode', () => {
  it('can represent field comparison', () => {
    const node: FieldQueryNode = {
      type: 'field',
      field: 'difficulty',
      operator: '=',
      value: 'beginner',
    }
    expect(node.type).toBe('field')
    expect(node.field).toBe('difficulty')
    expect(node.operator).toBe('=')
    expect(node.value).toBe('beginner')
  })

  it('supports number values', () => {
    const node: FieldQueryNode = {
      type: 'field',
      field: 'heading_level',
      operator: '<=',
      value: 2,
    }
    expect(node.value).toBe(2)
  })

  it('supports boolean values', () => {
    const node: FieldQueryNode = {
      type: 'field',
      field: 'status',
      operator: '=',
      value: true,
    }
    expect(node.value).toBe(true)
  })

  it('supports null values', () => {
    const node: FieldQueryNode = {
      type: 'field',
      field: 'summary',
      operator: '=',
      value: null,
    }
    expect(node.value).toBeNull()
  })
})

describe('AndQueryNode', () => {
  it('can represent AND expression', () => {
    const node: AndQueryNode = {
      type: 'and',
      left: { type: 'text', value: 'react' },
      right: { type: 'text', value: 'hooks' },
    }
    expect(node.type).toBe('and')
    expect((node.left as TextQueryNode).value).toBe('react')
    expect((node.right as TextQueryNode).value).toBe('hooks')
  })
})

describe('OrQueryNode', () => {
  it('can represent OR expression', () => {
    const node: OrQueryNode = {
      type: 'or',
      left: { type: 'tag', tagName: 'javascript' },
      right: { type: 'tag', tagName: 'typescript' },
    }
    expect(node.type).toBe('or')
  })
})

describe('NotQueryNode', () => {
  it('can represent NOT expression', () => {
    const node: NotQueryNode = {
      type: 'not',
      child: { type: 'tag', tagName: 'deprecated' },
    }
    expect(node.type).toBe('not')
  })
})

describe('DateQueryNode', () => {
  it('can represent date comparison', () => {
    const node: DateQueryNode = {
      type: 'date',
      field: 'created',
      operator: '>',
      value: '2024-01-01',
    }
    expect(node.type).toBe('date')
    expect(node.field).toBe('created')
    expect(node.value).toBe('2024-01-01')
  })

  it('supports updated field', () => {
    const node: DateQueryNode = {
      type: 'date',
      field: 'updated',
      operator: '>=',
      value: '2024-06-01',
    }
    expect(node.field).toBe('updated')
  })
})

describe('PathQueryNode', () => {
  it('can represent path filter', () => {
    const node: PathQueryNode = {
      type: 'path',
      pattern: 'mathematics/*',
      operator: 'matches',
    }
    expect(node.type).toBe('path')
    expect(node.pattern).toBe('mathematics/*')
    expect(node.operator).toBe('matches')
  })

  it('supports all path operators', () => {
    const operators: PathQueryNode['operator'][] = ['in', 'starts', 'ends', 'matches']
    expect(operators).toHaveLength(4)
  })
})

describe('TypeQueryNode', () => {
  it('can represent type filter', () => {
    const node: TypeQueryNode = {
      type: 'type',
      targetType: 'heading',
    }
    expect(node.type).toBe('type')
    expect(node.targetType).toBe('heading')
  })

  it('supports all target types', () => {
    const types: TypeQueryNode['targetType'][] = [
      'strand',
      'block',
      'heading',
      'paragraph',
      'code',
      'list',
      'blockquote',
      'table',
    ]
    expect(types).toHaveLength(8)
  })
})

describe('SupertagQueryNode', () => {
  it('can represent supertag query', () => {
    const node: SupertagQueryNode = {
      type: 'supertag',
      tagName: 'task',
    }
    expect(node.type).toBe('supertag')
    expect(node.tagName).toBe('task')
  })

  it('can include field filters', () => {
    const node: SupertagQueryNode = {
      type: 'supertag',
      tagName: 'task',
      fields: [
        { name: 'status', operator: '=', value: 'done' },
        { name: 'priority', operator: '>=', value: 3 },
      ],
    }
    expect(node.fields).toHaveLength(2)
    expect(node.fields![0].name).toBe('status')
  })
})

// ============================================================================
// Search Result Structure Tests
// ============================================================================

describe('StrandSearchResult', () => {
  it('can represent strand result', () => {
    const result: StrandSearchResult = {
      type: 'strand',
      id: 'strand-1',
      path: 'mathematics/calculus/intro',
      title: 'Introduction to Calculus',
      content: 'Calculus is the mathematical study of change...',
      tags: ['mathematics', 'calculus'],
      subjects: ['Mathematics'],
      topics: ['Calculus'],
      wordCount: 500,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-06-15T14:30:00Z',
      score: 0.95,
    }
    expect(result.type).toBe('strand')
    expect(result.score).toBe(0.95)
  })

  it('supports optional fields', () => {
    const result: StrandSearchResult = {
      type: 'strand',
      id: 'strand-2',
      path: 'physics/quantum',
      title: 'Quantum Mechanics',
      content: 'Content here',
      tags: [],
      subjects: [],
      topics: [],
      wordCount: 100,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      score: 0.8,
      summary: 'A brief summary',
      weave: 'physics',
      loom: 'quantum',
      difficulty: 'advanced',
      highlights: {
        title: ['<em>Quantum</em> Mechanics'],
        content: ['The <em>quantum</em> state...'],
      },
    }
    expect(result.summary).toBe('A brief summary')
    expect(result.highlights?.title).toHaveLength(1)
  })
})

describe('BlockSearchResult', () => {
  it('can represent block result', () => {
    const result: BlockSearchResult = {
      type: 'block',
      id: 'block-1',
      blockId: 'abc123',
      strandPath: 'mathematics/algebra',
      strandTitle: 'Linear Algebra',
      blockType: 'heading',
      content: 'Vector Spaces',
      tags: ['vectors'],
      startLine: 45,
      endLine: 50,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      score: 0.85,
    }
    expect(result.type).toBe('block')
    expect(result.blockType).toBe('heading')
    expect(result.startLine).toBe(45)
  })

  it('supports optional block fields', () => {
    const result: BlockSearchResult = {
      type: 'block',
      id: 'block-2',
      blockId: 'def456',
      strandPath: 'cs/algorithms',
      strandTitle: 'Sorting Algorithms',
      blockType: 'heading',
      content: 'Quick Sort',
      tags: [],
      startLine: 10,
      endLine: 15,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      score: 0.7,
      summary: 'Block summary',
      headingLevel: 2,
      worthinessScore: 0.9,
      highlights: { content: ['<em>Quick</em> Sort'] },
    }
    expect(result.headingLevel).toBe(2)
    expect(result.worthinessScore).toBe(0.9)
  })
})

describe('QueryResult', () => {
  it('can represent query result', () => {
    const result: QueryResult = {
      results: [],
      total: 0,
      executionTime: 25,
      query: { type: 'root', children: [] },
    }
    expect(result.total).toBe(0)
    expect(result.executionTime).toBe(25)
  })

  it('supports optional fields', () => {
    const result: QueryResult = {
      results: [],
      total: 50,
      executionTime: 100,
      query: { type: 'root', children: [] },
      cached: true,
      facets: {
        weaves: [],
        looms: [],
        tags: [],
        subjects: [],
        topics: [],
        blockTypes: [],
        supertags: [],
        difficulties: [],
      },
    }
    expect(result.cached).toBe(true)
    expect(result.facets).toBeDefined()
  })
})

// ============================================================================
// Facet Structure Tests
// ============================================================================

describe('FacetCount', () => {
  it('can represent facet count', () => {
    const facet: FacetCount = {
      value: 'javascript',
      count: 42,
    }
    expect(facet.value).toBe('javascript')
    expect(facet.count).toBe(42)
  })

  it('supports optional label and color', () => {
    const facet: FacetCount = {
      value: 'mathematics',
      count: 100,
      label: 'Mathematics',
      color: '#3498db',
    }
    expect(facet.label).toBe('Mathematics')
    expect(facet.color).toBe('#3498db')
  })
})

describe('QueryFacets', () => {
  it('can represent all facet categories', () => {
    const facets: QueryFacets = {
      weaves: [{ value: 'math', count: 10 }],
      looms: [{ value: 'algebra', count: 5 }],
      tags: [{ value: 'calculus', count: 8 }],
      subjects: [{ value: 'Mathematics', count: 15 }],
      topics: [{ value: 'Derivatives', count: 3 }],
      blockTypes: [{ value: 'heading', count: 20 }],
      supertags: [{ value: 'exercise', count: 7 }],
      difficulties: [{ value: 'intermediate', count: 12 }],
    }
    expect(facets.weaves).toHaveLength(1)
    expect(facets.tags[0].count).toBe(8)
  })
})

// ============================================================================
// SavedQuery Structure Tests
// ============================================================================

describe('SavedQuery', () => {
  it('can represent saved query', () => {
    const saved: SavedQuery = {
      id: 'query-1',
      name: 'Recent JavaScript',
      queryJson: '{"type":"root","children":[]}',
      isPinned: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }
    expect(saved.name).toBe('Recent JavaScript')
    expect(saved.isPinned).toBe(false)
  })

  it('supports optional fields', () => {
    const saved: SavedQuery = {
      id: 'query-2',
      name: 'Pinned Query',
      description: 'My frequently used query',
      queryJson: '{"type":"root","children":[]}',
      isPinned: true,
      folder: 'work',
      createdAt: '2024-01-01',
      updatedAt: '2024-06-01',
    }
    expect(saved.description).toBe('My frequently used query')
    expect(saved.folder).toBe('work')
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('query types integration', () => {
  it('can build a complex query AST', () => {
    // Build: (#javascript OR #typescript) AND title:~"React" AND -#deprecated
    const query: RootQueryNode = {
      type: 'root',
      children: [
        {
          type: 'and',
          left: {
            type: 'and',
            left: {
              type: 'or',
              left: { type: 'tag', tagName: 'javascript' },
              right: { type: 'tag', tagName: 'typescript' },
            },
            right: {
              type: 'field',
              field: 'title',
              operator: '~',
              value: 'React',
            },
          },
          right: {
            type: 'not',
            child: { type: 'tag', tagName: 'deprecated' },
          },
        },
      ],
      sort: { field: 'updated', direction: 'desc' },
      limit: 20,
    }

    expect(query.type).toBe('root')
    expect(query.children).toHaveLength(1)
    expect(query.sort?.field).toBe('updated')
    expect(query.limit).toBe(20)
  })

  it('config values are reasonable', () => {
    expect(DEFAULT_QUERY_CONFIG.cacheTTL).toBeGreaterThan(0)
    expect(DEFAULT_QUERY_CONFIG.defaultLimit).toBeGreaterThan(0)
    expect(DEFAULT_QUERY_CONFIG.maxLimit).toBeGreaterThan(DEFAULT_QUERY_CONFIG.defaultLimit)
    expect(DEFAULT_QUERY_CONFIG.highlightMaxLength).toBeGreaterThan(0)
  })
})
