/**
 * Content Generation API - Flashcards, Quizzes, and Suggestions
 * @module api/generate
 * 
 * POST /api/generate
 * 
 * Generates educational content using hybrid NLP + LLM approach.
 * Static NLP runs first for fast results, LLM enhances quality when available.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  generateFlashcards,
  generateQuiz,
  generateSuggestions,
  getGenerationCapabilities,
  type GenerationOptions,
} from '@/lib/generation'

export const runtime = 'nodejs'

/**
 * Request body schema
 */
interface GenerateRequest {
  /** Type of content to generate */
  type: 'flashcards' | 'quiz' | 'suggestions'
  /** Content to generate from */
  content: string
  /** Strand slug for context */
  strandSlug?: string
  /** Strand title */
  title?: string
  /** Use LLM enhancement */
  useLLM?: boolean
  /** Maximum items to generate */
  maxItems?: number
  /** Target difficulty level */
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  /** Focus topics */
  focusTopics?: string[]
}

/**
 * POST /api/generate
 * 
 * @example
 * ```typescript
 * const response = await fetch('/api/generate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     type: 'flashcards',
 *     content: '...',
 *     strandSlug: 'react-hooks',
 *     useLLM: true,
 *     maxItems: 10,
 *   }),
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateRequest
    
    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing required field: type' },
        { status: 400 }
      )
    }
    
    if (!body.content || body.content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content must be at least 50 characters' },
        { status: 400 }
      )
    }

    const options: GenerationOptions = {
      content: body.content,
      strandSlug: body.strandSlug,
      title: body.title,
      useLLM: body.useLLM ?? false,
      maxItems: Math.min(body.maxItems || 10, 20), // Cap at 20
      difficulty: body.difficulty,
      focusTopics: body.focusTopics,
    }

    let result
    switch (body.type) {
      case 'flashcards':
        result = await generateFlashcards(options)
        break
      case 'quiz':
        result = await generateQuiz(options)
        break
      case 'suggestions':
        result = await generateSuggestions(options)
        break
      default:
        return NextResponse.json(
          { error: `Invalid type: ${body.type}. Must be 'flashcards', 'quiz', or 'suggestions'` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type: body.type,
      ...result,
    })

  } catch (error) {
    console.error('[API] Generation error:', error)
    
    // Don't expose internal errors
    const message = error instanceof Error ? error.message : 'Generation failed'
    const isUserError = message.includes('required') || message.includes('invalid')
    
    return NextResponse.json(
      { error: isUserError ? message : 'Internal server error during generation' },
      { status: isUserError ? 400 : 500 }
    )
  }
}

/**
 * GET /api/generate
 * 
 * Returns generation capabilities and service status
 */
export async function GET() {
  const capabilities = getGenerationCapabilities()
  
  return NextResponse.json({
    status: 'ok',
    capabilities,
    endpoints: {
      POST: {
        types: ['flashcards', 'quiz', 'suggestions'],
        requiredFields: ['type', 'content'],
        optionalFields: ['strandSlug', 'title', 'useLLM', 'maxItems', 'difficulty', 'focusTopics'],
      },
    },
  })
}




















