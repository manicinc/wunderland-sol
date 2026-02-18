/**
 * Job Action API
 * @module api/jobs/[jobId]/action
 *
 * POST /api/jobs/:jobId/action - Pause/resume/cancel/continue a job
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Required for static export - skip generating API route pages
export const dynamicParams = false
export async function generateStaticParams() {
  return []
}

type JobAction = 'pause' | 'resume' | 'cancel' | 'continue'

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    }

    const body = (await request.json()) as { action?: JobAction }
    const action = body.action
    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    const { pauseJob, resumeJob, cancelJob, continueJob } = await import('@/lib/jobs')

    let job
    switch (action) {
      case 'pause':
        job = await pauseJob(jobId)
        break
      case 'resume':
        job = await resumeJob(jobId)
        break
      case 'cancel':
        job = await cancelJob(jobId)
        break
      case 'continue':
        job = await continueJob(jobId)
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found or invalid state for action' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        completedItems: job.completedItems,
        totalItems: job.totalItems,
        currentBatch: job.currentBatch,
        batchSize: job.batchSize,
        error: job.error,
      },
    })
  } catch (error) {
    console.error('[API] Job action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform job action' },
      { status: 500 }
    )
  }
}

