/**
 * Job Queue Hook
 * @module lib/hooks/useJobQueue
 *
 * React hook for subscribing to job queue state and events.
 * Provides real-time updates on job progress, status changes, and queue state.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  jobQueue,
  initializeJobQueue,
  cancelJob as cancelJobFn,
  type JobProcessor,
} from '@/lib/jobs/jobQueue'
import {
  type Job,
  type JobType,
  type JobStatus,
  type JobEvent,
  type JobEventType,
  isJobTerminal,
  isJobCancellable,
  JOB_TYPE_LABELS,
  JOB_TYPE_ICONS,
} from '@/lib/jobs/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UseJobQueueOptions {
  /** Filter jobs by type(s) */
  filterTypes?: JobType[]
  /** Filter jobs by status(es) */
  filterStatuses?: JobStatus[]
  /** Maximum number of completed jobs to keep in the list */
  maxCompleted?: number
  /** Callback when any job event occurs */
  onJobEvent?: (event: JobEvent) => void
  /** Callback when a job completes */
  onJobCompleted?: (job: Job) => void
  /** Callback when a job fails */
  onJobFailed?: (job: Job) => void
  /** Auto-remove completed jobs after this delay (ms) */
  autoRemoveCompletedDelay?: number | null
}

export interface UseJobQueueReturn {
  /** All jobs matching the filters */
  jobs: Job[]
  /** Currently running jobs */
  runningJobs: Job[]
  /** Pending jobs */
  pendingJobs: Job[]
  /** Completed jobs (includes failed/cancelled) */
  completedJobs: Job[]
  /** Number of active (pending + running) jobs */
  activeCount: number
  /** Number of pending jobs */
  pendingCount: number
  /** Whether any jobs are currently running */
  isProcessing: boolean
  /** Whether the queue has been initialized */
  isInitialized: boolean
  /** Cancel a job by ID */
  cancelJob: (jobId: string) => Promise<boolean>
  /** Clear all completed/failed/cancelled jobs */
  clearCompleted: () => Promise<number>
  /** Get a job by ID */
  getJob: (jobId: string) => Job | undefined
  /** Most recent event */
  lastEvent: JobEvent | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for subscribing to job queue state and events
 */
export function useJobQueue(options: UseJobQueueOptions = {}): UseJobQueueReturn {
  const {
    filterTypes,
    filterStatuses,
    maxCompleted = 10,
    onJobEvent,
    onJobCompleted,
    onJobFailed,
    autoRemoveCompletedDelay = null,
  } = options

  const [jobs, setJobs] = useState<Job[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastEvent, setLastEvent] = useState<JobEvent | null>(null)

  // Refs for callbacks to avoid re-subscribing on every render
  const onJobEventRef = useRef(onJobEvent)
  const onJobCompletedRef = useRef(onJobCompleted)
  const onJobFailedRef = useRef(onJobFailed)

  // Keep refs updated
  useEffect(() => {
    onJobEventRef.current = onJobEvent
    onJobCompletedRef.current = onJobCompleted
    onJobFailedRef.current = onJobFailed
  }, [onJobEvent, onJobCompleted, onJobFailed])

  // Initialize the queue and subscribe to events
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = async () => {
      await initializeJobQueue()
      setIsInitialized(true)

      // Get initial jobs
      setJobs(jobQueue.getJobs())

      // Subscribe to events
      unsubscribe = jobQueue.subscribe((event: JobEvent) => {
        setLastEvent(event)

        // Update jobs list
        setJobs(jobQueue.getJobs())

        // Call event callbacks
        if (onJobEventRef.current) {
          onJobEventRef.current(event)
        }

        if (event.type === 'job:completed' && onJobCompletedRef.current) {
          onJobCompletedRef.current(event.job)
        }

        if (event.type === 'job:failed' && onJobFailedRef.current) {
          onJobFailedRef.current(event.job)
        }
      })
    }

    init()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Auto-remove completed jobs after delay
  useEffect(() => {
    if (autoRemoveCompletedDelay === null) return

    const completedJobs = jobs.filter(
      (j) => isJobTerminal(j.status) && j.completedAt
    )

    const timeouts: NodeJS.Timeout[] = []

    for (const job of completedJobs) {
      const completedAt = new Date(job.completedAt!).getTime()
      const elapsed = Date.now() - completedAt
      const remaining = autoRemoveCompletedDelay - elapsed

      if (remaining <= 0) {
        // Already past the delay, remove immediately
        jobQueue.deleteJob(job.id)
      } else {
        // Schedule removal
        const timeout = setTimeout(() => {
          jobQueue.deleteJob(job.id)
          setJobs(jobQueue.getJobs())
        }, remaining)
        timeouts.push(timeout)
      }
    }

    return () => {
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [jobs, autoRemoveCompletedDelay])

  // Filter and categorize jobs
  const filteredJobs = useMemo(() => {
    let result = jobs

    // Filter by types
    if (filterTypes && filterTypes.length > 0) {
      result = result.filter((j) => filterTypes.includes(j.type))
    }

    // Filter by statuses
    if (filterStatuses && filterStatuses.length > 0) {
      result = result.filter((j) => filterStatuses.includes(j.status))
    }

    return result
  }, [jobs, filterTypes, filterStatuses])

  const runningJobs = useMemo(
    () => filteredJobs.filter((j) => j.status === 'running'),
    [filteredJobs]
  )

  const pendingJobs = useMemo(
    () => filteredJobs.filter((j) => j.status === 'pending'),
    [filteredJobs]
  )

  const completedJobs = useMemo(() => {
    const completed = filteredJobs.filter((j) => isJobTerminal(j.status))
    // Limit to maxCompleted, keeping the most recent
    return completed.slice(0, maxCompleted)
  }, [filteredJobs, maxCompleted])

  const activeCount = runningJobs.length + pendingJobs.length
  const isProcessing = runningJobs.length > 0

  // Cancel a job
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    const result = await cancelJobFn(jobId)
    // Update jobs list after cancellation
    setJobs(jobQueue.getJobs())
    return result
  }, [])

  // Clear all completed jobs
  const clearCompleted = useCallback(async (): Promise<number> => {
    const count = await jobQueue.clearTerminalJobs()
    setJobs(jobQueue.getJobs())
    return count
  }, [])

  // Get a job by ID
  const getJob = useCallback(
    (jobId: string): Job | undefined => {
      return jobs.find((j) => j.id === jobId)
    },
    [jobs]
  )

  return {
    jobs: filteredJobs,
    runningJobs,
    pendingJobs,
    completedJobs,
    activeCount,
    pendingCount: pendingJobs.length,
    isProcessing,
    isInitialized,
    cancelJob,
    clearCompleted,
    getJob,
    lastEvent,
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER HOOKS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to get a specific job by ID with real-time updates
 */
export function useJob(jobId: string | null): Job | null {
  const { jobs } = useJobQueue()

  return useMemo(() => {
    if (!jobId) return null
    return jobs.find((j) => j.id === jobId) || null
  }, [jobs, jobId])
}

/**
 * Hook to check if there are any active jobs of a specific type
 */
export function useActiveJobOfType(type: JobType): Job | null {
  const { jobs } = useJobQueue({ filterTypes: [type] })

  return useMemo(() => {
    return (
      jobs.find((j) => j.status === 'running' || j.status === 'pending') || null
    )
  }, [jobs])
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format job duration as human-readable string
 */
export function formatJobDuration(job: Job): string {
  if (!job.startedAt) return ''

  const start = new Date(job.startedAt).getTime()
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now()
  const durationMs = end - start

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Get relative time since job completed
 */
export function getJobRelativeTime(job: Job): string {
  if (!job.completedAt) return ''

  const completedAt = new Date(job.completedAt).getTime()
  const now = Date.now()
  const diffMs = now - completedAt

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// Re-export utilities from types for convenience
export { isJobTerminal, isJobCancellable, JOB_TYPE_LABELS, JOB_TYPE_ICONS }
export type { Job, JobType, JobStatus, JobEvent, JobEventType }

export default useJobQueue
