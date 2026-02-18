/**
 * Base Converter Abstract Class
 * @module lib/import-export/converters/BaseConverter
 *
 * Abstract base class for all import/export converters.
 * Provides common functionality like progress tracking, error handling,
 * and validation.
 */

import type {
  IConverter,
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
  ImportError,
  ProgressCallback,
} from '../core/types'
import type { StrandContent } from '@/lib/content/types'

// ============================================================================
// BASE CONVERTER
// ============================================================================

export abstract class BaseConverter implements IConverter {
  /** Converter name */
  abstract readonly name: string

  /** Supported import formats */
  abstract readonly supportsImport: ImportFormat[]

  /** Supported export formats */
  abstract readonly supportsExport: ExportFormat[]

  /**
   * Errors collected during conversion
   */
  protected errors: ImportError[] = []

  /**
   * Warnings collected during conversion
   */
  protected warnings: string[] = []

  /**
   * Progress callback
   */
  protected progressCallback?: ProgressCallback

  // ==========================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ==========================================================================

  /**
   * Validate if the input can be processed by this converter
   */
  abstract canProcess(input: File | Blob | string): Promise<boolean>

  /**
   * Import content from external format
   */
  abstract import(
    input: File | Blob | string,
    options: Partial<ImportOptions>
  ): Promise<ImportResult>

  /**
   * Export content to external format
   */
  abstract export(
    strands: StrandContent[],
    options: Partial<ExportOptions>
  ): Promise<ExportResult>

  // ==========================================================================
  // PROGRESS TRACKING
  // ==========================================================================

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  /**
   * Report progress
   */
  protected reportProgress(
    current: number,
    total: number,
    message?: string,
    currentItem?: string
  ): void {
    this.progressCallback?.(current, total, message, currentItem)
  }

  /**
   * Report progress as percentage
   */
  protected reportProgressPercent(
    percent: number,
    message?: string,
    currentItem?: string
  ): void {
    this.progressCallback?.(percent, 100, message, currentItem)
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Add an error
   */
  protected addError(error: ImportError): void {
    this.errors.push(error)
  }

  /**
   * Add a warning
   */
  protected addWarning(message: string): void {
    this.warnings.push(message)
  }

  /**
   * Create an error object
   */
  protected createError(
    type: ImportError['type'],
    message: string,
    file?: string,
    line?: number,
    details?: unknown
  ): ImportError {
    return {
      type,
      message,
      file,
      line,
      details,
    }
  }

  /**
   * Clear errors and warnings
   */
  protected clearErrors(): void {
    this.errors = []
    this.warnings = []
  }

  /**
   * Get all errors
   */
  getErrors(): ImportError[] {
    return [...this.errors]
  }

  /**
   * Get all warnings
   */
  getWarnings(): string[] {
    return [...this.warnings]
  }

  // ==========================================================================
  // VALIDATION UTILITIES
  // ==========================================================================

  /**
   * Validate file type by extension
   */
  protected validateFileExtension(
    filename: string,
    allowedExtensions: string[]
  ): boolean {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext ? allowedExtensions.includes(ext) : false
  }

  /**
   * Validate file size (in bytes)
   */
  protected validateFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize
  }

  /**
   * Validate MIME type
   */
  protected validateMimeType(
    mimeType: string,
    allowedTypes: string[]
  ): boolean {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2)
        return mimeType.startsWith(prefix)
      }
      return mimeType === type
    })
  }

  // ==========================================================================
  // FILE UTILITIES
  // ==========================================================================

  /**
   * Read file as text
   */
  protected async readFileAsText(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Read file as ArrayBuffer
   */
  protected async readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Read file as Data URL
   */
  protected async readFileAsDataURL(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  // ==========================================================================
  // STRING UTILITIES
  // ==========================================================================

  /**
   * Slugify a string (for IDs and paths)
   */
  protected slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Sanitize filename
   */
  protected sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Generate unique ID
   */
  protected generateId(prefix: string = 'item'): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 8)
    return `${prefix}-${timestamp}-${random}`
  }

  // ==========================================================================
  // DATE UTILITIES
  // ==========================================================================

  /**
   * Format date as ISO string
   */
  protected formatDate(date: Date | string | number): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString()
    }
    if (typeof date === 'number') {
      return new Date(date).toISOString()
    }
    return date.toISOString()
  }

  /**
   * Parse date from various formats
   */
  protected parseDate(dateStr: string): Date {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date()
    }
    return date
  }

  // ==========================================================================
  // PATH UTILITIES
  // ==========================================================================

  /**
   * Normalize path (remove leading/trailing slashes, dedupe slashes)
   */
  protected normalizePath(path: string): string {
    return path
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/')
  }

  /**
   * Join path segments
   */
  protected joinPath(...segments: string[]): string {
    return this.normalizePath(segments.join('/'))
  }

  /**
   * Get file extension from path
   */
  protected getExtension(path: string): string {
    const parts = path.split('.')
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  }

  /**
   * Get filename from path (without extension)
   */
  protected getFilename(path: string): string {
    const name = path.split('/').pop() || ''
    const ext = this.getExtension(path)
    return ext ? name.slice(0, -(ext.length + 1)) : name
  }

  /**
   * Get directory from path
   */
  protected getDirname(path: string): string {
    const parts = path.split('/')
    parts.pop()
    return parts.join('/')
  }

  // ==========================================================================
  // SIZE UTILITIES
  // ==========================================================================

  /**
   * Format bytes to human-readable string
   */
  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Calculate total size of files
   */
  protected calculateTotalSize(files: (File | Blob)[]): number {
    return files.reduce((total, file) => total + file.size, 0)
  }

  // ==========================================================================
  // ASYNC UTILITIES
  // ==========================================================================

  /**
   * Process array in batches with progress tracking
   */
  protected async processBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize: number = 10,
    onBatchComplete?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map((item, idx) => processor(item, i + idx))
      )
      results.push(...batchResults)

      onBatchComplete?.(Math.min(i + batchSize, items.length), items.length)
    }

    return results
  }

  /**
   * Delay execution (for rate limiting, etc.)
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (attempt < maxAttempts) {
          await this.delay(delayMs * Math.pow(2, attempt - 1))
        }
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }
}
