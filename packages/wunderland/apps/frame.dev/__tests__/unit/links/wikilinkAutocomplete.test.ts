/**
 * Wikilink Autocomplete Tests
 * Tests for the [[...]] autocomplete logic
 */

import { describe, it, expect } from 'vitest'

/**
 * Since the hook depends on Tiptap editor, we test the core logic patterns
 * that the hook uses internally
 */
describe('wikilinkAutocomplete patterns', () => {
  describe('wikilink detection regex', () => {
    const detectWikilink = (textBefore: string): { query: string } | null => {
      const match = textBefore.match(/\[\[([^\]\n]*)$/)
      return match ? { query: match[1] } : null
    }

    it('should detect opening [[', () => {
      const result = detectWikilink('Hello [[')
      expect(result).toEqual({ query: '' })
    })

    it('should capture query after [[', () => {
      const result = detectWikilink('Hello [[react')
      expect(result).toEqual({ query: 'react' })
    })

    it('should capture multi-word query', () => {
      const result = detectWikilink('See [[getting started')
      expect(result).toEqual({ query: 'getting started' })
    })

    it('should not match closed wikilinks', () => {
      const result = detectWikilink('Already [[linked]]')
      expect(result).toBeNull()
    })

    it('should match only the most recent [[', () => {
      const result = detectWikilink('First [[closed]] then [[open')
      expect(result).toEqual({ query: 'open' })
    })

    it('should not match across newlines', () => {
      const result = detectWikilink('Line1 [[\nLine2')
      expect(result).toBeNull()
    })

    it('should handle path with slashes', () => {
      const result = detectWikilink('Check [[docs/getting-started')
      expect(result).toEqual({ query: 'docs/getting-started' })
    })

    it('should handle block reference syntax', () => {
      const result = detectWikilink('See [[strand#block')
      expect(result).toEqual({ query: 'strand#block' })
    })

    it('should handle alias syntax in progress', () => {
      const result = detectWikilink('Check [[long-path|display')
      expect(result).toEqual({ query: 'long-path|display' })
    })
  })

  describe('link building', () => {
    const buildLink = (path: string, displayText?: string): string => {
      if (displayText && displayText !== path) {
        return `[[${path}|${displayText}]]`
      }
      return `[[${path}]]`
    }

    it('should build simple link', () => {
      expect(buildLink('react')).toBe('[[react]]')
    })

    it('should build link with display text', () => {
      expect(buildLink('react-hooks', 'React Hooks')).toBe('[[react-hooks|React Hooks]]')
    })

    it('should not add alias if same as path', () => {
      expect(buildLink('react', 'react')).toBe('[[react]]')
    })

    it('should handle paths with special characters', () => {
      expect(buildLink('docs/getting-started')).toBe('[[docs/getting-started]]')
    })

    it('should handle block references', () => {
      expect(buildLink('strand#block-id')).toBe('[[strand#block-id]]')
    })
  })

  describe('suggestion filtering', () => {
    interface Suggestion {
      path: string
      title: string
    }

    const filterSuggestions = (query: string, suggestions: Suggestion[]): Suggestion[] => {
      const lowerQuery = query.toLowerCase()
      return suggestions.filter(s =>
        s.path.toLowerCase().includes(lowerQuery) ||
        s.title.toLowerCase().includes(lowerQuery)
      )
    }

    const suggestions: Suggestion[] = [
      { path: 'react', title: 'React' },
      { path: 'react-hooks', title: 'React Hooks' },
      { path: 'typescript', title: 'TypeScript' },
      { path: 'next-js', title: 'Next.js' },
    ]

    it('should filter by path', () => {
      const results = filterSuggestions('react', suggestions)
      expect(results).toHaveLength(2)
      expect(results.map(r => r.path)).toContain('react')
      expect(results.map(r => r.path)).toContain('react-hooks')
    })

    it('should filter by title', () => {
      const results = filterSuggestions('hooks', suggestions)
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('React Hooks')
    })

    it('should be case insensitive', () => {
      const results = filterSuggestions('REACT', suggestions)
      expect(results.length).toBeGreaterThan(0)
    })

    it('should return empty for no matches', () => {
      const results = filterSuggestions('vue', suggestions)
      expect(results).toHaveLength(0)
    })

    it('should return all for empty query', () => {
      const results = filterSuggestions('', suggestions)
      expect(results).toHaveLength(suggestions.length)
    })
  })

  describe('keyboard navigation', () => {
    const navigate = (
      currentIndex: number,
      listLength: number,
      direction: 'up' | 'down'
    ): number => {
      if (direction === 'down') {
        return (currentIndex + 1) % listLength
      }
      return (currentIndex - 1 + listLength) % listLength
    }

    it('should move down', () => {
      expect(navigate(0, 5, 'down')).toBe(1)
      expect(navigate(1, 5, 'down')).toBe(2)
    })

    it('should wrap around at end', () => {
      expect(navigate(4, 5, 'down')).toBe(0)
    })

    it('should move up', () => {
      expect(navigate(2, 5, 'up')).toBe(1)
      expect(navigate(1, 5, 'up')).toBe(0)
    })

    it('should wrap around at start', () => {
      expect(navigate(0, 5, 'up')).toBe(4)
    })
  })
})

