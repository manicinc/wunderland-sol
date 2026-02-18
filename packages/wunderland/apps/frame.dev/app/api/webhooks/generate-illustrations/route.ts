/**
 * Webhook: Generate Illustrations
 * @module api/webhooks/generate-illustrations
 *
 * POST /api/webhooks/generate-illustrations
 *
 * External webhook endpoint for triggering illustration generation.
 * IMPORTANT: Only generates for explicitly selected/marked files.
 *
 * Authentication: Requires webhook secret in header or body.
 * Set WEBHOOK_SECRET env var or pass `secret` in payload.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for job initialization

interface WebhookPayload {
  /** Webhook secret for authentication */
  secret?: string
  /** Project title for the generation job */
  projectTitle: string
  /**
   * Explicitly selected chunk IDs to generate illustrations for.
   * ONLY these chunks will have images generated - not all chunks.
   * If empty or not provided, uses chunks with `generateIllustration: true` flag.
   */
  selectedChunkIds?: string[]
  /**
   * Chunks to process. Only chunks in selectedChunkIds (or with generateIllustration: true)
   * will actually have images generated.
   */
  chunks: Array<{
    id: string
    title: string
    content: string
    pageRange?: { start: number; end: number }
    /** If true, this chunk is marked for illustration generation */
    generateIllustration?: boolean
    /** Optional illustration points within this chunk */
    illustrationPoints?: number[]
  }>
  /** Image provider (default: openai) */
  provider?: 'openai' | 'replicate'
  /** Batch size (default: 3) */
  batchSize?: number
  /** Style preset ID */
  styleId?: string
  /** Style memory JSON for character consistency */
  styleMemory?: string
  /** Callback URL to POST job updates to (optional) */
  callbackUrl?: string
  /** GitHub commit SHA that triggered this (for tracking) */
  commitSha?: string
  /** GitHub repository (owner/repo format) */
  repository?: string
}

/**
 * Verify webhook secret
 */
function verifyWebhookSecret(providedSecret: string | undefined): boolean {
  const expectedSecret = process.env.WEBHOOK_SECRET
  if (!expectedSecret) {
    // If no secret is configured, reject all requests
    console.warn('[Webhook] No WEBHOOK_SECRET configured - rejecting request')
    return false
  }
  if (!providedSecret) {
    return false
  }
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSecret),
      Buffer.from(providedSecret)
    )
  } catch {
    return false
  }
}

/**
 * POST /api/webhooks/generate-illustrations
 *
 * Trigger illustration generation for selected files only.
 *
 * @example
 * ```bash
 * curl -X POST https://your-domain.com/api/webhooks/generate-illustrations \
 *   -H "Content-Type: application/json" \
 *   -H "X-Webhook-Secret: your-secret" \
 *   -d '{
 *     "projectTitle": "1984 by George Orwell",
 *     "selectedChunkIds": ["chapter-1", "chapter-3"],
 *     "chunks": [...],
 *     "provider": "openai"
 *   }'
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: WebhookPayload = await request.json()

    // Get secret from header or body
    const secretFromHeader = request.headers.get('X-Webhook-Secret')
    const secretFromBody = body.secret
    const providedSecret = secretFromHeader || secretFromBody

    // Verify authentication
    if (!verifyWebhookSecret(providedSecret)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing webhook secret. Set WEBHOOK_SECRET env var and provide it in X-Webhook-Secret header or body.',
        },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!body.projectTitle) {
      return NextResponse.json(
        { error: 'Missing required field: projectTitle' },
        { status: 400 }
      )
    }

    if (!body.chunks || body.chunks.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: chunks (must have at least one chunk)' },
        { status: 400 }
      )
    }

    // Filter chunks to only those selected for generation
    // Priority: selectedChunkIds > generateIllustration flag
    let chunksToGenerate = body.chunks

    if (body.selectedChunkIds && body.selectedChunkIds.length > 0) {
      // Use explicit selection
      const selectedSet = new Set(body.selectedChunkIds)
      chunksToGenerate = body.chunks.filter(chunk => selectedSet.has(chunk.id))
    } else {
      // Fall back to generateIllustration flag
      chunksToGenerate = body.chunks.filter(chunk => chunk.generateIllustration === true)
    }

    // If no chunks are selected for generation, return early
    if (chunksToGenerate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No chunks selected for illustration generation',
        hint: 'Either provide selectedChunkIds array or set generateIllustration: true on chunks',
        stats: {
          totalChunks: body.chunks.length,
          selectedChunks: 0,
        },
      })
    }

    // Prepare chunks with required fields
    const preparedChunks = chunksToGenerate.map(chunk => ({
      id: chunk.id,
      title: chunk.title,
      content: chunk.content,
      pageRange: chunk.pageRange || { start: 0, end: 0 },
      illustrationPoints: chunk.illustrationPoints || [0],
    }))

    // Import job manager
    const { startJob } = await import('@/lib/jobs')

    // Estimate cost
    const costPerImage = body.provider === 'replicate' ? 0.003 : 0.04

    // Create and start the job
    const job = await startJob({
      projectTitle: body.projectTitle,
      chunks: preparedChunks,
      provider: body.provider || 'openai',
      batchSize: body.batchSize || 3,
      styleId: body.styleId,
      styleMemory: body.styleMemory,
      costPerImage,
    }, {
      // If callback URL provided, notify on completion
      onStatusChange: async (job, _oldStatus, newStatus) => {
        if (body.callbackUrl && (newStatus === 'completed' || newStatus === 'failed')) {
          try {
            await fetch(body.callbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'job_status_change',
                jobId: job.id,
                status: newStatus,
                projectTitle: job.projectTitle,
                completedItems: job.completedItems,
                totalItems: job.totalItems,
                commitSha: body.commitSha,
                repository: body.repository,
              }),
            })
          } catch (err) {
            console.error('[Webhook] Failed to call callback URL:', err)
          }
        }
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Illustration generation job started',
      job: {
        id: job.id,
        status: job.status,
        projectTitle: job.projectTitle,
        totalItems: job.totalItems,
        batchSize: job.batchSize,
        provider: job.provider,
        estimatedCost: job.estimatedCost,
        createdAt: job.createdAt,
      },
      stats: {
        totalChunks: body.chunks.length,
        selectedChunks: chunksToGenerate.length,
        skippedChunks: body.chunks.length - chunksToGenerate.length,
      },
      links: {
        status: `/api/jobs/${job.id}`,
        actions: `/api/jobs/${job.id}/action`,
      },
      tracking: {
        commitSha: body.commitSha,
        repository: body.repository,
        callbackUrl: body.callbackUrl ? '(configured)' : undefined,
      },
    })

  } catch (error) {
    console.error('[Webhook] Generate illustrations error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process webhook',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/generate-illustrations
 *
 * Returns webhook documentation and health check
 */
export async function GET() {
  return NextResponse.json({
    name: 'Generate Illustrations Webhook',
    version: '1.0.0',
    status: 'healthy',
    documentation: {
      method: 'POST',
      authentication: 'X-Webhook-Secret header or secret in body',
      requiredFields: ['projectTitle', 'chunks'],
      optionalFields: [
        'selectedChunkIds - array of chunk IDs to generate (if not provided, uses generateIllustration flag)',
        'provider - openai | replicate (default: openai)',
        'batchSize - number (default: 3)',
        'styleId - string',
        'styleMemory - JSON string for character consistency',
        'callbackUrl - URL to POST job updates to',
        'commitSha - GitHub commit SHA for tracking',
        'repository - GitHub repo (owner/repo)',
      ],
      example: {
        projectTitle: '1984 by George Orwell',
        selectedChunkIds: ['chapter-1', 'chapter-3'],
        chunks: [
          {
            id: 'chapter-1',
            title: 'Chapter 1',
            content: 'It was a bright cold day in April...',
            generateIllustration: true,
          },
        ],
        provider: 'openai',
        batchSize: 3,
      },
      notes: [
        'IMPORTANT: Only generates illustrations for SELECTED chunks',
        'Selection is via selectedChunkIds OR generateIllustration: true flag',
        'If neither is provided, no images will be generated',
        'This prevents accidental full-book generation on every commit',
      ],
    },
    timestamp: new Date().toISOString(),
  })
}
