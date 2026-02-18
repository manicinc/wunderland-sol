/**
 * Builtin Functions Tests
 * @module __tests__/unit/lib/formulas/builtinFunctions.test
 *
 * Tests for formula system built-in functions.
 */

import { describe, it, expect } from 'vitest'
import {
  BUILTIN_FUNCTIONS,
  FUNCTION_MAP,
  getFunction,
  hasFunction,
  getFunctionsByCategory,
} from '@/lib/formulas/builtinFunctions'
import type { FormulaContext } from '@/lib/formulas/types'

// Mock context for testing
const mockContext: FormulaContext = {
  now: new Date('2024-06-15T12:00:00Z'),
  props: {},
  variables: {},
}

// ============================================================================
// BUILTIN_FUNCTIONS
// ============================================================================

describe('BUILTIN_FUNCTIONS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BUILTIN_FUNCTIONS)).toBe(true)
    expect(BUILTIN_FUNCTIONS.length).toBeGreaterThan(0)
  })

  it('each function has required properties', () => {
    for (const fn of BUILTIN_FUNCTIONS) {
      expect(fn.name).toBeDefined()
      expect(fn.category).toBeDefined()
      expect(fn.description).toBeDefined()
      expect(fn.parameters).toBeDefined()
      expect(fn.returnType).toBeDefined()
      expect(fn.implementation).toBeDefined()
      expect(typeof fn.implementation).toBe('function')
    }
  })

  it('includes math functions', () => {
    const names = BUILTIN_FUNCTIONS.map(f => f.name)
    expect(names).toContain('Sum')
    expect(names).toContain('Average')
    expect(names).toContain('Min')
    expect(names).toContain('Max')
    expect(names).toContain('Round')
    expect(names).toContain('Abs')
  })

  it('includes string functions', () => {
    const names = BUILTIN_FUNCTIONS.map(f => f.name)
    expect(names).toContain('Concat')
    expect(names).toContain('Upper')
    expect(names).toContain('Lower')
    expect(names).toContain('Length')
    expect(names).toContain('Trim')
    expect(names).toContain('Replace')
  })

  it('includes date functions', () => {
    const names = BUILTIN_FUNCTIONS.map(f => f.name)
    expect(names).toContain('Now')
    expect(names).toContain('Today')
    expect(names).toContain('Duration')
  })
})

// ============================================================================
// FUNCTION_MAP
// ============================================================================

describe('FUNCTION_MAP', () => {
  it('is a Map', () => {
    expect(FUNCTION_MAP instanceof Map).toBe(true)
  })

  it('has same count as BUILTIN_FUNCTIONS', () => {
    expect(FUNCTION_MAP.size).toBe(BUILTIN_FUNCTIONS.length)
  })

  it('keys are lowercase', () => {
    for (const key of FUNCTION_MAP.keys()) {
      expect(key).toBe(key.toLowerCase())
    }
  })

  it('values are function definitions', () => {
    for (const fn of FUNCTION_MAP.values()) {
      expect(fn.name).toBeDefined()
      expect(fn.implementation).toBeDefined()
    }
  })
})

// ============================================================================
// getFunction
// ============================================================================

describe('getFunction', () => {
  it('returns function by name', () => {
    const sum = getFunction('Sum')
    expect(sum).toBeDefined()
    expect(sum?.name).toBe('Sum')
  })

  it('is case insensitive', () => {
    expect(getFunction('sum')).toBeDefined()
    expect(getFunction('SUM')).toBeDefined()
    expect(getFunction('Sum')).toBeDefined()
  })

  it('returns undefined for unknown function', () => {
    expect(getFunction('NonExistent')).toBeUndefined()
  })
})

// ============================================================================
// hasFunction
// ============================================================================

describe('hasFunction', () => {
  it('returns true for existing function', () => {
    expect(hasFunction('Sum')).toBe(true)
    expect(hasFunction('Concat')).toBe(true)
    expect(hasFunction('Today')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(hasFunction('sum')).toBe(true)
    expect(hasFunction('SUM')).toBe(true)
    expect(hasFunction('Sum')).toBe(true)
  })

  it('returns false for non-existing function', () => {
    expect(hasFunction('NotAFunction')).toBe(false)
    expect(hasFunction('')).toBe(false)
  })
})

// ============================================================================
// getFunctionsByCategory
// ============================================================================

describe('getFunctionsByCategory', () => {
  it('returns math functions', () => {
    const mathFns = getFunctionsByCategory('math')
    expect(mathFns.length).toBeGreaterThan(0)
    expect(mathFns.every(f => f.category === 'math')).toBe(true)
  })

  it('returns string functions', () => {
    const stringFns = getFunctionsByCategory('string')
    expect(stringFns.length).toBeGreaterThan(0)
    expect(stringFns.every(f => f.category === 'string')).toBe(true)
  })

  it('returns date functions', () => {
    const dateFns = getFunctionsByCategory('date')
    expect(dateFns.length).toBeGreaterThan(0)
    expect(dateFns.every(f => f.category === 'date')).toBe(true)
  })

  it('returns empty array for unknown category', () => {
    expect(getFunctionsByCategory('unknown')).toEqual([])
  })
})

// ============================================================================
// Math Function Implementations
// ============================================================================

describe('Math Functions', () => {
  describe('Sum', () => {
    const sum = getFunction('Sum')!

    it('sums numbers', () => {
      expect(sum.implementation([1, 2, 3], mockContext)).toBe(6)
    })

    it('sums array of numbers', () => {
      expect(sum.implementation([[1, 2, 3]], mockContext)).toBe(6)
    })

    it('sums mixed args and arrays', () => {
      expect(sum.implementation([1, [2, 3], 4], mockContext)).toBe(10)
    })

    it('handles empty args', () => {
      expect(sum.implementation([], mockContext)).toBe(0)
    })

    it('converts strings to numbers', () => {
      expect(sum.implementation(['1', '2', '3'], mockContext)).toBe(6)
    })
  })

  describe('Average', () => {
    const avg = getFunction('Average')!

    it('calculates average', () => {
      expect(avg.implementation([10, 20, 30], mockContext)).toBe(20)
    })

    it('handles single value', () => {
      expect(avg.implementation([5], mockContext)).toBe(5)
    })

    it('returns 0 for empty args', () => {
      expect(avg.implementation([], mockContext)).toBe(0)
    })
  })

  describe('Min', () => {
    const min = getFunction('Min')!

    it('finds minimum', () => {
      expect(min.implementation([5, 3, 8, 1], mockContext)).toBe(1)
    })

    it('handles negative numbers', () => {
      expect(min.implementation([-5, 3, -8, 1], mockContext)).toBe(-8)
    })

    it('returns 0 for empty args', () => {
      expect(min.implementation([], mockContext)).toBe(0)
    })
  })

  describe('Max', () => {
    const max = getFunction('Max')!

    it('finds maximum', () => {
      expect(max.implementation([5, 3, 8, 1], mockContext)).toBe(8)
    })

    it('handles negative numbers', () => {
      expect(max.implementation([-5, -3, -8, -1], mockContext)).toBe(-1)
    })

    it('returns 0 for empty args', () => {
      expect(max.implementation([], mockContext)).toBe(0)
    })
  })

  describe('Round', () => {
    const round = getFunction('Round')!

    it('rounds to integer by default', () => {
      expect(round.implementation([3.7], mockContext)).toBe(4)
      expect(round.implementation([3.2], mockContext)).toBe(3)
    })

    it('rounds to specified decimal places', () => {
      expect(round.implementation([3.14159, 2], mockContext)).toBe(3.14)
      expect(round.implementation([3.14159, 3], mockContext)).toBe(3.142)
    })

    it('handles 0 decimal places', () => {
      expect(round.implementation([3.14159, 0], mockContext)).toBe(3)
    })
  })

  describe('Abs', () => {
    const abs = getFunction('Abs')!

    it('returns absolute value', () => {
      expect(abs.implementation([-5], mockContext)).toBe(5)
      expect(abs.implementation([5], mockContext)).toBe(5)
    })

    it('handles zero', () => {
      expect(abs.implementation([0], mockContext)).toBe(0)
    })
  })
})

// ============================================================================
// String Function Implementations
// ============================================================================

describe('String Functions', () => {
  describe('Concat', () => {
    const concat = getFunction('Concat')!

    it('concatenates strings', () => {
      expect(concat.implementation(['Hello', ' ', 'World'], mockContext)).toBe('Hello World')
    })

    it('handles empty strings', () => {
      expect(concat.implementation(['Hello', '', 'World'], mockContext)).toBe('HelloWorld')
    })

    it('converts numbers to strings', () => {
      expect(concat.implementation(['Value: ', 42], mockContext)).toBe('Value: 42')
    })
  })

  describe('Upper', () => {
    const upper = getFunction('Upper')!

    it('converts to uppercase', () => {
      expect(upper.implementation(['hello'], mockContext)).toBe('HELLO')
    })

    it('handles mixed case', () => {
      expect(upper.implementation(['HeLLo WoRLd'], mockContext)).toBe('HELLO WORLD')
    })

    it('handles already uppercase', () => {
      expect(upper.implementation(['HELLO'], mockContext)).toBe('HELLO')
    })
  })

  describe('Lower', () => {
    const lower = getFunction('Lower')!

    it('converts to lowercase', () => {
      expect(lower.implementation(['HELLO'], mockContext)).toBe('hello')
    })

    it('handles mixed case', () => {
      expect(lower.implementation(['HeLLo WoRLd'], mockContext)).toBe('hello world')
    })
  })

  describe('Length', () => {
    const length = getFunction('Length')!

    it('returns string length', () => {
      expect(length.implementation(['hello'], mockContext)).toBe(5)
    })

    it('returns array length', () => {
      expect(length.implementation([[1, 2, 3]], mockContext)).toBe(3)
    })

    it('handles empty string', () => {
      expect(length.implementation([''], mockContext)).toBe(0)
    })

    it('handles empty array', () => {
      expect(length.implementation([[]], mockContext)).toBe(0)
    })
  })

  describe('Trim', () => {
    const trim = getFunction('Trim')!

    it('removes leading whitespace', () => {
      expect(trim.implementation(['  hello'], mockContext)).toBe('hello')
    })

    it('removes trailing whitespace', () => {
      expect(trim.implementation(['hello  '], mockContext)).toBe('hello')
    })

    it('removes both', () => {
      expect(trim.implementation(['  hello  '], mockContext)).toBe('hello')
    })

    it('preserves internal whitespace', () => {
      expect(trim.implementation(['  hello world  '], mockContext)).toBe('hello world')
    })
  })

  describe('Replace', () => {
    const replace = getFunction('Replace')!

    it('replaces occurrences', () => {
      expect(replace.implementation(['hello', 'l', 'w'], mockContext)).toBe('hewwo')
    })

    it('handles no matches', () => {
      expect(replace.implementation(['hello', 'x', 'y'], mockContext)).toBe('hello')
    })

    it('replaces with empty string', () => {
      expect(replace.implementation(['hello', 'l', ''], mockContext)).toBe('heo')
    })
  })
})

// ============================================================================
// Date Function Implementations
// ============================================================================

describe('Date Functions', () => {
  describe('Now', () => {
    const now = getFunction('Now')!

    it('returns ISO string', () => {
      const result = now.implementation([], mockContext)
      expect(result).toBe('2024-06-15T12:00:00.000Z')
    })
  })

  describe('Today', () => {
    const today = getFunction('Today')!

    it('returns date only', () => {
      const result = today.implementation([], mockContext)
      expect(result).toBe('2024-06-15')
    })
  })

  describe('Duration', () => {
    const duration = getFunction('Duration')!

    it('calculates days by default', () => {
      const result = duration.implementation(
        ['2024-06-10', '2024-06-15'],
        mockContext
      )
      expect(result).toBe(5)
    })

    it('calculates hours', () => {
      const result = duration.implementation(
        ['2024-06-15T00:00:00', '2024-06-15T12:00:00', 'hours'],
        mockContext
      )
      expect(result).toBe(12)
    })

    it('handles negative duration', () => {
      const result = duration.implementation(
        ['2024-06-15', '2024-06-10'],
        mockContext
      )
      expect(result).toBeLessThan(0)
    })
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Type coercion', () => {
    const sum = getFunction('Sum')!
    const concat = getFunction('Concat')!

    it('Sum coerces string numbers', () => {
      expect(sum.implementation(['1', '2', '3'], mockContext)).toBe(6)
    })

    it('Concat coerces numbers to strings', () => {
      expect(concat.implementation([1, 2, 3], mockContext)).toBe('123')
    })

    it('handles null/undefined in strings', () => {
      expect(concat.implementation([null, 'test'], mockContext)).toBe('test')
      expect(concat.implementation([undefined, 'test'], mockContext)).toBe('test')
    })
  })

  describe('Empty inputs', () => {
    it('Sum handles empty array', () => {
      const sum = getFunction('Sum')!
      expect(sum.implementation([[]], mockContext)).toBe(0)
    })

    it('Average handles empty array', () => {
      const avg = getFunction('Average')!
      expect(avg.implementation([[]], mockContext)).toBe(0)
    })

    it('Concat handles no args', () => {
      const concat = getFunction('Concat')!
      expect(concat.implementation([], mockContext)).toBe('')
    })
  })
})
