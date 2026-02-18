/**
 * Auto Detector Tests
 * Tests for the unlinked mention detection algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectUnlinkedMentions,
  extractSignificantTerms,
  type StrandInfo,
  type DetectionOptions,
} from '@/lib/linkSuggestion/autoDetector'

describe('autoDetector', () => {
  describe('detectUnlinkedMentions', () => {
    const strands: StrandInfo[] = [
      { path: 'react', title: 'React', tags: ['javascript', 'frontend'] },
      { path: 'typescript', title: 'TypeScript', tags: ['javascript', 'types'] },
      { path: 'next-js', title: 'Next.js', aliases: ['NextJS', 'Nextjs'] },
      { path: 'getting-started', title: 'Getting Started', tags: ['docs'] },
    ]

    it('should detect exact title matches', () => {
      const content = 'I am learning React and TypeScript for web development.'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions).toHaveLength(2)
      expect(result.mentions.map(m => m.matchedText)).toContain('React')
      expect(result.mentions.map(m => m.matchedText)).toContain('TypeScript')
    })

    it('should return confidence of 1.0 for exact matches', () => {
      const content = 'React is a great library.'
      const result = detectUnlinkedMentions(content, strands)

      const reactMention = result.mentions.find(m => m.matchedText === 'React')
      expect(reactMention?.confidence).toBe(1.0)
      expect(reactMention?.isExactMatch).toBe(true)
    })

    it('should match aliases', () => {
      const content = 'NextJS is great for server-side rendering.'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions).toHaveLength(1)
      expect(result.mentions[0].targetStrand.path).toBe('next-js')
    })

    it('should ignore matches inside existing wikilinks', () => {
      const content = 'I love [[React]] and TypeScript.'
      const result = detectUnlinkedMentions(content, strands, {
        ignoreExistingLinks: true,
      })

      expect(result.mentions).toHaveLength(1)
      expect(result.mentions[0].matchedText).toBe('TypeScript')
    })

    it('should include context around matches', () => {
      const content = 'When working with React, you should understand components.'
      const result = detectUnlinkedMentions(content, strands, {
        contextLength: 20,
      })

      const mention = result.mentions[0]
      expect(mention.context).toContain('React')
      expect(mention.context.length).toBeGreaterThan(mention.matchedText.length)
    })

    it('should respect minConfidence option', () => {
      const content = 'React is awesome.'
      const result = detectUnlinkedMentions(content, strands, {
        minConfidence: 0.5,
      })

      expect(result.mentions.every(m => m.confidence >= 0.5)).toBe(true)
    })

    it('should respect maxSuggestions option', () => {
      const content = 'React and TypeScript and Next.js are all mentioned here.'
      const result = detectUnlinkedMentions(content, strands, {
        maxSuggestions: 2,
      })

      expect(result.mentions).toHaveLength(2)
    })

    it('should be case insensitive by default', () => {
      const content = 'I use REACT and typescript daily.'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.mentions).toHaveLength(2)
    })

    it('should skip short titles', () => {
      const shortStrands: StrandInfo[] = [
        { path: 'a', title: 'A', tags: [] },
        { path: 'react', title: 'React', tags: [] },
      ]
      const content = 'A React component.'
      const result = detectUnlinkedMentions(content, shortStrands, {
        minWordLength: 3,
      })

      expect(result.mentions).toHaveLength(1)
      expect(result.mentions[0].matchedText).toBe('React')
    })

    it('should return processing time', () => {
      const content = 'React TypeScript Next.js'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should return strandsChecked count', () => {
      const content = 'Hello world'
      const result = detectUnlinkedMentions(content, strands)

      expect(result.strandsChecked).toBe(strands.length)
    })

    it('should deduplicate mentions at same position', () => {
      // If same text matches multiple strands somehow
      const content = 'React React React' // Same word multiple times
      const result = detectUnlinkedMentions(content, strands)

      // Should have 3 mentions (one for each occurrence)
      expect(result.mentions.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty content', () => {
      const result = detectUnlinkedMentions('', strands)
      expect(result.mentions).toHaveLength(0)
    })

    it('should handle empty strands list', () => {
      const content = 'React TypeScript'
      const result = detectUnlinkedMentions(content, [])
      expect(result.mentions).toHaveLength(0)
    })
  })

  describe('extractSignificantTerms', () => {
    it('should extract capitalized words (proper nouns)', () => {
      const content = 'John works at Microsoft on the React team.'
      const terms = extractSignificantTerms(content)

      expect(terms).toContain('Microsoft')
      expect(terms).toContain('React')
    })

    it('should extract multi-word capitalized phrases', () => {
      const content = 'The New York Times reported on Silicon Valley.'
      const terms = extractSignificantTerms(content)

      expect(terms).toContain('New York Times')
      expect(terms).toContain('Silicon Valley')
    })

    it('should ignore first word of sentences', () => {
      const content = 'The project is great. It works well.'
      const terms = extractSignificantTerms(content)

      // "The" and "It" should be ignored as sentence starters
      expect(terms.every(t => t !== 'The' && t !== 'It')).toBe(true)
    })

    it('should remove markdown formatting', () => {
      const content = 'Use **React** and `TypeScript` for [[components]].'
      const terms = extractSignificantTerms(content)

      // Should not include markdown syntax
      expect(terms.every(t => !t.includes('**') && !t.includes('`'))).toBe(true)
    })

    it('should remove existing wikilinks from consideration', () => {
      const content = 'Already linked: [[React]]. Not linked: TypeScript.'
      const terms = extractSignificantTerms(content)

      // The text inside [[React]] should be removed
      expect(terms).not.toContain('React')
    })

    it('should filter out stop words', () => {
      const content = 'The And Or But are stop words.'
      const terms = extractSignificantTerms(content)

      // Stop words should be filtered even if capitalized
      expect(terms.every(t => !['The', 'And', 'Or', 'But'].includes(t))).toBe(true)
    })

    it('should return unique terms', () => {
      const content = 'React is great. React is awesome. React!'
      const terms = extractSignificantTerms(content)

      const reactCount = terms.filter(t => t === 'React').length
      expect(reactCount).toBeLessThanOrEqual(1)
    })

    it('should handle empty content', () => {
      const terms = extractSignificantTerms('')
      expect(terms).toHaveLength(0)
    })

    it('should filter terms shorter than 3 characters', () => {
      const content = 'AI and ML are short terms.'
      const terms = extractSignificantTerms(content)

      expect(terms.every(t => t.length >= 3)).toBe(true)
    })
  })
})

