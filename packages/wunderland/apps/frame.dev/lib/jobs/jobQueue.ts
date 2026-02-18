/**
 * Job Queue Service
 * @module lib/jobs/jobQueue
 * 
 * Background job queue with persistence and event system.
 * Handles heavy generation tasks (flashcards, glossaries, quizzes, ratings)
 * with progress tracking, cancellation, and resume on page refresh.
 */

import {
  type Job,
  type JobType,
  type JobStatus,
  type JobPayload,
  type JobResult,
  type JobEvent,
  type JobEventType,
  type JobEventCallback,
  generateJobId,
  isJobTerminal,
  JOB_TYPE_LABELS,
} from './types'
import {
  saveJob as saveJobToDb,
  getJob as getJobFromDb,
  listJobs as listJobsFromDb,
  updateJobProgress as updateJobProgressInDb,
  updateJobStatus as updateJobStatusInDb,
  deleteJob as deleteJobFromDb,
  getPendingJobs,
  cleanupOldJobs,
  type StoredJob,
} from '@/lib/storage/localCodex'

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Convert stored job to Job object
 */
function storedToJob(stored: StoredJob): Job {
  return {
    id: stored.id,
    type: stored.type as JobType,
    status: stored.status as JobStatus,
    progress: stored.progress,
    message: stored.message,
    payload: stored.payload ? JSON.parse(stored.payload) : {},
    result: stored.result ? JSON.parse(stored.result) : undefined,
    error: stored.error || undefined,
    createdAt: stored.created_at,
    startedAt: stored.started_at || undefined,
    completedAt: stored.completed_at || undefined,
  }
}

/**
 * Convert Job to stored format
 */
function jobToStored(job: Job): StoredJob {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message,
    payload: JSON.stringify(job.payload),
    result: job.result ? JSON.stringify(job.result) : undefined,
    error: job.error,
    created_at: job.createdAt,
    started_at: job.startedAt,
    completed_at: job.completedAt,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   JOB QUEUE SERVICE
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Job processor function type
 */
export type JobProcessor = (
  job: Job,
  onProgress: (progress: number, message: string) => void
) => Promise<JobResult>

/**
 * Job Queue Service singleton
 */
class JobQueueService {
  private jobs: Map<string, Job> = new Map()
  private subscribers: Set<JobEventCallback> = new Set()
  private processors: Map<JobType, JobProcessor> = new Map()
  private isProcessing = false
  private currentJobId: string | null = null
  private initialized = false
  private processingPromise: Promise<void> | null = null

  /**
   * Initialize the queue - load pending jobs from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Load pending jobs from storage
      const stored = await getPendingJobs()
      for (const s of stored) {
        const job = storedToJob(s)
        this.jobs.set(job.id, job)
      }
      
      // Also load recent completed/failed jobs for display
      const recent = await listJobsFromDb({
        status: ['completed', 'failed', 'cancelled'],
        limit: 20,
        orderBy: 'created_at',
        order: 'desc',
      })
      for (const s of recent) {
        if (!this.jobs.has(s.id)) {
          this.jobs.set(s.id, storedToJob(s))
        }
      }
      
      // Clean up old jobs
      await cleanupOldJobs(7 * 24 * 60 * 60 * 1000) // 7 days
      
      this.initialized = true
      
      // Auto-start processing if there are pending jobs
      const pendingJobs = Array.from(this.jobs.values()).filter(j => j.status === 'pending')
      if (pendingJobs.length > 0) {
        this.startProcessing()
      }
    } catch (error) {
      console.error('[JobQueue] Failed to initialize:', error)
      this.initialized = true // Mark as initialized to prevent retry loops
    }
  }

  /**
   * Register a processor for a job type
   */
  registerProcessor(type: JobType, processor: JobProcessor): void {
    this.processors.set(type, processor)
  }

  /**
   * Check if a similar job is already pending or running
   */
  hasSimilarJob(type: JobType, payload: JobPayload): Job | null {
    const payloadStr = JSON.stringify(payload)
    for (const job of this.jobs.values()) {
      if (
        job.type === type &&
        (job.status === 'pending' || job.status === 'running') &&
        JSON.stringify(job.payload) === payloadStr
      ) {
        return job
      }
    }
    return null
  }

  /**
   * Check if any job of the given type is pending or running
   */
  hasActiveJobOfType(type: JobType): Job | null {
    for (const job of this.jobs.values()) {
      if (job.type === type && (job.status === 'pending' || job.status === 'running')) {
        return job
      }
    }
    return null
  }

  /**
   * Enqueue a new job
   * @returns job ID, or null if a similar job is already active (duplicate prevention)
   */
  async enqueue<P extends JobPayload>(type: JobType, payload: P, options?: { allowDuplicates?: boolean }): Promise<string | null> {
    await this.initialize()
    
    // Check for duplicate jobs unless explicitly allowed
    if (!options?.allowDuplicates) {
      const existing = this.hasSimilarJob(type, payload)
      if (existing) {
        console.log(`[JobQueue] Job already exists: ${existing.id} (${type})`)
        this.emit('job:duplicate', existing)
        return null // Return null to indicate duplicate was blocked
      }
    }
    
    const job: Job<P> = {
      id: generateJobId(),
      type,
      status: 'pending',
      progress: 0,
      message: `Waiting to start ${JOB_TYPE_LABELS[type].toLowerCase()}...`,
      payload,
      createdAt: new Date().toISOString(),
    }
    
    // Save to storage
    await saveJobToDb(jobToStored(job as Job))
    
    // Add to in-memory map
    this.jobs.set(job.id, job as Job)
    
    // Emit event
    this.emit('job:created', job as Job)
    
    // Start processing if not already
    this.startProcessing()
    
    return job.id
  }

  /**
   * Cancel a job
   */
  async cancel(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job) return false
    
    if (job.status === 'pending') {
      // Can cancel immediately
      job.status = 'cancelled'
      job.message = 'Cancelled by user'
      job.completedAt = new Date().toISOString()
      
      await updateJobStatusInDb(jobId, 'cancelled', {
        message: job.message,
        completed_at: job.completedAt,
      })
      
      this.emit('job:cancelled', job)
      return true
    }
    
    if (job.status === 'running') {
      // Mark for cancellation - processor should check this
      job.status = 'cancelled'
      job.message = 'Cancelling...'
      
      await updateJobStatusInDb(jobId, 'cancelled', {
        message: job.message,
      })
      
      this.emit('job:cancelled', job)
      return true
    }
    
    return false
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Get all jobs
   */
  getJobs(): Job[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: JobStatus | JobStatus[]): Job[] {
    const statuses = Array.isArray(status) ? status : [status]
    return this.getJobs().filter(j => statuses.includes(j.status))
  }

  /**
   * Get the currently running job
   */
  getRunningJob(): Job | null {
    return this.currentJobId ? this.jobs.get(this.currentJobId) || null : null
  }

  /**
   * Get count of pending jobs
   */
  getPendingCount(): number {
    return Array.from(this.jobs.values()).filter(j => j.status === 'pending').length
  }

  /**
   * Subscribe to job events
   */
  subscribe(callback: JobEventCallback): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Delete a job (only if terminal)
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId)
    if (!job || !isJobTerminal(job.status)) return false
    
    await deleteJobFromDb(jobId)
    this.jobs.delete(jobId)
    return true
  }

  /**
   * Clear all completed/failed/cancelled jobs
   */
  async clearTerminalJobs(): Promise<number> {
    let count = 0
    for (const [id, job] of this.jobs) {
      if (isJobTerminal(job.status)) {
        await deleteJobFromDb(id)
        this.jobs.delete(id)
        count++
      }
    }
    return count
  }

  /**
   * Start processing the queue
   */
  startProcessing(): void {
    if (this.isProcessing) return
    
    this.isProcessing = true
    this.processingPromise = this.processQueue()
  }

  /**
   * Stop processing (for cleanup)
   */
  stopProcessing(): void {
    this.isProcessing = false
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     PRIVATE METHODS
  ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      // Find next pending job
      const pendingJobs = Array.from(this.jobs.values())
        .filter(j => j.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      
      if (pendingJobs.length === 0) {
        this.isProcessing = false
        this.currentJobId = null
        break
      }
      
      const job = pendingJobs[0]
      await this.processJob(job)
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const processor = this.processors.get(job.type)
    
    if (!processor) {
      // No processor registered - fail the job
      job.status = 'failed'
      job.error = `No processor registered for job type: ${job.type}`
      job.completedAt = new Date().toISOString()
      
      await updateJobStatusInDb(job.id, 'failed', {
        error: job.error,
        completed_at: job.completedAt,
      })
      
      this.emit('job:failed', job)
      return
    }
    
    // Start the job
    job.status = 'running'
    job.startedAt = new Date().toISOString()
    job.progress = 0
    job.message = `Starting ${JOB_TYPE_LABELS[job.type].toLowerCase()}...`
    this.currentJobId = job.id
    
    await updateJobStatusInDb(job.id, 'running', {
      started_at: job.startedAt,
      progress: 0,
      message: job.message,
    })
    
    this.emit('job:started', job)
    
    try {
      // Run the processor
      const result = await processor(job, async (progress, message) => {
        // Check for cancellation (status can be mutated externally by cancel())
        if ((job.status as JobStatus) === 'cancelled') {
          throw new Error('Job cancelled')
        }
        
        // Update progress
        job.progress = progress
        job.message = message
        
        await updateJobProgressInDb(job.id, progress, message)
        this.emit('job:progress', job)
      })
      
      // Check if cancelled during processing (status can be mutated externally by cancel())
      if ((job.status as JobStatus) === 'cancelled') {
        job.completedAt = new Date().toISOString()
        await updateJobStatusInDb(job.id, 'cancelled', {
          completed_at: job.completedAt,
        })
        return
      }
      
      // Job completed successfully
      job.status = 'completed'
      job.progress = 100
      job.result = result
      job.completedAt = new Date().toISOString()
      job.message = 'Completed successfully'
      
      await updateJobStatusInDb(job.id, 'completed', {
        progress: 100,
        message: job.message,
        result: JSON.stringify(result),
        completed_at: job.completedAt,
      })
      
      this.emit('job:completed', job)
    } catch (error) {
      // Job failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage === 'Job cancelled') {
        job.completedAt = new Date().toISOString()
        await updateJobStatusInDb(job.id, 'cancelled', {
          completed_at: job.completedAt,
        })
        return
      }
      
      job.status = 'failed'
      job.error = errorMessage
      job.completedAt = new Date().toISOString()
      job.message = `Failed: ${errorMessage}`
      
      await updateJobStatusInDb(job.id, 'failed', {
        error: errorMessage,
        message: job.message,
        completed_at: job.completedAt,
      })
      
      this.emit('job:failed', job)
    } finally {
      this.currentJobId = null
    }
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(type: JobEventType, job: Job): void {
    const event: JobEvent = {
      type,
      job,
      timestamp: new Date().toISOString(),
    }
    
    for (const callback of this.subscribers) {
      try {
        callback(event)
      } catch (error) {
        console.error('[JobQueue] Subscriber error:', error)
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SINGLETON INSTANCE
═══════════════════════════════════════════════════════════════════════════ */

// Create singleton instance
const jobQueue = new JobQueueService()

// Export singleton
export { jobQueue }
export type { JobQueueService }

// Export convenience functions
export const initializeJobQueue = () => jobQueue.initialize()
export const enqueueJob = <P extends JobPayload>(type: JobType, payload: P, options?: { allowDuplicates?: boolean }) => 
  jobQueue.enqueue(type, payload, options)
export const cancelJob = (jobId: string) => jobQueue.cancel(jobId)
export const getJob = (jobId: string) => jobQueue.getJob(jobId)
export const getJobs = () => jobQueue.getJobs()
export const getRunningJob = () => jobQueue.getRunningJob()
export const getPendingCount = () => jobQueue.getPendingCount()
export const hasActiveJobOfType = (type: JobType) => jobQueue.hasActiveJobOfType(type)
export const hasSimilarJob = (type: JobType, payload: JobPayload) => jobQueue.hasSimilarJob(type, payload)
export const subscribeToJobs = (callback: JobEventCallback) => jobQueue.subscribe(callback)
export const registerJobProcessor = (type: JobType, processor: JobProcessor) => 
  jobQueue.registerProcessor(type, processor)


