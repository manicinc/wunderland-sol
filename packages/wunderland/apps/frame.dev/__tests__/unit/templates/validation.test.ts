/**
 * Form Validation Unit Tests
 * @module __tests__/unit/templates/validation
 *
 * Tests for useFormValidation hook and validation utilities.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFormValidation, type SchemaField } from '@/components/quarry/hooks/useFormValidation'

/* ═══════════════════════════════════════════════════════════════════════════
   TEST DATA
═══════════════════════════════════════════════════════════════════════════ */

const basicFields: SchemaField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: false },
  { name: 'status', label: 'Status', type: 'select', required: true, options: ['draft', 'published'] },
]

const validatedFields: SchemaField[] = [
  {
    name: 'username',
    label: 'Username',
    type: 'text',
    required: true,
    validation: {
      minLength: 3,
      maxLength: 20,
      pattern: '^[a-z0-9_]+$',
      patternDescription: 'Only lowercase letters, numbers, and underscores',
    },
  },
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    required: false,
    validation: { min: 0, max: 150 },
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
  {
    name: 'website',
    label: 'Website',
    type: 'url',
    required: false,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TEST SUITES
═══════════════════════════════════════════════════════════════════════════ */

describe('useFormValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Basic Required Field Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('required field validation', () => {
    it('validates required fields as empty', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.isValid).toBe(false)
      expect(result.current.errors.size).toBe(2)
      expect(result.current.getFieldError('title')).toContain('required')
      expect(result.current.getFieldError('status')).toContain('required')
    })

    it('passes when required fields are filled', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: 'Test Title', status: 'draft' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.isValid).toBe(true)
      expect(result.current.errors.size).toBe(0)
    })

    it('treats whitespace-only as empty', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '   ', status: 'draft' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('title')).toContain('required')
    })

    it('validates empty arrays as empty', async () => {
      const tagsField: SchemaField[] = [
        { name: 'tags', label: 'Tags', type: 'tags', required: true },
      ]

      const { result } = renderHook(() =>
        useFormValidation({
          fields: tagsField,
          formData: { tags: [] },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.isValid).toBe(false)
      expect(result.current.getFieldError('tags')).toContain('required')
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Length Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('length validation', () => {
    it('validates minLength', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'ab', email: 'test@test.com' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('username')).toContain('at least 3')
    })

    it('validates maxLength', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'thisisaverylongusernamethatexceeds20characters', email: 'test@test.com' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('username')).toContain('at most 20')
    })

    it('passes when length is within bounds', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'valid_user', email: 'test@test.com' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('username')).toBeUndefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Pattern Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('pattern validation', () => {
    it('validates regex pattern', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'InvalidUser!', email: 'test@test.com' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('username')).toContain('lowercase letters')
    })

    it('passes when pattern matches', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'valid_user_123', email: 'test@test.com' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('username')).toBeUndefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Number Range Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('number range validation', () => {
    it('validates min value', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'test_user', email: 'test@test.com', age: -5 },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('age')).toContain('at least 0')
    })

    it('validates max value', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'test_user', email: 'test@test.com', age: 200 },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('age')).toContain('at most 150')
    })

    it('passes when number is within range', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: validatedFields,
          formData: { username: 'test_user', email: 'test@test.com', age: 25 },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.getFieldError('age')).toBeUndefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Email Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('email validation', () => {
    it('validates invalid email format', async () => {
      vi.useRealTimers()

      // Define email-only field for focused testing
      const emailField: SchemaField = {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
      }

      const { result } = renderHook(() =>
        useFormValidation({
          fields: [emailField],
          formData: { email: 'notanemail' },
          debounceMs: 0,
        })
      )

      // validateAll returns false when there are errors
      let isValid: boolean | undefined
      await act(async () => {
        isValid = result.current.validateAll()
      })

      // Validation should fail for invalid email
      expect(isValid).toBe(false)
      // And errors should be set after state update
      expect(result.current.errors.size).toBeGreaterThan(0)
    })

    it('passes with valid email', async () => {
      vi.useRealTimers()

      const emailField: SchemaField = {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
      }

      const { result } = renderHook(() =>
        useFormValidation({
          fields: [emailField],
          formData: { email: 'user@example.com' },
          debounceMs: 0,
        })
      )

      let isValid: boolean | undefined
      await act(async () => {
        isValid = result.current.validateAll()
      })

      expect(isValid).toBe(true)
      expect(result.current.getFieldError('email')).toBeUndefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     URL Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('url validation', () => {
    it('validates invalid URL format', async () => {
      vi.useRealTimers()

      const urlField: SchemaField = {
        name: 'website',
        label: 'Website',
        type: 'url',
        required: true,
      }

      const { result } = renderHook(() =>
        useFormValidation({
          fields: [urlField],
          formData: { website: 'not-a-url' },
          debounceMs: 0,
        })
      )

      let isValid: boolean | undefined
      await act(async () => {
        isValid = result.current.validateAll()
      })

      // Validation should fail for invalid URL
      expect(isValid).toBe(false)
      expect(result.current.errors.size).toBeGreaterThan(0)
    })

    it('passes with valid URL', async () => {
      vi.useRealTimers()

      const urlField: SchemaField = {
        name: 'website',
        label: 'Website',
        type: 'url',
        required: true,
      }

      const { result } = renderHook(() =>
        useFormValidation({
          fields: [urlField],
          formData: { website: 'https://example.com' },
          debounceMs: 0,
        })
      )

      let isValid: boolean | undefined
      await act(async () => {
        isValid = result.current.validateAll()
      })

      expect(isValid).toBe(true)
      expect(result.current.getFieldError('website')).toBeUndefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Select Options Validation
  ─────────────────────────────────────────────────────────────────────────── */

  describe('select options', () => {
    it('accepts valid option values', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: 'Test', status: 'draft' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.isValid).toBe(true)
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Field-level Error Management
  ─────────────────────────────────────────────────────────────────────────── */

  describe('error management', () => {
    it('returns field-level errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      const errors = result.current.allErrors
      expect(errors.length).toBe(2)
      expect(errors.map(e => e.field)).toContain('title')
      expect(errors.map(e => e.field)).toContain('status')
    })

    it('clears all errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.errors.size).toBe(2)

      act(() => {
        result.current.clearErrors()
      })

      expect(result.current.errors.size).toBe(0)
    })

    it('clears specific field error', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
        })
      )

      act(() => {
        result.current.validateAll()
      })

      expect(result.current.errors.size).toBe(2)

      act(() => {
        result.current.clearFieldError('title')
      })

      expect(result.current.errors.size).toBe(1)
      expect(result.current.getFieldError('title')).toBeUndefined()
      expect(result.current.getFieldError('status')).toBeDefined()
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Touched State Management
  ─────────────────────────────────────────────────────────────────────────── */

  describe('touched state', () => {
    it('tracks touched fields', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '' },
          debounceMs: 0,
        })
      )

      expect(result.current.touched.has('title')).toBe(false)

      act(() => {
        result.current.touchField('title')
      })

      expect(result.current.touched.has('title')).toBe(true)
    })

    it('hasVisibleError returns true only when touched and has error', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '' },
          debounceMs: 0,
        })
      )

      // Not touched yet
      expect(result.current.hasVisibleError('title')).toBe(false)

      // Touch the field (which also validates)
      act(() => {
        result.current.touchField('title')
      })

      // Now it's touched and has error
      expect(result.current.hasVisibleError('title')).toBe(true)
    })

    it('validates field when touched', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '' },
          debounceMs: 0,
        })
      )

      expect(result.current.errors.size).toBe(0)

      act(() => {
        result.current.touchField('title')
      })

      expect(result.current.errors.size).toBe(1)
      expect(result.current.getFieldError('title')).toContain('required')
    })
  })

  /* ─────────────────────────────────────────────────────────────────────────
     Validate on Mount
  ─────────────────────────────────────────────────────────────────────────── */

  describe('validateOnMount', () => {
    it('validates on mount when enabled', () => {
      vi.useRealTimers() // Need real timers for mount effects
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
          validateOnMount: true,
        })
      )

      // After mount with validateOnMount, errors should be set
      // The hook calls validateAll in useEffect when validateOnMount is true
      expect(result.current.errors.size).toBeGreaterThan(0)
    })

    it('does not validate on mount by default', () => {
      vi.useRealTimers()
      const { result } = renderHook(() =>
        useFormValidation({
          fields: basicFields,
          formData: { title: '', status: '' },
          debounceMs: 0,
        })
      )

      // Initially no errors (not validated yet)
      expect(result.current.errors.size).toBe(0)
    })
  })
})
