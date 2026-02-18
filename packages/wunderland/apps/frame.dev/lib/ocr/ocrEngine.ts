/**
 * OCR Engine
 * @module lib/ocr/ocrEngine
 *
 * Main orchestrator for handwriting transcription
 * Handles local TrOCR and cloud fallback with caching
 */

import { preprocessForOCR, hashImage } from './imagePreprocessor'
import { transcribeWithTrOCR, getModelInfo } from './trocr'
import { transcribeWithCloud, isCloudOCRAvailable } from './cloudOCR'
import { OCRError, OCRErrorCode, withTimeout, validateImageBlob } from './errors'
import type {
  OCRResult,
  OCRMode,
  OCREngineOptions,
  OCRCacheEntry,
  PreprocessOptions,
  CloudOCROptions,
} from './types'

const DEFAULT_OPTIONS: Required<OCREngineOptions> = {
  maxImageSize: 1024,
  enableCaching: true,
  cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  timeout: 30000, // 30 seconds
  debug: false,
}

const CACHE_KEY_PREFIX = 'ocr-cache-'

/**
 * OCR Engine for handwriting transcription
 *
 * Features:
 * - Local processing with TrOCR
 * - Cloud fallback with GPT-4 Vision / Claude
 * - Result caching
 * - Automatic preprocessing
 */
export class OCREngine {
  private options: Required<OCREngineOptions>
  private cache: Map<string, OCRCacheEntry> = new Map()

  constructor(options: OCREngineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // Load cache from localStorage if enabled
    if (this.options.enableCaching && typeof window !== 'undefined') {
      this.loadCacheFromStorage()
    }

    if (this.options.debug) {
      console.log('[OCREngine] Initialized with options:', this.options)
    }
  }

  /**
   * Transcribe handwritten text from an image
   *
   * @param imageBlob - Image containing handwritten text
   * @param mode - OCR mode: 'local' (TrOCR) or 'cloud' (GPT-4V/Claude)
   * @param preprocessOptions - Image preprocessing options
   * @param cloudOptions - Cloud OCR options
   * @param signal - AbortSignal for cancellation
   * @returns Promise resolving to OCR result
   */
  async transcribe(
    imageBlob: Blob,
    mode: OCRMode = 'local',
    preprocessOptions?: PreprocessOptions,
    cloudOptions?: CloudOCROptions,
    signal?: AbortSignal
  ): Promise<OCRResult> {
    const startTime = performance.now()

    // Check for abort before starting
    if (signal?.aborted) {
      throw new OCRError({
        code: OCRErrorCode.TRANSCRIPTION_FAILED,
        message: 'OCR cancelled',
        retryable: false,
      })
    }

    try {
      // Validate image blob first
      validateImageBlob(imageBlob)

      // Generate cache key from image hash
      const imageHash = this.options.enableCaching
        ? await hashImage(imageBlob)
        : ''

      // Check cache
      if (this.options.enableCaching && imageHash) {
        const cached = this.getFromCache(imageHash, mode)
        if (cached) {
          if (this.options.debug) {
            console.log('[OCREngine] Cache hit for', mode, imageHash.slice(0, 8))
          }
          return {
            ...cached,
            processingTime: Math.round(performance.now() - startTime),
          }
        }
      }

      // Preprocess image
      if (this.options.debug) {
        console.log('[OCREngine] Preprocessing image for', mode)
      }

      const preprocessed = await withTimeout(
        preprocessForOCR(imageBlob, {
          targetSize: this.options.maxImageSize,
          ...preprocessOptions,
        }),
        this.options.timeout,
        'Image preprocessing'
      )

      // Check for abort after preprocessing
      if (signal?.aborted) {
        throw new OCRError({
          code: OCRErrorCode.TRANSCRIPTION_FAILED,
          message: 'OCR cancelled',
          retryable: false,
        })
      }

      // Run OCR based on mode with timeout
      let result: OCRResult

      if (mode === 'local') {
        result = await withTimeout(
          this.runLocalOCR(preprocessed),
          this.options.timeout,
          'Local OCR'
        )
      } else {
        result = await withTimeout(
          this.runCloudOCR(preprocessed, cloudOptions, signal),
          this.options.timeout,
          'Cloud OCR'
        )
      }

      // Check for abort after OCR
      if (signal?.aborted) {
        throw new OCRError({
          code: OCRErrorCode.TRANSCRIPTION_FAILED,
          message: 'OCR cancelled',
          retryable: false,
        })
      }

      // Add processing time
      result.processingTime = Math.round(performance.now() - startTime)

      // Cache result
      if (this.options.enableCaching && imageHash) {
        this.saveToCache(imageHash, result)
      }

      return result
    } catch (error) {
      // Convert to OCRError if not already
      const ocrError = error instanceof OCRError
        ? error
        : OCRError.fromError(error, OCRErrorCode.TRANSCRIPTION_FAILED)

      console.error(`[OCREngine] Transcription failed (${mode}):`, ocrError)

      return {
        text: '',
        confidence: 0,
        mode,
        processingTime: Math.round(performance.now() - startTime),
        error: ocrError.getUserMessage(),
      }
    }
  }

  /**
   * Run local OCR using TrOCR model
   *
   * @param imageBlob - Preprocessed image
   * @returns Promise resolving to OCR result
   */
  private async runLocalOCR(imageBlob: Blob): Promise<OCRResult> {
    try {
      const { text, confidence } = await transcribeWithTrOCR(imageBlob)

      return {
        text,
        confidence,
        mode: 'local',
        processingTime: 0, // Will be set by transcribe()
      }
    } catch (error) {
      throw new OCRError({
        code: OCRErrorCode.MODEL_INFERENCE_FAILED,
        message: `Local OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalError: error instanceof Error ? error : undefined,
        retryable: true,
        suggestedAction: 'Try cloud mode for better accuracy',
      })
    }
  }

  /**
   * Run cloud OCR using vision AI models
   *
   * @param imageBlob - Preprocessed image
   * @param options - Cloud OCR options
   * @param signal - AbortSignal for cancellation
   * @returns Promise resolving to OCR result
   */
  private async runCloudOCR(
    imageBlob: Blob,
    options?: CloudOCROptions,
    signal?: AbortSignal
  ): Promise<OCRResult> {
    if (!isCloudOCRAvailable()) {
      throw new OCRError({
        code: OCRErrorCode.CLOUD_NOT_AVAILABLE,
        message: 'Cloud OCR is not available - API keys not configured',
        retryable: false,
        suggestedAction: 'Configure OpenAI or Anthropic API keys in settings',
      })
    }

    try {
      const { text, confidence } = await transcribeWithCloud(imageBlob, { ...options, signal })

      return {
        text,
        confidence,
        mode: 'cloud',
        processingTime: 0, // Will be set by transcribe()
      }
    } catch (error) {
      // Check if it was an abort
      if (signal?.aborted) {
        throw new OCRError({
          code: OCRErrorCode.TRANSCRIPTION_FAILED,
          message: 'OCR cancelled',
          retryable: false,
        })
      }
      throw new OCRError({
        code: OCRErrorCode.CLOUD_API_ERROR,
        message: `Cloud OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalError: error instanceof Error ? error : undefined,
        retryable: true,
        suggestedAction: 'Check your API key and try again',
      })
    }
  }

  /**
   * Get model information
   *
   * @returns Current model info for local OCR
   */
  getModelInfo() {
    return getModelInfo()
  }

  /**
   * Clear OCR result cache
   */
  clearCache(): void {
    this.cache.clear()

    if (typeof window !== 'undefined') {
      // Clear from localStorage
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      }
    }

    if (this.options.debug) {
      console.log('[OCREngine] Cache cleared')
    }
  }

  /**
   * Get cached result if available and not expired
   *
   * @param imageHash - Image hash key
   * @param mode - OCR mode
   * @returns Cached result or null
   */
  private getFromCache(
    imageHash: string,
    mode: OCRMode
  ): OCRResult | null {
    const cacheKey = `${imageHash}-${mode}`
    const cached = this.cache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check expiry
    const now = Date.now()
    if (now - cached.timestamp > this.options.cacheExpiry) {
      this.cache.delete(cacheKey)
      return null
    }

    return {
      text: cached.text,
      confidence: cached.confidence,
      mode: cached.mode,
      processingTime: 0, // Will be overwritten
    }
  }

  /**
   * Save result to cache
   *
   * @param imageHash - Image hash key
   * @param result - OCR result to cache
   */
  private saveToCache(imageHash: string, result: OCRResult): void {
    const cacheKey = `${imageHash}-${result.mode}`
    const entry: OCRCacheEntry = {
      text: result.text,
      confidence: result.confidence,
      mode: result.mode,
      timestamp: Date.now(),
      imageHash,
    }

    this.cache.set(cacheKey, entry)

    // Persist to localStorage (best effort)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          CACHE_KEY_PREFIX + cacheKey,
          JSON.stringify(entry)
        )
      } catch (error) {
        // localStorage might be full, ignore error
        console.warn('[OCREngine] Failed to save cache to localStorage:', error)
      }
    }
  }

  /**
   * Load cache from localStorage on init
   */
  private loadCacheFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()

      for (const key of keys) {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          const json = localStorage.getItem(key)
          if (json) {
            const entry: OCRCacheEntry = JSON.parse(json)

            // Check expiry
            if (now - entry.timestamp <= this.options.cacheExpiry) {
              const cacheKey = `${entry.imageHash}-${entry.mode}`
              this.cache.set(cacheKey, entry)
            } else {
              // Remove expired entry
              localStorage.removeItem(key)
            }
          }
        }
      }

      if (this.options.debug) {
        console.log(`[OCREngine] Loaded ${this.cache.size} cached results`)
      }
    } catch (error) {
      console.warn('[OCREngine] Failed to load cache from localStorage:', error)
    }
  }
}

// Export singleton instance
let engineInstance: OCREngine | null = null

/**
 * Get or create OCR engine singleton
 *
 * @param options - Engine options (only used on first call)
 * @returns OCR engine instance
 */
export function getOCREngine(options?: OCREngineOptions): OCREngine {
  if (!engineInstance) {
    engineInstance = new OCREngine(options)
  }
  return engineInstance
}

/**
 * Reset the OCR engine singleton
 * Useful for testing or reinitializing with different options
 */
export function resetOCREngine(): void {
  engineInstance = null
}
