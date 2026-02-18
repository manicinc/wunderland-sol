/**
 * Built-in Formula Functions Tests
 * @module __tests__/unit/formulas/builtinFunctions.test
 *
 * Tests for math, string, date, logic, and aggregate formula functions.
 */

import { describe, it, expect } from 'vitest'
import {
  BUILTIN_FUNCTIONS,
  FUNCTION_MAP,
  getFunction,
  hasFunction,
  getFunctionsByCategory,
} from '@/lib/formulas/builtinFunctions'

// Helper to execute a function by name with optional context
function execute(name: string, ...args: unknown[]): unknown {
  const fn = getFunction(name)
  if (!fn) throw new Error(`Function ${name} not found`)
  // Provide default context for functions that need it
  const context = {
    now: new Date('2024-06-15T12:00:00Z'),
    siblings: [],
    fields: {},
    row: { id: 'test', title: 'Test' },
  }
  return fn.implementation(args, context)
}

// ============================================================================
// FUNCTION REGISTRY
// ============================================================================

describe('Function Registry', () => {
  it('BUILTIN_FUNCTIONS contains functions', () => {
    expect(BUILTIN_FUNCTIONS.length).toBeGreaterThan(0)
  })

  it('FUNCTION_MAP has same count as BUILTIN_FUNCTIONS', () => {
    expect(FUNCTION_MAP.size).toBe(BUILTIN_FUNCTIONS.length)
  })

  it('getFunction returns function by name', () => {
    const fn = getFunction('Sum')
    expect(fn).toBeDefined()
    expect(fn?.name).toBe('Sum')
  })

  it('getFunction is case-insensitive', () => {
    expect(getFunction('sum')).toBeDefined()
    expect(getFunction('SUM')).toBeDefined()
    expect(getFunction('Sum')).toBeDefined()
  })

  it('getFunction returns undefined for unknown function', () => {
    expect(getFunction('UnknownFunction')).toBeUndefined()
  })

  it('hasFunction returns true for existing functions', () => {
    expect(hasFunction('Sum')).toBe(true)
    expect(hasFunction('Average')).toBe(true)
  })

  it('hasFunction returns false for non-existent functions', () => {
    expect(hasFunction('NotAFunction')).toBe(false)
  })

  it('getFunctionsByCategory returns math functions', () => {
    const mathFns = getFunctionsByCategory('math')
    expect(mathFns.length).toBeGreaterThan(0)
    expect(mathFns.every(fn => fn.category === 'math')).toBe(true)
  })

  it('getFunctionsByCategory returns string functions', () => {
    const stringFns = getFunctionsByCategory('string')
    expect(stringFns.length).toBeGreaterThan(0)
  })

  it('getFunctionsByCategory returns empty for unknown category', () => {
    expect(getFunctionsByCategory('unknownCategory')).toEqual([])
  })
})

// ============================================================================
// MATH FUNCTIONS
// ============================================================================

describe('Math Functions', () => {
  describe('Sum', () => {
    it('sums multiple numbers', () => {
      expect(execute('Sum', 1, 2, 3)).toBe(6)
    })

    it('sums array of numbers', () => {
      expect(execute('Sum', [1, 2, 3])).toBe(6)
    })

    it('handles single number', () => {
      expect(execute('Sum', 5)).toBe(5)
    })

    it('returns 0 for empty args', () => {
      expect(execute('Sum')).toBe(0)
    })

    it('handles mixed arrays and numbers', () => {
      expect(execute('Sum', 1, [2, 3], 4)).toBe(10)
    })
  })

  describe('Average', () => {
    it('calculates average of numbers', () => {
      expect(execute('Average', 10, 20, 30)).toBe(20)
    })

    it('calculates average of array', () => {
      expect(execute('Average', [10, 20, 30])).toBe(20)
    })

    it('returns 0 for empty args', () => {
      expect(execute('Average')).toBe(0)
    })

    it('handles single number', () => {
      expect(execute('Average', 10)).toBe(10)
    })
  })

  describe('Min', () => {
    it('finds minimum value', () => {
      expect(execute('Min', 5, 3, 8)).toBe(3)
    })

    it('handles negative numbers', () => {
      expect(execute('Min', -5, 3, -8)).toBe(-8)
    })

    it('returns 0 for empty args', () => {
      expect(execute('Min')).toBe(0)
    })
  })

  describe('Max', () => {
    it('finds maximum value', () => {
      expect(execute('Max', 5, 3, 8)).toBe(8)
    })

    it('handles negative numbers', () => {
      expect(execute('Max', -5, -3, -8)).toBe(-3)
    })

    it('returns 0 for empty args', () => {
      expect(execute('Max')).toBe(0)
    })
  })

  describe('Round', () => {
    it('rounds to integer by default', () => {
      expect(execute('Round', 3.7)).toBe(4)
      expect(execute('Round', 3.2)).toBe(3)
    })

    it('rounds to specified decimals', () => {
      expect(execute('Round', 3.14159, 2)).toBe(3.14)
      expect(execute('Round', 3.14159, 3)).toBe(3.142)
    })

    it('rounds negative numbers', () => {
      expect(execute('Round', -3.7)).toBe(-4)
    })
  })

  describe('Abs', () => {
    it('returns absolute value', () => {
      expect(execute('Abs', -5)).toBe(5)
      expect(execute('Abs', 5)).toBe(5)
    })

    it('handles zero', () => {
      expect(execute('Abs', 0)).toBe(0)
    })
  })
})

// ============================================================================
// STRING FUNCTIONS
// ============================================================================

describe('String Functions', () => {
  describe('Concat', () => {
    it('concatenates strings', () => {
      expect(execute('Concat', 'Hello', ' ', 'World')).toBe('Hello World')
    })

    it('handles empty strings', () => {
      expect(execute('Concat', '', 'test')).toBe('test')
    })

    it('converts numbers to strings', () => {
      expect(execute('Concat', 'Value: ', 42)).toBe('Value: 42')
    })
  })

  describe('Upper', () => {
    it('converts to uppercase', () => {
      expect(execute('Upper', 'hello')).toBe('HELLO')
    })

    it('handles mixed case', () => {
      expect(execute('Upper', 'Hello World')).toBe('HELLO WORLD')
    })
  })

  describe('Lower', () => {
    it('converts to lowercase', () => {
      expect(execute('Lower', 'HELLO')).toBe('hello')
    })

    it('handles mixed case', () => {
      expect(execute('Lower', 'Hello World')).toBe('hello world')
    })
  })

  describe('Length', () => {
    it('returns string length', () => {
      expect(execute('Length', 'hello')).toBe(5)
    })

    it('returns array length', () => {
      expect(execute('Length', [1, 2, 3])).toBe(3)
    })

    it('returns 0 for empty string', () => {
      expect(execute('Length', '')).toBe(0)
    })
  })

  describe('Trim', () => {
    it('trims whitespace', () => {
      expect(execute('Trim', '  hello  ')).toBe('hello')
    })

    it('handles no whitespace', () => {
      expect(execute('Trim', 'hello')).toBe('hello')
    })
  })

  describe('Replace', () => {
    it('replaces text', () => {
      expect(execute('Replace', 'hello world', 'world', 'there')).toBe('hello there')
    })

    it('replaces all occurrences', () => {
      expect(execute('Replace', 'foo foo', 'foo', 'bar')).toBe('bar bar')
    })
  })
})

// ============================================================================
// DATE FUNCTIONS
// ============================================================================

describe('Date Functions', () => {
  describe('Now', () => {
    it('returns current datetime as ISO string', () => {
      const result = execute('Now')
      // Uses context.now which is set to '2024-06-15T12:00:00Z' in the execute helper
      expect(result).toBe('2024-06-15T12:00:00.000Z')
    })
  })

  describe('Today', () => {
    it('returns today date as YYYY-MM-DD string', () => {
      const result = execute('Today')
      // Uses context.now and returns just the date portion
      expect(result).toBe('2024-06-15')
    })
  })

  describe('Duration', () => {
    it('calculates days between dates', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-11')
      expect(execute('Duration', start, end, 'days')).toBe(10)
    })

    it('calculates hours between dates', () => {
      const start = new Date('2024-01-01T00:00:00')
      const end = new Date('2024-01-01T12:00:00')
      expect(execute('Duration', start, end, 'hours')).toBe(12)
    })

    it('defaults to days', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-11')
      expect(execute('Duration', start, end)).toBe(10)
    })
  })

  describe('DateAdd', () => {
    it('adds days to date and returns ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const result = execute('DateAdd', date, 10, 'days') as string
      expect(result).toBe('2024-01-11T00:00:00.000Z')
    })

    it('adds hours to date and returns ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const result = execute('DateAdd', date, 5, 'hours') as string
      expect(result).toBe('2024-01-01T05:00:00.000Z')
    })

    it('handles negative amounts', () => {
      const date = new Date('2024-01-11T00:00:00.000Z')
      const result = execute('DateAdd', date, -10, 'days') as string
      expect(result).toBe('2024-01-01T00:00:00.000Z')
    })

    it('adds weeks', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const result = execute('DateAdd', date, 2, 'weeks') as string
      expect(result).toBe('2024-01-15T00:00:00.000Z')
    })
  })
})

// ============================================================================
// LOGIC FUNCTIONS
// ============================================================================

describe('Logic Functions', () => {
  describe('If', () => {
    it('returns trueValue when condition is true', () => {
      expect(execute('If', true, 'yes', 'no')).toBe('yes')
    })

    it('returns falseValue when condition is false', () => {
      expect(execute('If', false, 'yes', 'no')).toBe('no')
    })

    it('handles truthy values', () => {
      expect(execute('If', 1, 'yes', 'no')).toBe('yes')
      expect(execute('If', 'string', 'yes', 'no')).toBe('yes')
    })

    it('handles falsy values', () => {
      expect(execute('If', 0, 'yes', 'no')).toBe('no')
      expect(execute('If', '', 'yes', 'no')).toBe('no')
    })
  })

  describe('And', () => {
    it('returns true when all conditions are true', () => {
      expect(execute('And', true, true, true)).toBe(true)
    })

    it('returns false when any condition is false', () => {
      expect(execute('And', true, false, true)).toBe(false)
    })
  })

  describe('Or', () => {
    it('returns true when any condition is true', () => {
      expect(execute('Or', false, true, false)).toBe(true)
    })

    it('returns false when all conditions are false', () => {
      expect(execute('Or', false, false, false)).toBe(false)
    })
  })

  describe('Not', () => {
    it('negates true to false', () => {
      expect(execute('Not', true)).toBe(false)
    })

    it('negates false to true', () => {
      expect(execute('Not', false)).toBe(true)
    })
  })
})

// ============================================================================
// AGGREGATE FUNCTIONS
// ============================================================================

describe('Aggregate Functions', () => {
  describe('Count', () => {
    it('counts array elements', () => {
      expect(execute('Count', [1, 2, 3, 4, 5])).toBe(5)
    })

    it('returns 0 for empty array', () => {
      expect(execute('Count', [])).toBe(0)
    })

    it('counts filtered items by field value', () => {
      const items = [
        { fields: { status: 'done' } },
        { fields: { status: 'todo' } },
        { fields: { status: 'done' } },
      ]
      expect(execute('Count', items, 'status', 'done')).toBe(2)
    })
  })

  describe('SumField', () => {
    it('sums numeric field across items', () => {
      const items = [
        { fields: { amount: 10 } },
        { fields: { amount: 20 } },
        { fields: { amount: 30 } },
      ]
      expect(execute('SumField', items, 'amount')).toBe(60)
    })

    it('returns 0 for empty array', () => {
      expect(execute('SumField', [], 'amount')).toBe(0)
    })

    it('handles string numbers', () => {
      const items = [
        { fields: { amount: '10' } },
        { fields: { amount: '20.5' } },
      ]
      expect(execute('SumField', items, 'amount')).toBe(30.5)
    })
  })
})
