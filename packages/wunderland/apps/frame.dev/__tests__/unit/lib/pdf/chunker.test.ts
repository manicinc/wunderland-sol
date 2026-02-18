/**
 * PDF Chunker Tests
 * @module __tests__/unit/lib/pdf/chunker.test
 *
 * Tests for PDF chunking functionality.
 */

import { describe, it, expect } from 'vitest'
import { chunkPDF, type ChunkOptions, type PDFChunk } from '@/lib/pdf/chunker'
import type { ParsedPDF, PDFPage } from '@/lib/pdf/parser'

// Helper to create a mock PDFPage
function createMockPage(pageNumber: number, text: string, options: Partial<PDFPage> = {}): PDFPage {
  const lines = text.split('\n')
  return {
    pageNumber,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    lines,
    headings: [],
    ...options,
  }
}

// Helper to create a mock ParsedPDF
function createMockPDF(options: Partial<ParsedPDF> = {}): ParsedPDF {
  const pages = options.pages || [
    createMockPage(1, 'First page content with some words.'),
    createMockPage(2, 'Second page with different text.'),
    createMockPage(3, 'Third page has more content here.'),
  ]

  return {
    filename: 'test.pdf',
    totalPages: pages.length,
    pages,
    metadata: {},
    totalWords: pages.reduce((sum, p) => sum + p.wordCount, 0),
    tocPages: [],
    covers: {},
    structure: {
      hasChapters: false,
      hasParts: false,
      hasSections: false,
      chapters: [],
    },
    ...options,
  }
}

describe('PDF Chunker', () => {
  // ============================================================================
  // ChunkOptions defaults
  // ============================================================================

  describe('chunkPDF options', () => {
    it('uses default options when none provided', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('respects mode option', () => {
      const pdf = createMockPDF()

      const singleChunks = chunkPDF(pdf, { mode: 'single-file' })
      expect(singleChunks).toHaveLength(1)

      const perPageChunks = chunkPDF(pdf, { mode: 'per-page' })
      expect(perPageChunks.length).toBe(pdf.pages.length)
    })

    it('respects pageLimit option', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Page 1'),
          createMockPage(2, 'Page 2'),
          createMockPage(3, 'Page 3'),
          createMockPage(4, 'Page 4'),
          createMockPage(5, 'Page 5'),
        ],
      })

      const chunks = chunkPDF(pdf, { mode: 'per-page', pageLimit: 2 })
      expect(chunks).toHaveLength(2)
    })
  })

  // ============================================================================
  // Single file mode
  // ============================================================================

  describe('single-file mode', () => {
    it('returns exactly one chunk', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks).toHaveLength(1)
    })

    it('combines all pages into one chunk', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      const chunk = chunks[0]!
      expect(chunk.content).toContain('First page')
      expect(chunk.content).toContain('Second page')
      expect(chunk.content).toContain('Third page')
    })

    it('sets correct page range', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.pageRange.start).toBe(1)
      expect(chunks[0]!.pageRange.end).toBe(3)
    })

    it('uses filename as title when no metadata title', () => {
      const pdf = createMockPDF({ filename: 'my-document.pdf' })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.title).toBe('my-document')
    })

    it('uses metadata title when available', () => {
      const pdf = createMockPDF({
        metadata: { title: 'My Book Title' },
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.title).toBe('My Book Title')
    })

    it('calculates correct word count', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'one two three'),
          createMockPage(2, 'four five'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(5)
    })

    it('excludes TOC pages', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Content page one'),
          createMockPage(2, 'Table of Contents...', { isTOC: true }),
          createMockPage(3, 'Content page two'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.content).not.toContain('Table of Contents')
    })
  })

  // ============================================================================
  // Per-page mode
  // ============================================================================

  describe('per-page mode', () => {
    it('creates one chunk per page', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks).toHaveLength(3)
    })

    it('sets correct page numbers in IDs', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks[0]!.id).toBe('page-001')
      expect(chunks[1]!.id).toBe('page-002')
      expect(chunks[2]!.id).toBe('page-003')
    })

    it('sets correct titles', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks[0]!.title).toBe('Page 1')
      expect(chunks[1]!.title).toBe('Page 2')
    })

    it('includes page numbers in content when option is true', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page', includePageNumbers: true })

      expect(chunks[0]!.content).toContain('<!-- Page 1 -->')
    })

    it('excludes page numbers from content when option is false', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page', includePageNumbers: false })

      expect(chunks[0]!.content).not.toContain('<!-- Page')
    })

    it('handles cover pages specially', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Front cover content', { cover: 'front' }),
          createMockPage(2, 'Regular page'),
          createMockPage(3, 'Back cover content', { cover: 'back' }),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks[0]!.id).toBe('front-cover')
      expect(chunks[0]!.title).toBe('Front Cover')
      expect(chunks[2]!.id).toBe('back-cover')
      expect(chunks[2]!.title).toBe('Back Cover')
    })

    it('sets correct page range for each chunk', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks[0]!.pageRange).toEqual({ start: 1, end: 1 })
      expect(chunks[1]!.pageRange).toEqual({ start: 2, end: 2 })
      expect(chunks[2]!.pageRange).toEqual({ start: 3, end: 3 })
    })

    it('excludes TOC pages', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Content page'),
          createMockPage(2, 'Table of Contents', { isTOC: true }),
          createMockPage(3, 'More content'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks).toHaveLength(2)
      expect(chunks.every(c => !c.content.includes('Table of Contents'))).toBe(true)
    })
  })

  // ============================================================================
  // Smart chunk mode
  // ============================================================================

  describe('smart-chunk mode', () => {
    it('falls back to single-file when no chapters detected', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'smart-chunk' })

      // Without chapters, should behave like single-file
      expect(chunks).toHaveLength(1)
    })

    it('creates chunks based on chapters when detected', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Chapter 1 content'),
          createMockPage(2, 'More chapter 1'),
          createMockPage(3, 'Chapter 2 content'),
          createMockPage(4, 'More chapter 2'),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Chapter 1', startPage: 1, endPage: 2 },
            { title: 'Chapter 2', startPage: 3, endPage: 4 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, { mode: 'smart-chunk' })

      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })

    it('handles front and back covers', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Front cover', { cover: 'front' }),
          createMockPage(2, 'Chapter content'),
          createMockPage(3, 'Back cover', { cover: 'back' }),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Chapter 1', startPage: 2, endPage: 2 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, { mode: 'smart-chunk' })

      const ids = chunks.map(c => c.id)
      expect(ids).toContain('front-cover')
      expect(ids).toContain('back-cover')
    })

    it('respects pageLimit option', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Page 1'),
          createMockPage(2, 'Page 2'),
          createMockPage(3, 'Page 3'),
          createMockPage(4, 'Page 4'),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Chapter 1', startPage: 1, endPage: 4 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, { mode: 'smart-chunk', pageLimit: 2 })
      const allContent = chunks.map(c => c.content).join('\n')

      expect(allContent).toContain('Page 1')
      expect(allContent).toContain('Page 2')
      expect(allContent).not.toContain('Page 4')
    })
  })

  // ============================================================================
  // Scene break detection
  // ============================================================================

  describe('scene break detection', () => {
    it('detects asterisk scene breaks', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'First scene content\n\n* * *\n\nSecond scene content'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.scenes.length).toBeGreaterThan(0)
    })

    it('detects triple dash scene breaks', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Scene one\n\n---\n\nScene two'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.scenes.length).toBeGreaterThan(0)
    })

    it('detects triple asterisk scene breaks', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Before break\n\n***\n\nAfter break'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.scenes.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // Illustration point detection
  // ============================================================================

  describe('illustration point detection', () => {
    it('identifies visual description paragraphs', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, `
She looked at the towering building before her. The glass windows reflected
the sunset in brilliant oranges and reds.

"Hello there," he said.

She gazed upon the ancient ruins, crumbling walls covered in moss and vines
stretching toward the sky.
          `.trim()),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.illustrationPoints.length).toBeGreaterThan(0)
    })

    it('skips very short paragraphs', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Short.\n\nAnother short.'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.illustrationPoints).toHaveLength(0)
    })

    it('limits illustration points to reasonable number', () => {
      // Create text with many potential illustration points
      const manyParagraphs = Array(50)
        .fill(null)
        .map((_, i) => `Paragraph ${i}: She looked at the beautiful scenery before her, the mountains rising majestically.`)
        .join('\n\n')

      const pdf = createMockPDF({
        pages: [createMockPage(1, manyParagraphs)],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      // Should be limited (max ~10 points for 50 paragraphs)
      expect(chunks[0]!.illustrationPoints.length).toBeLessThanOrEqual(10)
    })
  })

  // ============================================================================
  // PDFChunk structure
  // ============================================================================

  describe('PDFChunk structure', () => {
    it('has required id field', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(chunk.id).toBeDefined()
        expect(typeof chunk.id).toBe('string')
        expect(chunk.id.length).toBeGreaterThan(0)
      }
    })

    it('has required title field', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(chunk.title).toBeDefined()
        expect(typeof chunk.title).toBe('string')
      }
    })

    it('has required content field', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(chunk.content).toBeDefined()
        expect(typeof chunk.content).toBe('string')
      }
    })

    it('has required wordCount field', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(typeof chunk.wordCount).toBe('number')
        expect(chunk.wordCount).toBeGreaterThanOrEqual(0)
      }
    })

    it('has required pageRange field', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(chunk.pageRange).toBeDefined()
        expect(chunk.pageRange.start).toBeDefined()
        expect(chunk.pageRange.end).toBeDefined()
        expect(chunk.pageRange.start).toBeLessThanOrEqual(chunk.pageRange.end)
      }
    })

    it('has scenes array', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(Array.isArray(chunk.scenes)).toBe(true)
      }
    })

    it('has illustrationPoints array', () => {
      const pdf = createMockPDF()
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      for (const chunk of chunks) {
        expect(Array.isArray(chunk.illustrationPoints)).toBe(true)
      }
    })
  })

  // ============================================================================
  // Edge cases
  // ============================================================================

  describe('edge cases', () => {
    it('handles empty PDF', () => {
      const pdf = createMockPDF({ pages: [] })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks).toHaveLength(1)
      expect(chunks[0]!.content).toBe('')
      expect(chunks[0]!.wordCount).toBe(0)
    })

    it('handles single page PDF', () => {
      const pdf = createMockPDF({
        pages: [createMockPage(1, 'Only one page')],
      })
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks).toHaveLength(1)
    })

    it('handles PDF with only TOC pages', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'TOC 1', { isTOC: true }),
          createMockPage(2, 'TOC 2', { isTOC: true }),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks).toHaveLength(0)
    })

    it('handles PDF with empty pages', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, ''),
          createMockPage(2, 'Content here'),
          createMockPage(3, ''),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'per-page' })

      expect(chunks).toHaveLength(3)
    })

    it('handles very long page text', () => {
      const longText = 'word '.repeat(10000)
      const pdf = createMockPDF({
        pages: [createMockPage(1, longText)],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(10000)
    })

    it('handles special characters in text', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Special chars: é ñ ü 中文 日本語 emoji 🎉'),
        ],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.content).toContain('emoji')
    })
  })

  // ============================================================================
  // Word count accuracy
  // ============================================================================

  describe('word count accuracy', () => {
    it('counts words separated by spaces', () => {
      const pdf = createMockPDF({
        pages: [createMockPage(1, 'one two three four five')],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(5)
    })

    it('counts words separated by newlines', () => {
      const pdf = createMockPDF({
        pages: [createMockPage(1, 'one\ntwo\nthree')],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(3)
    })

    it('counts words separated by tabs', () => {
      const pdf = createMockPDF({
        pages: [createMockPage(1, 'one\ttwo\tthree')],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(3)
    })

    it('ignores extra whitespace', () => {
      const pdf = createMockPDF({
        pages: [createMockPage(1, 'one    two     three')],
      })
      const chunks = chunkPDF(pdf, { mode: 'single-file' })

      expect(chunks[0]!.wordCount).toBe(3)
    })
  })

  // ============================================================================
  // Chapter splitting
  // ============================================================================

  describe('chapter splitting in smart mode', () => {
    it('splits long chapters into parts', () => {
      // Create a very long chapter that exceeds maxChunkWords
      // Need multiple paragraphs for splitting to work
      const paragraphs = Array(50)
        .fill(null)
        .map((_, i) => `Paragraph ${i}: ` + 'word '.repeat(100))
        .join('\n\n')

      const pdf = createMockPDF({
        pages: [createMockPage(1, paragraphs)],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Long Chapter', startPage: 1, endPage: 1 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, {
        mode: 'smart-chunk',
        maxChunkWords: 1000,
        targetWordsPerChunk: 500,
      })

      // Should be split into multiple parts (5000+ words, target 500)
      expect(chunks.length).toBeGreaterThan(1)

      // Each part should have the base chapter name
      for (const chunk of chunks) {
        expect(chunk.title).toContain('Long Chapter')
      }
    })

    it('preserves short chapters as single chunks', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Short chapter content only.'),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Short Chapter', startPage: 1, endPage: 1 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, {
        mode: 'smart-chunk',
        maxChunkWords: 8000,
      })

      expect(chunks).toHaveLength(1)
      expect(chunks[0]!.title).toBe('Short Chapter')
    })

    it('handles front matter before first chapter', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Preface content'),
          createMockPage(2, 'Chapter 1 content'),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Chapter 1', startPage: 2, endPage: 2 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, { mode: 'smart-chunk' })

      const ids = chunks.map(c => c.id)
      expect(ids).toContain('front-matter')
    })

    it('handles back matter after last chapter', () => {
      const pdf = createMockPDF({
        pages: [
          createMockPage(1, 'Chapter 1 content'),
          createMockPage(2, 'Appendix content'),
        ],
        structure: {
          hasChapters: true,
          hasParts: false,
          hasSections: false,
          chapters: [
            { title: 'Chapter 1', startPage: 1, endPage: 1 },
          ],
        },
      })

      const chunks = chunkPDF(pdf, { mode: 'smart-chunk' })

      const ids = chunks.map(c => c.id)
      expect(ids).toContain('back-matter')
    })
  })

  // ============================================================================
  // ConversionMode type
  // ============================================================================

  describe('ConversionMode type', () => {
    it('accepts single-file mode', () => {
      const options: ChunkOptions = { mode: 'single-file' }
      expect(options.mode).toBe('single-file')
    })

    it('accepts per-page mode', () => {
      const options: ChunkOptions = { mode: 'per-page' }
      expect(options.mode).toBe('per-page')
    })

    it('accepts smart-chunk mode', () => {
      const options: ChunkOptions = { mode: 'smart-chunk' }
      expect(options.mode).toBe('smart-chunk')
    })
  })
})
