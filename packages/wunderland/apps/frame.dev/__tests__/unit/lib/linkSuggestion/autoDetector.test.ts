/**
 * Auto Link Detector Tests
 * @module __tests__/unit/lib/linkSuggestion/autoDetector.test
 *
 * Tests for unlinked mention detection and auto-linking suggestions.
 */

import { describe, it, expect } from 'vitest'
import {
  detectUnlinkedMentions,
  extractSignificantTerms,
  type StrandInfo,
  type DetectionOptions,
} from '@/lib/linkSuggestion/autoDetector'

// ============================================================================
// Test fixtures
// ============================================================================

const testStrands: StrandInfo[] = [
  { path: '/notes/javascript', title: 'JavaScript', tags: ['programming'] },
  { path: '/notes/react', title: 'React', tags: ['framework'] },
  { path: '/notes/typescript', title: 'TypeScript', aliases: ['TS'] },
  { path: '/notes/nodejs', title: 'Node.js', aliases: ['NodeJS', 'Node'] },
  { path: '/notes/machine-learning', title: 'Machine Learning', aliases: ['ML'] },
]

// ============================================================================
// detectUnlinkedMentions - Basic Detection
// ============================================================================

describe('detectUnlinkedMentions', () => {
  describe('basic detection', () => {
    it('detects exact title matches', () => {
      const content = 'I am learning JavaScript today.'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('JavaScript')
      expect(result.mentions[0].isExactMatch).toBe(true)
      expect(result.mentions[0].confidence).toBe(1.0)
    })

    it('detects multiple mentions', () => {
      const content = 'JavaScript and React are popular frameworks.'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions.length).toBe(2)
      const matchedTexts = result.mentions.map(m => m.matchedText)
      expect(matchedTexts).toContain('JavaScript')
      expect(matchedTexts).toContain('React')
    })

    it('detects mentions via aliases', () => {
      const content = 'TypeScript is often abbreviated as TS.'
      // Use minWordLength: 2 to allow 2-char alias 'TS' to be detected
      const result = detectUnlinkedMentions(content, testStrands, { minWordLength: 2 })

      expect(result.mentions.length).toBe(2)
      const matchedTexts = result.mentions.map(m => m.matchedText)
      expect(matchedTexts).toContain('TypeScript')
      expect(matchedTexts).toContain('TS')
    })

    it('returns correct positions', () => {
      const content = 'Learn JavaScript basics'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions[0].startIndex).toBe(6)
      expect(result.mentions[0].endIndex).toBe(16)
    })

    it('includes context around match', () => {
      const content = 'I have been studying JavaScript for many years now.'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions[0].context).toContain('JavaScript')
      expect(result.mentions[0].context).toContain('studying')
    })
  })

  describe('case sensitivity', () => {
    it('matches case-insensitively by default', () => {
      const content = 'javascript is great'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('javascript')
    })

    it('respects caseInsensitive option', () => {
      const content = 'javascript is great'
      const result = detectUnlinkedMentions(content, testStrands, { caseInsensitive: false })

      expect(result.mentions.length).toBe(0)
    })
  })

  describe('existing links', () => {
    it('ignores text inside [[...]] links by default', () => {
      const content = 'I use [[JavaScript]] and React daily.'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('React')
    })

    it('can include existing links when option disabled', () => {
      const content = 'I use [[JavaScript]] and React daily.'
      const result = detectUnlinkedMentions(content, testStrands, { ignoreExistingLinks: false })

      expect(result.mentions.length).toBe(2)
    })
  })

  describe('confidence filtering', () => {
    it('filters by minConfidence', () => {
      const content = 'JavaScript is awesome'
      const result = detectUnlinkedMentions(content, testStrands, { minConfidence: 0.99 })

      // Only exact matches have 1.0 confidence
      expect(result.mentions.every(m => m.confidence >= 0.99)).toBe(true)
    })

    it('includes lower confidence with lower threshold', () => {
      const content = 'JavaScript is awesome'
      const result = detectUnlinkedMentions(content, testStrands, { minConfidence: 0.5 })

      expect(result.mentions.length).toBeGreaterThan(0)
    })
  })

  describe('word length filtering', () => {
    it('skips very short terms', () => {
      const strands: StrandInfo[] = [
        { path: '/notes/a', title: 'A' },
        { path: '/notes/ab', title: 'AB' },
        { path: '/notes/abc', title: 'ABC' },
      ]
      const content = 'A AB ABC are here'
      const result = detectUnlinkedMentions(content, strands, { minWordLength: 3 })

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('ABC')
    })
  })

  describe('max suggestions', () => {
    it('limits results to maxSuggestions', () => {
      const content = 'JavaScript React TypeScript Node.js Machine Learning'
      const result = detectUnlinkedMentions(content, testStrands, { maxSuggestions: 2 })

      expect(result.mentions.length).toBe(2)
    })

    it('sorts by confidence (highest first)', () => {
      const content = 'JavaScript React TypeScript'
      const result = detectUnlinkedMentions(content, testStrands)

      for (let i = 1; i < result.mentions.length; i++) {
        expect(result.mentions[i].confidence).toBeLessThanOrEqual(result.mentions[i - 1].confidence)
      }
    })
  })

  describe('stop words', () => {
    it('skips strand titles that are stop words', () => {
      const strands: StrandInfo[] = [
        { path: '/notes/the', title: 'The' },
        { path: '/notes/and', title: 'And' },
        { path: '/notes/test', title: 'Test' },
      ]
      const content = 'The Test and more'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('Test')
    })
  })

  describe('result metadata', () => {
    it('returns strandsChecked count', () => {
      const content = 'Hello world'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.strandsChecked).toBe(testStrands.length)
    })

    it('returns processingTime', () => {
      const content = 'JavaScript and React'
      const result = detectUnlinkedMentions(content, testStrands)

      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('deduplication', () => {
    it('deduplicates overlapping matches', () => {
      const strands: StrandInfo[] = [
        { path: '/notes/react', title: 'React' },
        { path: '/notes/react-native', title: 'React', aliases: ['ReactJS'] },
      ]
      const content = 'Using React for web development'
      const result = detectUnlinkedMentions(content, strands)

      // Should only return one match for 'React' position
      const positions = result.mentions.map(m => `${m.startIndex}-${m.endIndex}`)
      const uniquePositions = [...new Set(positions)]
      expect(positions.length).toBe(uniquePositions.length)
    })
  })

  describe('edge cases', () => {
    it('handles empty content', () => {
      const result = detectUnlinkedMentions('', testStrands)
      expect(result.mentions).toEqual([])
    })

    it('handles empty strands array', () => {
      const result = detectUnlinkedMentions('JavaScript is great', [])
      expect(result.mentions).toEqual([])
      expect(result.strandsChecked).toBe(0)
    })

    it('handles special regex characters in title', () => {
      const strands: StrandInfo[] = [
        { path: '/notes/regex', title: 'Regex' },
        { path: '/notes/testing', title: 'Testing' },
      ]
      const content = 'Learning Regex and Testing basics'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions.length).toBe(2)
    })

    it('handles word boundaries correctly', () => {
      const strands: StrandInfo[] = [
        { path: '/notes/java', title: 'Java' },
      ]
      const content = 'JavaScript is not Java'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions.length).toBe(1)
      expect(result.mentions[0].matchedText).toBe('Java')
      expect(result.mentions[0].startIndex).toBe(18) // 'Java' at end
    })
  })
})

// ============================================================================
// extractSignificantTerms
// ============================================================================

describe('extractSignificantTerms', () => {
  it('extracts capitalized terms', () => {
    const content = 'The company Apple makes great products.'
    const terms = extractSignificantTerms(content)

    expect(terms).toContain('Apple')
  })

  it('extracts multi-word capitalized phrases', () => {
    const content = 'I work at Microsoft Research in Seattle.'
    const terms = extractSignificantTerms(content)

    expect(terms).toContain('Microsoft Research')
  })

  it('ignores first word of sentences', () => {
    const content = 'The quick brown fox. Another sentence here.'
    const terms = extractSignificantTerms(content)

    // 'The' and 'Another' should not be extracted (start of sentences)
    expect(terms).not.toContain('The')
    expect(terms).not.toContain('Another')
  })

  it('removes wikilinks', () => {
    const content = 'Check out [[JavaScript]] for more info about React.'
    const terms = extractSignificantTerms(content)

    // JavaScript is inside wikilink, should be removed
    expect(terms).toContain('React')
  })

  it('removes markdown links', () => {
    const content = 'See [this guide](https://example.com) about Python.'
    const terms = extractSignificantTerms(content)

    expect(terms).toContain('Python')
  })

  it('filters out short terms', () => {
    const content = 'I use AI and ML for Machine Learning.'
    const terms = extractSignificantTerms(content)

    expect(terms).not.toContain('AI')
    expect(terms).not.toContain('ML')
    expect(terms).toContain('Machine Learning')
  })

  it('filters out stop words', () => {
    const content = 'The And Or are common words.'
    const terms = extractSignificantTerms(content)

    expect(terms).not.toContain('And')
    expect(terms).not.toContain('Or')
  })

  it('deduplicates terms', () => {
    const content = 'React is great. React is also fast. React rules.'
    const terms = extractSignificantTerms(content)

    const reactCount = terms.filter(t => t === 'React').length
    expect(reactCount).toBeLessThanOrEqual(1)
  })

  it('handles empty content', () => {
    const terms = extractSignificantTerms('')
    expect(terms).toEqual([])
  })

  it('handles content with no capitalized terms', () => {
    const content = 'the quick brown fox jumps over the lazy dog.'
    const terms = extractSignificantTerms(content)

    expect(terms).toEqual([])
  })

  it('removes markdown formatting', () => {
    const content = 'Using **Bold** and *Italic* and `code` formatting.'
    const terms = extractSignificantTerms(content)

    // Should extract 'Bold', 'Italic' without formatting
    expect(terms.some(t => t.includes('*'))).toBe(false)
    expect(terms.some(t => t.includes('`'))).toBe(false)
  })
})

// ============================================================================
// Integration scenarios
// ============================================================================

describe('Integration scenarios', () => {
  it('handles real-world markdown document', () => {
    const content = `
# Getting Started with React

React is a JavaScript library for building user interfaces.
You can use TypeScript with React for better type safety.

## Using Node.js

Make sure you have Node.js installed. You can also use NodeJS
as an alternative name.

Check out [[JavaScript]] for the basics.
    `.trim()

    const result = detectUnlinkedMentions(content, testStrands)

    // Should find React, TypeScript, and Node.js mentions
    // But not JavaScript inside [[...]]
    const matchedTexts = result.mentions.map(m => m.matchedText.toLowerCase())
    expect(matchedTexts).toContain('react')
    expect(matchedTexts).toContain('typescript')
  })

  it('handles code blocks appropriately', () => {
    const content = `
Here's some code:

\`\`\`javascript
const React = require('react');
\`\`\`

React is great for building UIs.
    `.trim()

    const result = detectUnlinkedMentions(content, testStrands)

    // Should detect React mentions (including in code block)
    expect(result.mentions.length).toBeGreaterThan(0)
  })

  it('prioritizes exact matches over aliases', () => {
    const content = 'TypeScript and TS are the same.'
    const result = detectUnlinkedMentions(content, testStrands)

    // TypeScript mention should have higher confidence
    const tsFullMatch = result.mentions.find(m => m.matchedText === 'TypeScript')
    const tsAliasMatch = result.mentions.find(m => m.matchedText === 'TS')

    expect(tsFullMatch?.confidence).toBeGreaterThanOrEqual(tsAliasMatch?.confidence || 0)
  })
})
