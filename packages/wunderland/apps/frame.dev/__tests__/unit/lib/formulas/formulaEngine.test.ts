/**
 * Formula Engine Tests
 * @module __tests__/unit/lib/formulas/formulaEngine.test
 *
 * Tests for the formula evaluation engine including parsing,
 * evaluation, and context management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseFormula,
  evaluateFormula,
  createFormulaContext,
  getAvailableFunctions,
  suggestFormulas,
  FormulaError,
  type FormulaContext,
  type ParsedFormula,
} from '@/lib/formulas/formulaEngine'

// Mock the mention resolver
vi.mock('@/lib/mentions/mentionResolver', () => ({
  resolveMention: vi.fn().mockResolvedValue(null),
}))

describe('Formula Engine', () => {
  // ============================================================================
  // createFormulaContext
  // ============================================================================

  describe('createFormulaContext', () => {
    it('creates default context', () => {
      const ctx = createFormulaContext()

      expect(ctx.mentions).toEqual([])
      expect(ctx.fields).toEqual({})
      expect(ctx.siblings).toEqual([])
      expect(ctx.settings).toEqual({})
      expect(ctx.currentStrandPath).toBe('')
      expect(ctx.currentBlockId).toBe('')
      expect(ctx.now).toBeInstanceOf(Date)
    })

    it('allows overriding fields', () => {
      const ctx = createFormulaContext({
        fields: { amount: 100, name: 'test' },
      })

      expect(ctx.fields.amount).toBe(100)
      expect(ctx.fields.name).toBe('test')
    })

    it('allows overriding mentions', () => {
      const mentions = [
        { type: 'place' as const, label: 'Paris', resolved: true } as any,
      ]
      const ctx = createFormulaContext({ mentions })

      expect(ctx.mentions).toHaveLength(1)
      expect(ctx.mentions[0].label).toBe('Paris')
    })

    it('allows overriding strandPath', () => {
      const ctx = createFormulaContext({
        currentStrandPath: '/my/strand',
      })

      expect(ctx.currentStrandPath).toBe('/my/strand')
    })

    it('allows overriding now', () => {
      const customDate = new Date('2025-06-15')
      const ctx = createFormulaContext({ now: customDate })

      expect(ctx.now).toBe(customDate)
    })
  })

  // ============================================================================
  // parseFormula - Literals
  // ============================================================================

  describe('parseFormula - literals', () => {
    it('parses integer', () => {
      const parsed = parseFormula('42')

      expect(parsed.ast.type).toBe('literal')
      expect((parsed.ast as any).value).toBe(42)
    })

    it('parses decimal', () => {
      const parsed = parseFormula('3.14159')

      expect(parsed.ast.type).toBe('literal')
      expect((parsed.ast as any).value).toBeCloseTo(3.14159)
    })

    it('parses double-quoted string', () => {
      const parsed = parseFormula('"hello world"')

      expect(parsed.ast.type).toBe('literal')
      expect((parsed.ast as any).value).toBe('hello world')
    })

    it('parses single-quoted string', () => {
      const parsed = parseFormula("'hello world'")

      expect(parsed.ast.type).toBe('literal')
      expect((parsed.ast as any).value).toBe('hello world')
    })

    it('handles escaped characters in strings', () => {
      const parsed = parseFormula('"hello\\"world"')

      expect((parsed.ast as any).value).toContain('world')
    })
  })

  // ============================================================================
  // parseFormula - Operators
  // ============================================================================

  describe('parseFormula - operators', () => {
    it('parses addition', () => {
      const parsed = parseFormula('1 + 2')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('+')
    })

    it('parses subtraction', () => {
      const parsed = parseFormula('5 - 3')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('-')
    })

    it('parses multiplication', () => {
      const parsed = parseFormula('4 * 5')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('*')
    })

    it('parses division', () => {
      const parsed = parseFormula('10 / 2')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('/')
    })

    it('parses modulo', () => {
      const parsed = parseFormula('10 % 3')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('%')
    })

    it('parses unary minus', () => {
      const parsed = parseFormula('-42')

      expect(parsed.ast.type).toBe('unary')
      expect((parsed.ast as any).operator).toBe('-')
    })

    it('respects operator precedence', () => {
      const parsed = parseFormula('1 + 2 * 3')

      // Should be parsed as 1 + (2 * 3)
      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('+')
      expect((parsed.ast as any).right.type).toBe('binary')
      expect((parsed.ast as any).right.operator).toBe('*')
    })

    it('parses parenthesized expressions', () => {
      const parsed = parseFormula('(1 + 2) * 3')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('*')
      expect((parsed.ast as any).left.type).toBe('binary')
      expect((parsed.ast as any).left.operator).toBe('+')
    })
  })

  // ============================================================================
  // parseFormula - Comparisons
  // ============================================================================

  describe('parseFormula - comparisons', () => {
    it('parses equals (=)', () => {
      const parsed = parseFormula('x = 5')

      expect(parsed.ast.type).toBe('binary')
      expect((parsed.ast as any).operator).toBe('=')
    })

    it('parses equals (==)', () => {
      const parsed = parseFormula('x == 5')

      expect((parsed.ast as any).operator).toBe('==')
    })

    it('parses not equals (!=)', () => {
      const parsed = parseFormula('x != 5')

      expect((parsed.ast as any).operator).toBe('!=')
    })

    it('parses not equals (<>)', () => {
      const parsed = parseFormula('x <> 5')

      expect((parsed.ast as any).operator).toBe('<>')
    })

    it('parses less than', () => {
      const parsed = parseFormula('x < 5')

      expect((parsed.ast as any).operator).toBe('<')
    })

    it('parses greater than', () => {
      const parsed = parseFormula('x > 5')

      expect((parsed.ast as any).operator).toBe('>')
    })

    it('parses less than or equal', () => {
      const parsed = parseFormula('x <= 5')

      expect((parsed.ast as any).operator).toBe('<=')
    })

    it('parses greater than or equal', () => {
      const parsed = parseFormula('x >= 5')

      expect((parsed.ast as any).operator).toBe('>=')
    })
  })

  // ============================================================================
  // parseFormula - Function Calls
  // ============================================================================

  describe('parseFormula - function calls', () => {
    it('parses function with no arguments', () => {
      const parsed = parseFormula('Now()')

      expect(parsed.ast.type).toBe('call')
      expect((parsed.ast as any).name).toBe('Now')
      expect((parsed.ast as any).arguments).toHaveLength(0)
    })

    it('parses function with one argument', () => {
      const parsed = parseFormula('Abs(-5)')

      expect(parsed.ast.type).toBe('call')
      expect((parsed.ast as any).name).toBe('Abs')
      expect((parsed.ast as any).arguments).toHaveLength(1)
    })

    it('parses function with multiple arguments', () => {
      const parsed = parseFormula('Sum(1, 2, 3)')

      expect(parsed.ast.type).toBe('call')
      expect((parsed.ast as any).name).toBe('Sum')
      expect((parsed.ast as any).arguments).toHaveLength(3)
    })

    it('parses nested function calls', () => {
      const parsed = parseFormula('Round(Abs(-3.14))')

      expect(parsed.ast.type).toBe('call')
      expect((parsed.ast as any).name).toBe('Round')
      expect((parsed.ast as any).arguments[0].type).toBe('call')
    })

    it('parses function with expression argument', () => {
      const parsed = parseFormula('Abs(2 + 3)')

      expect(parsed.ast.type).toBe('call')
      expect((parsed.ast as any).arguments[0].type).toBe('binary')
    })
  })

  // ============================================================================
  // parseFormula - Field References
  // ============================================================================

  describe('parseFormula - field references', () => {
    it('parses simple identifier', () => {
      const parsed = parseFormula('amount')

      expect(parsed.ast.type).toBe('identifier')
      expect((parsed.ast as any).name).toBe('amount')
    })

    it('parses identifier with underscore', () => {
      const parsed = parseFormula('total_amount')

      expect((parsed.ast as any).name).toBe('total_amount')
    })

    it('parses member access', () => {
      const parsed = parseFormula('item.price')

      expect(parsed.ast.type).toBe('member')
      expect((parsed.ast as any).property).toBe('price')
    })

    it('parses chained member access', () => {
      const parsed = parseFormula('order.item.price')

      expect(parsed.ast.type).toBe('member')
      expect((parsed.ast as any).property).toBe('price')
      expect((parsed.ast as any).object.type).toBe('member')
    })
  })

  // ============================================================================
  // parseFormula - Mentions
  // ============================================================================

  describe('parseFormula - mentions', () => {
    it('parses mention reference', () => {
      const parsed = parseFormula('@Paris')

      expect(parsed.ast.type).toBe('mention')
      expect((parsed.ast as any).name).toBe('Paris')
    })

    it('extracts mention as dependency', () => {
      const parsed = parseFormula('@Paris')

      expect(parsed.dependencies).toContain('@Paris')
    })

    it('parses mention in function call', () => {
      const parsed = parseFormula('Weather(@Paris)')

      expect((parsed.ast as any).arguments[0].type).toBe('mention')
    })
  })

  // ============================================================================
  // parseFormula - Dependencies
  // ============================================================================

  describe('parseFormula - dependencies', () => {
    it('extracts field dependencies', () => {
      const parsed = parseFormula('price + tax')

      expect(parsed.dependencies).toContain('price')
      expect(parsed.dependencies).toContain('tax')
    })

    it('extracts unique dependencies', () => {
      const parsed = parseFormula('x + x + x')

      expect(parsed.dependencies).toEqual(['x'])
    })

    it('returns empty dependencies for literals', () => {
      const parsed = parseFormula('42')

      expect(parsed.dependencies).toHaveLength(0)
    })

    it('extracts nested dependencies', () => {
      const parsed = parseFormula('Sum(a, b, c)')

      expect(parsed.dependencies).toContain('a')
      expect(parsed.dependencies).toContain('b')
      expect(parsed.dependencies).toContain('c')
    })
  })

  // ============================================================================
  // parseFormula - Errors
  // ============================================================================

  describe('parseFormula - errors', () => {
    it('throws on unclosed parenthesis', () => {
      expect(() => parseFormula('(1 + 2')).toThrow(FormulaError)
    })

    it('throws on unexpected token', () => {
      expect(() => parseFormula('1 + + 2')).toThrow(FormulaError)
    })

    it('throws on trailing content', () => {
      expect(() => parseFormula('1 + 2 3')).toThrow(FormulaError)
    })
  })

  // ============================================================================
  // evaluateFormula - Arithmetic
  // ============================================================================

  describe('evaluateFormula - arithmetic', () => {
    const ctx = createFormulaContext()

    it('evaluates addition', async () => {
      const result = await evaluateFormula('1 + 2', ctx)

      expect(result.success).toBe(true)
      expect(result.value).toBe(3)
    })

    it('evaluates subtraction', async () => {
      const result = await evaluateFormula('5 - 3', ctx)

      expect(result.value).toBe(2)
    })

    it('evaluates multiplication', async () => {
      const result = await evaluateFormula('4 * 5', ctx)

      expect(result.value).toBe(20)
    })

    it('evaluates division', async () => {
      const result = await evaluateFormula('10 / 2', ctx)

      expect(result.value).toBe(5)
    })

    it('evaluates modulo', async () => {
      const result = await evaluateFormula('10 % 3', ctx)

      expect(result.value).toBe(1)
    })

    it('evaluates unary minus', async () => {
      const result = await evaluateFormula('-42', ctx)

      expect(result.value).toBe(-42)
    })

    it('evaluates complex expression', async () => {
      const result = await evaluateFormula('(1 + 2) * 3 - 4', ctx)

      expect(result.value).toBe(5)
    })

    it('handles division by zero', async () => {
      const result = await evaluateFormula('10 / 0', ctx)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('evaluates decimals correctly', async () => {
      const result = await evaluateFormula('0.1 + 0.2', ctx)

      expect(result.value).toBeCloseTo(0.3)
    })
  })

  // ============================================================================
  // evaluateFormula - String operations
  // ============================================================================

  describe('evaluateFormula - strings', () => {
    const ctx = createFormulaContext()

    it('concatenates strings with +', async () => {
      const result = await evaluateFormula('"hello" + " " + "world"', ctx)

      expect(result.value).toBe('hello world')
    })

    it('converts number to string when concatenating', async () => {
      const result = await evaluateFormula('"value: " + 42', ctx)

      expect(result.value).toBe('value: 42')
    })
  })

  // ============================================================================
  // evaluateFormula - Comparisons
  // ============================================================================

  describe('evaluateFormula - comparisons', () => {
    const ctx = createFormulaContext()

    it('evaluates equals (true)', async () => {
      const result = await evaluateFormula('5 = 5', ctx)

      expect(result.value).toBe(true)
    })

    it('evaluates equals (false)', async () => {
      const result = await evaluateFormula('5 = 6', ctx)

      expect(result.value).toBe(false)
    })

    it('evaluates not equals (true)', async () => {
      const result = await evaluateFormula('5 != 6', ctx)

      expect(result.value).toBe(true)
    })

    it('evaluates less than', async () => {
      const result = await evaluateFormula('3 < 5', ctx)

      expect(result.value).toBe(true)
    })

    it('evaluates greater than', async () => {
      const result = await evaluateFormula('5 > 3', ctx)

      expect(result.value).toBe(true)
    })

    it('evaluates less than or equal', async () => {
      const result = await evaluateFormula('5 <= 5', ctx)

      expect(result.value).toBe(true)
    })

    it('evaluates greater than or equal', async () => {
      const result = await evaluateFormula('5 >= 5', ctx)

      expect(result.value).toBe(true)
    })
  })

  // ============================================================================
  // evaluateFormula - Fields
  // ============================================================================

  describe('evaluateFormula - fields', () => {
    it('resolves field from context', async () => {
      const ctx = createFormulaContext({
        fields: { amount: 100 },
      })
      const result = await evaluateFormula('amount', ctx)

      expect(result.value).toBe(100)
    })

    it('uses field in expression', async () => {
      const ctx = createFormulaContext({
        fields: { price: 10, quantity: 5 },
      })
      const result = await evaluateFormula('price * quantity', ctx)

      expect(result.value).toBe(50)
    })

    it('returns identifier as string if not in context', async () => {
      const ctx = createFormulaContext()
      const result = await evaluateFormula('unknownField', ctx)

      expect(result.value).toBe('unknownField')
    })
  })

  // ============================================================================
  // evaluateFormula - Member Access
  // ============================================================================

  describe('evaluateFormula - member access', () => {
    it('accesses object property', async () => {
      const ctx = createFormulaContext({
        fields: {
          item: { price: 25, name: 'Widget' },
        },
      })
      const result = await evaluateFormula('item.price', ctx)

      expect(result.value).toBe(25)
    })

    it('returns undefined for missing property', async () => {
      const ctx = createFormulaContext({
        fields: { item: { price: 25 } },
      })
      const result = await evaluateFormula('item.missing', ctx)

      expect(result.value).toBeUndefined()
    })

    it('handles null object gracefully', async () => {
      const ctx = createFormulaContext({
        fields: { item: null },
      })
      const result = await evaluateFormula('item.price', ctx)

      expect(result.value).toBeUndefined()
    })

    it('accesses properties object (MentionableEntity style)', async () => {
      const ctx = createFormulaContext({
        fields: {
          entity: {
            properties: { customField: 'custom value' },
          },
        },
      })
      const result = await evaluateFormula('entity.customField', ctx)

      expect(result.value).toBe('custom value')
    })
  })

  // ============================================================================
  // evaluateFormula - Result structure
  // ============================================================================

  describe('evaluateFormula - result structure', () => {
    const ctx = createFormulaContext()

    it('returns success true on success', async () => {
      const result = await evaluateFormula('1 + 1', ctx)

      expect(result.success).toBe(true)
    })

    it('returns success false on error', async () => {
      const result = await evaluateFormula('UnknownFunction()', ctx)

      expect(result.success).toBe(false)
    })

    it('includes dependencies', async () => {
      const result = await evaluateFormula('x + y', ctx)

      expect(result.dependencies).toContain('x')
      expect(result.dependencies).toContain('y')
    })

    it('includes evaluatedAt timestamp', async () => {
      const result = await evaluateFormula('1', ctx)

      expect(result.evaluatedAt).toBeDefined()
      expect(() => new Date(result.evaluatedAt)).not.toThrow()
    })

    it('includes executionTimeMs', async () => {
      const result = await evaluateFormula('1', ctx)

      expect(typeof result.executionTimeMs).toBe('number')
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('includes error on failure', async () => {
      const result = await evaluateFormula('UnknownFunc()', ctx)

      expect(result.error).toBeDefined()
    })
  })

  // ============================================================================
  // getAvailableFunctions
  // ============================================================================

  describe('getAvailableFunctions', () => {
    it('returns array of functions', () => {
      const functions = getAvailableFunctions()

      expect(Array.isArray(functions)).toBe(true)
      expect(functions.length).toBeGreaterThan(0)
    })

    it('includes math functions', () => {
      const functions = getAvailableFunctions()
      const names = functions.map(f => f.name)

      expect(names).toContain('Sum')
      expect(names).toContain('Abs')
      expect(names).toContain('Round')
    })

    it('includes date functions', () => {
      const functions = getAvailableFunctions()
      const names = functions.map(f => f.name)

      expect(names).toContain('Now')
      expect(names).toContain('Today')
    })

    it('each function has required properties', () => {
      const functions = getAvailableFunctions()

      for (const fn of functions) {
        expect(fn.name).toBeDefined()
        expect(fn.description).toBeDefined()
        expect(fn.category).toBeDefined()
        expect(fn.implementation).toBeDefined()
      }
    })
  })

  // ============================================================================
  // suggestFormulas
  // ============================================================================

  describe('suggestFormulas', () => {
    it('always suggests Now and Today', () => {
      const ctx = createFormulaContext()
      const suggestions = suggestFormulas(ctx)

      expect(suggestions).toContain('Now()')
      expect(suggestions).toContain('Today()')
    })

    it('suggests Route when two places exist', () => {
      const ctx = createFormulaContext({
        mentions: [
          { type: 'place', label: 'Paris', resolved: true } as any,
          { type: 'place', label: 'London', resolved: true } as any,
        ],
      })
      const suggestions = suggestFormulas(ctx)

      expect(suggestions.some(s => s.includes('Route'))).toBe(true)
    })

    it('suggests Distance when two places exist', () => {
      const ctx = createFormulaContext({
        mentions: [
          { type: 'place', label: 'Paris', resolved: true } as any,
          { type: 'place', label: 'London', resolved: true } as any,
        ],
      })
      const suggestions = suggestFormulas(ctx)

      expect(suggestions.some(s => s.includes('Distance'))).toBe(true)
    })

    it('suggests Sum for numeric fields', () => {
      const ctx = createFormulaContext({
        fields: { price: 10, quantity: 5 },
      })
      const suggestions = suggestFormulas(ctx)

      expect(suggestions.some(s => s.includes('Sum'))).toBe(true)
    })

    it('suggests Average for numeric fields', () => {
      const ctx = createFormulaContext({
        fields: { score1: 80, score2: 90 },
      })
      const suggestions = suggestFormulas(ctx)

      expect(suggestions.some(s => s.includes('Average'))).toBe(true)
    })

    it('suggests Count when siblings exist', () => {
      const ctx = createFormulaContext({
        siblings: [{} as any, {} as any],
      })
      const suggestions = suggestFormulas(ctx)

      expect(suggestions.some(s => s.includes('Count'))).toBe(true)
    })

    it('returns array even with empty context', () => {
      const ctx = createFormulaContext()
      const suggestions = suggestFormulas(ctx)

      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  // ============================================================================
  // FormulaError
  // ============================================================================

  describe('FormulaError', () => {
    it('is instanceof Error', () => {
      const error = new FormulaError('test', 'PARSE_ERROR')

      expect(error instanceof Error).toBe(true)
    })

    it('has message', () => {
      const error = new FormulaError('test message', 'PARSE_ERROR')

      expect(error.message).toBe('test message')
    })

    it('has code', () => {
      const error = new FormulaError('test', 'RUNTIME_ERROR')

      expect(error.code).toBe('RUNTIME_ERROR')
    })

    it('has optional position', () => {
      const error = new FormulaError('test', 'PARSE_ERROR', 10)

      expect(error.position).toBe(10)
    })
  })

  // ============================================================================
  // Complex formulas
  // ============================================================================

  describe('complex formulas', () => {
    it('evaluates nested function calls', async () => {
      const ctx = createFormulaContext()
      const result = await evaluateFormula('Round(Abs(-3.7))', ctx)

      expect(result.value).toBe(4)
    })

    it('evaluates formula with multiple operators', async () => {
      const ctx = createFormulaContext({
        fields: { a: 2, b: 3, c: 4 },
      })
      const result = await evaluateFormula('a + b * c - 1', ctx)

      expect(result.value).toBe(13) // 2 + (3 * 4) - 1 = 2 + 12 - 1 = 13
    })

    it('evaluates comparison in expression', async () => {
      const ctx = createFormulaContext({
        fields: { score: 85 },
      })
      const result = await evaluateFormula('score >= 80', ctx)

      expect(result.value).toBe(true)
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles empty expression', async () => {
      const ctx = createFormulaContext()

      // Empty expression should throw during parse
      expect(() => parseFormula('')).toThrow()
    })

    it('handles whitespace-only expression', async () => {
      const ctx = createFormulaContext()

      expect(() => parseFormula('   ')).toThrow()
    })

    it('handles very large numbers', async () => {
      const ctx = createFormulaContext()
      const result = await evaluateFormula('999999999999 + 1', ctx)

      expect(result.value).toBe(1000000000000)
    })

    it('handles negative numbers in expressions', async () => {
      const ctx = createFormulaContext()
      const result = await evaluateFormula('-5 + -3', ctx)

      expect(result.value).toBe(-8)
    })

    it('handles deep nesting', async () => {
      const ctx = createFormulaContext()
      const result = await evaluateFormula('((((1 + 2))))', ctx)

      expect(result.value).toBe(3)
    })
  })
})
