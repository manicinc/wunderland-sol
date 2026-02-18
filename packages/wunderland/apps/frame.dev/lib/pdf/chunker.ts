/**
 * PDF Chunker
 * @module lib/pdf/chunker
 *
 * Smart chunking of PDF content for optimal illustration generation.
 * Supports three modes:
 * - single-file: Entire PDF as one markdown file
 * - per-page: One markdown file per PDF page
 * - smart-chunk: Intelligent chunking by chapters/sections (default)
 */

import type { ParsedPDF, PDFPage } from './parser'

export type ConversionMode = 'single-file' | 'per-page' | 'smart-chunk'

export interface ChunkOptions {
  /** Chunking mode */
  mode: ConversionMode
  /** Target words per chunk (for smart-chunk mode) */
  targetWordsPerChunk?: number
  /** Minimum words to create a new chunk */
  minChunkWords?: number
  /** Maximum words per chunk before forcing a split */
  maxChunkWords?: number
  /** Include page numbers in output */
  includePageNumbers?: boolean
  /** Add scene break markers */
  addSceneBreaks?: boolean
  /** Maximum pages to process (for demo caps) */
  pageLimit?: number
}

export interface PDFChunk {
  /** Chunk identifier (e.g., "chapter-01", "page-005", "full") */
  id: string
  /** Human-readable title */
  title: string
  /** Chunk content */
  content: string
  /** Word count */
  wordCount: number
  /** Source page range */
  pageRange: {
    start: number
    end: number
  }
  /** Detected scenes/sections within this chunk */
  scenes: {
    startIndex: number
    endIndex: number
    summary?: string
  }[]
  /** Suggested illustration points (paragraph indices) */
  illustrationPoints: number[]
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  mode: 'smart-chunk',
  targetWordsPerChunk: 3000,
  minChunkWords: 500,
  maxChunkWords: 8000,
  includePageNumbers: true,
  addSceneBreaks: true,
  pageLimit: Number.MAX_SAFE_INTEGER,
}

function getContentPages(pdf: ParsedPDF, pageLimit?: number): { pages: PDFPage[]; totalWords: number } {
  const filtered = pdf.pages.filter(p => !p.isTOC)
  const limited = typeof pageLimit === 'number' && pageLimit > 0
    ? filtered.slice(0, pageLimit)
    : filtered

  return {
    pages: limited,
    totalWords: limited.reduce((sum, p) => sum + p.wordCount, 0),
  }
}

/**
 * Detect potential scene breaks in text
 */
function detectSceneBreaks(lines: string[]): number[] {
  const breakIndices: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Scene break patterns
    const isBreak =
      line === '* * *' ||
      line === '***' ||
      line === '---' ||
      line === '* * * *' ||
      line === '□' ||
      /^[•◦◆◇■□▪▫]+$/.test(line) ||
      (line === '' && i > 0 && i < lines.length - 1 &&
        lines[i - 1].trim() !== '' && lines[i + 1]?.trim() !== '' &&
        lines[i - 2]?.trim() === '' && lines[i + 2]?.trim() === '')

    if (isBreak) {
      breakIndices.push(i)
    }
  }

  return breakIndices
}

/**
 * Identify good points for illustrations (dramatic moments, descriptions)
 */
function findIllustrationPoints(text: string): number[] {
  const paragraphs = text.split(/\n\n+/)
  const points: number[] = []

  const illustratablePatterns = [
    /looked?\s+(at|upon|toward|into)/i,
    /saw\s+/i,
    /watched\s+/i,
    /stared\s+/i,
    /gazed\s+/i,
    /appeared\s+/i,
    /stood\s+(there|before|in)/i,
    /walked\s+(into|through|toward)/i,
    /entered\s+/i,
    /face\s+/i,
    /eyes\s+/i,
    /room\s+was/i,
    /building\s+/i,
    /street\s+/i,
    /window\s+/i,
    /door\s+/i,
    /suddenly/i,
    /moment/i,
  ]

  paragraphs.forEach((para, index) => {
    // Skip very short paragraphs
    if (para.length < 50) return

    // Check for illustratable content
    const hasVisualContent = illustratablePatterns.some(p => p.test(para))

    // Check for dialogue scenes (multiple quotes)
    const quoteCount = (para.match(/["'"]/g) || []).length
    const hasDialogue = quoteCount >= 4

    // Prioritize visual descriptions over dialogue
    if (hasVisualContent && !hasDialogue) {
      points.push(index)
    }
  })

  // Limit to reasonable number (every ~5 paragraphs max)
  const maxPoints = Math.ceil(paragraphs.length / 5)
  return points.slice(0, maxPoints)
}

/**
 * Single file mode: entire PDF as one chunk
 */
function chunkAsSingleFile(pdf: ParsedPDF, options: Required<ChunkOptions>): PDFChunk[] {
  const { pages, totalWords } = getContentPages(pdf, options.pageLimit)
  const allText = pages.map(p => p.text).join('\n\n')
  const lines = allText.split('\n')

  return [{
    id: 'full',
    title: pdf.metadata.title || pdf.filename.replace('.pdf', ''),
    content: allText,
    wordCount: totalWords,
    pageRange: { start: pages[0]?.pageNumber || 1, end: pages[pages.length - 1]?.pageNumber || pdf.totalPages },
    scenes: detectSceneBreaks(lines).map((idx, i, arr) => ({
      startIndex: i === 0 ? 0 : arr[i - 1],
      endIndex: idx,
    })),
    illustrationPoints: findIllustrationPoints(allText),
  }]
}

/**
 * Per-page mode: one chunk per PDF page
 */
function chunkPerPage(pdf: ParsedPDF, options: Required<ChunkOptions>): PDFChunk[] {
  const { pages } = getContentPages(pdf, options.pageLimit)
  return pages.map((page) => ({
    id: page.cover ? `${page.cover}-cover` : `page-${String(page.pageNumber).padStart(3, '0')}`,
    title: page.cover ? `${page.cover === 'front' ? 'Front' : 'Back'} Cover` : `Page ${page.pageNumber}`,
    content: options.includePageNumbers
      ? `<!-- Page ${page.pageNumber} -->\n\n${page.text}`
      : page.text,
    wordCount: page.wordCount,
    pageRange: { start: page.pageNumber, end: page.pageNumber },
    scenes: detectSceneBreaks(page.lines).map((idx, i, arr) => ({
      startIndex: i === 0 ? 0 : arr[i - 1],
      endIndex: idx,
    })),
    illustrationPoints: findIllustrationPoints(page.text),
  }))
}

/**
 * Smart chunk mode: intelligent splitting by chapters/sections
 */
function chunkSmart(pdf: ParsedPDF, options: Required<ChunkOptions>): PDFChunk[] {
  const chunks: PDFChunk[] = []
  const { pages } = getContentPages(pdf, options.pageLimit)
  const maxPageNumber = pages[pages.length - 1]?.pageNumber ?? pdf.totalPages

  const pushPagesChunk = (id: string, title: string, chunkPages: PDFPage[]) => {
    if (chunkPages.length === 0) return
    const chunkText = chunkPages.map(p => p.text).join('\n\n')
    const lines = chunkText.split('\n')
    const wordCount = chunkPages.reduce((sum, p) => sum + p.wordCount, 0)

    chunks.push({
      id,
      title,
      content: chunkText,
      wordCount,
      pageRange: { start: chunkPages[0]!.pageNumber, end: chunkPages[chunkPages.length - 1]!.pageNumber },
      scenes: detectSceneBreaks(lines).map((idx, i, arr) => ({
        startIndex: i === 0 ? 0 : arr[i - 1],
        endIndex: idx,
      })),
      illustrationPoints: findIllustrationPoints(chunkText),
    })
  }

  // If we have detected chapters, use them as primary boundaries
  if (pdf.structure.hasChapters && pdf.structure.chapters.length > 0) {
    const boundedChapters = pdf.structure.chapters.filter(ch => ch.startPage <= maxPageNumber)
    if (boundedChapters.length === 0) {
      return chunkAsSingleFile(pdf, options)
    }

    // Covers (kept separate from chapters)
    const frontCoverPage = pages.find(p => p.cover === 'front')
    const backCoverPage = pages.find(p => p.cover === 'back')
    if (frontCoverPage) {
      pushPagesChunk('front-cover', 'Front Cover', [frontCoverPage])
    }

    const firstChapterStart = boundedChapters[0]!.startPage
    const lastChapterEnd = Math.min(boundedChapters[boundedChapters.length - 1]!.endPage || pdf.totalPages, maxPageNumber)

    // Any non-chapter pages before first chapter (excluding cover + TOC)
    pushPagesChunk(
      'front-matter',
      'Front Matter',
      pages.filter(p => !p.cover && p.pageNumber < firstChapterStart)
    )

    for (const chapter of boundedChapters) {
      const endPage = Math.min(chapter.endPage || pdf.totalPages, maxPageNumber)
      const chapterPages = pages.filter(
        p => !p.cover && p.pageNumber >= chapter.startPage && p.pageNumber <= endPage
      )

      const chapterText = chapterPages.map(p => p.text).join('\n\n')
      const chapterWords = chapterPages.reduce((sum, p) => sum + p.wordCount, 0)

      // If chapter is too long, split it further
      if (chapterWords > options.maxChunkWords) {
        const subChunks = splitLongChunk(
          chapterText,
          chapter.title,
          chapter.startPage,
          endPage,
          options
        )
        chunks.push(...subChunks)
      } else {
        const lines = chapterText.split('\n')
        const chapterNum = String(chunks.length + 1).padStart(2, '0')

        chunks.push({
          id: `chapter-${chapterNum}`,
          title: chapter.title,
          content: chapterText,
          wordCount: chapterWords,
          pageRange: { start: chapter.startPage, end: endPage },
          scenes: detectSceneBreaks(lines).map((idx, i, arr) => ({
            startIndex: i === 0 ? 0 : arr[i - 1],
            endIndex: idx,
          })),
          illustrationPoints: findIllustrationPoints(chapterText),
        })
      }
    }

    // Any non-chapter pages after last chapter (excluding cover + TOC)
    pushPagesChunk(
      'back-matter',
      'Back Matter',
      pages.filter(p => !p.cover && p.pageNumber > lastChapterEnd)
    )

    if (backCoverPage) {
      pushPagesChunk('back-cover', 'Back Cover', [backCoverPage])
    }
  } else {
    // No chapters detected - default to single markdown file (unless per-page mode is selected)
    return chunkAsSingleFile(pdf, options)
  }

  return chunks
}

/**
 * Split a long chunk into smaller pieces
 */
function splitLongChunk(
  text: string,
  baseTitle: string,
  startPage: number,
  endPage: number,
  options: Required<ChunkOptions>
): PDFChunk[] {
  const chunks: PDFChunk[] = []
  const paragraphs = text.split(/\n\n+/)
  let currentParagraphs: string[] = []
  let currentWordCount = 0
  let subIndex = 1

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).filter(Boolean).length
    currentParagraphs.push(para)
    currentWordCount += paraWords

    if (currentWordCount >= options.targetWordsPerChunk) {
      const chunkText = currentParagraphs.join('\n\n')
      const lines = chunkText.split('\n')

      chunks.push({
        id: `${baseTitle.toLowerCase().replace(/\s+/g, '-')}-part-${subIndex}`,
        title: `${baseTitle} (Part ${subIndex})`,
        content: chunkText,
        wordCount: currentWordCount,
        pageRange: { start: startPage, end: endPage }, // Approximate
        scenes: detectSceneBreaks(lines).map((idx, i, arr) => ({
          startIndex: i === 0 ? 0 : arr[i - 1],
          endIndex: idx,
        })),
        illustrationPoints: findIllustrationPoints(chunkText),
      })

      currentParagraphs = []
      currentWordCount = 0
      subIndex++
    }
  }

  // Last sub-chunk
  if (currentParagraphs.length > 0) {
    const chunkText = currentParagraphs.join('\n\n')
    const lines = chunkText.split('\n')

    chunks.push({
      id: `${baseTitle.toLowerCase().replace(/\s+/g, '-')}-part-${subIndex}`,
      title: `${baseTitle} (Part ${subIndex})`,
      content: chunkText,
      wordCount: currentWordCount,
      pageRange: { start: startPage, end: endPage },
      scenes: detectSceneBreaks(lines).map((idx, i, arr) => ({
        startIndex: i === 0 ? 0 : arr[i - 1],
        endIndex: idx,
      })),
      illustrationPoints: findIllustrationPoints(chunkText),
    })
  }

  return chunks
}

/**
 * Chunk a parsed PDF according to the specified options
 */
export function chunkPDF(pdf: ParsedPDF, options: Partial<ChunkOptions> = {}): PDFChunk[] {
  const opts: Required<ChunkOptions> = { ...DEFAULT_OPTIONS, ...options }

  switch (opts.mode) {
    case 'single-file':
      return chunkAsSingleFile(pdf, opts)
    case 'per-page':
      return chunkPerPage(pdf, opts)
    case 'smart-chunk':
    default:
      return chunkSmart(pdf, opts)
  }
}
