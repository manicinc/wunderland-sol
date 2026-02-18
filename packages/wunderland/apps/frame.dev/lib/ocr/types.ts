/**
 * OCR Types and Interfaces
 * @module lib/ocr/types
 *
 * Type definitions for the handwriting transcription system
 */

export type OCRMode = 'local' | 'cloud'

export type TranscriptionStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'done'
  | 'error'
  | 'cancelled'

export interface OCRResult {
  text: string
  confidence: number
  mode: OCRMode
  processingTime: number
  error?: string
}

export interface OCREngineOptions {
  /**
   * Maximum image dimension (width or height) in pixels
   * Images larger than this will be downscaled
   * @default 1024
   */
  maxImageSize?: number

  /**
   * Enable caching of OCR results
   * @default true
   */
  enableCaching?: boolean

  /**
   * Cache expiry time in milliseconds
   * @default 604800000 (7 days)
   */
  cacheExpiry?: number

  /**
   * Timeout for OCR processing in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

export interface PreprocessOptions {
  /**
   * Target width/height for image resizing
   * @default 768
   */
  targetSize?: number

  /**
   * JPEG quality for output (0-1)
   * @default 0.95
   */
  quality?: number

  /**
   * Enable grayscale conversion
   * @default true
   */
  grayscale?: boolean

  /**
   * Contrast enhancement threshold (0-255)
   * @default 128
   */
  contrastThreshold?: number
}

export interface CloudOCROptions {
  /**
   * AI provider to use for cloud OCR
   * @default 'openai'
   */
  provider?: 'openai' | 'anthropic'

  /**
   * Custom system prompt for OCR
   */
  customPrompt?: string

  /**
   * AbortSignal for cancellation
   */
  signal?: AbortSignal
}

export interface TrOCRModelInfo {
  modelId: string
  modelPath?: string
  loaded: boolean
  loadedAt?: Date
  error?: string
}

export interface OCRCacheEntry {
  text: string
  confidence: number
  mode: OCRMode
  timestamp: number
  imageHash: string
}

// Re-export error types
export type {
  OCRErrorDetails,
} from './errors'
export {
  OCRError,
  OCRErrorCode,
  withTimeout,
  validateImageBlob,
} from './errors'
