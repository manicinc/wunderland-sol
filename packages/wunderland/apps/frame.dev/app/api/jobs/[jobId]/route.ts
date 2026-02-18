/**
 * Job Detail API
 * @module api/jobs/[jobId]
 *
 * GET /api/jobs/:jobId - Get job status and generated images
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Required for static export - skip generating API route pages
export const dynamicParams = false
export async function generateStaticParams() {
  return []
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    const { getJob, getJobImages } = await import('@/lib/jobs')

    const job = await getJob(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const images = await getJobImages(jobId)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        projectTitle: job.projectTitle,
        progress: {
          completed: job.completedItems,
          total: job.totalItems,
          percentage: job.totalItems > 0 ? Math.round((job.completedItems / job.totalItems) * 100) : 0,
        },
        batch: {
          current: job.currentBatch,
          size: job.batchSize,
        },
        provider: job.provider,
        estimatedCost: job.estimatedCost,
        actualCost: job.actualCost,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
      },
      images: images.map(img => ({
        id: img.id,
        url: img.dataUrl || img.url,
        pageIndex: img.pageIndex,
        chunkId: img.chunkId,
        prompt: img.prompt,
        enhancedPrompt: img.enhancedPrompt,
        provider: img.provider,
        model: img.model,
        seed: img.seed,
        cost: img.cost,
        createdAt: img.createdAt,
      })),
    })
  } catch (error) {
    console.error('[API] Get job error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job' },
      { status: 500 }
    )
  }
}

