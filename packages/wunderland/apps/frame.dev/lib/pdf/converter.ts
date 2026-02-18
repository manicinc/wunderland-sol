/**
 * PDF to Markdown Converter
 * @module lib/pdf/converter
 *
 * Converts PDF chunks to well-formatted markdown with frontmatter
 * suitable for the Codex system.
 */

import type { ParsedPDF } from './parser'
import type { PDFChunk } from './chunker'

export interface MarkdownOutput {
  /** Chunk ID */
  id: string
  /** Suggested filename */
  filename: string
  /** Full markdown content with frontmatter */
  content: string
  /** Word count */
  wordCount: number
  /** Illustration points (paragraph indices) */
  illustrationPoints: number[]
}

export interface ConvertOptions {
  /** Book/document title */
  title: string
  /** Author name */
  author?: string
  /** Subject/genre */
  subject?: string
  /** Tags for the content */
  tags?: string[]
  /** Source type used in frontmatter */
  sourceType?: 'pdf-import' | 'epub-import' | 'book-import'
  /** Base path for illustrations */
  illustrationBasePath?: string
  /** Include placeholder comments for illustrations */
  includePlaceholders?: boolean
}

/**
 * Generate a slug from a title
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

/**
 * Format text for markdown (basic cleanup)
 */
function formatForMarkdown(text: string): string {
  return text
    // Fix common PDF extraction issues
    .replace(/([a-z])- \n([a-z])/g, '$1$2') // Fix hyphenated words split across lines
    .replace(/\n([a-z])/g, ' $1') // Join lines that shouldn't be broken
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/^\s+|\s+$/gm, '') // Trim each line
    .trim()
}

/**
 * Add illustration placeholders at suggested points
 */
function addIllustrationPlaceholders(
  text: string,
  illustrationPoints: number[],
  basePath: string,
  chunkId: string
): string {
  const paragraphs = text.split(/\n\n+/)
  const result: string[] = []

  paragraphs.forEach((para, index) => {
    result.push(para)

    // Add placeholder after this paragraph if it's an illustration point
    if (illustrationPoints.includes(index)) {
      const illustrationId = `${chunkId}-${String(index + 1).padStart(3, '0')}`
      result.push(`\n<!-- ILLUSTRATION: ${illustrationId} -->`)
      result.push(`<!-- ![Illustration](${basePath}/${illustrationId}.png) -->`)
      result.push('')
    }
  })

  return result.join('\n\n')
}

/**
 * Generate frontmatter YAML
 */
function generateFrontmatter(
  chunk: PDFChunk,
  options: ConvertOptions,
  index: number
): string {
  const id = `${slugify(options.title)}-${chunk.id}`
  const now = new Date().toISOString()

  const frontmatter: Record<string, unknown> = {
    id,
    slug: chunk.id,
    title: chunk.title,
    version: '1.0.0',
    contentType: 'markdown',
    source: {
      type: options.sourceType || 'pdf-import',
      originalTitle: options.title,
      pageRange: `${chunk.pageRange.start}-${chunk.pageRange.end}`,
      wordCount: chunk.wordCount,
    },
    taxonomy: {
      subjects: options.subject ? [options.subject] : ['literature'],
      topics: ['imported', 'book'],
    },
    tags: options.tags || ['imported', 'pdf'],
    publishing: {
      created: now,
      updated: now,
      status: 'draft',
      license: 'CC-BY-4.0',
    },
    illustrations: {
      points: chunk.illustrationPoints.length,
      status: 'pending',
      basePath: options.illustrationBasePath || `illustrations/${slugify(options.title)}/${chunk.id}`,
    },
  }

  if (options.author) {
    frontmatter.author = options.author
  }

  // Convert to YAML
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const nested = Object.entries(value as Record<string, unknown>)
          .map(([k, v]) => {
            if (Array.isArray(v)) {
              return `  ${k}: [${v.map(i => `"${i}"`).join(', ')}]`
            }
            return `  ${k}: ${typeof v === 'string' ? `"${v}"` : v}`
          })
          .join('\n')
        return `${key}:\n${nested}`
      }
      if (Array.isArray(value)) {
        return `${key}: [${value.map(i => `"${i}"`).join(', ')}]`
      }
      return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`
    })
    .join('\n')

  return `---\n${yaml}\n---`
}

/**
 * Convert a single chunk to markdown
 */
function convertChunk(
  chunk: PDFChunk,
  options: ConvertOptions,
  index: number
): MarkdownOutput {
  const frontmatter = generateFrontmatter(chunk, options, index)
  let body = formatForMarkdown(chunk.content)

  // Add illustration placeholders if requested
  if (options.includePlaceholders) {
    const basePath = options.illustrationBasePath || `illustrations/${slugify(options.title)}/${chunk.id}`
    body = addIllustrationPlaceholders(body, chunk.illustrationPoints, basePath, chunk.id)
  }

  // Add title as H1
  const content = `${frontmatter}\n\n# ${chunk.title}\n\n${body}`

  return {
    id: chunk.id,
    filename: `${chunk.id}.md`,
    content,
    wordCount: chunk.wordCount,
    illustrationPoints: chunk.illustrationPoints,
  }
}

/**
 * Convert PDF chunks to markdown files
 */
export function convertToMarkdown(
  chunks: PDFChunk[],
  options: ConvertOptions
): MarkdownOutput[] {
  return chunks.map((chunk, index) => convertChunk(chunk, options, index))
}

/**
 * Generate a manifest file for the converted PDF
 */
export function generateManifest(
  pdf: ParsedPDF,
  chunks: PDFChunk[],
  markdownFiles: MarkdownOutput[],
  options: ConvertOptions
): string {
  const manifest = {
    version: '1.0.0',
    source: {
      filename: pdf.filename,
      title: options.title,
      author: options.author || pdf.metadata.author,
      totalPages: pdf.totalPages,
      totalWords: pdf.totalWords,
      tocPages: pdf.tocPages,
      covers: pdf.covers,
      importedAt: new Date().toISOString(),
    },
    structure: {
      hasChapters: pdf.structure.hasChapters,
      hasParts: pdf.structure.hasParts,
      chapterCount: pdf.structure.chapters.length,
    },
    content: {
      chunkCount: chunks.length,
      files: markdownFiles.map(f => ({
        id: f.id,
        filename: f.filename,
        wordCount: f.wordCount,
        illustrationPoints: f.illustrationPoints.length,
      })),
    },
    illustrations: {
      totalPoints: markdownFiles.reduce((sum, f) => sum + f.illustrationPoints.length, 0),
      status: 'pending',
      generated: 0,
      basePath: options.illustrationBasePath || `illustrations/${slugify(options.title)}`,
    },
    characterMemory: {
      characters: [],
      settings: [],
      globalStyle: null,
    },
  }

  return JSON.stringify(manifest, null, 2)
}
