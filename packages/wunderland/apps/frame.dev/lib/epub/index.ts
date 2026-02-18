/**
 * EPUB Processing Service
 * @module lib/epub
 *
 * Parses and chunks EPUB files, then converts to markdown outputs.
 */

import { parseEPUB, type ParsedEPUB } from './parser'
import { chunkEPUB, type EPUBChunk, type ConversionMode } from './chunker'

export { parseEPUB, type ParsedEPUB } from './parser'
export { chunkEPUB, type EPUBChunk, type ConversionMode } from './chunker'

export async function processEPUB(
  buffer: Buffer | ArrayBuffer,
  filename: string,
  options: {
    mode?: ConversionMode
    title?: string
    author?: string
    subject?: string
    tags?: string[]
    includePlaceholders?: boolean
    pageLimit?: number
    bypassCap?: boolean
  } = {}
): Promise<{
  parsed: ParsedEPUB
  chunks: EPUBChunk[]
  markdown: Array<{ id: string; filename: string; content: string; wordCount: number; illustrationPoints: number[] }>
  manifest: string
}> {
  const parsed = await parseEPUB(buffer, filename)

  const effectiveLimit = typeof options.pageLimit === 'number'
    ? (options.bypassCap ? options.pageLimit : Math.min(options.pageLimit, 3))
    : undefined
  const chunks = chunkEPUB(parsed, {
    mode: options.mode || 'smart-chunk',
    pageLimit: effectiveLimit,
  })

  const { convertToMarkdown } = await import('@/lib/pdf/converter')

  const convertOptions = {
    title: options.title || parsed.metadata.title || filename.replace(/\.epub$/i, ''),
    author: options.author || parsed.metadata.author,
    subject: options.subject,
    tags: options.tags,
    includePlaceholders: options.includePlaceholders ?? true,
    sourceType: 'epub-import' as const,
  }

  const markdown = convertToMarkdown(chunks as any, convertOptions as any)

  const manifest = JSON.stringify({
    version: '1.0.0',
    source: {
      filename: parsed.filename,
      title: convertOptions.title,
      author: convertOptions.author,
      totalSections: parsed.totalSections,
      totalWords: parsed.totalWords,
      importedAt: new Date().toISOString(),
    },
    content: {
      chunkCount: chunks.length,
      files: markdown.map(f => ({
        id: f.id,
        filename: f.filename,
        wordCount: f.wordCount,
        illustrationPoints: f.illustrationPoints.length,
      })),
    },
  }, null, 2)

  return {
    parsed,
    chunks,
    markdown,
    manifest,
  }
}
