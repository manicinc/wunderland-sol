/**
 * PDF Conversion API
 * @module api/pdf/convert
 *
 * POST /api/pdf/convert
 *
 * Converts uploaded PDF files to markdown with smart chunking.
 * Supports three conversion modes:
 * - single-file: Entire PDF as one markdown file
 * - per-page: One markdown file per PDF page
 * - smart-chunk: Intelligent chunking by chapters/sections (default)
 */

import { NextRequest, NextResponse } from 'next/server'

// Use Node.js runtime for pdf-parse (requires Buffer)
export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for large PDFs

interface ConvertRequest {
  /** Conversion mode */
  mode?: 'single-file' | 'per-page' | 'smart-chunk'
  /** Custom title (overrides PDF metadata) */
  title?: string
  /** Custom author (overrides PDF metadata) */
  author?: string
  /** Subject/genre */
  subject?: string
  /** Tags to apply */
  tags?: string[]
  /** Include illustration placeholders */
  includePlaceholders?: boolean
  /** Maximum pages to process (demo cap) */
  pageLimit?: number
  /** Whether to bypass the demo cap (requires PAT client-side) */
  bypassCap?: boolean
}

/**
 * POST /api/pdf/convert
 *
 * Accepts multipart/form-data with:
 * - file: PDF file
 * - options: JSON string of ConvertRequest
 *
 * @example
 * ```typescript
 * const formData = new FormData()
 * formData.append('file', pdfFile)
 * formData.append('options', JSON.stringify({
 *   mode: 'smart-chunk',
 *   title: '1984',
 *   author: 'George Orwell',
 * }))
 *
 * const response = await fetch('/api/pdf/convert', {
 *   method: 'POST',
 *   body: formData,
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const optionsStr = formData.get('options') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Parse options
    let options: ConvertRequest = {}
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr)
      } catch {
        return NextResponse.json(
          { error: 'Invalid options JSON' },
          { status: 400 }
        )
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Import and run the PDF processor
    const { processPDF } = await import('@/lib/pdf')

    const result = await processPDF(buffer, file.name, {
      mode: options.mode || 'smart-chunk',
      title: options.title,
      author: options.author,
      subject: options.subject,
      tags: options.tags,
      includePlaceholders: options.includePlaceholders ?? true,
      pageLimit: options.pageLimit,
      bypassCap: options.bypassCap,
    })

    const limitApplied = !options.bypassCap && typeof options.pageLimit === 'number'
    const pageSet = new Set<number>()
    result.chunks.forEach(chunk => {
      for (let p = chunk.pageRange.start; p <= chunk.pageRange.end; p++) {
        pageSet.add(p)
      }
    })
    const processedPages = pageSet.size

    // Return the processed result
    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: buffer.length,
      result: {
        metadata: {
          title: result.parsed.metadata.title,
          author: result.parsed.metadata.author,
          totalPages: result.parsed.totalPages,
          totalWords: result.parsed.totalWords,
          tocPages: result.parsed.tocPages,
          covers: result.parsed.covers,
          limitApplied,
          processedPages,
        },
        structure: result.parsed.structure,
        chunks: result.chunks.map(chunk => ({
          id: chunk.id,
          title: chunk.title,
          wordCount: chunk.wordCount,
          pageRange: chunk.pageRange,
          illustrationPoints: chunk.illustrationPoints.length,
        })),
        markdown: result.markdown.map(md => ({
          id: md.id,
          filename: md.filename,
          wordCount: md.wordCount,
          illustrationPoints: md.illustrationPoints.length,
          // Include content preview (first 500 chars)
          preview: md.content.slice(0, 500),
        })),
        manifest: JSON.parse(result.manifest),
        // Full markdown content (for download/storage)
        fullContent: result.markdown,
      },
    })
  } catch (error) {
    console.error('[API] PDF conversion error:', error)

    const message = error instanceof Error ? error.message : 'PDF conversion failed'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/pdf/convert
 *
 * Returns API info and supported options
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'PDF to Markdown conversion API',
    methods: {
      POST: {
        contentType: 'multipart/form-data',
        fields: {
          file: 'PDF file (required)',
          options: 'JSON string with conversion options (optional)',
        },
        options: {
          mode: {
            type: 'string',
            enum: ['single-file', 'per-page', 'smart-chunk'],
            default: 'smart-chunk',
            description: 'Chunking strategy',
          },
          title: {
            type: 'string',
            description: 'Override document title',
          },
          author: {
            type: 'string',
            description: 'Override document author',
          },
          subject: {
            type: 'string',
            description: 'Document subject/genre',
          },
          tags: {
            type: 'array',
            description: 'Tags to apply to generated markdown',
          },
          includePlaceholders: {
            type: 'boolean',
            default: true,
            description: 'Include illustration placeholder comments',
          },
        },
      },
    },
    limits: {
      maxFileSize: '50MB',
      supportedFormats: ['application/pdf'],
    },
  })
}
