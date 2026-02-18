/**
 * Utils Tests
 * @module __tests__/unit/lib/utils.test
 *
 * Tests for core utility functions.
 */

import { describe, it, expect } from 'vitest'
import { cn, generateId, normalizeTags, parseTags, MIN_TAG_LENGTH } from '@/lib/utils'

// ============================================================================
// cn() - Class Name Merging
// ============================================================================

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('merges Tailwind classes correctly', () => {
    // twMerge should handle conflicting Tailwind classes
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('preserves non-conflicting classes', () => {
    expect(cn('p-4', 'm-2')).toBe('p-4 m-2')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

// ============================================================================
// generateId() - ID Generation
// ============================================================================

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('uses default prefix "id"', () => {
    const id = generateId()
    expect(id).toMatch(/^id-/)
  })

  it('uses custom prefix', () => {
    const id = generateId('custom')
    expect(id).toMatch(/^custom-/)
  })

  it('includes timestamp', () => {
    const before = Date.now()
    const id = generateId()
    const after = Date.now()

    // Extract timestamp from ID
    const parts = id.split('-')
    const timestamp = parseInt(parts[1], 10)

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('includes random suffix', () => {
    const id = generateId()
    const parts = id.split('-')

    // Random part should be alphanumeric
    expect(parts[2]).toMatch(/^[a-z0-9]+$/)
  })

  it('generates IDs of consistent format', () => {
    const id = generateId('test')
    // Format: prefix-timestamp-random
    expect(id).toMatch(/^test-\d+-[a-z0-9]+$/)
  })
})

// ============================================================================
// MIN_TAG_LENGTH
// ============================================================================

describe('MIN_TAG_LENGTH', () => {
  it('is defined as 2', () => {
    expect(MIN_TAG_LENGTH).toBe(2)
  })
})

// ============================================================================
// normalizeTags() - Tag Normalization
// ============================================================================

describe('normalizeTags', () => {
  describe('input handling', () => {
    it('returns empty array for null', () => {
      expect(normalizeTags(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(normalizeTags(undefined)).toEqual([])
    })

    it('handles string input', () => {
      expect(normalizeTags('javascript')).toEqual(['javascript'])
    })

    it('handles array input', () => {
      expect(normalizeTags(['javascript', 'react'])).toEqual(['javascript', 'react'])
    })
  })

  describe('comma splitting', () => {
    it('splits comma-separated strings', () => {
      expect(normalizeTags('javascript,react,vue')).toEqual(['javascript', 'react', 'vue'])
    })

    it('handles spaces around commas', () => {
      expect(normalizeTags('javascript, react , vue')).toEqual(['javascript', 'react', 'vue'])
    })

    it('handles multiple commas', () => {
      // 'a,,b' splits to ['a', '', 'b'], all are filtered (too short)
      expect(normalizeTags('a,,b')).toEqual([])
      // With minLength 1, single chars are kept
      expect(normalizeTags('a,,b', { minLength: 1 })).toEqual(['a', 'b'])
    })
  })

  describe('trimming', () => {
    it('trims whitespace from tags', () => {
      expect(normalizeTags('  javascript  ')).toEqual(['javascript'])
    })

    it('trims whitespace from array elements', () => {
      expect(normalizeTags(['  js  ', '  ts  '])).toEqual(['js', 'ts'])
    })
  })

  describe('lowercasing', () => {
    it('lowercases tags by default', () => {
      expect(normalizeTags('JavaScript')).toEqual(['javascript'])
    })

    it('preserves case when lowercase is false', () => {
      expect(normalizeTags('JavaScript', { lowercase: false })).toEqual(['JavaScript'])
    })
  })

  describe('minimum length filtering', () => {
    it('filters tags shorter than MIN_TAG_LENGTH', () => {
      expect(normalizeTags('a,ab,abc')).toEqual(['ab', 'abc'])
    })

    it('uses custom minLength', () => {
      expect(normalizeTags('a,ab,abc', { minLength: 3 })).toEqual(['abc'])
    })

    it('allows minLength of 1', () => {
      expect(normalizeTags('a,ab', { minLength: 1 })).toEqual(['a', 'ab'])
    })

    it('filters empty strings', () => {
      expect(normalizeTags('  ,  ')).toEqual([])
    })
  })

  describe('combined options', () => {
    it('applies both lowercase and minLength', () => {
      const result = normalizeTags('A,AB,ABC', { lowercase: true, minLength: 2 })
      expect(result).toEqual(['ab', 'abc'])
    })
  })
})

// ============================================================================
// parseTags() - Parse Tags from Unknown Values
// ============================================================================

describe('parseTags', () => {
  describe('null/undefined handling', () => {
    it('returns empty array for null', () => {
      expect(parseTags(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(parseTags(undefined)).toEqual([])
    })
  })

  describe('string handling', () => {
    it('parses string input', () => {
      expect(parseTags('javascript')).toEqual(['javascript'])
    })

    it('parses comma-separated strings', () => {
      expect(parseTags('js,ts,py')).toEqual(['js', 'ts', 'py'])
    })
  })

  describe('array handling', () => {
    it('parses string array', () => {
      expect(parseTags(['javascript', 'react'])).toEqual(['javascript', 'react'])
    })

    it('converts non-string array elements to strings', () => {
      expect(parseTags([123, 'abc'])).toEqual(['123', 'abc'])
    })

    it('handles mixed array types', () => {
      expect(parseTags([true, 'test', 42])).toEqual(['true', 'test', '42'])
    })
  })

  describe('number handling', () => {
    it('converts number to string', () => {
      expect(parseTags(123)).toEqual(['123'])
    })

    it('filters short numbers', () => {
      expect(parseTags(1)).toEqual([])  // "1" is length 1, less than MIN_TAG_LENGTH
    })

    it('keeps numbers meeting minLength', () => {
      expect(parseTags(12)).toEqual(['12'])
    })
  })

  describe('boolean handling', () => {
    it('converts true to string', () => {
      expect(parseTags(true)).toEqual(['true'])
    })

    it('returns empty for false (falsy check)', () => {
      // parseTags has `if (!tags) return []` which catches false
      expect(parseTags(false)).toEqual([])
    })
  })

  describe('object handling', () => {
    it('returns empty array for plain objects', () => {
      expect(parseTags({ foo: 'bar' })).toEqual([])
    })

    it('returns empty array for functions', () => {
      expect(parseTags(() => {})).toEqual([])
    })
  })

  describe('options passthrough', () => {
    it('respects lowercase option', () => {
      expect(parseTags('UPPER', { lowercase: false })).toEqual(['UPPER'])
    })

    it('respects minLength option', () => {
      expect(parseTags('a,ab,abc', { minLength: 3 })).toEqual(['abc'])
    })
  })
})
