/**
 * Document Analysis API Route
 * POST /api/analysis/analyze
 *
 * Analyzes PDF/EPUB content to create work style profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeDocumentForIllustration } from '@/lib/analysis/documentAnalyzer'
import type { PDFChunk } from '@/lib/pdf/chunker'
import type { EPUBChunk } from '@/lib/epub/chunker'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for analysis

interface AnalyzeRequest {
  workId: string
  workTitle: string
  workType: 'pdf' | 'epub'
  chunks: Array<PDFChunk | EPUBChunk>
  options?: {
    useLLM?: boolean
    includeCharacters?: boolean
    includeSettings?: boolean
    maxSamples?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json()

    // Validate request
    if (!body.workId || !body.workTitle || !body.workType || !body.chunks) {
      return NextResponse.json(
        { error: 'Missing required fields: workId, workTitle, workType, chunks' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.chunks) || body.chunks.length === 0) {
      return NextResponse.json(
        { error: 'chunks must be a non-empty array' },
        { status: 400 }
      )
    }

    if (body.workType !== 'pdf' && body.workType !== 'epub') {
      return NextResponse.json(
        { error: 'workType must be "pdf" or "epub"' },
        { status: 400 }
      )
    }

    // Perform analysis
    const result = await analyzeDocumentForIllustration(
      body.workId,
      body.workTitle,
      body.workType,
      body.chunks,
      body.options || {}
    )

    return NextResponse.json({
      success: true,
      profile: result.profile,
      suggestions: result.suggestions,
      confidence: result.confidence,
      method: result.method,
      analysisTime: Date.now(),
    })
  } catch (error) {
    console.error('[Analysis API] Error:', error)

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for checking analysis service status
 */
export async function GET(request: NextRequest) {
  const { isLLMAvailable } = await import('@/lib/llm')

  return NextResponse.json({
    status: 'operational',
    llmAvailable: isLLMAvailable(),
    capabilities: {
      genreDetection: true,
      characterExtraction: true,
      settingExtraction: true,
      styleRecommendation: true,
      nlpFallback: true,
    },
    version: '1.0.0',
  })
}
