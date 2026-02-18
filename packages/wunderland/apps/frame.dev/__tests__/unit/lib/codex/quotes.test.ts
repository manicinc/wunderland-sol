/**
 * Quotes Module Tests
 * @module __tests__/unit/lib/codex/quotes.test
 *
 * Tests for the inspirational quotes system.
 */

import { describe, it, expect } from 'vitest'
import {
  QUOTES,
  getRandomQuote,
  getDailyQuote,
  getQuotesByTag,
  getRandomQuotes,
  type Quote,
} from '@/lib/codex/quotes'

// ============================================================================
// QUOTES Array
// ============================================================================

describe('QUOTES', () => {
  it('is defined and non-empty', () => {
    expect(QUOTES).toBeDefined()
    expect(Array.isArray(QUOTES)).toBe(true)
    expect(QUOTES.length).toBeGreaterThan(0)
  })

  it('has at least 50 quotes', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(50)
  })

  describe('quote structure', () => {
    it('all quotes have required text property', () => {
      QUOTES.forEach((quote, index) => {
        expect(quote.text, `Quote ${index} missing text`).toBeDefined()
        expect(typeof quote.text).toBe('string')
        expect(quote.text.length).toBeGreaterThan(0)
      })
    })

    it('all quotes have required author property', () => {
      QUOTES.forEach((quote, index) => {
        expect(quote.author, `Quote ${index} missing author`).toBeDefined()
        expect(typeof quote.author).toBe('string')
        expect(quote.author.length).toBeGreaterThan(0)
      })
    })

    it('tags are optional but when present are arrays', () => {
      QUOTES.forEach((quote) => {
        if (quote.tags !== undefined) {
          expect(Array.isArray(quote.tags)).toBe(true)
          quote.tags.forEach((tag) => {
            expect(typeof tag).toBe('string')
          })
        }
      })
    })
  })

  describe('quote content quality', () => {
    it('quotes are not duplicated', () => {
      const texts = QUOTES.map((q) => q.text)
      const uniqueTexts = new Set(texts)
      expect(uniqueTexts.size).toBe(texts.length)
    })

    it('quotes are reasonably sized', () => {
      QUOTES.forEach((quote) => {
        expect(quote.text.length).toBeGreaterThan(10)
        expect(quote.text.length).toBeLessThan(500)
      })
    })

    it('authors have reasonable names', () => {
      QUOTES.forEach((quote) => {
        expect(quote.author.length).toBeGreaterThan(2)
        expect(quote.author.length).toBeLessThan(100)
      })
    })
  })

  describe('tag coverage', () => {
    const expectedTags = [
      'wisdom',
      'learning',
      'writing',
      'creativity',
      'curiosity',
      'ideas',
      'reading',
      'thinking',
    ]

    expectedTags.forEach((tag) => {
      it(`has quotes with "${tag}" tag`, () => {
        const withTag = QUOTES.filter((q) => q.tags?.includes(tag))
        expect(withTag.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================================
// getRandomQuote
// ============================================================================

describe('getRandomQuote', () => {
  it('returns a quote object', () => {
    const quote = getRandomQuote()
    expect(quote).toBeDefined()
    expect(quote).toHaveProperty('text')
    expect(quote).toHaveProperty('author')
  })

  it('returns a quote from QUOTES array', () => {
    const quote = getRandomQuote()
    expect(QUOTES).toContainEqual(quote)
  })

  it('returns different quotes over multiple calls (probabilistic)', () => {
    const quotes = new Set<string>()
    for (let i = 0; i < 20; i++) {
      quotes.add(getRandomQuote().text)
    }
    // Should get at least 2 different quotes in 20 tries
    expect(quotes.size).toBeGreaterThan(1)
  })

  it('always returns a valid quote', () => {
    for (let i = 0; i < 10; i++) {
      const quote = getRandomQuote()
      expect(typeof quote.text).toBe('string')
      expect(typeof quote.author).toBe('string')
    }
  })
})

// ============================================================================
// getDailyQuote
// ============================================================================

describe('getDailyQuote', () => {
  it('returns a quote object', () => {
    const quote = getDailyQuote()
    expect(quote).toBeDefined()
    expect(quote).toHaveProperty('text')
    expect(quote).toHaveProperty('author')
  })

  it('returns the same quote for the same day', () => {
    const quote1 = getDailyQuote()
    const quote2 = getDailyQuote()
    expect(quote1).toEqual(quote2)
  })

  it('returns a quote from QUOTES array', () => {
    const quote = getDailyQuote()
    expect(QUOTES).toContainEqual(quote)
  })
})

// ============================================================================
// getQuotesByTag
// ============================================================================

describe('getQuotesByTag', () => {
  it('returns array for existing tag', () => {
    const quotes = getQuotesByTag('wisdom')
    expect(Array.isArray(quotes)).toBe(true)
  })

  it('returns quotes with matching tag', () => {
    const quotes = getQuotesByTag('writing')
    expect(quotes.length).toBeGreaterThan(0)
    quotes.forEach((quote) => {
      expect(quote.tags).toContain('writing')
    })
  })

  it('returns empty array for non-existent tag', () => {
    const quotes = getQuotesByTag('nonexistent-tag-xyz')
    expect(quotes).toEqual([])
  })

  it('is case sensitive', () => {
    const lower = getQuotesByTag('wisdom')
    const upper = getQuotesByTag('WISDOM')
    expect(lower.length).toBeGreaterThan(0)
    expect(upper.length).toBe(0)
  })

  describe('specific tags', () => {
    const tagsToTest = ['wisdom', 'learning', 'creativity', 'writing']

    tagsToTest.forEach((tag) => {
      it(`finds quotes for "${tag}"`, () => {
        const quotes = getQuotesByTag(tag)
        expect(quotes.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================================
// getRandomQuotes
// ============================================================================

describe('getRandomQuotes', () => {
  it('returns requested number of quotes', () => {
    const quotes = getRandomQuotes(5)
    expect(quotes).toHaveLength(5)
  })

  it('returns array of quote objects', () => {
    const quotes = getRandomQuotes(3)
    quotes.forEach((quote) => {
      expect(quote).toHaveProperty('text')
      expect(quote).toHaveProperty('author')
    })
  })

  it('returns quotes from QUOTES array', () => {
    const quotes = getRandomQuotes(3)
    quotes.forEach((quote) => {
      expect(QUOTES).toContainEqual(quote)
    })
  })

  it('returns empty array for count 0', () => {
    const quotes = getRandomQuotes(0)
    expect(quotes).toEqual([])
  })

  it('returns all quotes when count exceeds array length', () => {
    const quotes = getRandomQuotes(1000)
    expect(quotes.length).toBe(QUOTES.length)
  })

  it('returns unique quotes in result', () => {
    const quotes = getRandomQuotes(10)
    const texts = quotes.map((q) => q.text)
    const uniqueTexts = new Set(texts)
    expect(uniqueTexts.size).toBe(texts.length)
  })

  it('shuffles results (probabilistic)', () => {
    const firstResult = getRandomQuotes(5).map((q) => q.text)
    let isDifferent = false

    for (let i = 0; i < 10; i++) {
      const result = getRandomQuotes(5).map((q) => q.text)
      if (JSON.stringify(result) !== JSON.stringify(firstResult)) {
        isDifferent = true
        break
      }
    }

    expect(isDifferent).toBe(true)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('quotes integration', () => {
  it('all returned quotes have valid structure', () => {
    const random = getRandomQuote()
    const daily = getDailyQuote()
    const byTag = getQuotesByTag('wisdom')[0]
    const multiple = getRandomQuotes(3)

    const allQuotes = [random, daily, byTag, ...multiple].filter(Boolean)

    allQuotes.forEach((quote) => {
      expect(typeof quote.text).toBe('string')
      expect(typeof quote.author).toBe('string')
      if (quote.tags) {
        expect(Array.isArray(quote.tags)).toBe(true)
      }
    })
  })

  it('quotes cover diverse topics', () => {
    const knowledgeTags = ['knowledge', 'learning', 'wisdom', 'reading']
    const creativeTags = ['creativity', 'writing', 'ideas', 'imagination']
    const personalTags = ['focus', 'growth', 'action', 'persistence']

    const hasKnowledge = knowledgeTags.some(
      (tag) => getQuotesByTag(tag).length > 0
    )
    const hasCreative = creativeTags.some(
      (tag) => getQuotesByTag(tag).length > 0
    )
    const hasPersonal = personalTags.some(
      (tag) => getQuotesByTag(tag).length > 0
    )

    expect(hasKnowledge).toBe(true)
    expect(hasCreative).toBe(true)
    expect(hasPersonal).toBe(true)
  })
})
