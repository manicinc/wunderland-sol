/**
 * Tests for Text Context Menu Functionality
 * @module __tests__/unit/research/textContextMenu.test
 *
 * Tests for the double-click text context menu:
 * - Research action with selected text
 * - Define action with "define: " prefix
 * - Thesaurus action with "synonyms for: " prefix
 * - Query string generation
 *
 * These are unit tests for the logic, not the React component itself.
 */

import { describe, it, expect } from 'vitest'

// Helper functions that replicate the logic from TiptapEditor
function buildResearchQuery(text: string): string {
  return text.trim()
}

function buildDefineQuery(text: string): string {
  return `define: ${text.trim()}`
}

function buildThesaurusQuery(text: string): string {
  return `synonyms for: ${text.trim()}`
}

describe('Text Context Menu Queries', () => {
  describe('Research Query', () => {
    it('should return trimmed text for research', () => {
      expect(buildResearchQuery('machine learning')).toBe('machine learning')
    })

    it('should trim whitespace from research query', () => {
      expect(buildResearchQuery('  neural networks  ')).toBe('neural networks')
    })

    it('should handle single word', () => {
      expect(buildResearchQuery('quantum')).toBe('quantum')
    })

    it('should handle empty string', () => {
      expect(buildResearchQuery('')).toBe('')
    })

    it('should preserve internal whitespace', () => {
      expect(buildResearchQuery('deep   learning')).toBe('deep   learning')
    })

    it('should handle special characters', () => {
      expect(buildResearchQuery('C++ & JavaScript')).toBe('C++ & JavaScript')
    })

    it('should handle newlines by trimming', () => {
      expect(buildResearchQuery('\ntest\n')).toBe('test')
    })
  })

  describe('Define Query', () => {
    it('should prefix with "define: "', () => {
      expect(buildDefineQuery('algorithm')).toBe('define: algorithm')
    })

    it('should trim the word before prefixing', () => {
      expect(buildDefineQuery('  polymorphism  ')).toBe('define: polymorphism')
    })

    it('should handle compound terms', () => {
      expect(buildDefineQuery('machine learning')).toBe('define: machine learning')
    })

    it('should handle technical terms', () => {
      expect(buildDefineQuery('REST API')).toBe('define: REST API')
    })

    it('should handle empty string', () => {
      expect(buildDefineQuery('')).toBe('define: ')
    })

    it('should handle hyphenated words', () => {
      expect(buildDefineQuery('self-documenting')).toBe('define: self-documenting')
    })

    it('should handle numbers', () => {
      expect(buildDefineQuery('2FA')).toBe('define: 2FA')
    })
  })

  describe('Thesaurus Query', () => {
    it('should prefix with "synonyms for: "', () => {
      expect(buildThesaurusQuery('important')).toBe('synonyms for: important')
    })

    it('should trim the word before prefixing', () => {
      expect(buildThesaurusQuery('  beautiful  ')).toBe('synonyms for: beautiful')
    })

    it('should handle phrases', () => {
      expect(buildThesaurusQuery('very important')).toBe('synonyms for: very important')
    })

    it('should handle empty string', () => {
      expect(buildThesaurusQuery('')).toBe('synonyms for: ')
    })

    it('should handle adjectives', () => {
      expect(buildThesaurusQuery('fast')).toBe('synonyms for: fast')
    })

    it('should handle verbs', () => {
      expect(buildThesaurusQuery('implement')).toBe('synonyms for: implement')
    })

    it('should handle nouns', () => {
      expect(buildThesaurusQuery('solution')).toBe('synonyms for: solution')
    })
  })
})

describe('Text Selection Validation', () => {
  function isValidSelection(text: string | null | undefined): boolean {
    if (!text) return false
    const trimmed = text.trim()
    return trimmed.length > 0
  }

  it('should accept non-empty text', () => {
    expect(isValidSelection('hello')).toBe(true)
  })

  it('should reject empty string', () => {
    expect(isValidSelection('')).toBe(false)
  })

  it('should reject whitespace only', () => {
    expect(isValidSelection('   ')).toBe(false)
  })

  it('should reject null', () => {
    expect(isValidSelection(null)).toBe(false)
  })

  it('should reject undefined', () => {
    expect(isValidSelection(undefined)).toBe(false)
  })

  it('should accept text with leading/trailing whitespace', () => {
    expect(isValidSelection('  valid  ')).toBe(true)
  })

  it('should accept single character', () => {
    expect(isValidSelection('a')).toBe(true)
  })
})

describe('Popup Position Calculation', () => {
  function calculatePopupPosition(
    clickX: number,
    clickY: number,
    popupWidth: number = 200,
    viewportWidth: number = 1024
  ): { left: number; top: number } {
    const left = Math.max(10, Math.min(clickX - popupWidth / 2, viewportWidth - popupWidth - 10))
    const top = Math.max(10, clickY - 50)
    return { left, top }
  }

  it('should center popup on click position', () => {
    const pos = calculatePopupPosition(500, 300, 200, 1024)
    expect(pos.left).toBe(400) // 500 - 100 (half of 200)
  })

  it('should not go beyond left edge', () => {
    const pos = calculatePopupPosition(50, 300, 200, 1024)
    expect(pos.left).toBeGreaterThanOrEqual(10)
  })

  it('should not go beyond right edge', () => {
    const pos = calculatePopupPosition(1000, 300, 200, 1024)
    expect(pos.left).toBeLessThanOrEqual(1024 - 200 - 10)
  })

  it('should position above click by 50px', () => {
    const pos = calculatePopupPosition(500, 300, 200, 1024)
    expect(pos.top).toBe(250) // 300 - 50
  })

  it('should not go above viewport top', () => {
    const pos = calculatePopupPosition(500, 30, 200, 1024)
    expect(pos.top).toBeGreaterThanOrEqual(10)
  })

  it('should handle edge case at viewport top', () => {
    const pos = calculatePopupPosition(500, 10, 200, 1024)
    expect(pos.top).toBe(10) // Clamped to minimum
  })
})

describe('Highlight Color Integration', () => {
  const HIGHLIGHT_COLORS = [
    { color: 'yellow', label: 'Yellow' },
    { color: 'green', label: 'Green' },
    { color: 'blue', label: 'Blue' },
    { color: 'pink', label: 'Pink' },
    { color: 'orange', label: 'Orange' },
  ] as const

  it('should have 5 highlight colors', () => {
    expect(HIGHLIGHT_COLORS).toHaveLength(5)
  })

  it('should include yellow as first color', () => {
    expect(HIGHLIGHT_COLORS[0].color).toBe('yellow')
  })

  it('should have unique color values', () => {
    const colors = HIGHLIGHT_COLORS.map((c) => c.color)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(colors.length)
  })

  it('should have labels for all colors', () => {
    HIGHLIGHT_COLORS.forEach((c) => {
      expect(c.label).toBeTruthy()
      expect(c.label.length).toBeGreaterThan(0)
    })
  })
})

describe('Context Menu Actions State', () => {
  interface ContextMenuState {
    show: boolean
    x: number
    y: number
    text: string
    startOffset: number
    endOffset: number
  }

  function createContextMenuState(
    text: string,
    x: number,
    y: number
  ): ContextMenuState {
    return {
      show: true,
      x,
      y,
      text,
      startOffset: 0,
      endOffset: text.length,
    }
  }

  it('should create valid state object', () => {
    const state = createContextMenuState('test', 100, 200)
    expect(state).toEqual({
      show: true,
      x: 100,
      y: 200,
      text: 'test',
      startOffset: 0,
      endOffset: 4,
    })
  })

  it('should track text length in offsets', () => {
    const state = createContextMenuState('hello world', 100, 200)
    expect(state.endOffset - state.startOffset).toBe(11)
  })

  it('should handle empty text', () => {
    const state = createContextMenuState('', 100, 200)
    expect(state.startOffset).toBe(0)
    expect(state.endOffset).toBe(0)
  })

  it('should handle unicode text', () => {
    const state = createContextMenuState('émoji 🎉', 100, 200)
    expect(state.text).toBe('émoji 🎉')
  })
})
