/**
 * Job Queue Module
 * @module lib/jobs
 * 
 * Background job queue for heavy generation tasks.
 * Includes both:
 * - Generic job queue (flashcards, quizzes, etc.)
 * - Image generation job manager with pause/resume/cancel
 */

// Types (generic job queue)
export * from './types'

// Job Queue Service (generic jobs for flashcards, quizzes, etc.)
export {
  jobQueue,
  initializeJobQueue,
  enqueueJob,
  cancelJob as cancelQueueJob,
  getJob as getQueueJob,
  getJobs as getQueueJobs,
  getRunningJob,
  getPendingCount,
  subscribeToJobs,
  registerJobProcessor,
  type JobProcessor,
} from './jobQueue'

// Processors
export { publishStrandProcessor } from './processors/publishStrand'
export { publishProjectProcessor } from './processors/publishProject'
export { flashcardGenerationProcessor } from './processors/flashcardGeneration'
export { glossaryProcessor } from './processors/glossary'
export { quizGenerationProcessor } from './processors/quizGeneration'

// Job Storage (IndexedDB persistence for image generation jobs)
// Note: JobStatus from storage has additional states: 'paused', 'batch-complete'
// We export it as ImageJobStatus to avoid conflict with types.ts JobStatus
export {
  type JobStatus as ImageJobStatus,
  type JobRecord,
  type GeneratedImageRecord,
  isStorageAvailable,
  createJob,
  getJob,
  updateJob,
  deleteJob,
  getJobs,
  getRecentJobs,
  saveImage,
  getImage,
  getJobImages,
  deleteImage,
  getNextBatch,
  isBatchComplete,
  isJobComplete,
  cleanupOldJobs,
  getStorageStats,
} from './storage'

// Job Manager (image generation lifecycle)
export {
  type JobManagerCallbacks,
  type CreateJobOptions,
  startJob,
  pauseJob,
  resumeJob,
  cancelJob,
  continueJob,
  getJobStatus,
  getActiveJobs,
  isJobActive,
} from './manager'
