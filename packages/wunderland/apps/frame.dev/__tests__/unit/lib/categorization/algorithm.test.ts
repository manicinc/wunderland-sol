/**
 * Categorization Algorithm Tests
 * @module __tests__/unit/lib/categorization/algorithm.test
 *
 * Tests for keyword-based categorization algorithm.
 */

import { describe, it, expect } from 'vitest'
import {
  extractKeywords,
  parseFrontmatter,
  extractTitle,
  suggestCategory,
  categorizeStrand,
  categorizeStrands,
  DEFAULT_CATEGORIES,
  DEFAULT_CONFIG,
} from '@/lib/categorization/algorithm'

// ============================================================================
// extractKeywords
// ============================================================================

describe('extractKeywords', () => {
  it('extracts words from content', () => {
    const keywords = extractKeywords('This is a tutorial about React programming')

    expect(keywords.length).toBeGreaterThan(0)
  })

  it('returns lowercase keywords', () => {
    const keywords = extractKeywords('Tutorial GUIDE Learning')

    expect(keywords.every(k => k === k.toLowerCase())).toBe(true)
  })

  it('filters words shorter than 4 characters', () => {
    const keywords = extractKeywords('a to the and for with tutorial')

    expect(keywords).not.toContain('a')
    expect(keywords).not.toContain('to')
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('and')
  })

  it('removes punctuation', () => {
    const keywords = extractKeywords('Hello, world! How are you?')

    expect(keywords.every(k => !k.includes(','))).toBe(true)
    expect(keywords.every(k => !k.includes('!'))).toBe(true)
    expect(keywords.every(k => !k.includes('?'))).toBe(true)
  })

  it('returns top keywords by frequency', () => {
    const keywords = extractKeywords(
      'tutorial tutorial tutorial guide guide reference'
    )

    expect(keywords[0]).toBe('tutorial')
    expect(keywords[1]).toBe('guide')
  })

  it('limits to 30 keywords', () => {
    const longContent = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ')
    const keywords = extractKeywords(longContent)

    expect(keywords.length).toBeLessThanOrEqual(30)
  })

  it('handles empty content', () => {
    const keywords = extractKeywords('')

    expect(keywords).toEqual([])
  })

  it('preserves hyphens', () => {
    const keywords = extractKeywords('step-by-step how-to guide')

    expect(keywords.some(k => k.includes('-'))).toBe(true)
  })
})

// ============================================================================
// parseFrontmatter
// ============================================================================

describe('parseFrontmatter', () => {
  it('extracts title from frontmatter', () => {
    const content = `---
title: My Document
---
Content here`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.title).toBe('My Document')
  })

  it('extracts summary from frontmatter', () => {
    const content = `---
summary: A brief summary
---
Content`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.summary).toBe('A brief summary')
  })

  it('extracts tags array', () => {
    const content = `---
tags: [react, typescript, tutorial]
---
Content`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.tags).toEqual(['react', 'typescript', 'tutorial'])
  })

  it('extracts taxonomy topics', () => {
    const content = `---
taxonomy:
  topics: [programming, web-development]
---
Content`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.taxonomy?.topics).toEqual(['programming', 'web-development'])
  })

  it('returns body without frontmatter', () => {
    const content = `---
title: Test
---
This is the body content.`

    const { body } = parseFrontmatter(content)

    expect(body.trim()).toBe('This is the body content.')
  })

  it('handles content without frontmatter', () => {
    const content = 'Just regular content'

    const { metadata, body } = parseFrontmatter(content)

    expect(metadata).toEqual({})
    expect(body).toBe('Just regular content')
  })

  it('handles empty content', () => {
    const { metadata, body } = parseFrontmatter('')

    expect(metadata).toEqual({})
    expect(body).toBe('')
  })

  it('strips quotes from values', () => {
    const content = `---
title: "Quoted Title"
---
Content`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.title).toBe('Quoted Title')
  })

  it('handles single quotes', () => {
    const content = `---
title: 'Single Quoted'
---
Content`

    const { metadata } = parseFrontmatter(content)

    expect(metadata.title).toBe('Single Quoted')
  })
})

// ============================================================================
// extractTitle
// ============================================================================

describe('extractTitle', () => {
  it('extracts title from metadata', () => {
    const metadata = { title: 'Metadata Title' }
    const content = '# Heading Title'

    const title = extractTitle(metadata, content)

    expect(title).toBe('Metadata Title')
  })

  it('extracts title from heading when no metadata', () => {
    const metadata = {}
    const content = '# First Heading\n\nContent here'

    const title = extractTitle(metadata, content)

    expect(title).toBe('First Heading')
  })

  it('returns Untitled when no title found', () => {
    const metadata = {}
    const content = 'Content without heading'

    const title = extractTitle(metadata, content)

    expect(title).toBe('Untitled')
  })

  it('prefers metadata over heading', () => {
    const metadata = { title: 'Metadata Title' }
    const content = '# Different Heading'

    const title = extractTitle(metadata, content)

    expect(title).toBe('Metadata Title')
  })

  it('trims whitespace from heading', () => {
    const metadata = {}
    const content = '#   Spaced Heading   \n\nContent'

    const title = extractTitle(metadata, content)

    expect(title).toBe('Spaced Heading')
  })
})

// ============================================================================
// suggestCategory
// ============================================================================

describe('suggestCategory', () => {
  const minimalConfig = {
    auto_apply_threshold: 0.95,
    pr_threshold: 0.80,
    categories: DEFAULT_CATEGORIES,
  }

  it('returns category suggestion', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'This is a tutorial about React',
      title: 'React Tutorial',
      config: minimalConfig,
    })

    expect(suggestion.category).toBeDefined()
    expect(suggestion.confidence).toBeGreaterThan(0)
  })

  it('suggests tutorials for tutorial content', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'This tutorial will teach you step-by-step how to learn React',
      title: 'React Tutorial Guide',
      config: minimalConfig,
    })

    expect(suggestion.category).toContain('tutorials')
    expect(suggestion.confidence).toBeGreaterThan(0.3)
  })

  it('suggests reference for API content', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'API reference documentation for the interface specification',
      title: 'API Reference',
      config: minimalConfig,
    })

    expect(suggestion.category).toContain('reference')
  })

  it('suggests concepts for theoretical content', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'This explains the fundamental architecture and design patterns',
      title: 'System Architecture Concepts',
      config: minimalConfig,
    })

    expect(suggestion.category).toContain('concepts')
  })

  it('includes alternatives', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'Tutorial guide with API reference',
      title: 'Mixed Content',
      config: minimalConfig,
    })

    expect(suggestion.alternatives).toBeDefined()
    expect(Array.isArray(suggestion.alternatives)).toBe(true)
  })

  it('includes reasoning', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'Tutorial content',
      title: 'Test',
      config: minimalConfig,
    })

    expect(suggestion.reasoning).toBeDefined()
    expect(suggestion.reasoning.length).toBeGreaterThan(0)
  })

  it('falls back to inbox for unknown content', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'Random unrelated content xyz123',
      title: 'Unknown',
      config: minimalConfig,
    })

    expect(suggestion.category).toBe('weaves/inbox/')
    expect(suggestion.confidence).toBe(0.3)
  })

  it('considers metadata tags', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'Some content',
      title: 'Test',
      frontmatter: { tags: ['tutorial', 'guide'] },
      config: minimalConfig,
    })

    expect(suggestion.confidence).toBeGreaterThan(0)
  })

  it('considers taxonomy topics', () => {
    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'Some content',
      title: 'Test',
      frontmatter: { taxonomy: { topics: ['architecture', 'pattern'] } },
      config: minimalConfig,
    })

    expect(suggestion.confidence).toBeGreaterThan(0)
  })

  it('respects keyword hints', () => {
    const configWithHints = {
      ...minimalConfig,
      keyword_hints: {
        'weaves/custom/': ['custom-keyword', 'special-term'],
      },
    }

    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'This contains custom-keyword and special-term',
      title: 'Custom Content',
      config: configWithHints,
    })

    expect(suggestion.category).toBe('weaves/custom/')
  })

  it('respects excluded paths', () => {
    const configWithExclusions = {
      ...minimalConfig,
      excluded_paths: ['weaves/wiki/tutorials/'],
    }

    const suggestion = suggestCategory({
      path: '/test.md',
      content: 'This is a tutorial guide',
      title: 'Tutorial',
      config: configWithExclusions,
    })

    // Should suggest something other than tutorials since it's excluded
    expect(suggestion.category).not.toBe('weaves/wiki/tutorials/')
  })
})

// ============================================================================
// categorizeStrand
// ============================================================================

describe('categorizeStrand', () => {
  const minimalConfig = {
    auto_apply_threshold: 0.95,
    pr_threshold: 0.80,
    categories: DEFAULT_CATEGORIES,
  }

  it('returns categorization result', async () => {
    const result = await categorizeStrand({
      path: '/docs/test.md',
      content: 'Tutorial content here',
      title: 'Test',
      config: minimalConfig,
    })

    expect(result.filePath).toBe('/docs/test.md')
    expect(result.suggestion).toBeDefined()
    expect(result.action).toBeDefined()
  })

  it('determines auto-apply action for high confidence', async () => {
    const result = await categorizeStrand({
      path: '/test.md',
      content: `
        # Comprehensive Tutorial Guide
        This step-by-step tutorial will teach you how to learn everything.
        Learning is fundamental to this guide introduction.
        Tags include tutorial, guide, how-to, learn.
      `,
      title: 'Complete Tutorial Guide',
      frontmatter: {
        tags: ['tutorial', 'guide', 'learning'],
        taxonomy: { topics: ['tutorial', 'learn', 'guide'] }
      },
      config: {
        ...minimalConfig,
        auto_apply_threshold: 0.8, // Lower threshold for testing
      },
    })

    expect(['auto-apply', 'suggest']).toContain(result.action)
  })

  it('determines suggest action for medium confidence', async () => {
    const result = await categorizeStrand({
      path: '/test.md',
      content: 'Some tutorial content',
      title: 'Test',
      config: {
        ...minimalConfig,
        auto_apply_threshold: 0.99,
        pr_threshold: 0.1,
      },
    })

    // With very high auto threshold and very low PR threshold
    expect(['suggest', 'needs-triage']).toContain(result.action)
  })

  it('determines needs-triage action for low confidence', async () => {
    const result = await categorizeStrand({
      path: '/test.md',
      content: 'xyz123 random content',
      title: 'Unknown',
      config: {
        ...minimalConfig,
        pr_threshold: 0.9,
      },
    })

    expect(result.action).toBe('needs-triage')
  })

  it('extracts current path from file path', async () => {
    const result = await categorizeStrand({
      path: '/weaves/wiki/tutorials/react-intro.md',
      content: 'Content',
      title: 'Test',
      config: minimalConfig,
    })

    expect(result.currentPath).toBe('/weaves/wiki/tutorials/')
  })

  it('parses frontmatter from content', async () => {
    const content = `---
title: Frontmatter Title
tags: [api, reference]
---
This is about API documentation`

    const result = await categorizeStrand({
      path: '/test.md',
      content,
      config: minimalConfig,
    })

    // Should use frontmatter title and consider tags
    expect(result.suggestion).toBeDefined()
  })
})

// ============================================================================
// categorizeStrands (batch)
// ============================================================================

describe('categorizeStrands', () => {
  const minimalConfig = {
    auto_apply_threshold: 0.95,
    pr_threshold: 0.80,
    categories: DEFAULT_CATEGORIES,
  }

  it('categorizes multiple strands', async () => {
    const inputs = [
      { path: '/doc1.md', content: 'Tutorial one', title: 'Doc 1', config: minimalConfig },
      { path: '/doc2.md', content: 'Reference two', title: 'Doc 2', config: minimalConfig },
    ]

    const results = await categorizeStrands(inputs)

    expect(results.length).toBe(2)
    expect(results[0].filePath).toBe('/doc1.md')
    expect(results[1].filePath).toBe('/doc2.md')
  })

  it('calls progress callback', async () => {
    const inputs = [
      { path: '/doc1.md', content: 'Content', title: 'Doc 1', config: minimalConfig },
      { path: '/doc2.md', content: 'Content', title: 'Doc 2', config: minimalConfig },
      { path: '/doc3.md', content: 'Content', title: 'Doc 3', config: minimalConfig },
    ]

    const progressCalls: [number, number][] = []
    const onProgress = (current: number, total: number) => {
      progressCalls.push([current, total])
    }

    await categorizeStrands(inputs, onProgress)

    expect(progressCalls.length).toBe(3)
    expect(progressCalls[0]).toEqual([1, 3])
    expect(progressCalls[1]).toEqual([2, 3])
    expect(progressCalls[2]).toEqual([3, 3])
  })

  it('handles empty array', async () => {
    const results = await categorizeStrands([])

    expect(results).toEqual([])
  })
})

// ============================================================================
// DEFAULT_CATEGORIES
// ============================================================================

describe('DEFAULT_CATEGORIES', () => {
  it('contains standard categories', () => {
    const paths = DEFAULT_CATEGORIES.map(c => c.path)

    expect(paths.some(p => p.includes('tutorials'))).toBe(true)
    expect(paths.some(p => p.includes('reference'))).toBe(true)
    expect(paths.some(p => p.includes('concepts'))).toBe(true)
  })

  it('all categories have required fields', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.path).toBeDefined()
      expect(category.description).toBeDefined()
      expect(category.keywords).toBeDefined()
      expect(category.keywords.length).toBeGreaterThan(0)
    }
  })

  it('all categories have valid weights', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.weight).toBeGreaterThan(0)
      expect(category.weight).toBeLessThanOrEqual(2)
    }
  })
})

// ============================================================================
// DEFAULT_CONFIG
// ============================================================================

describe('DEFAULT_CONFIG', () => {
  it('has enabled flag', () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true)
  })

  it('has valid thresholds', () => {
    expect(DEFAULT_CONFIG.auto_apply_threshold).toBeLessThanOrEqual(1)
    expect(DEFAULT_CONFIG.auto_apply_threshold).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.pr_threshold).toBeLessThanOrEqual(1)
    expect(DEFAULT_CONFIG.pr_threshold).toBeGreaterThan(0)
    expect(DEFAULT_CONFIG.auto_apply_threshold).toBeGreaterThan(DEFAULT_CONFIG.pr_threshold)
  })

  it('includes categories', () => {
    expect(DEFAULT_CONFIG.categories).toBeDefined()
    expect(DEFAULT_CONFIG.categories.length).toBeGreaterThan(0)
  })

  it('has excluded paths', () => {
    expect(DEFAULT_CONFIG.excluded_paths).toBeDefined()
    expect(DEFAULT_CONFIG.excluded_paths).toContain('weaves/inbox/')
  })

  it('has keyword hints object', () => {
    expect(DEFAULT_CONFIG.keyword_hints).toBeDefined()
    expect(typeof DEFAULT_CONFIG.keyword_hints).toBe('object')
  })
})
