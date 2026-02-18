/**
 * useFormValidation Hook
 * @module codex/hooks/useFormValidation
 *
 * @description
 * Provides real-time form validation with debounced field-level feedback.
 * Designed for use with CreateNodeWizard and TemplateBuilder forms.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDebouncedCallback } from '@/lib/hooks/useDebounce'
import type { TemplateField, FieldValidation } from '../templates/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SchemaField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'tags' | 'number' | 'date' | 'url' | 'email'
  required: boolean
  placeholder?: string
  tooltip?: string
  options?: string[]
  defaultValue?: string | number
  validation?: FieldValidation
}

export interface FormValidationOptions {
  /** Fields to validate */
  fields: SchemaField[] | TemplateField[]
  /** Current form data */
  formData: Record<string, unknown>
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Validate on mount */
  validateOnMount?: boolean
}

export interface FieldError {
  field: string
  message: string
  type: 'required' | 'format' | 'length' | 'pattern' | 'custom'
}

export interface FormValidationReturn {
  /** Map of field name to error message */
  errors: Map<string, string>
  /** Set of field names that have been touched (focused/blurred) */
  touched: Set<string>
  /** Whether all fields are valid */
  isValid: boolean
  /** All validation errors (for display) */
  allErrors: FieldError[]
  /** Validate a single field */
  validateField: (fieldName: string) => void
  /** Mark a field as touched */
  touchField: (fieldName: string) => void
  /** Validate all fields at once */
  validateAll: () => boolean
  /** Clear all errors */
  clearErrors: () => void
  /** Clear a specific field's error */
  clearFieldError: (fieldName: string) => void
  /** Get error for a specific field */
  getFieldError: (fieldName: string) => string | undefined
  /** Check if field has error and is touched */
  hasVisibleError: (fieldName: string) => boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALIDATION HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Validate a single field value
 */
function validateFieldValue(
  field: SchemaField | TemplateField,
  value: unknown
): FieldError | null {
  // Check required
  if (field.required) {
    if (value === undefined || value === null) {
      return {
        field: field.name,
        message: `${field.label} is required`,
        type: 'required',
      }
    }
    if (typeof value === 'string' && !value.trim()) {
      return {
        field: field.name,
        message: `${field.label} is required`,
        type: 'required',
      }
    }
    if (Array.isArray(value) && value.length === 0) {
      return {
        field: field.name,
        message: `${field.label} is required`,
        type: 'required',
      }
    }
  }

  // Skip further validation if empty and not required
  if (!value || (typeof value === 'string' && !value.trim())) {
    return null
  }

  // Type-based validations (email, URL) should always run
  if (typeof value === 'string') {
    // Email validation
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          field: field.name,
          message: 'Please enter a valid email address',
          type: 'format',
        }
      }
    }

    // URL validation
    if (field.type === 'url' && value) {
      try {
        new URL(value)
      } catch {
        return {
          field: field.name,
          message: 'Please enter a valid URL',
          type: 'format',
        }
      }
    }
  }

  // Custom validation rules (optional)
  const validation = field.validation
  if (!validation) return null

  // String validations with custom rules
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return {
        field: field.name,
        message: validation.message ||
          `${field.label} must be at least ${validation.minLength} characters`,
        type: 'length',
      }
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return {
        field: field.name,
        message: validation.message ||
          `${field.label} must be at most ${validation.maxLength} characters`,
        type: 'length',
      }
    }

    if (validation.pattern) {
      try {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          return {
            field: field.name,
            message: validation.patternDescription ||
              validation.message ||
              `${field.label} format is invalid`,
            type: 'pattern',
          }
        }
      } catch {
        // Invalid regex, skip validation
      }
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return {
        field: field.name,
        message: validation.message ||
          `${field.label} must be at least ${validation.min}`,
        type: 'format',
      }
    }

    if (validation.max !== undefined && value > validation.max) {
      return {
        field: field.name,
        message: validation.message ||
          `${field.label} must be at most ${validation.max}`,
        type: 'format',
      }
    }
  }

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useFormValidation({
  fields,
  formData,
  debounceMs = 300,
  validateOnMount = false,
}: FormValidationOptions): FormValidationReturn {
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const fieldsRef = useRef(fields)

  // Keep fields ref updated
  useEffect(() => {
    fieldsRef.current = fields
  }, [fields])

  // Validate a single field (immediate)
  const validateFieldImmediate = useCallback((fieldName: string) => {
    const field = fieldsRef.current.find(f => f.name === fieldName)
    if (!field) return

    const value = formData[fieldName]
    const error = validateFieldValue(field, value)

    setErrors(prev => {
      const next = new Map(prev)
      if (error) {
        next.set(fieldName, error.message)
      } else {
        next.delete(fieldName)
      }
      return next
    })
  }, [formData])

  // Debounced field validation
  const validateField = useDebouncedCallback(validateFieldImmediate, debounceMs)

  // Mark field as touched
  const touchField = useCallback((fieldName: string) => {
    setTouched(prev => {
      if (prev.has(fieldName)) return prev
      const next = new Set(prev)
      next.add(fieldName)
      return next
    })
    // Also validate when touched
    validateFieldImmediate(fieldName)
  }, [validateFieldImmediate])

  // Validate all fields at once (returns validity)
  const validateAll = useCallback((): boolean => {
    const newErrors = new Map<string, string>()
    const newTouched = new Set<string>()

    for (const field of fieldsRef.current) {
      newTouched.add(field.name)
      const value = formData[field.name]
      const error = validateFieldValue(field, value)
      if (error) {
        newErrors.set(field.name, error.message)
      }
    }

    setErrors(newErrors)
    setTouched(newTouched)
    return newErrors.size === 0
  }, [formData])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors(new Map())
  }, [])

  // Clear specific field error
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      if (!prev.has(fieldName)) return prev
      const next = new Map(prev)
      next.delete(fieldName)
      return next
    })
  }, [])

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors.get(fieldName)
  }, [errors])

  // Check if field has visible error (touched + has error)
  const hasVisibleError = useCallback((fieldName: string): boolean => {
    return touched.has(fieldName) && errors.has(fieldName)
  }, [touched, errors])

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validateAll()
    }
  }, []) // Only on mount

  // Compute derived values
  const isValid = useMemo(() => errors.size === 0, [errors])

  const allErrors = useMemo((): FieldError[] => {
    return Array.from(errors.entries()).map(([field, message]) => {
      const fieldDef = fieldsRef.current.find(f => f.name === field)
      return {
        field,
        message,
        type: 'custom' as const, // We don't track type in the map
      }
    })
  }, [errors])

  return {
    errors,
    touched,
    isValid,
    allErrors,
    validateField,
    touchField,
    validateAll,
    clearErrors,
    clearFieldError,
    getFieldError,
    hasVisibleError,
  }
}

export default useFormValidation
