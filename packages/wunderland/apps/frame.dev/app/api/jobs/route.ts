/**
 * Jobs List API
 * @module api/jobs
 *
 * GET /api/jobs - List all jobs
 * POST /api/jobs - Create a new job
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // Allow up to 2 minutes for job creation with PDF processing

interface CreateJobRequest {
  /** Project/book title */
  projectTitle: string
  /** PDF chunks to generate images for */
  chunks: Array<{
    id: string
    title: string
    content: string
    pageRange: { start: number; end: number }
    illustrationPoints: number[]
  }>
  /** Provider to use (default: openai) */
  provider?: 'openai' | 'replicate'
  /** Items per batch (default: 3) */
  batchSize?: number
  /** Style preset ID */
  styleId?: string
  /** Style memory JSON for character consistency */
  styleMemory?: string
  /** Image quality: standard or hd */
  quality?: 'standard' | 'hd'
  /** Image size for OpenAI */
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  /** Model for Replicate */
  model?: 'flux-schnell' | 'flux-dev' | 'flux-pro'
  /** Aspect ratio for Replicate */
  aspectRatio?: '1:1' | '16:9' | '9:16'
  /** Maximum cost limit - job pauses when reached */
  costLimit?: number
  /** Webhook URL for job completion notification */
  webhookUrl?: string
  /** Secret for webhook authentication */
  webhookSecret?: string
}

/**
 * GET /api/jobs
 *
 * List all jobs with optional status filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as import('@/lib/jobs').ImageJobStatus | null

    const { getJobs, getRecentJobs, getStorageStats, isStorageAvailable } = await import('@/lib/jobs')

    // Check if storage is available (client-side only)
    if (!isStorageAvailable()) {
      return NextResponse.json({
        success: true,
        jobs: [],
        stats: { jobCount: 0, imageCount: 0, pendingJobs: 0, runningJobs: 0, completedJobs: 0 },
        message: 'Job storage is not available (IndexedDB required)',
      })
    }

    let jobs
    if (status) {
      jobs = await getJobs(status)
    } else {
      jobs = await getRecentJobs(50)
    }

    const stats = await getStorageStats()

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        projectTitle: job.projectTitle,
        progress: {
          completed: job.completedItems,
          total: job.totalItems,
          percentage: job.totalItems > 0 ? Math.round((job.completedItems / job.totalItems) * 100) : 0,
        },
        currentBatch: job.currentBatch,
        batchSize: job.batchSize,
        provider: job.provider,
        cost: {
          estimated: job.estimatedCost,
          actual: job.actualCost,
        },
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      })),
      stats,
    })
  } catch (error) {
    console.error('[API] List jobs error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list jobs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs
 *
 * Create and start a new image generation job
 *
 * @example
 * ```typescript
 * // Create job from PDF chunks
 * const response = await fetch('/api/jobs', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     projectTitle: '1984 by George Orwell',
 *     chunks: pdfChunks,
 *     provider: 'openai',
 *     batchSize: 3,
 *     styleMemory: JSON.stringify(characterMemory),
 *   }),
 * })
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateJobRequest = await request.json()

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

    const { startJob, isStorageAvailable } = await import('@/lib/jobs')

    // Check storage availability
    if (!isStorageAvailable()) {
      return NextResponse.json(
        {
          error: 'Job storage is not available',
          hint: 'IndexedDB is required for job management. This API must be called from a browser context.',
        },
        { status: 400 }
      )
    }

    // Calculate cost per image based on provider and options
    let costPerImage: number
    if (body.provider === 'replicate') {
      // Replicate pricing based on model
      const replicatePricing: Record<string, number> = {
        'flux-schnell': 0.003,
        'flux-dev': 0.025,
        'flux-pro': 0.055,
      }
      costPerImage = replicatePricing[body.model || 'flux-schnell'] || 0.003
    } else {
      // OpenAI pricing based on quality and size
      const isHD = body.quality === 'hd'
      const isNonSquare = body.size && body.size !== '1024x1024'
      if (isHD) {
        costPerImage = isNonSquare ? 0.16 : 0.08
      } else {
        costPerImage = isNonSquare ? 0.08 : 0.04
      }
    }

    // Create and start the job
    const job = await startJob({
      projectTitle: body.projectTitle,
      chunks: body.chunks,
      provider: body.provider || 'openai',
      batchSize: body.batchSize || 3,
      styleId: body.styleId,
      styleMemory: body.styleMemory,
      costPerImage,
      // Pass through advanced options
      quality: body.quality,
      size: body.size,
      model: body.model,
      aspectRatio: body.aspectRatio,
      costLimit: body.costLimit,
      webhookUrl: body.webhookUrl,
      webhookSecret: body.webhookSecret,
    })

    return NextResponse.json({
      success: true,
      message: 'Job created and started',
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
      links: {
        status: `/api/jobs/${job.id}`,
        actions: `/api/jobs/${job.id}/action`,
      },
    })
  } catch (error) {
    console.error('[API] Create job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
