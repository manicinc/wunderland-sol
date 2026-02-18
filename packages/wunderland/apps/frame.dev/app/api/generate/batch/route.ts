/**
 * Batch Content Generation API
 * @module api/generate/batch
 * 
 * POST /api/generate/batch
 * 
 * Generates flashcards/quizzes for multiple strands in a weave or loom.
 * Supports streaming progress updates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateFlashcards, generateQuiz } from '@/lib/generation'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for batch processing

interface BatchRequest {
  /** Type of content to generate */
  type: 'flashcards' | 'quiz'
  /** List of strands to process */
  strands: Array<{
    path: string
    title?: string
    content: string
  }>
  /** Use LLM enhancement */
  useLLM?: boolean
  /** Items per strand */
  itemsPerStrand?: number
}

interface BatchResult {
  strandPath: string
  success: boolean
  itemCount: number
  error?: string
}

/**
 * POST /api/generate/batch
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BatchRequest
    
    if (!body.type || !body.strands || !Array.isArray(body.strands)) {
      return NextResponse.json(
        { error: 'Missing required fields: type, strands' },
        { status: 400 }
      )
    }

    if (body.strands.length === 0) {
      return NextResponse.json(
        { error: 'No strands provided' },
        { status: 400 }
      )
    }

    if (body.strands.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 strands per batch' },
        { status: 400 }
      )
    }

    const results: BatchResult[] = []
    const itemsPerStrand = Math.min(body.itemsPerStrand || 5, 10)
    
    // Process strands sequentially to avoid rate limiting
    for (const strand of body.strands) {
      if (!strand.content || strand.content.length < 50) {
        results.push({
          strandPath: strand.path,
          success: false,
          itemCount: 0,
          error: 'Content too short',
        })
        continue
      }

      try {
        const options = {
          content: strand.content,
          strandSlug: strand.path,
          title: strand.title,
          useLLM: body.useLLM ?? false,
          maxItems: itemsPerStrand,
        }

        if (body.type === 'flashcards') {
          const result = await generateFlashcards(options)
          results.push({
            strandPath: strand.path,
            success: true,
            itemCount: result.items.length,
          })
        } else {
          const result = await generateQuiz(options)
          results.push({
            strandPath: strand.path,
            success: true,
            itemCount: result.items.length,
          })
        }
      } catch (err) {
        results.push({
          strandPath: strand.path,
          success: false,
          itemCount: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const totalItems = results.reduce((sum, r) => sum + r.itemCount, 0)

    return NextResponse.json({
      success: true,
      summary: {
        totalStrands: body.strands.length,
        successfulStrands: successful,
        failedStrands: body.strands.length - successful,
        totalItemsGenerated: totalItems,
      },
      results,
    })

  } catch (error) {
    console.error('[API] Batch generation error:', error)
    return NextResponse.json(
      { error: 'Batch generation failed' },
      { status: 500 }
    )
  }
}




















