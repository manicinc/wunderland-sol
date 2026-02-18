/**
 * EPUB Chunker
 * @module lib/epub/chunker
 *
 * Splits EPUB content into chunks compatible with the PDF markdown converter.
 */

import type { ParsedEPUB, EPUBSection } from './parser'

export type ConversionMode = 'single-file' | 'per-page' | 'smart-chunk'

export interface ChunkOptions {
  mode: ConversionMode
  pageLimit?: number
}

export interface EPUBChunk {
  id: string
  title: string
  content: string
  wordCount: number
  pageRange: { start: number; end: number }
  illustrationPoints: number[]
}

function getLimitedSections(epub: ParsedEPUB, pageLimit?: number): EPUBSection[] {
  if (!pageLimit || pageLimit <= 0) return epub.sections
  return epub.sections.slice(0, pageLimit)
}

function chunkSingleFile(epub: ParsedEPUB, options: ChunkOptions): EPUBChunk[] {
  const sections = getLimitedSections(epub, options.pageLimit)
  const text = sections.map(s => s.text).join('\n\n')
  const wordCount = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const title = epub.metadata.title || epub.filename.replace(/\.epub$/i, '')
  const end = sections.length

  return [{
    id: 'full',
    title,
    content: text,
    wordCount,
    pageRange: { start: 1, end: end || 1 },
    illustrationPoints: [],
  }]
}

function chunkPerSection(epub: ParsedEPUB, options: ChunkOptions): EPUBChunk[] {
  const sections = getLimitedSections(epub, options.pageLimit)
  return sections.map((s, i) => ({
    id: `section-${String(i + 1).padStart(3, '0')}`,
    title: s.title || `Section ${i + 1}`,
    content: s.text,
    wordCount: s.wordCount,
    pageRange: { start: i + 1, end: i + 1 },
    illustrationPoints: [],
  }))
}

export function chunkEPUB(epub: ParsedEPUB, options: ChunkOptions): EPUBChunk[] {
  switch (options.mode) {
    case 'single-file':
      return chunkSingleFile(epub, options)
    case 'per-page':
    case 'smart-chunk':
    default:
      return chunkPerSection(epub, options)
  }
}

