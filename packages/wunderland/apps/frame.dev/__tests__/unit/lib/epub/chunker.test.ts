/**
 * Tests for lib/epub/chunker.ts
 *
 * Tests EPUB content chunking functionality.
 */

import { describe, it, expect } from 'vitest'
import { chunkEPUB } from '@/lib/epub/chunker'
import type { ChunkOptions, EPUBChunk, ConversionMode } from '@/lib/epub/chunker'
import type { ParsedEPUB, EPUBSection } from '@/lib/epub/parser'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockSection(overrides: Partial<EPUBSection> = {}): EPUBSection {
  return {
    id: 'section-1',
    title: 'Test Section',
    text: 'This is test content.',
    wordCount: 4,
    order: 0,
    ...overrides
  }
}

function createMockEPUB(overrides: Partial<ParsedEPUB> = {}): ParsedEPUB {
  return {
    filename: 'test-book.epub',
    metadata: {
      title: 'Test Book',
      author: 'Test Author'
    },
    sections: [
      createMockSection({ id: 'section-1', title: 'Chapter 1', text: 'Content one.', wordCount: 2, order: 0 }),
      createMockSection({ id: 'section-2', title: 'Chapter 2', text: 'Content two.', wordCount: 2, order: 1 }),
      createMockSection({ id: 'section-3', title: 'Chapter 3', text: 'Content three.', wordCount: 2, order: 2 })
    ],
    toc: [],
    ...overrides
  }
}

// ============================================================================
// CONVERSION MODE TYPE TESTS
// ============================================================================

describe('ConversionMode', () => {
  it('supports single-file mode', () => {
    const mode: ConversionMode = 'single-file'
    expect(mode).toBe('single-file')
  })

  it('supports per-page mode', () => {
    const mode: ConversionMode = 'per-page'
    expect(mode).toBe('per-page')
  })

  it('supports smart-chunk mode', () => {
    const mode: ConversionMode = 'smart-chunk'
    expect(mode).toBe('smart-chunk')
  })
})

// ============================================================================
// CHUNK OPTIONS TESTS
// ============================================================================

describe('ChunkOptions', () => {
  it('validates complete options', () => {
    const options: ChunkOptions = {
      mode: 'single-file',
      pageLimit: 10
    }

    expect(options.mode).toBe('single-file')
    expect(options.pageLimit).toBe(10)
  })

  it('validates minimal options', () => {
    const options: ChunkOptions = {
      mode: 'per-page'
    }

    expect(options.mode).toBe('per-page')
    expect(options.pageLimit).toBeUndefined()
  })
})

// ============================================================================
// EPUB CHUNK INTERFACE TESTS
// ============================================================================

describe('EPUBChunk', () => {
  it('validates chunk structure', () => {
    const chunk: EPUBChunk = {
      id: 'chunk-001',
      title: 'Chapter 1',
      content: 'Chapter content here.',
      wordCount: 3,
      pageRange: { start: 1, end: 5 },
      illustrationPoints: [10, 25, 50]
    }

    expect(chunk.id).toBe('chunk-001')
    expect(chunk.title).toBe('Chapter 1')
    expect(chunk.content).toBe('Chapter content here.')
    expect(chunk.wordCount).toBe(3)
    expect(chunk.pageRange.start).toBe(1)
    expect(chunk.pageRange.end).toBe(5)
    expect(chunk.illustrationPoints).toHaveLength(3)
  })
})

// ============================================================================
// chunkEPUB TESTS - SINGLE FILE MODE
// ============================================================================

describe('chunkEPUB', () => {
  describe('single-file mode', () => {
    it('combines all sections into one chunk', () => {
      const epub = createMockEPUB()
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].id).toBe('full')
    })

    it('uses epub title as chunk title', () => {
      const epub = createMockEPUB({
        metadata: { title: 'My Great Book' }
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].title).toBe('My Great Book')
    })

    it('falls back to filename when no title', () => {
      const epub = createMockEPUB({
        metadata: {},
        filename: 'awesome-book.epub'
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].title).toBe('awesome-book')
    })

    it('combines content from all sections', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ text: 'First section.' }),
          createMockSection({ text: 'Second section.' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].content).toContain('First section.')
      expect(chunks[0].content).toContain('Second section.')
    })

    it('sums word counts from all sections', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ wordCount: 100 }),
          createMockSection({ wordCount: 200 }),
          createMockSection({ wordCount: 300 })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].wordCount).toBe(600)
    })

    it('sets page range from 1 to section count', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection(),
          createMockSection(),
          createMockSection(),
          createMockSection()
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].pageRange).toEqual({ start: 1, end: 4 })
    })

    it('has empty illustration points', () => {
      const epub = createMockEPUB()
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].illustrationPoints).toEqual([])
    })

    it('respects page limit', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ text: 'Section 1', wordCount: 10 }),
          createMockSection({ text: 'Section 2', wordCount: 20 }),
          createMockSection({ text: 'Section 3', wordCount: 30 }),
          createMockSection({ text: 'Section 4', wordCount: 40 })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file', pageLimit: 2 })

      expect(chunks[0].wordCount).toBe(30) // Only first 2 sections
      expect(chunks[0].pageRange.end).toBe(2)
    })

    it('handles empty sections', () => {
      const epub = createMockEPUB({ sections: [] })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].wordCount).toBe(0)
      expect(chunks[0].content).toBe('')
      expect(chunks[0].pageRange).toEqual({ start: 1, end: 1 })
    })
  })

  // ============================================================================
  // chunkEPUB TESTS - PER PAGE MODE
  // ============================================================================

  describe('per-page mode', () => {
    it('creates one chunk per section', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: 'Chapter 1' }),
          createMockSection({ title: 'Chapter 2' }),
          createMockSection({ title: 'Chapter 3' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks).toHaveLength(3)
    })

    it('generates padded section IDs', () => {
      const epub = createMockEPUB({
        sections: Array(15).fill(null).map((_, i) =>
          createMockSection({ title: `Section ${i + 1}` })
        )
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].id).toBe('section-001')
      expect(chunks[9].id).toBe('section-010')
      expect(chunks[14].id).toBe('section-015')
    })

    it('uses section title as chunk title', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: 'Introduction' }),
          createMockSection({ title: 'Main Content' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].title).toBe('Introduction')
      expect(chunks[1].title).toBe('Main Content')
    })

    it('falls back to Section N when no title', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: '' }),
          createMockSection({ title: undefined as unknown as string })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].title).toBe('Section 1')
      expect(chunks[1].title).toBe('Section 2')
    })

    it('preserves section content', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ text: 'First chapter content.' }),
          createMockSection({ text: 'Second chapter content.' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].content).toBe('First chapter content.')
      expect(chunks[1].content).toBe('Second chapter content.')
    })

    it('preserves section word counts', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ wordCount: 150 }),
          createMockSection({ wordCount: 250 })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].wordCount).toBe(150)
      expect(chunks[1].wordCount).toBe(250)
    })

    it('sets page range based on section index', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection(),
          createMockSection(),
          createMockSection()
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].pageRange).toEqual({ start: 1, end: 1 })
      expect(chunks[1].pageRange).toEqual({ start: 2, end: 2 })
      expect(chunks[2].pageRange).toEqual({ start: 3, end: 3 })
    })

    it('has empty illustration points', () => {
      const epub = createMockEPUB()
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      chunks.forEach(chunk => {
        expect(chunk.illustrationPoints).toEqual([])
      })
    })

    it('respects page limit', () => {
      const epub = createMockEPUB({
        sections: Array(10).fill(null).map((_, i) =>
          createMockSection({ title: `Section ${i + 1}` })
        )
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page', pageLimit: 3 })

      expect(chunks).toHaveLength(3)
      expect(chunks[2].title).toBe('Section 3')
    })

    it('handles empty sections', () => {
      const epub = createMockEPUB({ sections: [] })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks).toHaveLength(0)
    })
  })

  // ============================================================================
  // chunkEPUB TESTS - SMART CHUNK MODE
  // ============================================================================

  describe('smart-chunk mode', () => {
    it('behaves like per-page mode', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: 'Chapter 1' }),
          createMockSection({ title: 'Chapter 2' })
        ]
      })

      const perPageChunks = chunkEPUB(epub, { mode: 'per-page' })
      const smartChunks = chunkEPUB(epub, { mode: 'smart-chunk' })

      expect(smartChunks).toEqual(perPageChunks)
    })
  })

  // ============================================================================
  // chunkEPUB TESTS - PAGE LIMIT
  // ============================================================================

  describe('page limit handling', () => {
    it('ignores zero page limit', () => {
      const epub = createMockEPUB({
        sections: Array(5).fill(null).map(() => createMockSection())
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page', pageLimit: 0 })

      expect(chunks).toHaveLength(5)
    })

    it('ignores negative page limit', () => {
      const epub = createMockEPUB({
        sections: Array(5).fill(null).map(() => createMockSection())
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page', pageLimit: -1 })

      expect(chunks).toHaveLength(5)
    })

    it('handles page limit larger than section count', () => {
      const epub = createMockEPUB({
        sections: Array(3).fill(null).map(() => createMockSection())
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page', pageLimit: 100 })

      expect(chunks).toHaveLength(3)
    })

    it('handles page limit of 1', () => {
      const epub = createMockEPUB({
        sections: Array(10).fill(null).map((_, i) =>
          createMockSection({ title: `Section ${i + 1}` })
        )
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page', pageLimit: 1 })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].title).toBe('Section 1')
    })
  })

  // ============================================================================
  // chunkEPUB TESTS - DEFAULT MODE
  // ============================================================================

  describe('default mode handling', () => {
    it('uses per-section chunking for unknown modes', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: 'Chapter 1' }),
          createMockSection({ title: 'Chapter 2' })
        ]
      })
      // Cast to bypass TypeScript check for testing
      const chunks = chunkEPUB(epub, { mode: 'unknown-mode' as ConversionMode })

      expect(chunks).toHaveLength(2)
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('handles single section', () => {
      const epub = createMockEPUB({
        sections: [createMockSection({ title: 'Only Chapter', wordCount: 500 })]
      })

      const singleChunks = chunkEPUB(epub, { mode: 'single-file' })
      const perPageChunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(singleChunks).toHaveLength(1)
      expect(perPageChunks).toHaveLength(1)
      expect(singleChunks[0].wordCount).toBe(500)
      expect(perPageChunks[0].wordCount).toBe(500)
    })

    it('handles very long section text', () => {
      const longText = 'word '.repeat(10000)
      const epub = createMockEPUB({
        sections: [createMockSection({ text: longText, wordCount: 10000 })]
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].wordCount).toBe(10000)
      expect(chunks[0].content.length).toBe(longText.length)
    })

    it('handles special characters in content', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ text: 'Content with émojis 🎉 and spëcial çhars!' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].content).toContain('émojis')
      expect(chunks[0].content).toContain('🎉')
    })

    it('handles newlines in content', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ text: 'Line 1\nLine 2\n\nLine 3' })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].content).toContain('\n')
    })

    it('preserves section order', () => {
      const epub = createMockEPUB({
        sections: [
          createMockSection({ title: 'First', order: 0 }),
          createMockSection({ title: 'Second', order: 1 }),
          createMockSection({ title: 'Third', order: 2 })
        ]
      })
      const chunks = chunkEPUB(epub, { mode: 'per-page' })

      expect(chunks[0].title).toBe('First')
      expect(chunks[1].title).toBe('Second')
      expect(chunks[2].title).toBe('Third')
    })

    it('handles epub with no metadata', () => {
      const epub = createMockEPUB({
        metadata: {},
        filename: 'unnamed.epub'
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].title).toBe('unnamed')
    })

    it('handles empty string title in metadata', () => {
      const epub = createMockEPUB({
        metadata: { title: '' },
        filename: 'fallback.epub'
      })
      const chunks = chunkEPUB(epub, { mode: 'single-file' })

      expect(chunks[0].title).toBe('fallback')
    })
  })
})
