/**
 * Formula Engine Tests
 * @module __tests__/unit/formulas/formulaEngine.test
 *
 * Tests for formula parsing, AST generation, and expression evaluation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseFormula,
  evaluateFormula,
  createFormulaContext,
  getAvailableFunctions,
  suggestFormulas,
  FormulaError,
} from '@/lib/formulas/formulaEngine'
import type { FormulaContext } from '@/lib/formulas/types'

// Mock the mentionResolver to avoid database calls
vi.mock('@/lib/mentions/mentionResolver', () => ({
  resolveMention: vi.fn().mockResolvedValue({
    entity: {
      id: 'mock-entity',
      type: 'place',
      label: 'Test Place',
      properties: { city: 'New York' },
    },
    confidence: 0.9,
  }),
}))

// ============================================================================
// PARSING TESTS
// ============================================================================

describe('Formula Parsing', () => {
  describe('Literals', () => {
    it('parses integer literals', () => {
      const result = parseFormula('42')
      expect(result.ast.type).toBe('literal')
      expect(result.ast.value).toBe(42)
    })

    it('parses floating point literals', () => {
      const result = parseFormula('3.14159')
      expect(result.ast.type).toBe('literal')
      expect(result.ast.value).toBeCloseTo(3.14159)
    })

    it('parses negative numbers via unary operator', () => {
      const result = parseFormula('-42')
      expect(result.ast.type).toBe('unary')
      expect(result.ast.operator).toBe('-')
    })

    it('parses single-quoted strings', () => {
      const result = parseFormula("'hello world'")
      expect(result.ast.type).toBe('literal')
      expect(result.ast.value).toBe('hello world')
    })

    it('parses double-quoted strings', () => {
      const result = parseFormula('"hello world"')
      expect(result.ast.type).toBe('literal')
      expect(result.ast.value).toBe('hello world')
    })

    it('parses strings with escaped characters', () => {
      const result = parseFormula('"hello\\"world"')
      expect(result.ast.type).toBe('literal')
    })
  })

  describe('Identifiers', () => {
    it('parses simple identifiers', () => {
      const result = parseFormula('fieldName')
      expect(result.ast.type).toBe('identifier')
      expect(result.ast.name).toBe('fieldName')
    })

    it('parses identifiers with underscores', () => {
      const result = parseFormula('field_name_123')
      expect(result.ast.type).toBe('identifier')
      expect(result.ast.name).toBe('field_name_123')
    })

    it('extracts identifiers as dependencies', () => {
      const result = parseFormula('price + tax')
      expect(result.dependencies).toContain('price')
      expect(result.dependencies).toContain('tax')
    })
  })

  describe('Mentions', () => {
    it('parses @mention syntax', () => {
      const result = parseFormula('@NewYork')
      expect(result.ast.type).toBe('mention')
      expect(result.ast.name).toBe('NewYork')
    })

    it('extracts mentions as dependencies with @ prefix', () => {
      const result = parseFormula('@Paris + @London')
      expect(result.dependencies).toContain('@Paris')
      expect(result.dependencies).toContain('@London')
    })
  })

  describe('Function Calls', () => {
    it('parses function call with no arguments', () => {
      const result = parseFormula('Now()')
      expect(result.ast.type).toBe('call')
      expect(result.ast.name).toBe('Now')
      expect(result.ast.arguments).toHaveLength(0)
    })

    it('parses function call with single argument', () => {
      const result = parseFormula('Abs(-5)')
      expect(result.ast.type).toBe('call')
      expect(result.ast.name).toBe('Abs')
      expect(result.ast.arguments).toHaveLength(1)
    })

    it('parses function call with multiple arguments', () => {
      const result = parseFormula('Sum(1, 2, 3)')
      expect(result.ast.type).toBe('call')
      expect(result.ast.name).toBe('Sum')
      expect(result.ast.arguments).toHaveLength(3)
    })

    it('parses nested function calls', () => {
      const result = parseFormula('Round(Average(1, 2, 3), 2)')
      expect(result.ast.type).toBe('call')
      expect(result.ast.arguments[0].type).toBe('call')
    })
  })

  describe('Binary Operators', () => {
    it('parses addition', () => {
      const result = parseFormula('1 + 2')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('+')
    })

    it('parses subtraction', () => {
      const result = parseFormula('5 - 3')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('-')
    })

    it('parses multiplication', () => {
      const result = parseFormula('4 * 5')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('*')
    })

    it('parses division', () => {
      const result = parseFormula('10 / 2')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('/')
    })

    it('parses modulo', () => {
      const result = parseFormula('7 % 3')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('%')
    })

    it('respects operator precedence (* before +)', () => {
      const result = parseFormula('1 + 2 * 3')
      // Should be 1 + (2 * 3), so root is +
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('+')
      expect(result.ast.right.type).toBe('binary')
      expect(result.ast.right.operator).toBe('*')
    })

    it('respects parentheses for grouping', () => {
      const result = parseFormula('(1 + 2) * 3')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('*')
      expect(result.ast.left.type).toBe('binary')
      expect(result.ast.left.operator).toBe('+')
    })
  })

  describe('Comparison Operators', () => {
    it('parses equals (=)', () => {
      const result = parseFormula('a = b')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('=')
    })

    it('parses double equals (==)', () => {
      const result = parseFormula('a == b')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('==')
    })

    it('parses not equals (!=)', () => {
      const result = parseFormula('a != b')
      expect(result.ast.type).toBe('binary')
      expect(result.ast.operator).toBe('!=')
    })

    it('parses less than (<)', () => {
      const result = parseFormula('5 < 10')
      expect(result.ast.operator).toBe('<')
    })

    it('parses greater than (>)', () => {
      const result = parseFormula('10 > 5')
      expect(result.ast.operator).toBe('>')
    })

    it('parses less than or equal (<=)', () => {
      const result = parseFormula('5 <= 10')
      expect(result.ast.operator).toBe('<=')
    })

    it('parses greater than or equal (>=)', () => {
      const result = parseFormula('10 >= 5')
      expect(result.ast.operator).toBe('>=')
    })
  })

  describe('Member Access', () => {
    it('parses dot notation', () => {
      const result = parseFormula('entity.property')
      expect(result.ast.type).toBe('member')
      expect(result.ast.property).toBe('property')
    })

    it('parses chained member access', () => {
      const result = parseFormula('entity.properties.city')
      expect(result.ast.type).toBe('member')
      expect(result.ast.property).toBe('city')
      expect(result.ast.object.type).toBe('member')
    })

    it('parses member access on mentions', () => {
      const result = parseFormula('@NewYork.latitude')
      expect(result.ast.type).toBe('member')
      expect(result.ast.property).toBe('latitude')
      expect(result.ast.object.type).toBe('mention')
    })
  })

  describe('Error Handling', () => {
    it('throws FormulaError on unbalanced parentheses', () => {
      expect(() => parseFormula('(1 + 2')).toThrow()
    })

    it('throws FormulaError on unexpected token', () => {
      expect(() => parseFormula('1 + + 2')).toThrow()
    })

    it('throws FormulaError on incomplete expression', () => {
      expect(() => parseFormula('1 +')).toThrow()
    })
  })
})

// ============================================================================
// EVALUATION TESTS
// ============================================================================

describe('Formula Evaluation', () => {
  let context: FormulaContext

  beforeEach(() => {
    context = createFormulaContext({
      now: new Date('2024-06-15T12:00:00Z'),
      fields: {
        price: 100,
        quantity: 5,
        taxRate: 0.1,
        name: 'Test Product',
      },
      mentions: [
        {
          id: 'mention-1',
          type: 'place',
          label: 'Paris',
          properties: { latitude: 48.8566, longitude: 2.3522 },
        } as any,
      ],
      siblings: [
        { id: 'item-1', fields: { amount: 10, status: 'done' } },
        { id: 'item-2', fields: { amount: 20, status: 'pending' } },
        { id: 'item-3', fields: { amount: 30, status: 'done' } },
      ],
    })
  })

  describe('Literal Evaluation', () => {
    it('evaluates number literals', async () => {
      const result = await evaluateFormula('42', context)
      expect(result.success).toBe(true)
      expect(result.value).toBe(42)
    })

    it('evaluates string literals', async () => {
      const result = await evaluateFormula('"hello"', context)
      expect(result.success).toBe(true)
      expect(result.value).toBe('hello')
    })
  })

  describe('Field Access', () => {
    it('evaluates field references', async () => {
      const result = await evaluateFormula('price', context)
      expect(result.success).toBe(true)
      expect(result.value).toBe(100)
    })

    it('evaluates expressions with fields', async () => {
      const result = await evaluateFormula('price * quantity', context)
      expect(result.success).toBe(true)
      expect(result.value).toBe(500)
    })

    it('evaluates complex field expressions', async () => {
      const result = await evaluateFormula('price * quantity * (1 + taxRate)', context)
      expect(result.success).toBe(true)
      expect(result.value).toBeCloseTo(550)
    })
  })

  describe('Arithmetic Operations', () => {
    it('evaluates addition', async () => {
      const result = await evaluateFormula('10 + 5', context)
      expect(result.value).toBe(15)
    })

    it('evaluates subtraction', async () => {
      const result = await evaluateFormula('10 - 3', context)
      expect(result.value).toBe(7)
    })

    it('evaluates multiplication', async () => {
      const result = await evaluateFormula('6 * 7', context)
      expect(result.value).toBe(42)
    })

    it('evaluates division', async () => {
      const result = await evaluateFormula('20 / 4', context)
      expect(result.value).toBe(5)
    })

    it('evaluates modulo', async () => {
      const result = await evaluateFormula('17 % 5', context)
      expect(result.value).toBe(2)
    })

    it('handles string concatenation with +', async () => {
      const result = await evaluateFormula('"Hello" + " " + "World"', context)
      expect(result.value).toBe('Hello World')
    })

    it('handles mixed number/string concatenation', async () => {
      const result = await evaluateFormula('"Price: " + 42', context)
      expect(result.value).toBe('Price: 42')
    })
  })

  describe('Comparison Operations', () => {
    it('evaluates equality (true)', async () => {
      const result = await evaluateFormula('5 == 5', context)
      expect(result.value).toBe(true)
    })

    it('evaluates equality (false)', async () => {
      const result = await evaluateFormula('5 == 6', context)
      expect(result.value).toBe(false)
    })

    it('evaluates inequality', async () => {
      const result = await evaluateFormula('5 != 6', context)
      expect(result.value).toBe(true)
    })

    it('evaluates less than', async () => {
      const result = await evaluateFormula('3 < 5', context)
      expect(result.value).toBe(true)
    })

    it('evaluates greater than', async () => {
      const result = await evaluateFormula('10 > 5', context)
      expect(result.value).toBe(true)
    })
  })

  describe('Function Calls', () => {
    it('evaluates Sum function', async () => {
      const result = await evaluateFormula('Sum(1, 2, 3, 4)', context)
      expect(result.value).toBe(10)
    })

    it('evaluates Average function', async () => {
      const result = await evaluateFormula('Average(10, 20, 30)', context)
      expect(result.value).toBe(20)
    })

    it('evaluates Now function', async () => {
      const result = await evaluateFormula('Now()', context)
      expect(result.value).toBe('2024-06-15T12:00:00.000Z')
    })

    it('evaluates Today function', async () => {
      const result = await evaluateFormula('Today()', context)
      expect(result.value).toBe('2024-06-15')
    })

    it('evaluates If function (true branch)', async () => {
      const result = await evaluateFormula('If(5 > 3, "yes", "no")', context)
      expect(result.value).toBe('yes')
    })

    it('evaluates If function (false branch)', async () => {
      const result = await evaluateFormula('If(2 > 3, "yes", "no")', context)
      expect(result.value).toBe('no')
    })

    it('evaluates nested functions', async () => {
      const result = await evaluateFormula('Round(Average(1, 2, 3, 4), 1)', context)
      expect(result.value).toBe(2.5)
    })

    it('evaluates Concat function', async () => {
      const result = await evaluateFormula('Concat("Hello", " ", "World")', context)
      expect(result.value).toBe('Hello World')
    })

    it('evaluates Upper function', async () => {
      const result = await evaluateFormula('Upper("hello")', context)
      expect(result.value).toBe('HELLO')
    })

    it('evaluates Length function on string', async () => {
      const result = await evaluateFormula('Length("hello")', context)
      expect(result.value).toBe(5)
    })
  })

  describe('Error Handling', () => {
    it('returns error for unknown function', async () => {
      const result = await evaluateFormula('UnknownFunction()', context)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('returns error for division by zero', async () => {
      const result = await evaluateFormula('10 / 0', context)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('includes execution time in result', async () => {
      const result = await evaluateFormula('1 + 1', context)
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('includes evaluatedAt timestamp', async () => {
      const result = await evaluateFormula('1 + 1', context)
      expect(result.evaluatedAt).toBeDefined()
      expect(new Date(result.evaluatedAt).getTime()).toBeGreaterThan(0)
    })
  })

  describe('Dependencies Tracking', () => {
    it('tracks field dependencies', async () => {
      const result = await evaluateFormula('price + quantity', context)
      expect(result.dependencies).toContain('price')
      expect(result.dependencies).toContain('quantity')
    })

    it('tracks mention dependencies', async () => {
      const result = await evaluateFormula('@Paris + @London', context)
      expect(result.dependencies).toContain('@Paris')
      expect(result.dependencies).toContain('@London')
    })

    it('deduplicates dependencies', async () => {
      const result = await evaluateFormula('price + price + price', context)
      expect(result.dependencies.filter(d => d === 'price')).toHaveLength(1)
    })
  })
})

// ============================================================================
// CONTEXT TESTS
// ============================================================================

describe('Formula Context', () => {
  it('creates default context with empty values', () => {
    const context = createFormulaContext()
    expect(context.mentions).toEqual([])
    expect(context.fields).toEqual({})
    expect(context.siblings).toEqual([])
    expect(context.settings).toEqual({})
    expect(context.now).toBeInstanceOf(Date)
  })

  it('merges overrides into default context', () => {
    const context = createFormulaContext({
      fields: { test: 123 },
      currentStrandPath: '/test/path',
    })
    expect(context.fields.test).toBe(123)
    expect(context.currentStrandPath).toBe('/test/path')
    expect(context.mentions).toEqual([])
  })
})

// ============================================================================
// UTILITY TESTS
// ============================================================================

describe('Formula Utilities', () => {
  describe('getAvailableFunctions', () => {
    it('returns array of functions', () => {
      const functions = getAvailableFunctions()
      expect(Array.isArray(functions)).toBe(true)
      expect(functions.length).toBeGreaterThan(0)
    })

    it('each function has required properties', () => {
      const functions = getAvailableFunctions()
      for (const fn of functions) {
        expect(fn.name).toBeDefined()
        expect(fn.category).toBeDefined()
        expect(fn.description).toBeDefined()
        expect(typeof fn.implementation).toBe('function')
      }
    })
  })

  describe('suggestFormulas', () => {
    it('suggests date functions for any context', () => {
      const context = createFormulaContext()
      const suggestions = suggestFormulas(context)
      expect(suggestions).toContain('Now()')
      expect(suggestions).toContain('Today()')
    })

    it('suggests Route when two places exist', () => {
      const context = createFormulaContext({
        mentions: [
          { id: '1', type: 'place', label: 'Paris', properties: {} } as any,
          { id: '2', type: 'place', label: 'London', properties: {} } as any,
        ],
      })
      const suggestions = suggestFormulas(context)
      expect(suggestions.some(s => s.includes('Route'))).toBe(true)
    })

    it('suggests aggregations when numeric fields exist', () => {
      const context = createFormulaContext({
        fields: { amount: 100, quantity: 5 },
      })
      const suggestions = suggestFormulas(context)
      expect(suggestions.some(s => s.includes('Sum'))).toBe(true)
      expect(suggestions.some(s => s.includes('Average'))).toBe(true)
    })

    it('suggests Count when siblings exist', () => {
      const context = createFormulaContext({
        siblings: [{ id: '1' }, { id: '2' }],
      })
      const suggestions = suggestFormulas(context)
      expect(suggestions.some(s => s.includes('Count'))).toBe(true)
    })
  })
})

