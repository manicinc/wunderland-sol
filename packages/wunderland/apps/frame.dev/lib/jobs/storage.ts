/**
 * Job Storage System
 * @module lib/jobs/storage
 *
 * Persistent storage for job state using IndexedDB.
 * Allows job resume after page refresh or browser close.
 */

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'codex-jobs'
const DB_VERSION = 1
const JOBS_STORE = 'jobs'
const IMAGES_STORE = 'generated-images'

type InMemoryStore = {
  jobs: Map<string, JobRecord>
  images: Map<string, GeneratedImageRecord>
}

function getInMemoryStore(): InMemoryStore {
  const globalAny = globalThis as unknown as { __codexJobsStore?: InMemoryStore }
  if (!globalAny.__codexJobsStore) {
    globalAny.__codexJobsStore = {
      jobs: new Map<string, JobRecord>(),
      images: new Map<string, GeneratedImageRecord>(),
    }
  }
  return globalAny.__codexJobsStore
}

export type JobStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'batch-complete'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface GeneratedImageRecord {
  /** Image ID */
  id: string
  /** Job ID this image belongs to */
  jobId: string
  /** Image URL (may be temporary) */
  url: string
  /** Base64 data URL (for persistence) */
  dataUrl?: string
  /** Prompt used */
  prompt: string
  /** Enhanced prompt after style injection */
  enhancedPrompt?: string
  /** Provider used */
  provider: 'openai' | 'replicate'
  /** Model used */
  model: string
  /** Page/chunk index this image is for */
  pageIndex: number
  /** Chunk ID from PDF conversion */
  chunkId?: string
  /** Seed used (if any) */
  seed?: number
  /** Generation cost in USD */
  cost?: number
  /** Creation timestamp */
  createdAt: Date
  /** Character names in the image */
  characterNames?: string[]
  /** Setting name in the image */
  settingName?: string
}

export interface JobRecord {
  /** Unique job ID */
  id: string
  /** Job type */
  type: 'illustration-generation'
  /** Current status */
  status: JobStatus
  /** Project/book title */
  projectTitle: string
  /** Total number of pages/chunks to process */
  totalItems: number
  /** Number of items completed */
  completedItems: number
  /** Current batch number (1-indexed) */
  currentBatch: number
  /** Items per batch */
  batchSize: number
  /** Provider to use */
  provider: 'openai' | 'replicate'
  /** Style preset ID */
  styleId?: string
  /** Style memory JSON for character consistency */
  styleMemory?: string
  /** Total estimated cost */
  estimatedCost: number
  /** Actual cost so far */
  actualCost: number
  /** Generated image IDs */
  imageIds: string[]
  /** Error message if failed */
  error?: string
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Completion timestamp */
  completedAt?: Date
  /** PDF chunks data (stored for resume) */
  chunks?: Array<{
    id: string
    title: string
    content: string
    pageRange: { start: number; end: number }
    illustrationPoints: number[]
  }>
  /** Advanced generation options metadata */
  metadata?: {
    quality?: 'standard' | 'hd'
    size?: '1024x1024' | '1792x1024' | '1024x1792'
    model?: 'flux-schnell' | 'flux-dev' | 'flux-pro'
    aspectRatio?: '1:1' | '16:9' | '9:16'
    costLimit?: number
    webhookUrl?: string
    webhookSecret?: string
    smartSkip?: boolean
    skipThreshold?: number
    useLLMForSkip?: boolean
    workStyleProfile?: import('@/lib/images/workStyleProfile').WorkStyleProfile
  }
}

let dbPromise: Promise<IDBPDatabase> | null = null

/**
 * Get or create the IndexedDB database
 */
async function getDB(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Jobs store
        if (!db.objectStoreNames.contains(JOBS_STORE)) {
          const jobStore = db.createObjectStore(JOBS_STORE, { keyPath: 'id' })
          jobStore.createIndex('status', 'status')
          jobStore.createIndex('createdAt', 'createdAt')
          jobStore.createIndex('projectTitle', 'projectTitle')
        }

        // Generated images store
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          const imageStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' })
          imageStore.createIndex('jobId', 'jobId')
          imageStore.createIndex('pageIndex', 'pageIndex')
          imageStore.createIndex('createdAt', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

/**
 * Check if job storage is available
 */
export function isStorageAvailable(): boolean {
  return true
}

// ============================================================================
// JOB OPERATIONS
// ============================================================================

/**
 * Create a new job
 */
export async function createJob(
  job: Omit<JobRecord, 'id' | 'createdAt' | 'updatedAt' | 'imageIds' | 'actualCost' | 'completedItems' | 'currentBatch'>
): Promise<JobRecord> {
  const db = await getDB()

  const newJob: JobRecord = {
    ...job,
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    completedItems: 0,
    currentBatch: 1,
    actualCost: 0,
    imageIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  if (db) {
    await db.put(JOBS_STORE, newJob)
  } else {
    const store = getInMemoryStore()
    store.jobs.set(newJob.id, newJob)
  }
  return newJob
}

/**
 * Get a job by ID
 */
export async function getJob(jobId: string): Promise<JobRecord | undefined> {
  const db = await getDB()
  if (db) {
    return db.get(JOBS_STORE, jobId)
  }
  return getInMemoryStore().jobs.get(jobId)
}

/**
 * Update a job
 */
export async function updateJob(
  jobId: string,
  updates: Partial<Omit<JobRecord, 'id' | 'createdAt'>>
): Promise<JobRecord | undefined> {
  const db = await getDB()
  const job = db ? await db.get(JOBS_STORE, jobId) : getInMemoryStore().jobs.get(jobId)

  if (!job) return undefined

  const updatedJob: JobRecord = {
    ...job,
    ...updates,
    updatedAt: new Date(),
  }

  if (db) {
    await db.put(JOBS_STORE, updatedJob)
  } else {
    getInMemoryStore().jobs.set(jobId, updatedJob)
  }
  return updatedJob
}

/**
 * Delete a job and its associated images
 */
export async function deleteJob(jobId: string): Promise<void> {
  const db = await getDB()
  if (db) {
    // Delete associated images
    const tx = db.transaction([JOBS_STORE, IMAGES_STORE], 'readwrite')
    const imageStore = tx.objectStore(IMAGES_STORE)
    const imageIndex = imageStore.index('jobId')
    const images = await imageIndex.getAll(jobId)

    for (const image of images) {
      await imageStore.delete(image.id)
    }

    // Delete the job
    await tx.objectStore(JOBS_STORE).delete(jobId)
    await tx.done
    return
  }

  const store = getInMemoryStore()
  store.jobs.delete(jobId)
  for (const [id, image] of store.images.entries()) {
    if (image.jobId === jobId) {
      store.images.delete(id)
    }
  }
}

/**
 * Get all jobs, optionally filtered by status
 */
export async function getJobs(status?: JobStatus): Promise<JobRecord[]> {
  const db = await getDB()
  if (db) {
    if (status) {
      return db.getAllFromIndex(JOBS_STORE, 'status', status)
    }
    return db.getAll(JOBS_STORE)
  }

  const jobs = Array.from(getInMemoryStore().jobs.values())
  return status ? jobs.filter(j => j.status === status) : jobs
}

/**
 * Get recent jobs
 */
export async function getRecentJobs(limit = 10): Promise<JobRecord[]> {
  const db = await getDB()
  const jobs = db ? await db.getAll(JOBS_STORE) : Array.from(getInMemoryStore().jobs.values())

  return jobs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

// ============================================================================
// IMAGE OPERATIONS
// ============================================================================

/**
 * Save a generated image
 */
export async function saveImage(image: GeneratedImageRecord): Promise<void> {
  const db = await getDB()
  if (db) {
    await db.put(IMAGES_STORE, image)
  } else {
    getInMemoryStore().images.set(image.id, image)
  }
}

/**
 * Get an image by ID
 */
export async function getImage(imageId: string): Promise<GeneratedImageRecord | undefined> {
  const db = await getDB()
  if (db) {
    return db.get(IMAGES_STORE, imageId)
  }
  return getInMemoryStore().images.get(imageId)
}

/**
 * Get all images for a job
 */
export async function getJobImages(jobId: string): Promise<GeneratedImageRecord[]> {
  const db = await getDB()
  const images = db
    ? await db.getAllFromIndex(IMAGES_STORE, 'jobId', jobId)
    : Array.from(getInMemoryStore().images.values()).filter(img => img.jobId === jobId)

  return images.sort((a, b) => a.pageIndex - b.pageIndex)
}

/**
 * Delete an image
 */
export async function deleteImage(imageId: string): Promise<void> {
  const db = await getDB()
  if (db) {
    await db.delete(IMAGES_STORE, imageId)
  } else {
    getInMemoryStore().images.delete(imageId)
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Get the next batch of items to process
 */
export function getNextBatch(
  job: JobRecord,
  allItems: Array<{ id: string; content: string }>,
): Array<{ id: string; content: string; index: number }> {
  const startIndex = job.completedItems
  const endIndex = Math.min(startIndex + job.batchSize, allItems.length)

  return allItems.slice(startIndex, endIndex).map((item, i) => ({
    ...item,
    index: startIndex + i,
  }))
}

/**
 * Check if current batch is complete
 */
export function isBatchComplete(job: JobRecord): boolean {
  const expectedBatchEnd = Math.min(job.currentBatch * job.batchSize, job.totalItems)
  return job.completedItems >= expectedBatchEnd
}

/**
 * Check if all items are complete
 */
export function isJobComplete(job: JobRecord): boolean {
  return job.completedItems >= job.totalItems
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old completed jobs (older than specified days)
 */
export async function cleanupOldJobs(maxAgeDays = 30): Promise<number> {
  const db = await getDB()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  const jobs = db ? await db.getAll(JOBS_STORE) : Array.from(getInMemoryStore().jobs.values())
  let deletedCount = 0

  for (const job of jobs) {
    if (
      (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') &&
      new Date(job.createdAt) < cutoffDate
    ) {
      await deleteJob(job.id)
      deletedCount++
    }
  }

  return deletedCount
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  jobCount: number
  imageCount: number
  pendingJobs: number
  runningJobs: number
  completedJobs: number
}> {
  const db = await getDB()
  const jobs = db ? await db.getAll(JOBS_STORE) : Array.from(getInMemoryStore().jobs.values())
  const images = db ? await db.getAll(IMAGES_STORE) : Array.from(getInMemoryStore().images.values())

  return {
    jobCount: jobs.length,
    imageCount: images.length,
    pendingJobs: jobs.filter(j => j.status === 'pending').length,
    runningJobs: jobs.filter(j => j.status === 'running').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
  }
}
