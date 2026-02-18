/**
 * Summarization Prompts Tests
 * @module __tests__/unit/lib/summarization/prompts.test
 *
 * Tests for summarization prompt building functions.
 */

import { describe, it, expect } from 'vitest'
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildScrapeSummaryPrompt,
  buildQuoteExtractionPrompt,
  buildDiscussionQuestionsPrompt,
  buildLitReviewOutlinePrompt,
} from '@/lib/summarization/prompts'
import type { SummarizationRequest, SummarizationSource } from '@/lib/summarization/types'

// ============================================================================
// Test fixtures
// ============================================================================

const basicRequest: SummarizationRequest = {
  type: 'digest',
  length: 'standard',
  sources: [],
}

const fullRequest: SummarizationRequest = {
  type: 'executive',
  length: 'brief',
  sources: [],
  audience: 'executive',
  includeCitations: true,
  focus: 'market trends',
}

const basicSource: SummarizationSource = {
  title: 'Introduction to AI',
  url: 'https://example.com/ai-intro',
  content: 'Artificial intelligence is transforming industries worldwide.',
  domain: 'example.com',
}

const academicSource: SummarizationSource = {
  title: 'Neural Networks in Healthcare',
  url: 'https://journal.example.com/nn-health',
  content: 'This study examines the application of neural networks in diagnostic medicine.',
  domain: 'journal.example.com',
  authors: ['Smith, J.', 'Doe, M.'],
  isAcademic: true,
}

// ============================================================================
// buildSystemPrompt
// ============================================================================

describe('buildSystemPrompt', () => {
  describe('base content', () => {
    it('includes research assistant system prompt', () => {
      const result = buildSystemPrompt(basicRequest)
      expect(result).toContain('expert research assistant')
      expect(result).toContain('synthesizing')
    })

    it('includes task section', () => {
      const result = buildSystemPrompt(basicRequest)
      expect(result).toContain('## Task')
    })

    it('includes length section', () => {
      const result = buildSystemPrompt(basicRequest)
      expect(result).toContain('## Length')
    })
  })

  describe('summary type prompts', () => {
    it('includes digest-specific instructions', () => {
      const result = buildSystemPrompt({ ...basicRequest, type: 'digest' })
      expect(result).toContain('comprehensive digest')
      expect(result).toContain('synthesizes')
    })

    it('includes abstract-specific instructions', () => {
      const result = buildSystemPrompt({ ...basicRequest, type: 'abstract' })
      expect(result).toContain('academic-style abstract')
      expect(result).toContain('Background/Context')
      expect(result).toContain('formal academic language')
    })

    it('includes key-points-specific instructions', () => {
      const result = buildSystemPrompt({ ...basicRequest, type: 'key-points' })
      expect(result).toContain('numbered list')
      expect(result).toContain('concise')
    })

    it('includes comparison-specific instructions', () => {
      const result = buildSystemPrompt({ ...basicRequest, type: 'comparison' })
      expect(result).toContain('Compare and contrast')
      expect(result).toContain('Common Themes')
      expect(result).toContain('Differences')
    })

    it('includes executive-specific instructions', () => {
      const result = buildSystemPrompt({ ...basicRequest, type: 'executive' })
      expect(result).toContain('executive summary')
      expect(result).toContain('decision-makers')
    })
  })

  describe('length modifiers', () => {
    it('includes brief length modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, length: 'brief' })
      expect(result).toContain('50-100 words')
      expect(result).toContain('concise')
    })

    it('includes standard length modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, length: 'standard' })
      expect(result).toContain('150-250 words')
    })

    it('includes detailed length modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, length: 'detailed' })
      expect(result).toContain('300-500 words')
      expect(result).toContain('comprehensive')
    })
  })

  describe('optional sections', () => {
    it('includes audience section when specified', () => {
      const result = buildSystemPrompt({ ...basicRequest, audience: 'technical' })
      expect(result).toContain('## Audience')
      expect(result).toContain('technical language')
    })

    it('includes citations section when enabled', () => {
      const result = buildSystemPrompt({ ...basicRequest, includeCitations: true })
      expect(result).toContain('## Citations')
      expect(result).toContain('inline citations')
    })

    it('includes focus section when specified', () => {
      const result = buildSystemPrompt({ ...basicRequest, focus: 'machine learning' })
      expect(result).toContain('## Focus Area')
      expect(result).toContain('machine learning')
    })

    it('omits optional sections when not specified', () => {
      const result = buildSystemPrompt(basicRequest)
      expect(result).not.toContain('## Audience')
      expect(result).not.toContain('## Citations')
      expect(result).not.toContain('## Focus Area')
    })
  })

  describe('audience modifiers', () => {
    it('includes general audience modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, audience: 'general' })
      expect(result).toContain('accessible language')
    })

    it('includes academic audience modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, audience: 'academic' })
      expect(result).toContain('formal academic language')
    })

    it('includes executive audience modifier', () => {
      const result = buildSystemPrompt({ ...basicRequest, audience: 'executive' })
      expect(result).toContain('business language')
    })
  })
})

// ============================================================================
// buildUserPrompt
// ============================================================================

describe('buildUserPrompt', () => {
  describe('source formatting', () => {
    it('includes source title', () => {
      const result = buildUserPrompt([basicSource], 'digest')
      expect(result).toContain('Source 1: Introduction to AI')
    })

    it('includes source URL', () => {
      const result = buildUserPrompt([basicSource], 'digest')
      expect(result).toContain('URL: https://example.com/ai-intro')
    })

    it('includes source content', () => {
      const result = buildUserPrompt([basicSource], 'digest')
      expect(result).toContain('Artificial intelligence is transforming')
    })

    it('includes authors when present', () => {
      const result = buildUserPrompt([academicSource], 'digest')
      expect(result).toContain('Authors: Smith, J., Doe, M.')
    })

    it('includes academic indicator when applicable', () => {
      const result = buildUserPrompt([academicSource], 'digest')
      expect(result).toContain('Type: Academic/Research')
    })
  })

  describe('multiple sources', () => {
    it('numbers sources correctly', () => {
      const result = buildUserPrompt([basicSource, academicSource], 'digest')
      expect(result).toContain('Source 1:')
      expect(result).toContain('Source 2:')
    })

    it('separates sources with dividers', () => {
      const result = buildUserPrompt([basicSource, academicSource], 'digest')
      expect(result).toContain('---')
    })
  })

  describe('intro text by type', () => {
    it('uses summarize intro for digest', () => {
      const result = buildUserPrompt([basicSource], 'digest')
      expect(result).toContain('Please summarize')
    })

    it('uses compare intro for comparison', () => {
      const result = buildUserPrompt([basicSource, academicSource], 'comparison')
      expect(result).toContain('Please compare and contrast')
    })

    it('uses key points intro for key-points', () => {
      const result = buildUserPrompt([basicSource], 'key-points')
      expect(result).toContain('Please extract the key points')
    })

    it('uses abstract intro for abstract', () => {
      const result = buildUserPrompt([basicSource], 'abstract')
      expect(result).toContain('Please write an academic abstract')
    })

    it('uses executive intro for executive', () => {
      const result = buildUserPrompt([basicSource], 'executive')
      expect(result).toContain('Please provide an executive summary')
    })
  })

  describe('source count in intro', () => {
    it('shows correct count for single source', () => {
      const result = buildUserPrompt([basicSource], 'digest')
      expect(result).toContain('1 source')
    })

    it('shows correct count for multiple sources', () => {
      const result = buildUserPrompt([basicSource, academicSource], 'digest')
      expect(result).toContain('2 source')
    })
  })
})

// ============================================================================
// buildScrapeSummaryPrompt
// ============================================================================

describe('buildScrapeSummaryPrompt', () => {
  it('creates source from URL and content', () => {
    const result = buildScrapeSummaryPrompt(
      'https://example.com/article',
      'Article content here.',
      'digest'
    )
    expect(result).toContain('Source 1: Web Page')
    expect(result).toContain('URL: https://example.com/article')
    expect(result).toContain('Article content here.')
  })

  it('uses correct summary type intro', () => {
    const result = buildScrapeSummaryPrompt(
      'https://example.com',
      'Content',
      'key-points'
    )
    expect(result).toContain('Please extract the key points')
  })
})

// ============================================================================
// buildQuoteExtractionPrompt
// ============================================================================

describe('buildQuoteExtractionPrompt', () => {
  it('includes quote extraction instructions', () => {
    const result = buildQuoteExtractionPrompt([basicSource])
    expect(result).toContain('3-5 most significant quotes')
    expect(result).toContain('exact quote')
    expect(result).toContain('quotation marks')
  })

  it('includes source content', () => {
    const result = buildQuoteExtractionPrompt([basicSource])
    expect(result).toContain('Introduction to AI')
    expect(result).toContain('Artificial intelligence')
  })

  it('numbers sources', () => {
    const result = buildQuoteExtractionPrompt([basicSource, academicSource])
    expect(result).toContain('1. Introduction to AI')
    expect(result).toContain('2. Neural Networks in Healthcare')
  })

  it('asks for significance explanation', () => {
    const result = buildQuoteExtractionPrompt([basicSource])
    expect(result).toContain('why this quote is significant')
  })
})

// ============================================================================
// buildDiscussionQuestionsPrompt
// ============================================================================

describe('buildDiscussionQuestionsPrompt', () => {
  it('asks for 5 discussion questions', () => {
    const result = buildDiscussionQuestionsPrompt([basicSource])
    expect(result).toContain('5 thought-provoking discussion questions')
  })

  it('includes question criteria', () => {
    const result = buildDiscussionQuestionsPrompt([basicSource])
    expect(result).toContain('critical thinking')
    expect(result).toContain('Connect ideas across sources')
    expect(result).toContain('further research')
  })

  it('includes sources with content', () => {
    const result = buildDiscussionQuestionsPrompt([basicSource])
    expect(result).toContain('1. Introduction to AI')
    expect(result).toContain('Artificial intelligence')
  })
})

// ============================================================================
// buildLitReviewOutlinePrompt
// ============================================================================

describe('buildLitReviewOutlinePrompt', () => {
  it('includes outline structure', () => {
    const result = buildLitReviewOutlinePrompt([basicSource])
    expect(result).toContain('literature review')
    expect(result).toContain('Introduction')
    expect(result).toContain('Thematic Sections')
    expect(result).toContain('Analysis')
    expect(result).toContain('Conclusion')
  })

  it('includes analysis requirements', () => {
    const result = buildLitReviewOutlinePrompt([basicSource])
    expect(result).toContain('Common findings')
    expect(result).toContain('Gaps in research')
  })

  it('includes source type indicator', () => {
    const result = buildLitReviewOutlinePrompt([academicSource])
    expect(result).toContain('(Academic)')
  })

  it('includes web indicator for non-academic', () => {
    const result = buildLitReviewOutlinePrompt([basicSource])
    expect(result).toContain('(Web)')
  })

  it('identifies 2-4 major themes requirement', () => {
    const result = buildLitReviewOutlinePrompt([basicSource])
    expect(result).toContain('2-4 major themes')
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty sources array', () => {
    const result = buildUserPrompt([], 'digest')
    expect(result).toContain('0 source')
  })

  it('handles source with minimal data', () => {
    const minimalSource: SummarizationSource = {
      title: 'Minimal',
      url: 'https://minimal.com',
      content: 'Content',
      domain: 'minimal.com',
    }
    const result = buildUserPrompt([minimalSource], 'digest')
    expect(result).toContain('Minimal')
    expect(result).not.toContain('Authors:')
    expect(result).not.toContain('Type: Academic')
  })

  it('handles very long content', () => {
    const longContent = 'Word '.repeat(1000)
    const longSource: SummarizationSource = {
      ...basicSource,
      content: longContent,
    }
    const result = buildUserPrompt([longSource], 'digest')
    expect(result).toContain(longContent)
  })

  it('handles special characters in content', () => {
    const specialSource: SummarizationSource = {
      ...basicSource,
      content: 'Test <html> & "quotes" \'apostrophes\'',
    }
    const result = buildUserPrompt([specialSource], 'digest')
    expect(result).toContain('<html>')
    expect(result).toContain('&')
    expect(result).toContain('"quotes"')
  })

  it('handles URL with special characters', () => {
    const specialUrlSource: SummarizationSource = {
      ...basicSource,
      url: 'https://example.com/path?query=value&other=123',
    }
    const result = buildUserPrompt([specialUrlSource], 'digest')
    expect(result).toContain('?query=value&other=123')
  })
})
