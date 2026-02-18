/**
 * Auto-Tagging Tests
 * @module __tests__/unit/lib/nlp/autoTagging.test
 *
 * Tests for auto-tagging utilities and NLP-based tag suggestion.
 */

import { describe, it, expect } from 'vitest'
import {
  isTagWorthy,
  determineIllustrationWorthiness,
  buildDocumentTagPrompt,
  buildBlockTagPrompt,
  buildCategorySuggestionPrompt,
  DOCUMENT_TAGGING_SYSTEM_PROMPT,
  BLOCK_TAGGING_SYSTEM_PROMPT,
  CATEGORY_SUGGESTION_SYSTEM_PROMPT,
  DEFAULT_AUTO_TAG_CONFIG,
  DEFAULT_CATEGORIZATION_CONFIG,
} from '@/lib/nlp/autoTagging'

// ============================================================================
// isTagWorthy
// ============================================================================

describe('isTagWorthy', () => {
  const existingTags = ['react', 'typescript', 'testing', 'api', 'database', 'frontend']

  describe('validation rules', () => {
    it('rejects tags that are too short', () => {
      const result = isTagWorthy('a', existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('too short')
    })

    it('accepts valid technology tags', () => {
      // Technology names should be worthy
      const result = isTagWorthy('graphql', existingTags)
      expect(result.worthy).toBe(true)
    })

    it('rejects tags that are too long', () => {
      const result = isTagWorthy('a'.repeat(60), existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('too long')
    })

    it('rejects tags with too many words', () => {
      const result = isTagWorthy('this-is-a-very-long-tag-name', existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('too many words')
    })

    it('accepts tags with up to 4 words', () => {
      const result = isTagWorthy('machine-learning-models', existingTags)
      expect(result.worthy).toBe(true)
    })
  })

  describe('duplicate detection', () => {
    it('rejects exact duplicates', () => {
      const result = isTagWorthy('react', existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('Duplicate')
    })

    it('rejects duplicates with different case', () => {
      const result = isTagWorthy('REACT', existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('Duplicate')
    })

    it('rejects similar tags (typo variants)', () => {
      const result = isTagWorthy('reacct', existingTags) // One char off
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('variant')
    })

    it('rejects substring matches that are too similar', () => {
      const result = isTagWorthy('apis', existingTags) // api is existing
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('similar')
    })

    it('allows significantly different variants', () => {
      const result = isTagWorthy('react-hooks', existingTags)
      expect(result.worthy).toBe(true)
    })
  })

  describe('unworthy patterns', () => {
    it('rejects tags starting with articles', () => {
      expect(isTagWorthy('the-component', existingTags).worthy).toBe(false)
      expect(isTagWorthy('a-feature', existingTags).worthy).toBe(false)
      expect(isTagWorthy('an-idea', existingTags).worthy).toBe(false)
    })

    it('rejects tags starting with possessives', () => {
      expect(isTagWorthy('my-project', existingTags).worthy).toBe(false)
      expect(isTagWorthy('your-code', existingTags).worthy).toBe(false)
      expect(isTagWorthy('our-team', existingTags).worthy).toBe(false)
    })

    it('rejects tags starting with demonstratives', () => {
      expect(isTagWorthy('this-feature', existingTags).worthy).toBe(false)
      expect(isTagWorthy('that-bug', existingTags).worthy).toBe(false)
    })

    it('rejects vague tags', () => {
      expect(isTagWorthy('some-thing', existingTags).worthy).toBe(false)
      expect(isTagWorthy('more-stuff', existingTags).worthy).toBe(false)
    })

    it('rejects dev note patterns', () => {
      expect(isTagWorthy('todo-fix', existingTags).worthy).toBe(false)
      expect(isTagWorthy('fixme-later', existingTags).worthy).toBe(false)
      expect(isTagWorthy('note-123', existingTags).worthy).toBe(false)
    })
  })

  describe('code artifact detection', () => {
    it('rejects obvious code artifacts', () => {
      const result = isTagWorthy('const', existingTags)
      expect(result.worthy).toBe(false)
      expect(result.reason).toContain('code artifact')
    })

    it('rejects single character tags', () => {
      const result = isTagWorthy('i', existingTags)
      expect(result.worthy).toBe(false)
    })
  })

  describe('worthy tags', () => {
    it('accepts valid new technology tags', () => {
      const result = isTagWorthy('graphql', existingTags)
      expect(result.worthy).toBe(true)
      expect(result.reason).toContain('worthy')
    })

    it('accepts valid concept tags', () => {
      const result = isTagWorthy('authentication', existingTags)
      expect(result.worthy).toBe(true)
    })

    it('accepts multi-word tags within limit', () => {
      const result = isTagWorthy('unit-testing', existingTags)
      expect(result.worthy).toBe(true)
    })
  })
})

// ============================================================================
// determineIllustrationWorthiness
// ============================================================================

describe('determineIllustrationWorthiness', () => {
  describe('block type handling', () => {
    it('rejects code blocks by default', () => {
      const result = determineIllustrationWorthiness(
        { content: 'const x = 5;', type: 'code' },
        []
      )
      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('Code block')
    })

    it('accepts code blocks describing diagrams', () => {
      const result = determineIllustrationWorthiness(
        { content: 'class DiagramBuilder { diagram }', type: 'code' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('rejects table blocks', () => {
      const result = determineIllustrationWorthiness(
        { content: '| Col1 | Col2 |', type: 'table' },
        []
      )
      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('already visual')
    })

    it('rejects blockquote blocks', () => {
      const result = determineIllustrationWorthiness(
        { content: '> Some quoted text here', type: 'blockquote' },
        []
      )
      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('decorative')
    })
  })

  describe('visual indicator detection', () => {
    it('detects diagram keywords', () => {
      const result = determineIllustrationWorthiness(
        { content: 'The following diagram shows the system architecture.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
      expect(result.reasoning).toContain('diagram')
    })

    it('detects architecture keywords', () => {
      const result = determineIllustrationWorthiness(
        { content: 'The architecture consists of three main layers.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
      expect(result.reasoning).toContain('architecture')
    })

    it('detects flow/process keywords', () => {
      const result = determineIllustrationWorthiness(
        { content: 'The workflow includes multiple stages and transitions.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('detects hierarchy/structure keywords', () => {
      const result = determineIllustrationWorthiness(
        { content: 'The hierarchy of components in the system.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('detects pipeline keywords', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Our data pipeline processes information in stages.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })
  })

  describe('heading analysis', () => {
    it('warrants illustration for introduction headings', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Welcome to the guide', type: 'heading', headingText: 'Introduction' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('warrants illustration for overview headings', () => {
      const result = determineIllustrationWorthiness(
        { content: 'System overview', type: 'heading', headingText: 'System Overview' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('warrants illustration for architecture headings', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Application structure', type: 'heading', headingText: 'Architecture Design' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('warrants illustration for "how it works" headings', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Explanation', type: 'heading', headingText: 'How It Works' },
        []
      )
      expect(result.warrants).toBe(true)
    })
  })

  describe('process detection', () => {
    it('detects step-by-step descriptions', () => {
      const result = determineIllustrationWorthiness(
        { content: 'First, we start the setup. Then, we do the rest of the work.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
      expect(result.reasoning).toContain('process')
    })

    it('detects numbered steps', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Step 1: Install dependencies. Step 2: Configure environment.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('detects phase descriptions', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Phase 1 involves data collection and analysis.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })

    it('detects sequence indicators', () => {
      const result = determineIllustrationWorthiness(
        { content: 'The process begins with validation, followed by processing.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(true)
    })
  })

  describe('short content handling', () => {
    it('rejects very short blocks', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Short text.', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('too short')
    })

    it('accepts longer conceptual content', () => {
      const result = determineIllustrationWorthiness(
        {
          content: 'This is a longer paragraph that discusses the visualization of data structures and how the components interact with each other in the system.',
          type: 'paragraph'
        },
        []
      )
      expect(result.warrants).toBe(true)
    })
  })

  describe('default behavior', () => {
    it('does not warrant illustration for plain text', () => {
      const result = determineIllustrationWorthiness(
        {
          // Avoid accidental matches: 'paragraph' contains 'graph', 'structure' etc.
          // Need at least 30 words to avoid "too short" rejection
          content: 'This is some text about writing code and developing software applications. We will discuss variables, functions, and loops in detail. Just basic coding concepts here without any visual elements to display or show the reader. The content is purely informational and educational in nature.',
          type: 'paragraph'
        },
        []
      )
      expect(result.warrants).toBe(false)
      expect(result.reasoning).toContain('primarily textual')
    })
  })
})

// ============================================================================
// buildDocumentTagPrompt
// ============================================================================

describe('buildDocumentTagPrompt', () => {
  it('includes existing tags', () => {
    const prompt = buildDocumentTagPrompt(
      'Some content',
      'Test Title',
      ['tag1', 'tag2'],
      [],
      5
    )
    expect(prompt).toContain('- tag1')
    expect(prompt).toContain('- tag2')
  })

  it('indicates no existing tags', () => {
    const prompt = buildDocumentTagPrompt('Content', 'Title', [], [], 5)
    expect(prompt).toContain('(none yet)')
  })

  it('includes related tags', () => {
    const prompt = buildDocumentTagPrompt(
      'Content',
      'Title',
      [],
      ['related1', 'related2'],
      5
    )
    expect(prompt).toContain('- related1')
    expect(prompt).toContain('- related2')
  })

  it('indicates no related tags', () => {
    const prompt = buildDocumentTagPrompt('Content', 'Title', [], [], 5)
    expect(prompt).toContain('(none)')
  })

  it('includes document title', () => {
    const prompt = buildDocumentTagPrompt('Content', 'My Document', [], [], 5)
    expect(prompt).toContain('My Document')
  })

  it('handles untitled documents', () => {
    const prompt = buildDocumentTagPrompt('Content', '', [], [], 5)
    expect(prompt).toContain('(untitled)')
  })

  it('includes document content', () => {
    const prompt = buildDocumentTagPrompt('Important content here', 'Title', [], [], 5)
    expect(prompt).toContain('Important content here')
  })

  it('truncates long content', () => {
    const longContent = 'a'.repeat(10000)
    const prompt = buildDocumentTagPrompt(longContent, 'Title', [], [], 5)
    expect(prompt.length).toBeLessThan(longContent.length)
    expect(prompt).toContain('(truncated)')
  })

  it('includes max tags instruction', () => {
    const prompt = buildDocumentTagPrompt('Content', 'Title', [], [], 7)
    expect(prompt).toContain('up to 7 tags')
  })
})

// ============================================================================
// buildBlockTagPrompt
// ============================================================================

describe('buildBlockTagPrompt', () => {
  it('includes document tags', () => {
    const prompt = buildBlockTagPrompt(
      'Block content',
      'paragraph',
      ['doc-tag1', 'doc-tag2'],
      [],
      null,
      3
    )
    expect(prompt).toContain('- doc-tag1')
    expect(prompt).toContain('- doc-tag2')
  })

  it('includes existing tags (limited to 100)', () => {
    const existingTags = Array.from({ length: 150 }, (_, i) => `tag${i}`)
    const prompt = buildBlockTagPrompt(
      'Content',
      'paragraph',
      [],
      existingTags,
      null,
      3
    )
    expect(prompt).toContain('- tag0')
    expect(prompt).toContain('- tag99')
    expect(prompt).not.toContain('- tag100')
  })

  it('includes previous block context', () => {
    const prompt = buildBlockTagPrompt(
      'Current content',
      'paragraph',
      [],
      [],
      'Previous block discussed authentication',
      3
    )
    expect(prompt).toContain('Previous block discussed authentication')
  })

  it('indicates first block when no previous', () => {
    const prompt = buildBlockTagPrompt('Content', 'paragraph', [], [], null, 3)
    expect(prompt).toContain('(first block)')
  })

  it('includes block type', () => {
    const prompt = buildBlockTagPrompt('Content', 'code', [], [], null, 3)
    expect(prompt).toContain('Type: code')
  })

  it('includes block content', () => {
    const prompt = buildBlockTagPrompt('My block content', 'paragraph', [], [], null, 3)
    expect(prompt).toContain('My block content')
  })

  it('includes max tags instruction', () => {
    const prompt = buildBlockTagPrompt('Content', 'paragraph', [], [], null, 5)
    expect(prompt).toContain('Maximum 5 additional tags')
  })
})

// ============================================================================
// buildCategorySuggestionPrompt
// ============================================================================

describe('buildCategorySuggestionPrompt', () => {
  it('includes existing paths', () => {
    const prompt = buildCategorySuggestionPrompt(
      'Content',
      { title: 'Test' },
      ['weaves/wiki/', 'weaves/notes/']
    )
    expect(prompt).toContain('- weaves/wiki/')
    expect(prompt).toContain('- weaves/notes/')
  })

  it('limits paths to 50', () => {
    const paths = Array.from({ length: 100 }, (_, i) => `weaves/path${i}/`)
    const prompt = buildCategorySuggestionPrompt('Content', { title: 'Test' }, paths)
    expect(prompt).toContain('- weaves/path0/')
    expect(prompt).toContain('- weaves/path49/')
    expect(prompt).not.toContain('- weaves/path50/')
  })

  it('includes document title', () => {
    const prompt = buildCategorySuggestionPrompt('Content', { title: 'My Document' }, [])
    expect(prompt).toContain('My Document')
  })

  it('handles untitled documents', () => {
    const prompt = buildCategorySuggestionPrompt('Content', {}, [])
    expect(prompt).toContain('(untitled)')
  })

  it('includes document tags', () => {
    const prompt = buildCategorySuggestionPrompt(
      'Content',
      { title: 'Test', tags: ['tag1', 'tag2'] },
      []
    )
    expect(prompt).toContain('tag1, tag2')
  })

  it('handles missing tags', () => {
    const prompt = buildCategorySuggestionPrompt('Content', { title: 'Test' }, [])
    expect(prompt).toContain('(none)')
  })

  it('truncates content to 4000 chars', () => {
    const longContent = 'x'.repeat(5000)
    const prompt = buildCategorySuggestionPrompt(longContent, { title: 'Test' }, [])
    expect(prompt.length).toBeLessThan(longContent.length)
  })
})

// ============================================================================
// System Prompts
// ============================================================================

describe('System Prompts', () => {
  describe('DOCUMENT_TAGGING_SYSTEM_PROMPT', () => {
    it('is defined and non-empty', () => {
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toBeDefined()
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('mentions preferring existing tags', () => {
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toContain('PREFER EXISTING TAGS')
    })

    it('mentions hallucination prevention', () => {
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toContain('HALLUCINATION')
    })

    it('specifies JSON output format', () => {
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toContain('JSON')
    })

    it('explains confidence scores', () => {
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toContain('confidence')
      expect(DOCUMENT_TAGGING_SYSTEM_PROMPT).toContain('0.9')
    })
  })

  describe('BLOCK_TAGGING_SYSTEM_PROMPT', () => {
    it('is defined and non-empty', () => {
      expect(BLOCK_TAGGING_SYSTEM_PROMPT).toBeDefined()
      expect(BLOCK_TAGGING_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('mentions conservative approach', () => {
      expect(BLOCK_TAGGING_SYSTEM_PROMPT).toContain('CONSERVATIVE')
    })

    it('mentions inheriting document tags', () => {
      expect(BLOCK_TAGGING_SYSTEM_PROMPT).toContain('INHERIT')
    })

    it('mentions illustration worthiness', () => {
      expect(BLOCK_TAGGING_SYSTEM_PROMPT).toContain('warrantsNewIllustration')
    })
  })

  describe('CATEGORY_SUGGESTION_SYSTEM_PROMPT', () => {
    it('is defined and non-empty', () => {
      expect(CATEGORY_SUGGESTION_SYSTEM_PROMPT).toBeDefined()
      expect(CATEGORY_SUGGESTION_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('specifies JSON output format', () => {
      expect(CATEGORY_SUGGESTION_SYSTEM_PROMPT).toContain('JSON')
    })

    it('mentions preferring existing paths', () => {
      expect(CATEGORY_SUGGESTION_SYSTEM_PROMPT).toContain('existing paths')
    })
  })
})

// ============================================================================
// Default Configs
// ============================================================================

describe('Default Configs', () => {
  describe('DEFAULT_AUTO_TAG_CONFIG', () => {
    it('has document auto-tag enabled', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.documentAutoTag).toBe(true)
    })

    it('has block auto-tag enabled', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.blockAutoTag).toBe(true)
    })

    it('has LLM disabled by default', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.useLLM).toBe(false)
    })

    it('prefers existing tags', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.preferExistingTags).toBe(true)
    })

    it('has reasonable max tags per block', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerBlock).toBe(3)
    })

    it('has reasonable max tags per document', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.maxNewTagsPerDocument).toBe(10)
    })

    it('has reasonable confidence threshold', () => {
      expect(DEFAULT_AUTO_TAG_CONFIG.confidenceThreshold).toBe(0.6)
    })
  })

  describe('DEFAULT_CATEGORIZATION_CONFIG', () => {
    it('is enabled by default', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.enabled).toBe(true)
    })

    it('has high confidence threshold for auto-merge', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.confidenceThreshold).toBe(0.8)
    })

    it('has auto-merge enabled', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.autoMergeEnabled).toBe(true)
    })

    it('has LLM fallback enabled', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.useLLMFallback).toBe(true)
    })

    it('has inbox path defined', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.inboxPath).toBe('weaves/inbox/')
    })

    it('excludes inbox from categorization', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.excludedPaths).toContain('weaves/inbox/')
    })

    it('excludes templates from categorization', () => {
      expect(DEFAULT_CATEGORIZATION_CONFIG.excludedPaths).toContain('weaves/.templates/')
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('isTagWorthy edge cases', () => {
    it('handles empty tag', () => {
      const result = isTagWorthy('', [])
      expect(result.worthy).toBe(false)
    })

    it('handles whitespace-only tag', () => {
      const result = isTagWorthy('   ', [])
      expect(result.worthy).toBe(false)
    })

    it('handles special characters', () => {
      const result = isTagWorthy('c++', [])
      // Should normalize and check
      expect(result).toBeDefined()
    })

    it('handles empty existing tags array', () => {
      const result = isTagWorthy('new-tag', [])
      expect(result.worthy).toBe(true)
    })
  })

  describe('determineIllustrationWorthiness edge cases', () => {
    it('handles empty content', () => {
      const result = determineIllustrationWorthiness(
        { content: '', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(false)
    })

    it('handles content with only whitespace', () => {
      const result = determineIllustrationWorthiness(
        { content: '   \n\t   ', type: 'paragraph' },
        []
      )
      expect(result.warrants).toBe(false)
    })

    it('handles unknown block type', () => {
      const result = determineIllustrationWorthiness(
        { content: 'Some architecture diagram content', type: 'custom' },
        []
      )
      // Should still detect visual indicators
      expect(result.warrants).toBe(true)
    })
  })

  describe('prompt building edge cases', () => {
    it('buildDocumentTagPrompt handles empty arrays', () => {
      const prompt = buildDocumentTagPrompt('', '', [], [], 0)
      expect(prompt).toBeDefined()
      expect(prompt.length).toBeGreaterThan(0)
    })

    it('buildBlockTagPrompt handles empty inputs', () => {
      const prompt = buildBlockTagPrompt('', '', [], [], null, 0)
      expect(prompt).toBeDefined()
    })

    it('buildCategorySuggestionPrompt handles empty metadata', () => {
      const prompt = buildCategorySuggestionPrompt('', {}, [])
      expect(prompt).toBeDefined()
    })
  })
})
