/**
 * Formula Types Tests
 * @module __tests__/unit/lib/formulas/types.test
 *
 * Tests for formula engine types, error class, and type guards.
 */

import { describe, it, expect } from 'vitest'
import {
  FormulaError,
  isFormulaError,
  type FormulaErrorCode,
  type FormulaNodeType,
  type FunctionCategory,
  type FormulaResult,
  type FormulaValidation,
} from '@/lib/formulas/types'

// ============================================================================
// FormulaError
// ============================================================================

describe('FormulaError', () => {
  it('extends Error', () => {
    const error = new FormulaError('Test error', 'PARSE_ERROR')
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const error = new FormulaError('Test error', 'PARSE_ERROR')
    expect(error.name).toBe('FormulaError')
  })

  it('stores message', () => {
    const error = new FormulaError('Invalid syntax', 'PARSE_ERROR')
    expect(error.message).toBe('Invalid syntax')
  })

  it('stores error code', () => {
    const error = new FormulaError('Test', 'UNKNOWN_FUNCTION')
    expect(error.code).toBe('UNKNOWN_FUNCTION')
  })

  it('stores optional position', () => {
    const error = new FormulaError('Error at pos', 'PARSE_ERROR', 42)
    expect(error.position).toBe(42)
  })

  it('position is undefined by default', () => {
    const error = new FormulaError('Error', 'PARSE_ERROR')
    expect(error.position).toBeUndefined()
  })

  describe('error codes', () => {
    const testCases: Array<{ code: FormulaErrorCode; message: string }> = [
      { code: 'PARSE_ERROR', message: 'Unexpected token' },
      { code: 'UNKNOWN_FUNCTION', message: 'Function xyz not found' },
      { code: 'INVALID_ARGUMENTS', message: 'Expected 2 arguments' },
      { code: 'UNKNOWN_REFERENCE', message: 'Field abc not found' },
      { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero' },
      { code: 'TYPE_ERROR', message: 'Expected number, got string' },
      { code: 'CIRCULAR_REFERENCE', message: 'Field references itself' },
      { code: 'ASYNC_ERROR', message: 'API request failed' },
      { code: 'TIMEOUT', message: 'Evaluation exceeded 5000ms' },
    ]

    testCases.forEach(({ code, message }) => {
      it(`supports ${code} error code`, () => {
        const error = new FormulaError(message, code)
        expect(error.code).toBe(code)
        expect(error.message).toBe(message)
      })
    })
  })

  it('can be thrown and caught', () => {
    expect(() => {
      throw new FormulaError('Parse failed', 'PARSE_ERROR', 10)
    }).toThrow(FormulaError)
  })

  it('preserves stack trace', () => {
    const error = new FormulaError('Test', 'PARSE_ERROR')
    expect(error.stack).toBeDefined()
    expect(typeof error.stack).toBe('string')
  })

  it('can be caught by type', () => {
    try {
      throw new FormulaError('Division error', 'DIVISION_BY_ZERO', 5)
    } catch (e) {
      if (e instanceof FormulaError) {
        expect(e.code).toBe('DIVISION_BY_ZERO')
        expect(e.position).toBe(5)
      } else {
        throw new Error('Expected FormulaError')
      }
    }
  })
})

// ============================================================================
// isFormulaError
// ============================================================================

describe('isFormulaError', () => {
  it('returns true for FormulaError', () => {
    const error = new FormulaError('Test', 'PARSE_ERROR')
    expect(isFormulaError(error)).toBe(true)
  })

  it('returns false for regular Error', () => {
    const error = new Error('Regular error')
    expect(isFormulaError(error)).toBe(false)
  })

  it('returns false for TypeError', () => {
    const error = new TypeError('Type error')
    expect(isFormulaError(error)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isFormulaError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isFormulaError(undefined)).toBe(false)
  })

  it('returns false for string', () => {
    expect(isFormulaError('error message')).toBe(false)
  })

  it('returns false for number', () => {
    expect(isFormulaError(42)).toBe(false)
  })

  it('returns false for object with error-like properties', () => {
    const fakeError = {
      name: 'FormulaError',
      message: 'Test',
      code: 'PARSE_ERROR',
    }
    expect(isFormulaError(fakeError)).toBe(false)
  })

  it('narrows type correctly for FormulaError', () => {
    const value: unknown = new FormulaError('Test', 'TYPE_ERROR', 20)

    if (isFormulaError(value)) {
      expect(value.code).toBe('TYPE_ERROR')
      expect(value.position).toBe(20)
      expect(value.message).toBe('Test')
    } else {
      throw new Error('Expected FormulaError')
    }
  })

  it('narrows type correctly for non-FormulaError', () => {
    const value: unknown = new Error('Regular')

    if (!isFormulaError(value)) {
      expect(value instanceof Error).toBe(true)
    } else {
      throw new Error('Expected not FormulaError')
    }
  })
})

// ============================================================================
// Type Definitions Tests
// ============================================================================

describe('FormulaNodeType', () => {
  it('includes all expected node types', () => {
    const nodeTypes: FormulaNodeType[] = [
      'literal',
      'identifier',
      'reference',
      'property',
      'call',
      'binary',
      'unary',
      'conditional',
    ]
    expect(nodeTypes).toHaveLength(8)
  })
})

describe('FunctionCategory', () => {
  it('includes all expected categories', () => {
    const categories: FunctionCategory[] = [
      'math',
      'string',
      'date',
      'logic',
      'aggregate',
      'lookup',
      'travel',
      'reference',
    ]
    expect(categories).toHaveLength(8)
  })
})

describe('FormulaResult structure', () => {
  it('can represent successful result', () => {
    const result: FormulaResult = {
      success: true,
      value: 42,
      valueType: 'number',
      displayValue: '42',
    }
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('can represent failed result', () => {
    const result: FormulaResult = {
      success: false,
      value: null,
      valueType: 'null',
      displayValue: 'Error',
      error: 'Division by zero',
    }
    expect(result.success).toBe(false)
    expect(result.error).toBe('Division by zero')
  })

  it('supports all value types', () => {
    const types: FormulaResult['valueType'][] = [
      'string',
      'number',
      'boolean',
      'date',
      'array',
      'object',
      'null',
    ]
    expect(types).toHaveLength(7)
  })

  it('can include dependencies', () => {
    const result: FormulaResult = {
      success: true,
      value: 100,
      valueType: 'number',
      displayValue: '100',
      dependencies: ['field1', 'field2', '@entity-123'],
    }
    expect(result.dependencies).toEqual(['field1', 'field2', '@entity-123'])
  })

  it('can include evaluation time', () => {
    const result: FormulaResult = {
      success: true,
      value: 'computed',
      valueType: 'string',
      displayValue: 'computed',
      evaluationTimeMs: 15,
    }
    expect(result.evaluationTimeMs).toBe(15)
  })
})

describe('FormulaValidation structure', () => {
  it('can represent valid formula', () => {
    const validation: FormulaValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      references: ['field1'],
      functions: ['SUM'],
    }
    expect(validation.isValid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('can represent invalid formula with errors', () => {
    const validation: FormulaValidation = {
      isValid: false,
      errors: [
        { message: 'Unexpected token', position: 5, length: 1 },
        { message: 'Missing closing parenthesis', position: 10, length: 0 },
      ],
      warnings: [],
      references: [],
      functions: [],
    }
    expect(validation.isValid).toBe(false)
    expect(validation.errors).toHaveLength(2)
  })

  it('can include warnings', () => {
    const validation: FormulaValidation = {
      isValid: true,
      errors: [],
      warnings: [{ message: 'Field may be undefined', position: 0 }],
      references: ['optionalField'],
      functions: [],
    }
    expect(validation.isValid).toBe(true)
    expect(validation.warnings).toHaveLength(1)
  })

  it('tracks references and functions', () => {
    const validation: FormulaValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      references: ['price', 'quantity', '@supplier-123'],
      functions: ['MULTIPLY', 'ROUND', 'FORMAT'],
    }
    expect(validation.references).toHaveLength(3)
    expect(validation.functions).toHaveLength(3)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('formula types integration', () => {
  it('FormulaError can be used in error handling workflow', () => {
    function evaluateFormula(expression: string): FormulaResult {
      try {
        if (expression.includes('/0')) {
          throw new FormulaError('Division by zero', 'DIVISION_BY_ZERO', expression.indexOf('/0'))
        }
        return {
          success: true,
          value: 42,
          valueType: 'number',
          displayValue: '42',
        }
      } catch (e) {
        if (isFormulaError(e)) {
          return {
            success: false,
            value: null,
            valueType: 'null',
            displayValue: 'Error',
            error: e.message,
          }
        }
        throw e
      }
    }

    const success = evaluateFormula('2 + 2')
    expect(success.success).toBe(true)

    const failure = evaluateFormula('1/0')
    expect(failure.success).toBe(false)
    expect(failure.error).toBe('Division by zero')
  })

  it('error codes map to appropriate error scenarios', () => {
    const scenarios: Record<FormulaErrorCode, string> = {
      PARSE_ERROR: 'Invalid syntax at position 5',
      UNKNOWN_FUNCTION: "Function 'CUSTOM' is not defined",
      INVALID_ARGUMENTS: 'SUM() requires at least 1 argument',
      UNKNOWN_REFERENCE: "Field 'missing_field' not found",
      DIVISION_BY_ZERO: 'Cannot divide 10 by 0',
      TYPE_ERROR: "Cannot compare string with number",
      CIRCULAR_REFERENCE: "Field 'total' references itself",
      ASYNC_ERROR: 'API request to weather service failed',
      TIMEOUT: 'Formula evaluation exceeded 5000ms limit',
    }

    Object.entries(scenarios).forEach(([code, message]) => {
      const error = new FormulaError(message, code as FormulaErrorCode)
      expect(error.code).toBe(code)
      expect(error.message).toBe(message)
    })
  })
})
