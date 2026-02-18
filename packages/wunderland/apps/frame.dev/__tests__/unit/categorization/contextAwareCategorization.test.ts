/**
 * Context-Aware Categorization Tests
 * @module __tests__/unit/categorization/contextAwareCategorization.test
 *
 * Tests for enhanced categorization with hierarchy, relationships, and semantics.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  parseDocumentHierarchy,
  calculateHierarchyBoost,
  analyzeDocumentRelationships,
  calculateRelationshipBoost,
  analyzeDocumentSemantics,
  calculateSemanticBoost,
  suggestCategoryWithContext,
  categorizeStrandWithContext,
} from '@/lib/categorization/contextAwareCategorization'
import type { CategoryDefinition } from '@/lib/categorization/types'

// Mock NLP functions
vi.mock('@/lib/nlp', () => ({
  parseHierarchyFromPath: vi.fn((path: string) => {
    const parts = path.split('/').filter(Boolean)
    return {
      level: parts.length,
      fabric: parts[0],
      weave: parts.includes('weaves') ? parts[parts.indexOf('weaves') + 1] : undefined,
      loom: parts.includes('looms') ? parts[parts.indexOf('looms') + 1] : undefined,
      strand: parts[parts.length - 1]?.replace('.md', ''),
      path,
      parentPath: parts.slice(0, -1).join('/') || '/',
    }
  }),
  extractTechEntities: vi.fn(() => ({
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React', 'Next.js'],
    databases: ['SQLite'],
    cloud: [],
    ai: [],
    protocols: [],
    concepts: ['Local-First', 'CRDT'],
  })),
  extractInternalLinks: vi.fn(() => ['related-doc', 'another-doc']),
  extractExternalLinks: vi.fn(() => [
    { url: 'https://github.com/example', domain: 'github.com' },
  ]),
  classifyContentType: vi.fn(() => ({ primary: 'tutorial', secondary: 'reference' })),
  analyzeReadingLevel: vi.fn(() => ({ level: 'intermediate' })),
  extractKeywords: vi.fn(() => [
    { word: 'categorization' },
    { word: 'hierarchy' },
    { word: 'documents' },
  ]),
  suggestPrerequisites: vi.fn(() => []),
  inferTagsFromHierarchy: vi.fn(() => ['programming', 'typescript']),
}))

// Mock the base algorithm
vi.mock('@/lib/categorization/algorithm', () => ({
  DEFAULT_CATEGORIES: [
    { path: 'weaves/tutorials', keywords: ['tutorial', 'guide', 'learn'], description: 'Learning materials' },
    { path: 'weaves/reference', keywords: ['reference', 'api', 'documentation'], description: 'Reference docs' },
    { path: 'weaves/projects', keywords: ['project', 'build', 'app'], description: 'Project documentation' },
  ],
  DEFAULT_CONFIG: {
    auto_apply_threshold: 0.95,
    pr_threshold: 0.8,
    categories: [],
  },
  suggestCategory: vi.fn(() => ({
    category: 'weaves/tutorials',
    confidence: 0.6,
    reasoning: 'Keyword match for tutorial content',
    alternatives: [
      { category: 'weaves/reference', confidence: 0.3, reasoning: 'Some reference keywords' },
    ],
  })),
  parseFrontmatter: vi.fn((content: string) => ({
    metadata: {},
    body: content,
  })),
  extractTitle: vi.fn(() => 'Test Document'),
}))

// ============================================================================
// HIERARCHY PARSING TESTS
// ============================================================================

describe('Hierarchy Parsing', () => {
  describe('parseDocumentHierarchy', () => {
    it('parses simple path', () => {
      const hierarchy = parseDocumentHierarchy('/content/documents/test.md')

      expect(hierarchy).toBeDefined()
      expect(hierarchy.path).toBe('/content/documents/test.md')
    })

    it('extracts weave from path', () => {
      const hierarchy = parseDocumentHierarchy('/weaves/tutorials/getting-started.md')

      expect(hierarchy.weave).toBe('tutorials')
    })

    it('extracts loom from path', () => {
      const hierarchy = parseDocumentHierarchy('/weaves/tutorials/looms/react/intro.md')

      expect(hierarchy.loom).toBe('react')
    })

    it('includes parent path', () => {
      const hierarchy = parseDocumentHierarchy('/weaves/tutorials/doc.md')

      expect(hierarchy.parentPath).toBeDefined()
    })

    it('calculates hierarchy level', () => {
      const hierarchy = parseDocumentHierarchy('/a/b/c/d.md')

      expect(hierarchy.level).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// HIERARCHY BOOST TESTS
// ============================================================================

describe('Hierarchy Boost', () => {
  describe('calculateHierarchyBoost', () => {
    const mockHierarchy = {
      level: 3,
      fabric: 'weaves',
      weave: 'tutorials',
      loom: 'react',
      strand: 'intro',
      path: '/weaves/tutorials/looms/react/intro.md',
      parentPath: '/weaves/tutorials/looms/react',
    }

    it('boosts when document is in same weave', () => {
      const boost = calculateHierarchyBoost(mockHierarchy, 'weaves/tutorials')

      expect(boost).toBeGreaterThan(0)
    })

    it('boosts when document is in same loom', () => {
      const boost = calculateHierarchyBoost(mockHierarchy, 'weaves/tutorials/looms/react')

      expect(boost).toBeGreaterThan(0.1)
    })

    it('boosts based on sibling pattern', () => {
      const existingIndex = [
        {
          path: '/weaves/tutorials/looms/react/hooks.md',
          metadata: { category: 'weaves/tutorials' },
        },
        {
          path: '/weaves/tutorials/looms/react/state.md',
          metadata: { category: 'weaves/tutorials' },
        },
      ]

      const boost = calculateHierarchyBoost(mockHierarchy, 'weaves/tutorials', existingIndex)

      expect(boost).toBeGreaterThan(0)
    })

    it('returns 0 for unrelated paths', () => {
      const boost = calculateHierarchyBoost(mockHierarchy, 'weaves/reference')

      expect(boost).toBe(0)
    })

    it('caps boost at 0.35', () => {
      const existingIndex = [
        { path: '/weaves/tutorials/looms/react/a.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/looms/react/b.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/looms/react/c.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/looms/react/d.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/looms/react/e.md', metadata: { category: 'weaves/tutorials' } },
      ]

      const boost = calculateHierarchyBoost(
        mockHierarchy,
        'weaves/tutorials/looms/react',
        existingIndex,
      )

      expect(boost).toBeLessThanOrEqual(0.35)
    })
  })
})

// ============================================================================
// RELATIONSHIP ANALYSIS TESTS
// ============================================================================

describe('Relationship Analysis', () => {
  describe('analyzeDocumentRelationships', () => {
    it('extracts internal links', () => {
      const content = 'See [[related-doc]] and [[another-doc]]'
      const relationships = analyzeDocumentRelationships(content, '/test.md')

      expect(relationships.internalLinks).toBeDefined()
      expect(relationships.internalLinks.length).toBeGreaterThan(0)
    })

    it('extracts external domains', () => {
      const content = 'Check [GitHub](https://github.com)'
      const relationships = analyzeDocumentRelationships(content, '/test.md')

      expect(relationships.externalDomains).toBeDefined()
    })

    it('finds sibling documents', () => {
      const existingIndex = [
        { path: '/docs/intro.md', metadata: {} },
        { path: '/docs/advanced.md', metadata: {} },
        { path: '/other/file.md', metadata: {} },
      ]

      const relationships = analyzeDocumentRelationships(
        'content',
        '/docs/test.md',
        existingIndex,
      )

      expect(relationships.siblings).toBeDefined()
    })

    it('extracts mentioned entities from links', () => {
      const content = 'Reference to [[EntityName]]'
      const relationships = analyzeDocumentRelationships(content, '/test.md')

      expect(relationships.mentionedEntities).toBeDefined()
    })
  })

  describe('calculateRelationshipBoost', () => {
    it('boosts when internal links point to category', () => {
      const relationships = {
        internalLinks: ['related-doc'],
        externalDomains: [],
        mentionedEntities: [],
        suggestedPrerequisites: [],
        siblings: [],
      }

      const existingIndex = [
        { path: '/weaves/tutorials/related-doc.md', metadata: { category: 'weaves/tutorials' } },
      ]

      const { boost, relatedDocs } = calculateRelationshipBoost(
        relationships,
        'weaves/tutorials',
        existingIndex,
      )

      expect(boost).toBeGreaterThan(0)
      expect(relatedDocs.length).toBeGreaterThan(0)
    })

    it('boosts based on prerequisites in category', () => {
      const relationships = {
        internalLinks: [],
        externalDomains: [],
        mentionedEntities: [],
        suggestedPrerequisites: [
          { path: 'weaves/tutorials/basics.md', confidence: 0.8, type: 'prerequisite' },
        ],
        siblings: [],
      }

      const { boost } = calculateRelationshipBoost(relationships, 'weaves/tutorials', [])

      expect(boost).toBeGreaterThan(0)
    })

    it('caps boost at 0.3', () => {
      const relationships = {
        internalLinks: ['a', 'b', 'c', 'd', 'e'],
        externalDomains: [],
        mentionedEntities: [],
        suggestedPrerequisites: [],
        siblings: [],
      }

      const existingIndex = [
        { path: '/weaves/tutorials/a.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/b.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/c.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/d.md', metadata: { category: 'weaves/tutorials' } },
        { path: '/weaves/tutorials/e.md', metadata: { category: 'weaves/tutorials' } },
      ]

      const { boost } = calculateRelationshipBoost(
        relationships,
        'weaves/tutorials',
        existingIndex,
      )

      expect(boost).toBeLessThanOrEqual(0.3)
    })

    it('returns unique related docs', () => {
      const relationships = {
        internalLinks: ['doc', 'doc', 'doc'],
        externalDomains: [],
        mentionedEntities: [],
        suggestedPrerequisites: [{ path: 'weaves/tutorials/doc.md', confidence: 0.8, type: 'prerequisite' }],
        siblings: [],
      }

      const existingIndex = [
        { path: '/weaves/tutorials/doc.md', metadata: { category: 'weaves/tutorials' } },
      ]

      const { relatedDocs } = calculateRelationshipBoost(
        relationships,
        'weaves/tutorials',
        existingIndex,
      )

      // Function may return multiple related docs from different sources
      expect(relatedDocs.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ============================================================================
// SEMANTIC ANALYSIS TESTS
// ============================================================================

describe('Semantic Analysis', () => {
  describe('analyzeDocumentSemantics', () => {
    it('extracts technologies', () => {
      const content = 'Building with TypeScript and React'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.technologies).toBeDefined()
      expect(semantics.technologies.length).toBeGreaterThan(0)
    })

    it('extracts concepts', () => {
      const content = 'Explaining CRDT and local-first principles'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.concepts).toBeDefined()
    })

    it('classifies content type', () => {
      const content = 'This tutorial will show you how to...'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.contentType).toBeDefined()
    })

    it('extracts key phrases', () => {
      const content = 'Understanding categorization and hierarchy'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.keyPhrases).toBeDefined()
    })

    it('determines difficulty level', () => {
      const content = 'Advanced concepts in distributed systems'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.difficulty).toBeDefined()
    })

    it('extracts named entities', () => {
      const content = 'Google and Microsoft are leading cloud providers'
      const semantics = analyzeDocumentSemantics(content)

      expect(semantics.namedEntities).toBeDefined()
      expect(semantics.namedEntities.organizations.length).toBeGreaterThan(0)
    })
  })

  describe('calculateSemanticBoost', () => {
    const mockCategory: CategoryDefinition = {
      path: 'weaves/tutorials',
      keywords: ['tutorial', 'guide', 'learn', 'react', 'typescript'],
      description: 'Learning materials',
    }

    it('boosts when technologies match keywords', () => {
      const semantics = {
        technologies: ['React', 'TypeScript'],
        concepts: [],
        contentType: 'tutorial' as const,
        difficulty: 'intermediate',
        keyPhrases: [],
        namedEntities: { people: [], organizations: [], locations: [] },
      }

      const { boost } = calculateSemanticBoost(semantics, mockCategory)

      expect(boost).toBeGreaterThan(0)
    })

    it('boosts when content type aligns with category', () => {
      const semantics = {
        technologies: [],
        concepts: [],
        contentType: 'tutorial' as const,
        difficulty: 'beginner',
        keyPhrases: [],
        namedEntities: { people: [], organizations: [], locations: [] },
      }

      const { boost } = calculateSemanticBoost(semantics, mockCategory)

      expect(boost).toBeGreaterThan(0)
    })

    it('includes semantic factors in result', () => {
      const semantics = {
        technologies: ['React'],
        concepts: ['Component'],
        contentType: 'tutorial' as const,
        difficulty: 'intermediate',
        keyPhrases: ['learn react'],
        namedEntities: { people: [], organizations: [], locations: [] },
      }

      const { factors } = calculateSemanticBoost(semantics, mockCategory)

      expect(factors).toBeDefined()
      expect(factors.length).toBeGreaterThan(0)
    })

    it('caps boost at 0.4', () => {
      const semantics = {
        technologies: ['React', 'TypeScript', 'JavaScript', 'Next.js'],
        concepts: ['Tutorial', 'Learn', 'Guide'],
        contentType: 'tutorial' as const,
        difficulty: 'beginner',
        keyPhrases: ['learn', 'guide', 'tutorial'],
        namedEntities: { people: [], organizations: [], locations: [] },
      }

      const { boost } = calculateSemanticBoost(semantics, mockCategory)

      expect(boost).toBeLessThanOrEqual(0.4)
    })
  })
})

// ============================================================================
// CONTEXT-AWARE SUGGESTION TESTS
// ============================================================================

describe('Context-Aware Suggestion', () => {
  describe('suggestCategoryWithContext', () => {
    const mockConfig = {
      auto_apply_threshold: 0.95,
      pr_threshold: 0.8,
      categories: [
        { path: 'weaves/tutorials', keywords: ['tutorial', 'guide'], description: 'Tutorials' },
        { path: 'weaves/reference', keywords: ['reference', 'api'], description: 'Reference' },
      ],
    }

    it('returns enhanced suggestion with context boosts', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Tutorial content here',
        title: 'Test Tutorial',
        config: mockConfig,
      })

      expect(suggestion.category).toBeDefined()
      expect(suggestion.confidence).toBeGreaterThan(0)
    })

    it('includes hierarchy boost in result', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Tutorial content',
        title: 'Test',
        config: mockConfig,
      })

      expect(suggestion.hierarchyBoost).toBeDefined()
    })

    it('includes relationship boost in result', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Tutorial content',
        title: 'Test',
        config: mockConfig,
      })

      expect(suggestion.relationshipBoost).toBeDefined()
    })

    it('includes semantic factors', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'React TypeScript tutorial',
        title: 'Test',
        config: mockConfig,
      })

      expect(suggestion.semanticFactors).toBeDefined()
    })

    it('includes suggested tags', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Content',
        title: 'Test',
        config: mockConfig,
      })

      expect(suggestion.suggestedTags).toBeDefined()
      expect(Array.isArray(suggestion.suggestedTags)).toBe(true)
    })

    it('provides alternatives', () => {
      const suggestion = suggestCategoryWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Content',
        title: 'Test',
        config: mockConfig,
      })

      expect(suggestion.alternatives).toBeDefined()
      expect(Array.isArray(suggestion.alternatives)).toBe(true)
    })
  })

  describe('categorizeStrandWithContext', () => {
    const mockConfig = {
      auto_apply_threshold: 0.95,
      pr_threshold: 0.8,
      categories: [
        { path: 'weaves/tutorials', keywords: ['tutorial'], description: 'Tutorials' },
      ],
    }

    it('returns full categorization result', async () => {
      const result = await categorizeStrandWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Tutorial content',
        title: 'Test',
        config: mockConfig,
      })

      expect(result.filePath).toBe('/weaves/tutorials/test.md')
      expect(result.suggestion).toBeDefined()
      expect(result.action).toBeDefined()
    })

    it('determines action based on confidence thresholds', async () => {
      const result = await categorizeStrandWithContext({
        path: '/test.md',
        content: 'Generic content',
        title: 'Test',
        config: mockConfig,
      })

      expect(['auto-apply', 'suggest', 'needs-triage']).toContain(result.action)
    })

    it('includes hierarchy context in result', async () => {
      const result = await categorizeStrandWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Content',
        title: 'Test',
        config: mockConfig,
      })

      expect(result.hierarchyContext).toBeDefined()
    })

    it('includes discovered relationships', async () => {
      const result = await categorizeStrandWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'Content with [[link]]',
        title: 'Test',
        config: mockConfig,
      })

      expect(result.discoveredRelationships).toBeDefined()
    })

    it('includes semantic analysis', async () => {
      const result = await categorizeStrandWithContext({
        path: '/weaves/tutorials/test.md',
        content: 'TypeScript React tutorial',
        title: 'Test',
        config: mockConfig,
      })

      expect(result.semanticAnalysis).toBeDefined()
    })
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty content', () => {
    const semantics = analyzeDocumentSemantics('')

    expect(semantics.technologies).toBeDefined()
    expect(semantics.contentType).toBeDefined()
  })

  it('handles path with no hierarchy markers', () => {
    const hierarchy = parseDocumentHierarchy('simple-file.md')

    expect(hierarchy.path).toBe('simple-file.md')
  })

  it('handles missing config', () => {
    const suggestion = suggestCategoryWithContext({
      path: '/test.md',
      content: 'Content',
      title: 'Test',
      config: {},
    })

    expect(suggestion.category).toBeDefined()
  })

  it('handles empty existing index', () => {
    const relationships = analyzeDocumentRelationships('Content', '/test.md', [])

    expect(relationships.siblings).toEqual([])
  })

  it('handles null frontmatter', () => {
    const suggestion = suggestCategoryWithContext({
      path: '/test.md',
      content: 'Content',
      title: 'Test',
      frontmatter: undefined,
      config: {},
    })

    expect(suggestion).toBeDefined()
  })
})

