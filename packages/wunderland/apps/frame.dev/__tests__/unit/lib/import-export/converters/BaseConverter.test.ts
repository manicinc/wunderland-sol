/**
 * Base Converter Tests
 * @module __tests__/unit/lib/import-export/converters/BaseConverter.test
 *
 * Tests for the BaseConverter abstract class utility methods.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseConverter } from '@/lib/import-export/converters/BaseConverter'
import type {
  ImportFormat,
  ExportFormat,
  ImportOptions,
  ExportOptions,
  ImportResult,
  ExportResult,
} from '@/lib/import-export/core/types'
import type { StrandContent } from '@/lib/content/types'

// Create a concrete implementation for testing
class TestConverter extends BaseConverter {
  readonly name = 'TestConverter'
  readonly supportsImport: ImportFormat[] = ['markdown', 'json']
  readonly supportsExport: ExportFormat[] = ['markdown', 'json']

  async canProcess(): Promise<boolean> {
    return true
  }

  async import(): Promise<ImportResult> {
    return {
      success: true,
      strandsImported: 0,
      strandsSkipped: 0,
      errors: [],
      warnings: [],
    }
  }

  async export(): Promise<ExportResult> {
    return {
      success: true,
      strandsExported: 0,
      format: 'markdown',
      output: '',
    }
  }

  // Expose protected methods for testing
  public testValidateFileExtension(filename: string, allowed: string[]): boolean {
    return this.validateFileExtension(filename, allowed)
  }

  public testValidateFileSize(size: number, maxSize: number): boolean {
    return this.validateFileSize(size, maxSize)
  }

  public testValidateMimeType(mimeType: string, allowed: string[]): boolean {
    return this.validateMimeType(mimeType, allowed)
  }

  public testSlugify(text: string): string {
    return this.slugify(text)
  }

  public testSanitizeFilename(filename: string): string {
    return this.sanitizeFilename(filename)
  }

  public testGenerateId(prefix?: string): string {
    return this.generateId(prefix)
  }

  public testFormatDate(date: Date | string | number): string {
    return this.formatDate(date)
  }

  public testParseDate(dateStr: string): Date {
    return this.parseDate(dateStr)
  }

  public testNormalizePath(path: string): string {
    return this.normalizePath(path)
  }

  public testJoinPath(...segments: string[]): string {
    return this.joinPath(...segments)
  }

  public testGetExtension(path: string): string {
    return this.getExtension(path)
  }

  public testGetFilename(path: string): string {
    return this.getFilename(path)
  }

  public testGetDirname(path: string): string {
    return this.getDirname(path)
  }

  public testFormatBytes(bytes: number): string {
    return this.formatBytes(bytes)
  }

  public testCalculateTotalSize(files: (File | Blob)[]): number {
    return this.calculateTotalSize(files)
  }

  public async testProcessBatch<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    batchSize?: number,
    onBatchComplete?: (processed: number, total: number) => void
  ): Promise<R[]> {
    return this.processBatch(items, processor, batchSize, onBatchComplete)
  }

  public async testDelay(ms: number): Promise<void> {
    return this.delay(ms)
  }

  public async testRetry<T>(
    operation: () => Promise<T>,
    maxAttempts?: number,
    delayMs?: number
  ): Promise<T> {
    return this.retry(operation, maxAttempts, delayMs)
  }

  public testAddError(error: { type: 'parse' | 'validation' | 'network' | 'unknown'; message: string }): void {
    this.addError(error)
  }

  public testAddWarning(message: string): void {
    this.addWarning(message)
  }

  public testCreateError(
    type: 'parse' | 'validation' | 'network' | 'unknown',
    message: string,
    file?: string,
    line?: number
  ) {
    return this.createError(type, message, file, line)
  }

  public testClearErrors(): void {
    this.clearErrors()
  }

  public testReportProgress(current: number, total: number, message?: string): void {
    this.reportProgress(current, total, message)
  }

  public testReportProgressPercent(percent: number, message?: string): void {
    this.reportProgressPercent(percent, message)
  }
}

describe('BaseConverter', () => {
  let converter: TestConverter

  beforeEach(() => {
    converter = new TestConverter()
  })

  // ============================================================================
  // validateFileExtension
  // ============================================================================

  describe('validateFileExtension', () => {
    it('returns true for allowed extension', () => {
      expect(converter.testValidateFileExtension('file.md', ['md', 'txt'])).toBe(true)
    })

    it('returns false for disallowed extension', () => {
      expect(converter.testValidateFileExtension('file.exe', ['md', 'txt'])).toBe(false)
    })

    it('is case-insensitive', () => {
      expect(converter.testValidateFileExtension('file.MD', ['md'])).toBe(true)
      expect(converter.testValidateFileExtension('file.Md', ['md'])).toBe(true)
    })

    it('handles multiple dots in filename', () => {
      expect(converter.testValidateFileExtension('file.test.md', ['md'])).toBe(true)
    })

    it('returns false for no extension', () => {
      expect(converter.testValidateFileExtension('file', ['md'])).toBe(false)
    })

    it('handles empty filename', () => {
      expect(converter.testValidateFileExtension('', ['md'])).toBe(false)
    })

    it('returns false for file ending with dot', () => {
      expect(converter.testValidateFileExtension('file.', ['md'])).toBe(false)
    })

    it('returns false when allowed list is empty', () => {
      expect(converter.testValidateFileExtension('file.md', [])).toBe(false)
    })

    it('handles hidden files with extension', () => {
      expect(converter.testValidateFileExtension('.gitignore', ['gitignore'])).toBe(true)
    })

    it('handles files with only extension', () => {
      expect(converter.testValidateFileExtension('.md', ['md'])).toBe(true)
    })
  })

  // ============================================================================
  // validateFileSize
  // ============================================================================

  describe('validateFileSize', () => {
    it('returns true when size is under limit', () => {
      expect(converter.testValidateFileSize(100, 1000)).toBe(true)
    })

    it('returns true when size equals limit', () => {
      expect(converter.testValidateFileSize(1000, 1000)).toBe(true)
    })

    it('returns false when size exceeds limit', () => {
      expect(converter.testValidateFileSize(1001, 1000)).toBe(false)
    })

    it('handles zero size', () => {
      expect(converter.testValidateFileSize(0, 1000)).toBe(true)
    })

    it('handles zero max size', () => {
      expect(converter.testValidateFileSize(0, 0)).toBe(true)
      expect(converter.testValidateFileSize(1, 0)).toBe(false)
    })

    it('handles large sizes', () => {
      expect(converter.testValidateFileSize(1073741824, 2147483648)).toBe(true) // 1GB < 2GB
    })
  })

  // ============================================================================
  // validateMimeType
  // ============================================================================

  describe('validateMimeType', () => {
    it('returns true for exact match', () => {
      expect(converter.testValidateMimeType('text/plain', ['text/plain'])).toBe(true)
    })

    it('returns false for no match', () => {
      expect(converter.testValidateMimeType('text/plain', ['image/png'])).toBe(false)
    })

    it('supports wildcard patterns', () => {
      expect(converter.testValidateMimeType('text/plain', ['text/*'])).toBe(true)
      expect(converter.testValidateMimeType('text/html', ['text/*'])).toBe(true)
      expect(converter.testValidateMimeType('image/png', ['text/*'])).toBe(false)
    })

    it('matches multiple allowed types', () => {
      expect(converter.testValidateMimeType('image/png', ['text/plain', 'image/*'])).toBe(true)
    })

    it('returns false for empty allowed list', () => {
      expect(converter.testValidateMimeType('text/plain', [])).toBe(false)
    })

    it('returns false for empty mime type', () => {
      expect(converter.testValidateMimeType('', ['text/*'])).toBe(false)
    })

    it('handles application types', () => {
      expect(converter.testValidateMimeType('application/json', ['application/*'])).toBe(true)
      expect(converter.testValidateMimeType('application/pdf', ['application/json'])).toBe(false)
    })

    it('is case-sensitive for mime types', () => {
      // MIME types are case-insensitive per RFC, but implementation is strict
      expect(converter.testValidateMimeType('TEXT/PLAIN', ['text/plain'])).toBe(false)
    })
  })

  // ============================================================================
  // slugify
  // ============================================================================

  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(converter.testSlugify('Hello World')).toBe('hello-world')
    })

    it('replaces spaces with dashes', () => {
      expect(converter.testSlugify('hello world')).toBe('hello-world')
    })

    it('removes special characters', () => {
      expect(converter.testSlugify('Hello! World?')).toBe('hello-world')
    })

    it('trims leading/trailing dashes', () => {
      expect(converter.testSlugify('  hello world  ')).toBe('hello-world')
    })

    it('collapses multiple dashes', () => {
      expect(converter.testSlugify('hello   world')).toBe('hello-world')
    })

    it('handles empty string', () => {
      expect(converter.testSlugify('')).toBe('')
    })

    it('handles numbers', () => {
      expect(converter.testSlugify('Hello 123 World')).toBe('hello-123-world')
    })

    it('handles unicode characters', () => {
      expect(converter.testSlugify('Café résumé')).toBe('caf-r-sum')
    })

    it('handles only special characters', () => {
      expect(converter.testSlugify('!@#$%')).toBe('')
    })

    it('handles only spaces', () => {
      expect(converter.testSlugify('     ')).toBe('')
    })

    it('handles tabs and newlines', () => {
      expect(converter.testSlugify('hello\tworld\ntest')).toBe('hello-world-test')
    })
  })

  // ============================================================================
  // sanitizeFilename
  // ============================================================================

  describe('sanitizeFilename', () => {
    it('keeps alphanumeric characters', () => {
      expect(converter.testSanitizeFilename('hello123')).toBe('hello123')
    })

    it('keeps dots, underscores, and dashes', () => {
      expect(converter.testSanitizeFilename('hello_world-v1.0.txt')).toBe('hello_world-v1.0.txt')
    })

    it('replaces special characters with dashes', () => {
      expect(converter.testSanitizeFilename('hello@world#test')).toBe('hello-world-test')
    })

    it('collapses multiple dashes', () => {
      expect(converter.testSanitizeFilename('hello!!!world')).toBe('hello-world')
    })

    it('trims leading/trailing dashes', () => {
      expect(converter.testSanitizeFilename('!hello!')).toBe('hello')
    })

    it('handles empty string', () => {
      expect(converter.testSanitizeFilename('')).toBe('')
    })

    it('handles spaces', () => {
      expect(converter.testSanitizeFilename('hello world')).toBe('hello-world')
    })

    it('handles unicode characters', () => {
      expect(converter.testSanitizeFilename('文件名')).toBe('')
    })

    it('handles only special characters', () => {
      expect(converter.testSanitizeFilename('!@#$%^&*()')).toBe('')
    })

    it('preserves case', () => {
      expect(converter.testSanitizeFilename('HelloWorld.TXT')).toBe('HelloWorld.TXT')
    })
  })

  // ============================================================================
  // generateId
  // ============================================================================

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const ids = new Set<string>()
      for (let i = 0; i < 100; i++) {
        ids.add(converter.testGenerateId())
      }
      expect(ids.size).toBe(100)
    })

    it('uses default prefix', () => {
      const id = converter.testGenerateId()
      expect(id.startsWith('item-')).toBe(true)
    })

    it('uses custom prefix', () => {
      const id = converter.testGenerateId('custom')
      expect(id.startsWith('custom-')).toBe(true)
    })

    it('has timestamp and random components', () => {
      const id = converter.testGenerateId('test')
      const parts = id.split('-')
      expect(parts.length).toBe(3)
    })
  })

  // ============================================================================
  // formatDate
  // ============================================================================

  describe('formatDate', () => {
    it('formats Date object to ISO string', () => {
      const date = new Date('2025-01-01T12:00:00Z')
      expect(converter.testFormatDate(date)).toBe('2025-01-01T12:00:00.000Z')
    })

    it('formats timestamp to ISO string', () => {
      const timestamp = new Date('2025-01-01T12:00:00Z').getTime()
      expect(converter.testFormatDate(timestamp)).toBe('2025-01-01T12:00:00.000Z')
    })

    it('formats date string to ISO string', () => {
      expect(converter.testFormatDate('2025-01-01')).toContain('2025-01-01')
    })

    it('handles zero timestamp', () => {
      expect(converter.testFormatDate(0)).toBe('1970-01-01T00:00:00.000Z')
    })

    it('handles negative timestamp', () => {
      // Negative timestamps are before Unix epoch
      const result = converter.testFormatDate(-86400000)
      expect(result).toBe('1969-12-31T00:00:00.000Z')
    })
  })

  // ============================================================================
  // parseDate
  // ============================================================================

  describe('parseDate', () => {
    it('parses valid date string', () => {
      const date = converter.testParseDate('2025-01-15T12:00:00Z')
      expect(date.getUTCFullYear()).toBe(2025)
    })

    it('parses ISO date string', () => {
      const date = converter.testParseDate('2025-06-15T10:30:00Z')
      expect(date.getUTCMonth()).toBe(5) // June is month 5 (0-indexed)
    })

    it('returns current date for invalid string', () => {
      const date = converter.testParseDate('not-a-date')
      expect(date).toBeInstanceOf(Date)
      expect(isNaN(date.getTime())).toBe(false)
    })

    it('returns current date for empty string', () => {
      const before = Date.now()
      const date = converter.testParseDate('')
      const after = Date.now()
      expect(date.getTime()).toBeGreaterThanOrEqual(before)
      expect(date.getTime()).toBeLessThanOrEqual(after)
    })

    it('parses date-only format', () => {
      const date = converter.testParseDate('2025-06-15')
      expect(date.getUTCFullYear()).toBe(2025)
      expect(date.getUTCMonth()).toBe(5) // June
      expect(date.getUTCDate()).toBe(15)
    })

    it('parses RFC 2822 format', () => {
      const date = converter.testParseDate('Mon, 15 Jun 2025 10:30:00 GMT')
      expect(date.getUTCFullYear()).toBe(2025)
    })
  })

  // ============================================================================
  // normalizePath
  // ============================================================================

  describe('normalizePath', () => {
    it('removes leading slashes', () => {
      expect(converter.testNormalizePath('/path/to/file')).toBe('path/to/file')
    })

    it('removes trailing slashes', () => {
      expect(converter.testNormalizePath('path/to/file/')).toBe('path/to/file')
    })

    it('removes multiple leading/trailing slashes', () => {
      expect(converter.testNormalizePath('///path/to/file///')).toBe('path/to/file')
    })

    it('deduplicates slashes', () => {
      expect(converter.testNormalizePath('path//to///file')).toBe('path/to/file')
    })

    it('handles empty string', () => {
      expect(converter.testNormalizePath('')).toBe('')
    })

    it('handles only slashes', () => {
      expect(converter.testNormalizePath('///')).toBe('')
    })

    it('handles single segment', () => {
      expect(converter.testNormalizePath('file')).toBe('file')
    })
  })

  // ============================================================================
  // joinPath
  // ============================================================================

  describe('joinPath', () => {
    it('joins path segments', () => {
      expect(converter.testJoinPath('path', 'to', 'file')).toBe('path/to/file')
    })

    it('normalizes the result', () => {
      expect(converter.testJoinPath('/path/', '/to/', '/file/')).toBe('path/to/file')
    })

    it('handles empty segments', () => {
      expect(converter.testJoinPath('path', '', 'file')).toBe('path/file')
    })

    it('handles single segment', () => {
      expect(converter.testJoinPath('path')).toBe('path')
    })

    it('handles no segments', () => {
      expect(converter.testJoinPath()).toBe('')
    })

    it('handles all empty segments', () => {
      expect(converter.testJoinPath('', '', '')).toBe('')
    })
  })

  // ============================================================================
  // getExtension
  // ============================================================================

  describe('getExtension', () => {
    it('returns extension without dot', () => {
      expect(converter.testGetExtension('file.md')).toBe('md')
    })

    it('returns lowercase extension', () => {
      expect(converter.testGetExtension('file.MD')).toBe('md')
    })

    it('handles multiple dots', () => {
      expect(converter.testGetExtension('file.test.md')).toBe('md')
    })

    it('returns empty for no extension', () => {
      expect(converter.testGetExtension('file')).toBe('')
    })

    it('handles paths', () => {
      expect(converter.testGetExtension('path/to/file.md')).toBe('md')
    })

    it('handles empty string', () => {
      expect(converter.testGetExtension('')).toBe('')
    })

    it('handles file ending with dot', () => {
      expect(converter.testGetExtension('file.')).toBe('')
    })

    it('handles hidden files', () => {
      expect(converter.testGetExtension('.gitignore')).toBe('gitignore')
    })
  })

  // ============================================================================
  // getFilename
  // ============================================================================

  describe('getFilename', () => {
    it('returns filename without extension', () => {
      expect(converter.testGetFilename('file.md')).toBe('file')
    })

    it('handles paths', () => {
      expect(converter.testGetFilename('path/to/file.md')).toBe('file')
    })

    it('handles multiple dots', () => {
      expect(converter.testGetFilename('file.test.md')).toBe('file.test')
    })

    it('returns full name if no extension', () => {
      expect(converter.testGetFilename('path/to/file')).toBe('file')
    })

    it('handles empty path', () => {
      expect(converter.testGetFilename('')).toBe('')
    })
  })

  // ============================================================================
  // getDirname
  // ============================================================================

  describe('getDirname', () => {
    it('returns directory path', () => {
      expect(converter.testGetDirname('path/to/file.md')).toBe('path/to')
    })

    it('returns empty for file in root', () => {
      expect(converter.testGetDirname('file.md')).toBe('')
    })

    it('handles deep paths', () => {
      expect(converter.testGetDirname('a/b/c/d/file.md')).toBe('a/b/c/d')
    })
  })

  // ============================================================================
  // formatBytes
  // ============================================================================

  describe('formatBytes', () => {
    it('formats zero bytes', () => {
      expect(converter.testFormatBytes(0)).toBe('0 Bytes')
    })

    it('formats bytes', () => {
      expect(converter.testFormatBytes(500)).toBe('500 Bytes')
    })

    it('formats kilobytes', () => {
      expect(converter.testFormatBytes(1024)).toBe('1 KB')
      expect(converter.testFormatBytes(1536)).toBe('1.5 KB')
    })

    it('formats megabytes', () => {
      expect(converter.testFormatBytes(1048576)).toBe('1 MB')
    })

    it('formats gigabytes', () => {
      expect(converter.testFormatBytes(1073741824)).toBe('1 GB')
    })

    it('formats terabytes', () => {
      expect(converter.testFormatBytes(1099511627776)).toBe('1 TB')
    })

    it('rounds to two decimal places', () => {
      expect(converter.testFormatBytes(1234567)).toBe('1.18 MB')
    })

    it('handles single byte', () => {
      expect(converter.testFormatBytes(1)).toBe('1 Bytes')
    })
  })

  // ============================================================================
  // calculateTotalSize
  // ============================================================================

  describe('calculateTotalSize', () => {
    it('returns 0 for empty array', () => {
      expect(converter.testCalculateTotalSize([])).toBe(0)
    })

    it('sums file sizes', () => {
      const files = [
        new Blob(['hello'], { type: 'text/plain' }),
        new Blob(['world!'], { type: 'text/plain' }),
      ]
      expect(converter.testCalculateTotalSize(files)).toBe(11)
    })
  })

  // ============================================================================
  // processBatch
  // ============================================================================

  describe('processBatch', () => {
    it('processes all items', async () => {
      const items = [1, 2, 3, 4, 5]
      const results = await converter.testProcessBatch(
        items,
        async (n) => n * 2
      )
      expect(results).toEqual([2, 4, 6, 8, 10])
    })

    it('respects batch size', async () => {
      const items = [1, 2, 3, 4, 5]
      const batches: number[] = []

      await converter.testProcessBatch(
        items,
        async (n) => n,
        2,
        (processed) => batches.push(processed)
      )

      expect(batches).toEqual([2, 4, 5])
    })

    it('calls progress callback', async () => {
      const items = [1, 2, 3]
      const progressCallback = vi.fn()

      await converter.testProcessBatch(items, async (n) => n, 1, progressCallback)

      expect(progressCallback).toHaveBeenCalledTimes(3)
      expect(progressCallback).toHaveBeenCalledWith(1, 3)
      expect(progressCallback).toHaveBeenCalledWith(2, 3)
      expect(progressCallback).toHaveBeenCalledWith(3, 3)
    })

    it('handles empty array', async () => {
      const results = await converter.testProcessBatch([], async (n) => n)
      expect(results).toEqual([])
    })

    it('passes correct index to processor', async () => {
      const items = ['a', 'b', 'c']
      const indices: number[] = []

      await converter.testProcessBatch(items, async (item, index) => {
        indices.push(index)
        return item
      })

      expect(indices).toEqual([0, 1, 2])
    })

    it('uses default batch size of 10', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i)
      const batches: number[] = []

      await converter.testProcessBatch(
        items,
        async (n) => n,
        undefined,
        (processed) => batches.push(processed)
      )

      expect(batches).toEqual([10, 20, 25])
    })
  })

  // ============================================================================
  // delay
  // ============================================================================

  describe('delay', () => {
    it('delays execution', async () => {
      const start = Date.now()
      await converter.testDelay(50)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45)
    })
  })

  // ============================================================================
  // retry
  // ============================================================================

  describe('retry', () => {
    it('returns on first success', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      const result = await converter.testRetry(operation)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('retries on failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success')

      const result = await converter.testRetry(operation, 3, 10)
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('throws after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('always fails'))

      await expect(converter.testRetry(operation, 2, 10)).rejects.toThrow('always fails')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('uses exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success')

      const start = Date.now()
      const result = await converter.testRetry(operation, 3, 10)
      const elapsed = Date.now() - start

      expect(result).toBe('success')
      // First retry: 10ms, Second retry: 20ms = 30ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(25)
    })

    it('throws generic error when no error captured', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw undefined
      })

      await expect(converter.testRetry(operation, 1, 10)).rejects.toThrow('Operation failed after retries')
    })
  })

  // ============================================================================
  // Error handling
  // ============================================================================

  describe('error handling', () => {
    it('addError adds to errors list', () => {
      converter.testAddError({ type: 'parse', message: 'Parse error' })
      expect(converter.getErrors()).toHaveLength(1)
      expect(converter.getErrors()[0].type).toBe('parse')
    })

    it('addWarning adds to warnings list', () => {
      converter.testAddWarning('Warning message')
      expect(converter.getWarnings()).toHaveLength(1)
      expect(converter.getWarnings()[0]).toBe('Warning message')
    })

    it('createError creates error object', () => {
      const error = converter.testCreateError('validation', 'Invalid input', 'file.md', 10)
      expect(error.type).toBe('validation')
      expect(error.message).toBe('Invalid input')
      expect(error.file).toBe('file.md')
      expect(error.line).toBe(10)
    })

    it('clearErrors clears both errors and warnings', () => {
      converter.testAddError({ type: 'parse', message: 'Error' })
      converter.testAddWarning('Warning')
      converter.testClearErrors()
      expect(converter.getErrors()).toHaveLength(0)
      expect(converter.getWarnings()).toHaveLength(0)
    })

    it('getErrors returns copy of errors', () => {
      converter.testAddError({ type: 'parse', message: 'Error' })
      const errors = converter.getErrors()
      errors.push({ type: 'unknown', message: 'New' })
      expect(converter.getErrors()).toHaveLength(1)
    })

    it('getWarnings returns copy of warnings', () => {
      converter.testAddWarning('Warning')
      const warnings = converter.getWarnings()
      warnings.push('New warning')
      expect(converter.getWarnings()).toHaveLength(1)
    })
  })

  // ============================================================================
  // Progress tracking
  // ============================================================================

  describe('progress tracking', () => {
    it('setProgressCallback sets callback', () => {
      const callback = vi.fn()
      converter.setProgressCallback(callback)
      converter.testReportProgress(50, 100, 'Processing')
      expect(callback).toHaveBeenCalledWith(50, 100, 'Processing', undefined)
    })

    it('reportProgressPercent reports as percentage', () => {
      const callback = vi.fn()
      converter.setProgressCallback(callback)
      converter.testReportProgressPercent(75, 'Almost done')
      expect(callback).toHaveBeenCalledWith(75, 100, 'Almost done', undefined)
    })

    it('handles no callback gracefully', () => {
      expect(() => converter.testReportProgress(50, 100)).not.toThrow()
    })
  })
})
