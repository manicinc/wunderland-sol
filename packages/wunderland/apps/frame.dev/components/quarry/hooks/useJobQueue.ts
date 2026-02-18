'use client'

/**
 * React Hook for Background Job Queue
 * @module codex/hooks/useJobQueue
 * 
 * Provides React components with access to the background job queue
 * for heavy generation tasks like flashcards, glossaries, quizzes.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  jobQueue,
  initializeJobQueue,
  subscribeToJobs,
  registerJobProcessor,
  publishStrandProcessor,
  publishProjectProcessor,
  flashcardGenerationProcessor,
  glossaryProcessor,
  quizGenerationProcessor,
  type Job,
  type JobType,
  type JobStatus,
  type JobEvent,
  type JobProcessor,
  type FlashcardJobPayload,
  type GlossaryJobPayload,
  type QuizJobPayload,
  type RatingJobPayload,
  type PublishStrandPayload,
  isJobTerminal,
  JOB_TYPE_LABELS,
} from '@/lib/jobs'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseJobQueueOptions {
  /** Auto-initialize on mount */
  autoInit?: boolean
  /** Show toast notifications for job events */
  showToasts?: boolean
  /** Callback when job completes */
  onJobComplete?: (job: Job) => void
  /** Callback when job fails */
  onJobFailed?: (job: Job) => void
  /** Callback when duplicate job is blocked */
  onJobDuplicate?: (job: Job) => void
}

export interface UseJobQueueReturn {
  /** All jobs */
  jobs: Job[]
  /** Currently running job */
  runningJob: Job | null
  /** Number of pending jobs */
  pendingCount: number
  /** Whether queue is initialized */
  isInitialized: boolean
  /** Whether any job is running */
  isProcessing: boolean
  
  // Actions
  /** Enqueue flashcard generation - returns job ID or null if duplicate blocked */
  enqueueFlashcards: (strandPaths: string[], options?: Omit<FlashcardJobPayload, 'strandPaths'>) => Promise<string | null>
  /** Enqueue glossary generation - returns job ID or null if duplicate blocked */
  enqueueGlossary: (strandPaths: string[], options?: Omit<GlossaryJobPayload, 'strandPaths'>) => Promise<string | null>
  /** Enqueue quiz generation - returns job ID or null if duplicate blocked */
  enqueueQuiz: (strandPaths: string[], options?: Omit<QuizJobPayload, 'strandPaths'>) => Promise<string | null>
  /** Enqueue rating generation - returns job ID or null if duplicate blocked */
  enqueueRating: (strandPaths: string[], options?: Omit<RatingJobPayload, 'strandPaths'>) => Promise<string | null>
  /** Enqueue publish strand - writes to vault + runs NLP pipeline */
  enqueuePublish: (strandPath: string, content: string, metadata: Record<string, unknown>, options?: Omit<PublishStrandPayload, 'strandPath' | 'content' | 'metadata'>) => Promise<string | null>
  /** Check if a job of this type is already active */
  hasActiveJob: (type: JobType) => Job | null
  /** Cancel a job */
  cancelJob: (jobId: string) => Promise<boolean>
  /** Delete a completed/failed job */
  deleteJob: (jobId: string) => Promise<boolean>
  /** Clear all terminal jobs */
  clearTerminalJobs: () => Promise<number>
  /** Get job by ID */
  getJob: (jobId: string) => Job | undefined
  /** Get jobs by status */
  getJobsByStatus: (status: JobStatus | JobStatus[]) => Job[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useJobQueue(options: UseJobQueueOptions = {}): UseJobQueueReturn {
  const {
    autoInit = true,
    onJobComplete,
    onJobFailed,
    onJobDuplicate,
  } = options
  
  const [jobs, setJobs] = useState<Job[]>([])
  const [runningJob, setRunningJob] = useState<Job | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const onJobCompleteRef = useRef(onJobComplete)
  const onJobFailedRef = useRef(onJobFailed)
  const onJobDuplicateRef = useRef(onJobDuplicate)
  
  // Keep refs up to date
  useEffect(() => {
    onJobCompleteRef.current = onJobComplete
    onJobFailedRef.current = onJobFailed
    onJobDuplicateRef.current = onJobDuplicate
  }, [onJobComplete, onJobFailed, onJobDuplicate])
  
  // Initialize and subscribe to job events
  useEffect(() => {
    if (!autoInit) return
    
    let unsubscribe: (() => void) | undefined
    
    const init = async () => {
      await initializeJobQueue()

      // Register processors
      registerJobProcessor('publish-strand', publishStrandProcessor)
      registerJobProcessor('publish-project', publishProjectProcessor)

      // Learning Studio processors
      registerJobProcessor('flashcard_generation', flashcardGenerationProcessor)
      registerJobProcessor('glossary_generation', glossaryProcessor)
      registerJobProcessor('quiz_generation', quizGenerationProcessor)

      setIsInitialized(true)

      // Get initial state
      setJobs(jobQueue.getJobs())
      setRunningJob(jobQueue.getRunningJob())
      setPendingCount(jobQueue.getPendingCount())
      
      // Subscribe to events
      unsubscribe = subscribeToJobs((event: JobEvent) => {
        // Update state
        setJobs(jobQueue.getJobs())
        setRunningJob(jobQueue.getRunningJob())
        setPendingCount(jobQueue.getPendingCount())
        
        // Call callbacks
        if (event.type === 'job:completed') {
          onJobCompleteRef.current?.(event.job)
        } else if (event.type === 'job:failed') {
          onJobFailedRef.current?.(event.job)
        } else if (event.type === 'job:duplicate') {
          onJobDuplicateRef.current?.(event.job)
        }
      })
    }
    
    init()
    
    return () => {
      unsubscribe?.()
    }
  }, [autoInit])
  
  // Check if a job of this type is already active
  const hasActiveJob = useCallback((type: JobType): Job | null => {
    return jobQueue.hasActiveJobOfType(type)
  }, [])
  
  // Enqueue flashcard generation - returns null if duplicate blocked
  const enqueueFlashcards = useCallback(
    async (strandPaths: string[], opts?: Omit<FlashcardJobPayload, 'strandPaths'>): Promise<string | null> => {
      const payload: FlashcardJobPayload = { strandPaths, ...opts }
      return jobQueue.enqueue('flashcard_generation', payload)
    },
    []
  )
  
  // Enqueue glossary generation - returns null if duplicate blocked
  const enqueueGlossary = useCallback(
    async (strandPaths: string[], opts?: Omit<GlossaryJobPayload, 'strandPaths'>): Promise<string | null> => {
      const payload: GlossaryJobPayload = { strandPaths, ...opts }
      return jobQueue.enqueue('glossary_generation', payload)
    },
    []
  )
  
  // Enqueue quiz generation - returns null if duplicate blocked
  const enqueueQuiz = useCallback(
    async (strandPaths: string[], opts?: Omit<QuizJobPayload, 'strandPaths'>): Promise<string | null> => {
      const payload: QuizJobPayload = { strandPaths, ...opts }
      return jobQueue.enqueue('quiz_generation', payload)
    },
    []
  )
  
  // Enqueue rating generation - returns null if duplicate blocked
  const enqueueRating = useCallback(
    async (strandPaths: string[], opts?: Omit<RatingJobPayload, 'strandPaths'>): Promise<string | null> => {
      const payload: RatingJobPayload = { strandPaths, ...opts }
      return jobQueue.enqueue('rating_generation', payload)
    },
    []
  )

  // Enqueue publish strand - writes to vault + runs NLP pipeline
  const enqueuePublish = useCallback(
    async (
      strandPath: string,
      content: string,
      metadata: Record<string, unknown>,
      opts?: Omit<PublishStrandPayload, 'strandPath' | 'content' | 'metadata'>
    ): Promise<string | null> => {
      const payload: PublishStrandPayload = { strandPath, content, metadata, ...opts }
      return jobQueue.enqueue('publish-strand', payload)
    },
    []
  )

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    return jobQueue.cancel(jobId)
  }, [])
  
  // Delete a job
  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    return jobQueue.deleteJob(jobId)
  }, [])
  
  // Clear terminal jobs
  const clearTerminalJobs = useCallback(async (): Promise<number> => {
    return jobQueue.clearTerminalJobs()
  }, [])
  
  // Get job by ID
  const getJob = useCallback((jobId: string): Job | undefined => {
    return jobQueue.getJob(jobId)
  }, [])
  
  // Get jobs by status
  const getJobsByStatus = useCallback((status: JobStatus | JobStatus[]): Job[] => {
    return jobQueue.getJobsByStatus(status)
  }, [])
  
  return {
    jobs,
    runningJob,
    pendingCount,
    isInitialized,
    isProcessing: runningJob !== null,
    enqueueFlashcards,
    enqueueGlossary,
    enqueueQuiz,
    enqueueRating,
    enqueuePublish,
    hasActiveJob,
    cancelJob,
    deleteJob,
    clearTerminalJobs,
    getJob,
    getJobsByStatus,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER HOOKS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to register a job processor
 */
export function useJobProcessor(type: JobType, processor: JobProcessor): void {
  useEffect(() => {
    registerJobProcessor(type, processor)
  }, [type, processor])
}

/**
 * Hook to watch a specific job
 */
export function useWatchJob(jobId: string | null): Job | null {
  const [job, setJob] = useState<Job | null>(null)
  
  useEffect(() => {
    if (!jobId) {
      setJob(null)
      return
    }
    
    // Get initial state
    setJob(jobQueue.getJob(jobId) || null)
    
    // Subscribe to updates
    const unsubscribe = subscribeToJobs((event) => {
      if (event.job.id === jobId) {
        setJob(event.job)
      }
    })
    
    return unsubscribe
  }, [jobId])
  
  return job
}

// Re-export types and helpers
export { JOB_TYPE_LABELS, isJobTerminal }
export type { Job, JobType, JobStatus, JobEvent }









