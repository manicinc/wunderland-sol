/**
 * PDF Parser
 * @module lib/pdf/parser
 *
 * Extracts text and metadata from PDF files using pdf-parse.
 * Handles page-by-page extraction with position data.
 */

// Note: pdf-parse is a Node.js library, so this runs server-side only
// For client-side, we use the API route

export interface PDFPage {
  pageNumber: number
  text: string
  /** Estimated word count */
  wordCount: number
  /** Lines of text on this page */
  lines: string[]
  /** Detected headings on this page */
  headings: {
    text: string
    level: number // 1 = chapter, 2 = section, etc.
    lineIndex: number
  }[]
  /** Whether this page appears to be a Table of Contents page */
  isTOC?: boolean
  /** Whether this page is a cover */
  cover?: 'front' | 'back'
}

export interface ParsedPDF {
  /** Original filename */
  filename: string
  /** Total number of pages */
  totalPages: number
  /** Extracted pages */
  pages: PDFPage[]
  /** PDF metadata */
  metadata: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  /** Total word count across all pages */
  totalWords: number
  /** Pages flagged as TOC */
  tocPages: number[]
  /** Cover pages */
  covers: {
    front?: number
    back?: number
  }
  /** Detected book structure */
  structure: {
    hasChapters: boolean
    hasParts: boolean
    hasSections: boolean
    chapters: {
      title: string
      startPage: number
      endPage?: number
    }[]
  }
}

// Patterns for detecting structural elements
const CHAPTER_PATTERNS = [
  /^CHAPTER\s+(\d+|[IVXLCDM]+)/i,
  /^Chapter\s+(\d+|[IVXLCDM]+)/i,
  /^PART\s+(\d+|[IVXLCDM]+)/i,
  /^Part\s+(\d+|[IVXLCDM]+)/i,
  /^BOOK\s+(\d+|[IVXLCDM]+)/i,
  /^Book\s+(\d+|[IVXLCDM]+)/i,
  /^(\d+)\.\s+[A-Z]/,  // "1. Title" format
]

const SECTION_PATTERNS = [
  /^Section\s+(\d+)/i,
  /^§\s*(\d+)/,
  /^\d+\.\d+\s+[A-Z]/,  // "1.1 Title" format
]

/**
 * Detect if a line is a heading and return its level
 */
function detectHeading(line: string): { isHeading: boolean; level: number; text: string } {
  const trimmed = line.trim()

  // Check for chapter-level headings
  for (const pattern of CHAPTER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isHeading: true, level: 1, text: trimmed }
    }
  }

  // Check for section-level headings
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isHeading: true, level: 2, text: trimmed }
    }
  }

  // Check for all-caps lines (potential headings)
  if (trimmed.length > 3 && trimmed.length < 100 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return { isHeading: true, level: 2, text: trimmed }
  }

  return { isHeading: false, level: 0, text: trimmed }
}

/**
 * Heuristic TOC detection (explicit TOC pages only)
 */
function isTOCPage(lines: string[]): boolean {
  const joined = lines.join(' ').toLowerCase()
  const hasTOCKeyword = joined.includes('table of contents') || joined.startsWith('contents')
  if (!hasTOCKeyword) return false

  const numericLines = lines.filter(l => /\b\d+\b/.test(l))
  const dottedLeaders = lines.filter(l => /\.+\s*\d+$/.test(l))

  return numericLines.length >= 5 || dottedLeaders.length >= 3
}

/**
 * Parse a PDF buffer and extract text page by page
 */
export async function parsePDF(
  buffer: Buffer | ArrayBuffer,
  filename: string = 'document.pdf'
): Promise<ParsedPDF> {
  // Dynamic import for pdf-parse (Node.js only)
  const pdfParse = (await import('pdf-parse')).default

  const data = await pdfParse(Buffer.from(buffer as ArrayBuffer))

  // Split by form feed characters (page breaks) or double newlines
  const pageTexts = data.text.split(/\f|\n{4,}/)

  const pages: PDFPage[] = []
  const chapters: ParsedPDF['structure']['chapters'] = []
  let hasChapters = false
  let hasParts = false
  let hasSections = false
  const tocPages: number[] = []

  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i].trim()
    if (!pageText) continue

    const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const headings: PDFPage['headings'] = []
    const pageNumber = i + 1
    const toc = isTOCPage(lines)
    if (toc) {
      tocPages.push(pageNumber)
    } else {
      // Detect headings on this page
      lines.forEach((line: string, lineIndex: number) => {
        const detection = detectHeading(line)
        if (detection.isHeading) {
          headings.push({
            text: detection.text,
            level: detection.level,
            lineIndex,
          })

          // Track structure
          if (detection.level === 1) {
            if (/chapter/i.test(line)) hasChapters = true
            if (/part/i.test(line)) hasParts = true

            chapters.push({
              title: detection.text,
              startPage: pageNumber,
            })
          }
          if (detection.level === 2) hasSections = true
        }
      })

      // Update previous chapter's end page
      if (chapters.length > 1) {
        const prevChapter = chapters[chapters.length - 2]
        if (!prevChapter.endPage) {
          prevChapter.endPage = i
        }
      }
    }

    const wordCount = pageText.split(/\s+/).filter(Boolean).length

    pages.push({
      pageNumber,
      text: pageText,
      wordCount,
      lines,
      headings,
      isTOC: toc,
    })
  }

  // Mark covers
  if (pages.length > 0) {
    pages[0].cover = 'front'
    pages[pages.length - 1].cover = 'back'
  }

  // Set end page for last chapter
  if (chapters.length > 0) {
    const lastChapter = chapters[chapters.length - 1]
    if (!lastChapter.endPage) {
      lastChapter.endPage = pages.length
    }
  }

  return {
    filename,
    totalPages: pages.length,
    pages,
    metadata: {
      title: data.info?.Title || undefined,
      author: data.info?.Author || undefined,
      subject: data.info?.Subject || undefined,
      creator: data.info?.Creator || undefined,
      producer: data.info?.Producer || undefined,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
    },
    totalWords: pages.reduce((sum, p) => sum + p.wordCount, 0),
    tocPages,
    covers: {
      front: pages[0]?.pageNumber,
      back: pages[pages.length - 1]?.pageNumber,
    },
    structure: {
      hasChapters,
      hasParts,
      hasSections,
      chapters,
    },
  }
}
