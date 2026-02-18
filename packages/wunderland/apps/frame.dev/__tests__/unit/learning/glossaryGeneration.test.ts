/**
 * Glossary Generation Tests
 * @module tests/unit/learning/glossaryGeneration
 *
 * Tests for glossary term extraction and deduplication including:
 * - Term extraction from markdown
 * - Definition parsing
 * - Deduplication logic
 * - Category inference
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock NLP module
vi.mock('compromise', () => ({
  default: vi.fn(() => ({
    nouns: () => ({ toSingular: () => ({ out: () => ['component', 'state', 'hook'] }) }),
    topics: () => ({ out: () => ['React', 'JavaScript'] }),
  })),
}))

// ============================================================================
// TYPES
// ============================================================================

interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category?: string
  aliases?: string[]
  sourceStrand?: string
  confidence: number
  createdAt: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return 'term-' + Math.random().toString(36).substr(2, 9)
}

function extractDefinitions(text: string): Array<{ term: string; definition: string }> {
  const definitions: Array<{ term: string; definition: string }> = []

  // Pattern 1: **Term**: Definition
  const boldColonPattern = /\*\*([^*]+)\*\*[:\s]+([^*\n.]+[.!?]?)/g
  let match
  while ((match = boldColonPattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ term: match[1].trim(), definition: match[2].trim() })
    }
  }

  // Pattern 2: Term is/are definition
  const isArePattern = /([A-Z][a-zA-Z\s]+)\s+(?:is|are)\s+([a-z][^.!?]+[.!?])/g
  while ((match = isArePattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ term: match[1].trim(), definition: match[2].trim() })
    }
  }

  // Pattern 3: Definition list items
  const listPattern = /^[-*]\s+\*\*([^*]+)\*\*[:\s]+(.+)$/gm
  while ((match = listPattern.exec(text)) !== null) {
    if (match[1].length >= 2 && match[2].length >= 10) {
      definitions.push({ term: match[1].trim(), definition: match[2].trim() })
    }
  }

  return definitions
}

function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

function deduplicateTerms(terms: GlossaryTerm[]): GlossaryTerm[] {
  const seen = new Map<string, GlossaryTerm>()

  for (const term of terms) {
    const normalized = normalizeTerm(term.term)

    if (!seen.has(normalized)) {
      seen.set(normalized, term)
    } else {
      // Keep the one with higher confidence or longer definition
      const existing = seen.get(normalized)!
      if (
        term.confidence > existing.confidence ||
        (term.confidence === existing.confidence && term.definition.length > existing.definition.length)
      ) {
        // Merge aliases
        const mergedAliases = [...new Set([...(existing.aliases || []), ...(term.aliases || []), existing.term])]
        seen.set(normalized, {
          ...term,
          aliases: mergedAliases,
        })
      } else {
        // Add this term as an alias
        existing.aliases = [...new Set([...(existing.aliases || []), term.term])]
      }
    }
  }

  return Array.from(seen.values())
}

function inferCategory(term: string, definition: string): string {
  const termLower = term.toLowerCase()
  const defLower = definition.toLowerCase()

  // Programming patterns
  if (/hook|function|method|api/i.test(termLower) || /call|invoke|execute|return/i.test(defLower)) {
    return 'programming'
  }

  // UI/Component patterns
  if (/component|element|ui|interface/i.test(termLower) || /render|display|show|view/i.test(defLower)) {
    return 'ui'
  }

  // Data patterns
  if (/state|data|store|value|variable/i.test(termLower) || /contain|hold|manage|track/i.test(defLower)) {
    return 'data'
  }

  // Concept patterns
  if (/concept|principle|pattern|architecture/i.test(termLower)) {
    return 'concept'
  }

  return 'general'
}

function createGlossaryTerm(
  term: string,
  definition: string,
  options: { sourceStrand?: string; confidence?: number } = {}
): GlossaryTerm {
  return {
    id: generateId(),
    term,
    definition,
    category: inferCategory(term, definition),
    aliases: [],
    sourceStrand: options.sourceStrand,
    confidence: options.confidence || 0.7,
    createdAt: new Date().toISOString(),
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Glossary Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Definition Extraction', () => {
    it('should extract bold term definitions', () => {
      const text = '**React** is a JavaScript library for building user interfaces.'
      const defs = extractDefinitions(text)
      expect(defs).toHaveLength(1)
      expect(defs[0].term).toBe('React')
    })

    it('should extract colon-style definitions', () => {
      const text = '**Component**: A reusable piece of UI that accepts props.'
      const defs = extractDefinitions(text)
      expect(defs).toHaveLength(1)
      expect(defs[0].term).toBe('Component')
      expect(defs[0].definition).toContain('reusable')
    })

    it('should extract is/are definitions', () => {
      const text = 'Hooks are functions that let you use React features in functional components.'
      const defs = extractDefinitions(text)
      expect(defs).toHaveLength(1)
      expect(defs[0].term).toBe('Hooks')
    })

    it('should extract multiple definitions', () => {
      const text = `
        **State** is data that can change over time.
        **Props** are read-only inputs to a component.
        **Effect** is a side effect that runs after render.
      `
      const defs = extractDefinitions(text)
      expect(defs.length).toBeGreaterThanOrEqual(3)
    })

    it('should skip short definitions', () => {
      const text = '**X**: Y.'
      const defs = extractDefinitions(text)
      expect(defs).toHaveLength(0)
    })
  })

  describe('Term Normalization', () => {
    it('should lowercase terms', () => {
      expect(normalizeTerm('React')).toBe('react')
      expect(normalizeTerm('UPPERCASE')).toBe('uppercase')
    })

    it('should remove punctuation', () => {
      expect(normalizeTerm('React.js')).toBe('reactjs')
      expect(normalizeTerm("it's")).toBe('its')
    })

    it('should normalize whitespace', () => {
      expect(normalizeTerm('  multiple   spaces  ')).toBe('multiple spaces')
    })

    it('should handle empty strings', () => {
      expect(normalizeTerm('')).toBe('')
    })
  })

  describe('Deduplication', () => {
    it('should remove exact duplicates', () => {
      const terms: GlossaryTerm[] = [
        createGlossaryTerm('React', 'A JavaScript library.'),
        createGlossaryTerm('React', 'A JavaScript library.'),
      ]
      const unique = deduplicateTerms(terms)
      expect(unique).toHaveLength(1)
    })

    it('should merge case-insensitive duplicates', () => {
      const terms: GlossaryTerm[] = [
        createGlossaryTerm('react', 'A library.'),
        createGlossaryTerm('React', 'A JavaScript library for UIs.'),
      ]
      const unique = deduplicateTerms(terms)
      expect(unique).toHaveLength(1)
    })

    it('should keep term with higher confidence', () => {
      const terms: GlossaryTerm[] = [
        createGlossaryTerm('React', 'Short def.', { confidence: 0.5 }),
        createGlossaryTerm('React', 'A complete definition.', { confidence: 0.9 }),
      ]
      const unique = deduplicateTerms(terms)
      expect(unique[0].confidence).toBe(0.9)
    })

    it('should keep longer definition when confidence is equal', () => {
      const terms: GlossaryTerm[] = [
        createGlossaryTerm('React', 'Short.', { confidence: 0.8 }),
        createGlossaryTerm('React', 'A much longer and more detailed definition.', { confidence: 0.8 }),
      ]
      const unique = deduplicateTerms(terms)
      expect(unique[0].definition.length).toBeGreaterThan(10)
    })

    it('should merge aliases', () => {
      const terms: GlossaryTerm[] = [
        { ...createGlossaryTerm('React', 'Def 1.'), aliases: ['ReactJS'] },
        { ...createGlossaryTerm('react', 'Def 2.'), aliases: ['React.js'] },
      ]
      const unique = deduplicateTerms(terms)
      expect(unique[0].aliases).toContain('ReactJS')
    })
  })

  describe('Category Inference', () => {
    it('should detect programming terms', () => {
      expect(inferCategory('useState', 'A hook that returns a stateful value.')).toBe('programming')
      expect(inferCategory('fetchData', 'A function that calls the API.')).toBe('programming')
    })

    it('should detect UI terms', () => {
      expect(inferCategory('Button', 'A component that renders a clickable element.')).toBe('ui')
      expect(inferCategory('Modal', 'A UI element that displays content in a popup.')).toBe('ui')
    })

    it('should detect data terms', () => {
      expect(inferCategory('State', 'Data that holds the current value.')).toBe('data')
      expect(inferCategory('Store', 'A container that manages application state.')).toBe('data')
    })

    it('should fallback to general for unknown terms', () => {
      expect(inferCategory('Randomword', 'Some unclear definition without keywords.')).toBe('general')
    })
  })

  describe('Term Creation', () => {
    it('should create term with all required fields', () => {
      const term = createGlossaryTerm('React', 'A JavaScript library.')
      expect(term.id).toBeDefined()
      expect(term.term).toBe('React')
      expect(term.definition).toBe('A JavaScript library.')
      expect(term.category).toBeDefined()
      expect(term.confidence).toBeGreaterThan(0)
      expect(term.createdAt).toBeDefined()
    })

    it('should accept source strand option', () => {
      const term = createGlossaryTerm('React', 'A library.', { sourceStrand: 'react-basics' })
      expect(term.sourceStrand).toBe('react-basics')
    })

    it('should accept custom confidence', () => {
      const term = createGlossaryTerm('React', 'A library.', { confidence: 0.95 })
      expect(term.confidence).toBe(0.95)
    })
  })
})

describe('Glossary Integration', () => {
  it('should process complete markdown content', () => {
    const markdown = `
# React Basics

**React** is a JavaScript library for building user interfaces.

## Core Concepts

- **Component**: A reusable piece of UI that accepts props.
- **State**: Internal data that can change over time.
- **Props**: Read-only inputs passed to a component.

## Hooks

Hooks are functions that let you use React features.

**useState**: A hook that returns a stateful value and a function to update it.
**useEffect**: A hook that performs side effects in function components.
    `

    const definitions = extractDefinitions(markdown)
    expect(definitions.length).toBeGreaterThan(3)

    const terms = definitions.map((d) =>
      createGlossaryTerm(d.term, d.definition, { sourceStrand: 'react-basics' })
    )
    expect(terms.every((t) => t.sourceStrand === 'react-basics')).toBe(true)

    const unique = deduplicateTerms(terms)
    expect(unique.length).toBeLessThanOrEqual(terms.length)
  })

  it('should handle empty content gracefully', () => {
    const definitions = extractDefinitions('')
    expect(definitions).toHaveLength(0)
  })

  it('should handle content without definitions', () => {
    // Use lowercase to avoid matching "is/are" pattern with capital start
    const markdown = 'just regular text without any definitions or special formatting here'
    const definitions = extractDefinitions(markdown)
    expect(definitions).toHaveLength(0)
  })
})

