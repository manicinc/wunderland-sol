/**
 * PDF Processing Service
 * @module lib/pdf
 *
 * Handles PDF parsing, text extraction, and smart chunking
 * for conversion to markdown suitable for illustration generation.
 */

export { parsePDF, type ParsedPDF, type PDFPage } from './parser'
export {
  chunkPDF,
  type ChunkOptions,
  type PDFChunk,
  type ConversionMode
} from './chunker'
export {
  convertToMarkdown,
  generateManifest,
  type MarkdownOutput,
  type ConvertOptions
} from './converter'

/**
 * Full PDF processing pipeline
 */
export async function processPDF(
  buffer: Buffer | ArrayBuffer,
  filename: string,
  options: {
    mode?: import('./chunker').ConversionMode
    title?: string
    author?: string
    subject?: string
    tags?: string[]
    includePlaceholders?: boolean
    pageLimit?: number
    bypassCap?: boolean
  } = {}
) {
  const { parsePDF } = await import('./parser')
  const { chunkPDF } = await import('./chunker')
  const { convertToMarkdown, generateManifest } = await import('./converter')

  // 1. Parse PDF
  const parsed = await parsePDF(buffer, filename)

  // 2. Chunk content
  const chunkOptions: Partial<import('./chunker').ChunkOptions> = {
    mode: options.mode || 'smart-chunk',
  }
  if (typeof options.pageLimit === 'number') {
    chunkOptions.pageLimit = options.bypassCap ? options.pageLimit : Math.min(options.pageLimit, 3)
  }
  const chunks = chunkPDF(parsed, chunkOptions)

  // 3. Convert to markdown
  const convertOptions = {
    title: options.title || parsed.metadata.title || filename.replace('.pdf', ''),
    author: options.author || parsed.metadata.author,
    subject: options.subject || parsed.metadata.subject,
    tags: options.tags,
    includePlaceholders: options.includePlaceholders ?? true,
  }

  const markdown = convertToMarkdown(chunks, convertOptions)

  // 4. Generate manifest
  const manifest = generateManifest(parsed, chunks, markdown, convertOptions)

  return {
    parsed,
    chunks,
    markdown,
    manifest,
  }
}
