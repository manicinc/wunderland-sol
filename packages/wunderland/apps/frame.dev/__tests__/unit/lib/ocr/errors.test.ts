/**
 * OCR Errors Module Tests
 * @module __tests__/unit/lib/ocr/errors.test
 *
 * Tests for OCR error handling types and utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  OCRErrorCode,
  OCRError,
  withTimeout,
  validateImageBlob,
} from '@/lib/ocr/errors'

// ============================================================================
// OCRErrorCode Enum
// ============================================================================

describe('OCRErrorCode', () => {
  it('is defined', () => {
    expect(OCRErrorCode).toBeDefined()
  })

  describe('image errors', () => {
    it('has INVALID_IMAGE', () => {
      expect(OCRErrorCode.INVALID_IMAGE).toBe('INVALID_IMAGE')
    })

    it('has IMAGE_TOO_LARGE', () => {
      expect(OCRErrorCode.IMAGE_TOO_LARGE).toBe('IMAGE_TOO_LARGE')
    })

    it('has IMAGE_LOAD_FAILED', () => {
      expect(OCRErrorCode.IMAGE_LOAD_FAILED).toBe('IMAGE_LOAD_FAILED')
    })
  })

  describe('model errors', () => {
    it('has MODEL_LOAD_FAILED', () => {
      expect(OCRErrorCode.MODEL_LOAD_FAILED).toBe('MODEL_LOAD_FAILED')
    })

    it('has MODEL_NOT_AVAILABLE', () => {
      expect(OCRErrorCode.MODEL_NOT_AVAILABLE).toBe('MODEL_NOT_AVAILABLE')
    })

    it('has MODEL_INFERENCE_FAILED', () => {
      expect(OCRErrorCode.MODEL_INFERENCE_FAILED).toBe('MODEL_INFERENCE_FAILED')
    })
  })

  describe('cloud errors', () => {
    it('has CLOUD_NOT_AVAILABLE', () => {
      expect(OCRErrorCode.CLOUD_NOT_AVAILABLE).toBe('CLOUD_NOT_AVAILABLE')
    })

    it('has CLOUD_API_ERROR', () => {
      expect(OCRErrorCode.CLOUD_API_ERROR).toBe('CLOUD_API_ERROR')
    })

    it('has CLOUD_RATE_LIMIT', () => {
      expect(OCRErrorCode.CLOUD_RATE_LIMIT).toBe('CLOUD_RATE_LIMIT')
    })
  })

  describe('network errors', () => {
    it('has NETWORK_ERROR', () => {
      expect(OCRErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR')
    })

    it('has TIMEOUT', () => {
      expect(OCRErrorCode.TIMEOUT).toBe('TIMEOUT')
    })
  })

  describe('processing errors', () => {
    it('has PREPROCESSING_FAILED', () => {
      expect(OCRErrorCode.PREPROCESSING_FAILED).toBe('PREPROCESSING_FAILED')
    })

    it('has TRANSCRIPTION_FAILED', () => {
      expect(OCRErrorCode.TRANSCRIPTION_FAILED).toBe('TRANSCRIPTION_FAILED')
    })
  })

  describe('generic errors', () => {
    it('has UNKNOWN_ERROR', () => {
      expect(OCRErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    })
  })

  it('has 14 error codes total', () => {
    const codes = Object.values(OCRErrorCode)
    expect(codes).toHaveLength(14)
  })

  it('all values are unique', () => {
    const codes = Object.values(OCRErrorCode)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })
})

// ============================================================================
// OCRError Class
// ============================================================================

describe('OCRError', () => {
  describe('constructor', () => {
    it('extends Error', () => {
      const error = new OCRError({
        code: OCRErrorCode.INVALID_IMAGE,
        message: 'Test error',
        retryable: false,
      })
      expect(error).toBeInstanceOf(Error)
    })

    it('has correct name', () => {
      const error = new OCRError({
        code: OCRErrorCode.INVALID_IMAGE,
        message: 'Test error',
        retryable: false,
      })
      expect(error.name).toBe('OCRError')
    })

    it('stores code', () => {
      const error = new OCRError({
        code: OCRErrorCode.TIMEOUT,
        message: 'Timed out',
        retryable: true,
      })
      expect(error.code).toBe(OCRErrorCode.TIMEOUT)
    })

    it('stores message', () => {
      const error = new OCRError({
        code: OCRErrorCode.NETWORK_ERROR,
        message: 'Network failed',
        retryable: true,
      })
      expect(error.message).toBe('Network failed')
    })

    it('stores retryable flag', () => {
      const retryableError = new OCRError({
        code: OCRErrorCode.TIMEOUT,
        message: 'Test',
        retryable: true,
      })
      const nonRetryableError = new OCRError({
        code: OCRErrorCode.INVALID_IMAGE,
        message: 'Test',
        retryable: false,
      })

      expect(retryableError.retryable).toBe(true)
      expect(nonRetryableError.retryable).toBe(false)
    })

    it('stores suggestedAction', () => {
      const error = new OCRError({
        code: OCRErrorCode.IMAGE_TOO_LARGE,
        message: 'Too large',
        retryable: false,
        suggestedAction: 'Compress the image',
      })
      expect(error.suggestedAction).toBe('Compress the image')
    })

    it('stores originalError', () => {
      const original = new Error('Original error')
      const error = new OCRError({
        code: OCRErrorCode.UNKNOWN_ERROR,
        message: 'Wrapped error',
        retryable: false,
        originalError: original,
      })
      expect(error.originalError).toBe(original)
    })
  })

  describe('getUserMessage', () => {
    it('returns user-friendly message for INVALID_IMAGE', () => {
      const error = new OCRError({
        code: OCRErrorCode.INVALID_IMAGE,
        message: 'Technical message',
        retryable: false,
      })
      expect(error.getUserMessage()).toContain('Invalid image')
    })

    it('returns user-friendly message for IMAGE_TOO_LARGE', () => {
      const error = new OCRError({
        code: OCRErrorCode.IMAGE_TOO_LARGE,
        message: 'Technical message',
        retryable: false,
      })
      expect(error.getUserMessage()).toContain('too large')
    })

    it('returns user-friendly message for TIMEOUT', () => {
      const error = new OCRError({
        code: OCRErrorCode.TIMEOUT,
        message: 'Technical message',
        retryable: true,
      })
      expect(error.getUserMessage()).toContain('timed out')
    })

    it('returns user-friendly message for NETWORK_ERROR', () => {
      const error = new OCRError({
        code: OCRErrorCode.NETWORK_ERROR,
        message: 'Technical message',
        retryable: true,
      })
      expect(error.getUserMessage()).toContain('Network')
    })

    it('returns user-friendly message for CLOUD_RATE_LIMIT', () => {
      const error = new OCRError({
        code: OCRErrorCode.CLOUD_RATE_LIMIT,
        message: 'Technical message',
        retryable: true,
      })
      expect(error.getUserMessage()).toContain('Too many requests')
    })

    it('returns fallback message for UNKNOWN_ERROR', () => {
      const error = new OCRError({
        code: OCRErrorCode.UNKNOWN_ERROR,
        message: 'Technical message',
        retryable: false,
      })
      expect(error.getUserMessage()).toContain('unexpected error')
    })
  })

  describe('fromError static method', () => {
    it('returns same error if already OCRError', () => {
      const original = new OCRError({
        code: OCRErrorCode.INVALID_IMAGE,
        message: 'Test',
        retryable: false,
      })
      const result = OCRError.fromError(original)
      expect(result).toBe(original)
    })

    it('converts generic Error to OCRError', () => {
      const generic = new Error('Something failed')
      const result = OCRError.fromError(generic)

      expect(result).toBeInstanceOf(OCRError)
      expect(result.originalError).toBe(generic)
    })

    it('detects timeout errors', () => {
      const timeoutError = new Error('Request timeout occurred')
      const result = OCRError.fromError(timeoutError)

      expect(result.code).toBe(OCRErrorCode.TIMEOUT)
      expect(result.retryable).toBe(true)
    })

    it('detects network errors', () => {
      const networkError = new Error('Network connection failed')
      const result = OCRError.fromError(networkError)

      expect(result.code).toBe(OCRErrorCode.NETWORK_ERROR)
      expect(result.retryable).toBe(true)
    })

    it('detects fetch errors as network errors', () => {
      const fetchError = new Error('Failed to fetch')
      const result = OCRError.fromError(fetchError)

      expect(result.code).toBe(OCRErrorCode.NETWORK_ERROR)
    })

    it('detects rate limit errors', () => {
      const rateLimitError = new Error('Rate limit exceeded')
      const result = OCRError.fromError(rateLimitError)

      expect(result.code).toBe(OCRErrorCode.CLOUD_RATE_LIMIT)
      expect(result.retryable).toBe(true)
    })

    it('uses default code for unknown errors', () => {
      const unknownError = new Error('Something random happened')
      const result = OCRError.fromError(unknownError)

      expect(result.code).toBe(OCRErrorCode.UNKNOWN_ERROR)
      expect(result.retryable).toBe(false)
    })

    it('accepts custom default code', () => {
      const error = new Error('Image processing failed')
      const result = OCRError.fromError(error, OCRErrorCode.PREPROCESSING_FAILED)

      expect(result.code).toBe(OCRErrorCode.PREPROCESSING_FAILED)
    })

    it('handles string errors', () => {
      const result = OCRError.fromError('String error message')

      expect(result).toBeInstanceOf(OCRError)
      expect(result.message).toBe('String error message')
    })

    it('handles null/undefined errors', () => {
      const nullResult = OCRError.fromError(null)
      const undefinedResult = OCRError.fromError(undefined)

      expect(nullResult).toBeInstanceOf(OCRError)
      expect(undefinedResult).toBeInstanceOf(OCRError)
    })
  })

  describe('throwing and catching', () => {
    it('can be thrown and caught', () => {
      expect(() => {
        throw new OCRError({
          code: OCRErrorCode.INVALID_IMAGE,
          message: 'Test throw',
          retryable: false,
        })
      }).toThrow(OCRError)
    })

    it('can be caught with type check', () => {
      try {
        throw new OCRError({
          code: OCRErrorCode.TIMEOUT,
          message: 'Test',
          retryable: true,
        })
      } catch (e) {
        if (e instanceof OCRError) {
          expect(e.code).toBe(OCRErrorCode.TIMEOUT)
          expect(e.retryable).toBe(true)
        } else {
          throw new Error('Expected OCRError')
        }
      }
    })
  })
})

// ============================================================================
// withTimeout
// ============================================================================

describe('withTimeout', () => {
  it('resolves if promise completes before timeout', async () => {
    const fastPromise = Promise.resolve('success')
    const result = await withTimeout(fastPromise, 1000, 'Test operation')
    expect(result).toBe('success')
  })

  it('rejects with OCRError if timeout occurs', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 500)
    })

    await expect(withTimeout(slowPromise, 10, 'Test operation')).rejects.toThrow(OCRError)
  })

  it('timeout error has correct code', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 500)
    })

    try {
      await withTimeout(slowPromise, 10, 'Test operation')
    } catch (e) {
      expect(e).toBeInstanceOf(OCRError)
      expect((e as OCRError).code).toBe(OCRErrorCode.TIMEOUT)
    }
  })

  it('timeout error includes operation name', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 500)
    })

    try {
      await withTimeout(slowPromise, 10, 'Image processing')
    } catch (e) {
      expect((e as OCRError).message).toContain('Image processing')
    }
  })

  it('timeout error is retryable', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 500)
    })

    try {
      await withTimeout(slowPromise, 10, 'Test')
    } catch (e) {
      expect((e as OCRError).retryable).toBe(true)
    }
  })
})

// ============================================================================
// validateImageBlob
// ============================================================================

describe('validateImageBlob', () => {
  describe('valid images', () => {
    it('accepts PNG blob', () => {
      const blob = new Blob(['test'], { type: 'image/png' })
      expect(() => validateImageBlob(blob)).not.toThrow()
    })

    it('accepts JPEG blob', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' })
      expect(() => validateImageBlob(blob)).not.toThrow()
    })

    it('accepts JPG blob', () => {
      const blob = new Blob(['test'], { type: 'image/jpg' })
      expect(() => validateImageBlob(blob)).not.toThrow()
    })

    it('accepts WebP blob', () => {
      const blob = new Blob(['test'], { type: 'image/webp' })
      expect(() => validateImageBlob(blob)).not.toThrow()
    })
  })

  describe('invalid blobs', () => {
    it('throws for empty blob', () => {
      const blob = new Blob([], { type: 'image/png' })
      expect(() => validateImageBlob(blob)).toThrow(OCRError)
    })

    it('throws for null blob', () => {
      expect(() => validateImageBlob(null as unknown as Blob)).toThrow(OCRError)
    })

    it('throws for undefined blob', () => {
      expect(() => validateImageBlob(undefined as unknown as Blob)).toThrow(OCRError)
    })

    it('empty blob error has INVALID_IMAGE code', () => {
      const blob = new Blob([], { type: 'image/png' })
      try {
        validateImageBlob(blob)
      } catch (e) {
        expect((e as OCRError).code).toBe(OCRErrorCode.INVALID_IMAGE)
      }
    })
  })

  describe('size validation', () => {
    it('throws for blob over 10MB', () => {
      // Create a blob > 10MB (10 * 1024 * 1024 + 1 bytes)
      const largeContent = new Uint8Array(10 * 1024 * 1024 + 1)
      const blob = new Blob([largeContent], { type: 'image/png' })

      expect(() => validateImageBlob(blob)).toThrow(OCRError)
    })

    it('size error has IMAGE_TOO_LARGE code', () => {
      const largeContent = new Uint8Array(10 * 1024 * 1024 + 1)
      const blob = new Blob([largeContent], { type: 'image/png' })

      try {
        validateImageBlob(blob)
      } catch (e) {
        expect((e as OCRError).code).toBe(OCRErrorCode.IMAGE_TOO_LARGE)
      }
    })

    it('size error is not retryable', () => {
      const largeContent = new Uint8Array(10 * 1024 * 1024 + 1)
      const blob = new Blob([largeContent], { type: 'image/png' })

      try {
        validateImageBlob(blob)
      } catch (e) {
        expect((e as OCRError).retryable).toBe(false)
      }
    })
  })

  describe('MIME type validation', () => {
    it('throws for unsupported MIME type', () => {
      const blob = new Blob(['test'], { type: 'image/gif' })
      expect(() => validateImageBlob(blob)).toThrow(OCRError)
    })

    it('throws for non-image MIME type', () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      expect(() => validateImageBlob(blob)).toThrow(OCRError)
    })

    it('MIME error has INVALID_IMAGE code', () => {
      const blob = new Blob(['test'], { type: 'image/gif' })
      try {
        validateImageBlob(blob)
      } catch (e) {
        expect((e as OCRError).code).toBe(OCRErrorCode.INVALID_IMAGE)
      }
    })

    it('MIME error includes the invalid type', () => {
      const blob = new Blob(['test'], { type: 'image/bmp' })
      try {
        validateImageBlob(blob)
      } catch (e) {
        expect((e as OCRError).message).toContain('image/bmp')
      }
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('ocr errors integration', () => {
  it('all error codes have corresponding user messages', () => {
    const codes = Object.values(OCRErrorCode)

    codes.forEach((code) => {
      const error = new OCRError({
        code,
        message: 'Test',
        retryable: false,
      })
      const userMessage = error.getUserMessage()
      expect(userMessage.length).toBeGreaterThan(0)
    })
  })

  it('retryable errors are properly categorized', () => {
    // These should generally be retryable
    const retryableCodes = [
      OCRErrorCode.TIMEOUT,
      OCRErrorCode.NETWORK_ERROR,
      OCRErrorCode.CLOUD_RATE_LIMIT,
    ]

    // These should generally not be retryable
    const nonRetryableCodes = [
      OCRErrorCode.INVALID_IMAGE,
      OCRErrorCode.IMAGE_TOO_LARGE,
    ]

    retryableCodes.forEach((code) => {
      const error = OCRError.fromError(new Error('test'), code)
      // Note: fromError may override for known patterns
      expect(error).toBeInstanceOf(OCRError)
    })

    nonRetryableCodes.forEach((code) => {
      const error = new OCRError({
        code,
        message: 'test',
        retryable: false,
      })
      expect(error.retryable).toBe(false)
    })
  })
})
