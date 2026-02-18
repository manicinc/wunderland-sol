/**
 * Book Conversion API (PDF + EPUB)
 * @module api/book/convert
 *
 * POST /api/book/convert
 *
 * Converts uploaded PDF/EPUB files to markdown with smart chunking.
 * Mirrors the response shape of /api/pdf/convert for UI compatibility.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ConvertRequest {
  mode?: 'single-file' | 'per-page' | 'smart-chunk'
  title?: string
  author?: string
  subject?: string
  tags?: string[]
  includePlaceholders?: boolean
  pageLimit?: number
  bypassCap?: boolean
  // Analysis options
  analyzeContent?: boolean
  useLLM?: boolean
  includeCharacters?: boolean
  includeSettings?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const optionsStr = formData.get('options') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse options
    let options: ConvertRequest = {}
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr)
      } catch {
        return NextResponse.json({ error: 'Invalid options JSON' }, { status: 400 })
      }
    }

    const name = file.name || 'document'
    const lower = name.toLowerCase()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let parsed: any
    let chunks: any[]
    let markdown: any[]
    let manifest: string

    if (lower.endsWith('.pdf')) {
      const { processPDF } = await import('@/lib/pdf')
      const result = await processPDF(buffer, name, {
        mode: options.mode || 'smart-chunk',
        title: options.title,
        author: options.author,
        subject: options.subject,
        tags: options.tags,
        includePlaceholders: options.includePlaceholders ?? true,
        pageLimit: options.pageLimit,
        bypassCap: options.bypassCap,
      })
      parsed = result.parsed
      chunks = result.chunks
      markdown = result.markdown
      manifest = result.manifest
    } else if (lower.endsWith('.epub')) {
      const { processEPUB } = await import('@/lib/epub')
      const result = await processEPUB(buffer, name, {
        mode: options.mode || 'smart-chunk',
        title: options.title,
        author: options.author,
        subject: options.subject,
        tags: options.tags,
        includePlaceholders: options.includePlaceholders ?? true,
        pageLimit: options.pageLimit,
        bypassCap: options.bypassCap,
      })
      parsed = result.parsed
      chunks = result.chunks
      markdown = result.markdown
      manifest = result.manifest
    } else {
      return NextResponse.json({ error: 'File must be a PDF or EPUB' }, { status: 400 })
    }

    const limitApplied = !options.bypassCap && typeof options.pageLimit === 'number'
    const pageSet = new Set<number>()
    chunks.forEach(chunk => {
      for (let p = chunk.pageRange.start; p <= chunk.pageRange.end; p++) {
        pageSet.add(p)
      }
    })

    const isPDF = lower.endsWith('.pdf')
    const totalPages = isPDF ? parsed.totalPages : parsed.totalSections
    const totalWords = isPDF ? parsed.totalWords : parsed.totalWords
    const title = isPDF ? parsed.metadata.title : parsed.metadata.title
    const author = isPDF ? parsed.metadata.author : parsed.metadata.author

    // Optional: Analyze content for illustration style
    let analysisResult: any = null
    if (options.analyzeContent) {
      try {
        const { analyzeDocumentForIllustration } = await import('@/lib/analysis/documentAnalyzer')
        const workId = `work-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const workTitle = title || name.replace(/\.(pdf|epub)$/i, '')
        const workType = isPDF ? 'pdf' : 'epub'

        analysisResult = await analyzeDocumentForIllustration(
          workId,
          workTitle,
          workType,
          chunks,
          {
            useLLM: options.useLLM ?? true,
            includeCharacters: options.includeCharacters ?? true,
            includeSettings: options.includeSettings ?? true,
          }
        )
      } catch (error) {
        console.error('[Book Convert] Analysis failed:', error)
        // Don't fail the entire conversion if analysis fails
        analysisResult = { error: 'Analysis failed', message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      filename: name,
      fileSize: buffer.length,
      result: {
        metadata: {
          title,
          author,
          totalPages,
          totalWords,
          tocPages: isPDF ? parsed.tocPages : [],
          covers: isPDF ? parsed.covers : { front: 1, back: totalPages },
          limitApplied,
          processedPages: pageSet.size,
          fileType: isPDF ? 'pdf' : 'epub',
        },
        structure: isPDF ? parsed.structure : { hasChapters: chunks.length > 1, hasParts: false, hasSections: chunks.length > 1, chapters: [] },
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          title: chunk.title,
          wordCount: chunk.wordCount,
          pageRange: chunk.pageRange,
          illustrationPoints: Array.isArray(chunk.illustrationPoints) ? chunk.illustrationPoints.length : 0,
        })),
        manifest: JSON.parse(manifest),
        fullContent: markdown,
      },
      // Include analysis if requested
      ...(analysisResult && {
        analysis: {
          profile: analysisResult.profile,
          suggestions: analysisResult.suggestions,
          confidence: analysisResult.confidence,
          method: analysisResult.method,
        },
      }),
    })
  } catch (error) {
    console.error('[API] Book conversion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Book conversion failed' },
      { status: 500 }
    )
  }
}

