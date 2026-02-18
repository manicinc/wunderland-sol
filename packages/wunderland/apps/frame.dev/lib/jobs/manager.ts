/**
 * Job Manager
 * @module lib/jobs/manager
 *
 * Manages the lifecycle of image generation jobs.
 * Supports batch processing, pause/resume, and cancellation.
 */

import {
  type JobRecord,
  type JobStatus,
  type GeneratedImageRecord,
  createJob,
  getJob,
  updateJob,
  saveImage,
  getJobImages,
  getNextBatch,
  isBatchComplete,
  isJobComplete,
} from './storage'
import type { WorkStyleProfile } from '@/lib/images/workStyleProfile'

export interface JobManagerCallbacks {
  /** Called when an image is generated */
  onImageGenerated?: (image: GeneratedImageRecord, job: JobRecord) => void
  /** Called when a batch is complete */
  onBatchComplete?: (job: JobRecord, batchNumber: number) => void
  /** Called when job status changes */
  onStatusChange?: (job: JobRecord, oldStatus: JobStatus, newStatus: JobStatus) => void
  /** Called on error */
  onError?: (error: Error, job: JobRecord) => void
  /** Called with progress updates */
  onProgress?: (job: JobRecord, message: string) => void
}

export interface CreateJobOptions {
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
  /** Provider to use */
  provider?: 'openai' | 'replicate'
  /** Items per batch (default: 3) */
  batchSize?: number
  /** Style preset ID */
  styleId?: string
  /** Style memory JSON for character consistency */
  styleMemory?: string
  /** Estimated cost per image */
  costPerImage?: number
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
  /** Smart skip: analyze worthiness before generating */
  smartSkip?: boolean
  /** Confidence threshold for smart skip (0-1, default: 0.6) */
  skipThreshold?: number
  /** Use LLM for worthiness analysis (default: true) */
  useLLMForSkip?: boolean
  /** Work style profile for cohesive illustration generation */
  workStyleProfile?: WorkStyleProfile
}

// Active jobs being processed
const activeJobs = new Map<string, {
  job: JobRecord
  callbacks: JobManagerCallbacks
  abortController: AbortController
  isPaused: boolean
}>()

/**
 * Create and start a new job
 */
export async function startJob(
  options: CreateJobOptions,
  callbacks: JobManagerCallbacks = {}
): Promise<JobRecord> {
  const batchSize = options.batchSize ?? 3
  const costPerImage = options.costPerImage ?? 0.04 // Default DALL-E 3 standard

  const job = await createJob({
    type: 'illustration-generation',
    status: 'pending',
    projectTitle: options.projectTitle,
    totalItems: options.chunks.length,
    batchSize,
    provider: options.provider || 'openai',
    styleId: options.styleId,
    styleMemory: options.styleMemory,
    estimatedCost: options.chunks.length * costPerImage,
    chunks: options.chunks,
    // Store advanced options in metadata
    metadata: {
      quality: options.quality,
      size: options.size,
      model: options.model,
      aspectRatio: options.aspectRatio,
      costLimit: options.costLimit,
      webhookUrl: options.webhookUrl,
      webhookSecret: options.webhookSecret,
      smartSkip: options.smartSkip,
      skipThreshold: options.skipThreshold ?? 0.6,
      useLLMForSkip: options.useLLMForSkip ?? true,
      workStyleProfile: options.workStyleProfile,
    },
  })

  // Register the job as active
  activeJobs.set(job.id, {
    job,
    callbacks,
    abortController: new AbortController(),
    isPaused: false,
  })

  // Start processing
  processJob(job.id).catch(err => {
    console.error(`[JobManager] Job ${job.id} failed:`, err)
    callbacks.onError?.(err, job)
  })

  return job
}

/**
 * Pause a running job
 */
export async function pauseJob(jobId: string): Promise<JobRecord | null> {
  const active = activeJobs.get(jobId)
  if (!active) {
    // Job might be in storage but not active
    const job = await getJob(jobId)
    if (job && job.status === 'running') {
      return await updateJob(jobId, { status: 'paused' }) || null
    }
    return null
  }

  active.isPaused = true
  const oldStatus = active.job.status

  const updatedJob = await updateJob(jobId, { status: 'paused' })
  if (updatedJob) {
    active.job = updatedJob
    active.callbacks.onStatusChange?.(updatedJob, oldStatus, 'paused')
  }

  return updatedJob || null
}

/**
 * Resume a paused job
 */
export async function resumeJob(
  jobId: string,
  callbacks: JobManagerCallbacks = {}
): Promise<JobRecord | null> {
  let job = await getJob(jobId)
  if (!job || (job.status !== 'paused' && job.status !== 'batch-complete')) {
    return null
  }

  const oldStatus = job.status

  // Re-register as active if not already
  if (!activeJobs.has(jobId)) {
    activeJobs.set(jobId, {
      job,
      callbacks,
      abortController: new AbortController(),
      isPaused: false,
    })
  } else {
    const active = activeJobs.get(jobId)!
    active.isPaused = false
    active.callbacks = { ...active.callbacks, ...callbacks }
  }

  job = await updateJob(jobId, { status: 'running' }) || job

  callbacks.onStatusChange?.(job, oldStatus, 'running')

  // Continue processing
  processJob(jobId).catch(err => {
    console.error(`[JobManager] Job ${jobId} failed:`, err)
    callbacks.onError?.(err, job!)
  })

  return job
}

/**
 * Cancel a job completely
 */
export async function cancelJob(jobId: string): Promise<JobRecord | null> {
  const active = activeJobs.get(jobId)

  if (active) {
    // Abort any in-flight requests
    active.abortController.abort()
    const oldStatus = active.job.status

    const updatedJob = await updateJob(jobId, {
      status: 'cancelled',
      completedAt: new Date(),
    })

    if (updatedJob) {
      active.callbacks.onStatusChange?.(updatedJob, oldStatus, 'cancelled')
    }

    activeJobs.delete(jobId)
    return updatedJob || null
  }

  // Job might be in storage
  const job = await getJob(jobId)
  if (job && job.status !== 'completed' && job.status !== 'cancelled' && job.status !== 'failed') {
    return await updateJob(jobId, {
      status: 'cancelled',
      completedAt: new Date(),
    }) || null
  }

  return null
}

/**
 * Get job status and progress
 */
export async function getJobStatus(jobId: string): Promise<{
  job: JobRecord
  images: GeneratedImageRecord[]
  isActive: boolean
  isPaused: boolean
} | null> {
  const job = await getJob(jobId)
  if (!job) return null

  const images = await getJobImages(jobId)
  const active = activeJobs.get(jobId)

  return {
    job,
    images,
    isActive: !!active,
    isPaused: active?.isPaused ?? false,
  }
}

/**
 * Continue a job after batch completion
 */
export async function continueJob(
  jobId: string,
  callbacks: JobManagerCallbacks = {}
): Promise<JobRecord | null> {
  const job = await getJob(jobId)
  if (!job || job.status !== 'batch-complete') {
    return null
  }

  // Increment batch number
  const updatedJob = await updateJob(jobId, {
    status: 'running',
    currentBatch: job.currentBatch + 1,
  })

  if (!updatedJob) return null

  // Re-register as active
  if (!activeJobs.has(jobId)) {
    activeJobs.set(jobId, {
      job: updatedJob,
      callbacks,
      abortController: new AbortController(),
      isPaused: false,
    })
  }

  // Continue processing
  processJob(jobId).catch(err => {
    console.error(`[JobManager] Job ${jobId} failed:`, err)
    callbacks.onError?.(err, updatedJob)
  })

  return updatedJob
}

// ============================================================================
// INTERNAL PROCESSING
// ============================================================================

/**
 * Main job processing loop
 */
async function processJob(jobId: string): Promise<void> {
  const active = activeJobs.get(jobId)
  if (!active) return

  let job = await updateJob(jobId, { status: 'running' })
  if (!job) return

  active.job = job
  active.callbacks.onStatusChange?.(job, 'pending', 'running')
  active.callbacks.onProgress?.(job, `Starting batch ${job.currentBatch}...`)

  // Import image generation
  const { generateImage } = await import('@/lib/images/service')
  const { StyleMemory } = await import('@/lib/images/styleMemory')

  // Import work illustration service if profile is provided
  let generateWorkIllustration: any = null
  const workProfile = job.metadata?.workStyleProfile
  if (workProfile) {
    const workIllustrationModule = await import('@/lib/images/workIllustrationService')
    generateWorkIllustration = workIllustrationModule.generateWorkIllustration
  }

  // Import worthiness analysis if smart skip is enabled
  let analyzeContentWorthiness: any = null
  if (job.metadata?.smartSkip) {
    const autoTaggingModule = await import('@/lib/nlp/autoTagging')
    analyzeContentWorthiness = autoTaggingModule.analyzeContentWorthiness
  }

  // Parse style memory if available
  let styleMemory: InstanceType<typeof StyleMemory> | null = null
  if (job.styleMemory) {
    try {
      styleMemory = StyleMemory.fromJSON(job.styleMemory)
    } catch (err) {
      console.warn('[JobManager] Failed to parse style memory:', err)
    }
  }

  // Get chunks to process
  const chunks = job.chunks || []
  const batch = getNextBatch(job, chunks.map(c => ({ id: c.id, content: c.content })))

  for (const item of batch) {
    // Check for pause or abort
    if (active.isPaused || active.abortController.signal.aborted) {
      break
    }

    const chunk = chunks[item.index]
    if (!chunk) continue

    try {
      // Smart skip: Check worthiness before generating
      if (job.metadata?.smartSkip && analyzeContentWorthiness) {
        active.callbacks.onProgress?.(
          active.job,
          `Analyzing worthiness for ${chunk.title}...`
        )

        const worthinessResult = await analyzeContentWorthiness(
          chunk.content,
          'chunk',
          {
            useLLM: job.metadata.useLLMForSkip ?? true,
            confidenceThreshold: job.metadata.skipThreshold ?? 0.6,
          }
        )

        if (!worthinessResult.warrants) {
          // Skip this chunk - doesn't warrant illustration
          console.log(`[JobManager] Skipping chunk ${chunk.id}: ${worthinessResult.reasoning}`)
          active.callbacks.onProgress?.(
            active.job,
            `Skipped ${chunk.title} (${worthinessResult.reasoning})`
          )

          // Update job progress without generating
          job = await updateJob(jobId, {
            completedItems: job.completedItems + 1,
          }) || job

          active.job = job
          continue // Skip to next chunk
        }

        active.callbacks.onProgress?.(
          active.job,
          `${chunk.title} warrants illustration (confidence: ${(worthinessResult.confidence * 100).toFixed(0)}%)`
        )
      }

      active.callbacks.onProgress?.(
        active.job,
        `Generating image ${item.index + 1} of ${job.totalItems}: ${chunk.title}`
      )

      // Generate using work profile or standard generation
      let result: any

      if (workProfile && generateWorkIllustration) {
        // Work-aware generation with profile
        const basePrompt = `${chunk.title}\n\n${chunk.content.slice(0, 500)}`

        const generationResult: { image: any; updatedProfile: WorkStyleProfile } = await generateWorkIllustration(
          workProfile,
          {
            chunkId: chunk.id,
            pageNumber: chunk.pageRange.start,
            sceneDescription: chunk.content.slice(0, 1000),
          },
          {
            prompt: basePrompt,
            size: job.metadata?.size || '1024x1024',
            quality: job.metadata?.quality || 'standard',
            model: job.metadata?.model,
            provider: job.provider,
            generateReference: true, // Store as reference if first occurrence
          }
        )

        result = generationResult.image

        // Update job with updated profile
        if (generationResult.updatedProfile) {
          job = await updateJob(jobId, {
            metadata: {
              ...job.metadata,
              workStyleProfile: generationResult.updatedProfile,
            },
          }) || job
        }
      } else {
        // Standard generation with optional style memory
        let prompt = `Illustration for: ${chunk.title}\n\n${chunk.content.slice(0, 500)}`
        let seed: number | undefined

        if (styleMemory) {
          const sceneResult = styleMemory.buildScenePrompt({
            sceneDescription: chunk.content.slice(0, 1000),
          })
          prompt = sceneResult.prompt
          seed = sceneResult.seed
        }

        result = await generateImage({
          prompt,
          seed,
          size: job.metadata?.size || '1024x1024',
          quality: job.metadata?.quality || 'standard',
          model: job.metadata?.model,
          metadata: {
            aspectRatio: job.metadata?.aspectRatio,
          },
        }, job.provider)
      }

      // Save the generated image
      const imageRecord: GeneratedImageRecord = {
        id: result.id,
        jobId: job.id,
        url: result.url,
        prompt: result.prompt,
        enhancedPrompt: result.enhancedPrompt,
        provider: result.provider as 'openai' | 'replicate',
        model: result.model,
        pageIndex: item.index,
        chunkId: chunk.id,
        seed: result.seed,
        cost: result.cost,
        createdAt: result.createdAt,
      }

      await saveImage(imageRecord)

      // Update job progress
      job = await updateJob(jobId, {
        completedItems: job.completedItems + 1,
        actualCost: job.actualCost + (result.cost || 0),
        imageIds: [...job.imageIds, result.id],
      }) || job

      active.job = job
      active.callbacks.onImageGenerated?.(imageRecord, job)

    } catch (err) {
      console.error(`[JobManager] Failed to generate image for chunk ${chunk.id}:`, err)

      // Continue with next item on error (don't fail entire job)
      job = await updateJob(jobId, {
        completedItems: job.completedItems + 1,
        error: `Failed on ${chunk.title}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }) || job

      active.job = job
    }
  }

  // Check if batch or job is complete
  if (active.abortController.signal.aborted) {
    return // Job was cancelled during processing
  }

  if (active.isPaused) {
    return // Job was paused during processing
  }

  if (isJobComplete(job)) {
    // All done!
    job = await updateJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
    }) || job

    active.callbacks.onStatusChange?.(job, 'running', 'completed')
    active.callbacks.onProgress?.(job, 'All illustrations generated!')
    activeJobs.delete(jobId)
  } else if (isBatchComplete(job)) {
    // Batch complete, wait for user to continue
    job = await updateJob(jobId, { status: 'batch-complete' }) || job

    active.callbacks.onStatusChange?.(job, 'running', 'batch-complete')
    active.callbacks.onBatchComplete?.(job, job.currentBatch)
    active.callbacks.onProgress?.(
      job,
      `Batch ${job.currentBatch} complete (${job.completedItems}/${job.totalItems} images). Continue or cancel?`
    )
  }
}

/**
 * Get all active jobs
 */
export function getActiveJobs(): JobRecord[] {
  return Array.from(activeJobs.values()).map(a => a.job)
}

/**
 * Check if a job is active
 */
export function isJobActive(jobId: string): boolean {
  return activeJobs.has(jobId)
}
