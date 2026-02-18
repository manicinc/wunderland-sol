/**
 * OCR Error Types and Handling
 * @module lib/ocr/errors
 *
 * Defines error codes and error classes for OCR operations
 */

export enum OCRErrorCode {
  // Image errors
  INVALID_IMAGE = 'INVALID_IMAGE',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',

  // Model errors
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  MODEL_INFERENCE_FAILED = 'MODEL_INFERENCE_FAILED',

  // Cloud errors
  CLOUD_NOT_AVAILABLE = 'CLOUD_NOT_AVAILABLE',
  CLOUD_API_ERROR = 'CLOUD_API_ERROR',
  CLOUD_RATE_LIMIT = 'CLOUD_RATE_LIMIT',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Processing errors
  PREPROCESSING_FAILED = 'PREPROCESSING_FAILED',
  TRANSCRIPTION_FAILED = 'TRANSCRIPTION_FAILED',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface OCRErrorDetails {
  code: OCRErrorCode
  message: string
  originalError?: Error
  retryable: boolean
  suggestedAction?: string
}

/**
 * Custom error class for OCR operations
 */
export class OCRError extends Error {
  public readonly code: OCRErrorCode
  public readonly retryable: boolean
  public readonly suggestedAction?: string
  public readonly originalError?: Error

  constructor(details: OCRErrorDetails) {
    super(details.message)
    this.name = 'OCRError'
    this.code = details.code
    this.retryable = details.retryable
    this.suggestedAction = details.suggestedAction
    this.originalError = details.originalError

    // Maintain proper stack trace (only available on V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OCRError)
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case OCRErrorCode.INVALID_IMAGE:
        return 'Invalid image format. Please use PNG, JPEG, or WebP.'
      case OCRErrorCode.IMAGE_TOO_LARGE:
        return 'Image is too large. Please use an image smaller than 10MB.'
      case OCRErrorCode.IMAGE_LOAD_FAILED:
        return 'Failed to load image. Please try again.'

      case OCRErrorCode.MODEL_LOAD_FAILED:
        return 'Failed to load OCR model. Please check your internet connection.'
      case OCRErrorCode.MODEL_NOT_AVAILABLE:
        return 'OCR model is not available. Please enable cloud mode.'
      case OCRErrorCode.MODEL_INFERENCE_FAILED:
        return 'OCR processing failed. Please try cloud mode for better accuracy.'

      case OCRErrorCode.CLOUD_NOT_AVAILABLE:
        return 'Cloud OCR is not available. Please check your API configuration.'
      case OCRErrorCode.CLOUD_API_ERROR:
        return 'Cloud service error. Please try again later.'
      case OCRErrorCode.CLOUD_RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.'

      case OCRErrorCode.NETWORK_ERROR:
        return 'Network error. Please check your internet connection.'
      case OCRErrorCode.TIMEOUT:
        return 'Request timed out. Please try again or use a smaller image.'

      case OCRErrorCode.PREPROCESSING_FAILED:
        return 'Failed to process image. Please try a different image.'
      case OCRErrorCode.TRANSCRIPTION_FAILED:
        return 'Transcription failed. Please try again or use cloud mode.'

      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  /**
   * Create OCR error from generic error
   */
  static fromError(error: unknown, code: OCRErrorCode = OCRErrorCode.UNKNOWN_ERROR): OCRError {
    if (error instanceof OCRError) {
      return error
    }

    const message = error instanceof Error ? error.message : String(error)
    const originalError = error instanceof Error ? error : undefined

    // Detect specific error types
    if (message.toLowerCase().includes('timeout')) {
      return new OCRError({
        code: OCRErrorCode.TIMEOUT,
        message: 'Request timed out',
        originalError,
        retryable: true,
        suggestedAction: 'Try again with a smaller image or check your connection',
      })
    }

    if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
      return new OCRError({
        code: OCRErrorCode.NETWORK_ERROR,
        message: 'Network error occurred',
        originalError,
        retryable: true,
        suggestedAction: 'Check your internet connection and try again',
      })
    }

    if (message.toLowerCase().includes('rate limit')) {
      return new OCRError({
        code: OCRErrorCode.CLOUD_RATE_LIMIT,
        message: 'Rate limit exceeded',
        originalError,
        retryable: true,
        suggestedAction: 'Wait a moment before trying again',
      })
    }

    return new OCRError({
      code,
      message,
      originalError,
      retryable: false,
    })
  }
}

/**
 * Helper to create timeout promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new OCRError({
            code: OCRErrorCode.TIMEOUT,
            message: `${operation} timed out after ${timeoutMs}ms`,
            retryable: true,
            suggestedAction: 'Try again or use a smaller image',
          })
        )
      }, timeoutMs)
    }),
  ])
}

/**
 * Validate image blob
 */
export function validateImageBlob(blob: Blob): void {
  // Check if blob is valid
  if (!blob || blob.size === 0) {
    throw new OCRError({
      code: OCRErrorCode.INVALID_IMAGE,
      message: 'Image blob is empty or invalid',
      retryable: false,
      suggestedAction: 'Please select a valid image file',
    })
  }

  // Check file size (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024
  if (blob.size > MAX_SIZE) {
    throw new OCRError({
      code: OCRErrorCode.IMAGE_TOO_LARGE,
      message: `Image size (${Math.round(blob.size / 1024 / 1024)}MB) exceeds maximum (10MB)`,
      retryable: false,
      suggestedAction: 'Compress the image or use a smaller file',
    })
  }

  // Check MIME type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
  if (!validTypes.includes(blob.type)) {
    throw new OCRError({
      code: OCRErrorCode.INVALID_IMAGE,
      message: `Unsupported image type: ${blob.type}`,
      retryable: false,
      suggestedAction: 'Use PNG, JPEG, or WebP format',
    })
  }
}
