/**
 * Embeddings API - Server-Side Embedding Generation
 * @module api/embeddings
 * 
 * POST /api/embeddings
 * 
 * Generates semantic embeddings server-side using OpenAI or local model.
 * Provides reliable embeddings when client-side generation fails.
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

// OpenAI client (lazy-initialized)
let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
    if (!openaiClient && process.env.OPENAI_API_KEY) {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }
    return openaiClient
}

/**
 * Request body schema
 */
interface EmbeddingsRequest {
    /** Text content to embed (single text or batch) */
    texts: string[]
    /** Model to use */
    model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002'
}

interface EmbeddingsResponse {
    success: boolean
    embeddings: number[][]
    model: string
    dimensions: number
    usage?: {
        prompt_tokens: number
        total_tokens: number
    }
}

/**
 * Simple TF-IDF fallback for when OpenAI is unavailable
 */
function createFallbackEmbedding(text: string, vocabSize = 384): number[] {
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)

    const embedding = new Array(vocabSize).fill(0)
    const wordCounts = new Map<string, number>()

    for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }

    for (const [word, count] of wordCounts) {
        let hash = 0
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) - hash) + word.charCodeAt(i)
            hash = hash & hash
        }
        const idx = Math.abs(hash) % vocabSize
        embedding[idx] += Math.log(1 + count)
        embedding[(idx + 1) % vocabSize] += Math.log(1 + count) * 0.3
        embedding[(idx + vocabSize - 1) % vocabSize] += Math.log(1 + count) * 0.3
    }

    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    if (norm > 0) {
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] /= norm
        }
    }

    return embedding
}

/**
 * POST /api/embeddings
 * 
 * Generate embeddings for text content
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as EmbeddingsRequest

        // Validate
        if (!body.texts || !Array.isArray(body.texts) || body.texts.length === 0) {
            return NextResponse.json(
                { error: 'Missing required field: texts (array of strings)' },
                { status: 400 }
            )
        }

        // Cap at 100 texts per request
        if (body.texts.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 texts per request' },
                { status: 400 }
            )
        }

        const openai = getOpenAIClient()
        const model = body.model || 'text-embedding-3-small'

        if (openai) {
            // Use OpenAI API
            console.log(`[Embeddings] Generating ${body.texts.length} embeddings with ${model}`)

            const response = await openai.embeddings.create({
                model,
                input: body.texts,
                dimensions: model === 'text-embedding-3-small' ? 384 : undefined,
            })

            const embeddings = response.data.map(d => d.embedding)

            return NextResponse.json({
                success: true,
                embeddings,
                model,
                dimensions: embeddings[0]?.length || 384,
                usage: response.usage,
                backend: 'openai',
            } satisfies EmbeddingsResponse & { backend: string })

        } else {
            // Fallback to TF-IDF embeddings
            console.log(`[Embeddings] Using TF-IDF fallback for ${body.texts.length} texts`)

            const embeddings = body.texts.map(text => createFallbackEmbedding(text))

            return NextResponse.json({
                success: true,
                embeddings,
                model: 'tfidf-fallback',
                dimensions: 384,
                backend: 'tfidf',
            } satisfies EmbeddingsResponse & { backend: string })
        }

    } catch (error) {
        console.error('[Embeddings] API error:', error)

        const message = error instanceof Error ? error.message : 'Embedding generation failed'

        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

/**
 * GET /api/embeddings
 * 
 * Returns capabilities and status
 */
export async function GET() {
    const hasOpenAI = !!process.env.OPENAI_API_KEY

    return NextResponse.json({
        status: 'ok',
        capabilities: {
            openai: hasOpenAI,
            models: hasOpenAI
                ? ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002']
                : ['tfidf-fallback'],
            defaultModel: hasOpenAI ? 'text-embedding-3-small' : 'tfidf-fallback',
            maxTexts: 100,
            dimensions: 384,
        },
        endpoints: {
            POST: {
                requiredFields: ['texts'],
                optionalFields: ['model'],
                example: {
                    texts: ['Hello world', 'Semantic search is powerful'],
                },
            },
        },
    })
}
