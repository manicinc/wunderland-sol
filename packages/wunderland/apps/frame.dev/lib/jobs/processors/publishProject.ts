/**
 * Publish Project Job Processor
 * @module lib/jobs/processors/publishProject
 *
 * Background job for publishing writing projects as strands.
 * Supports two formats:
 * - Single combined strand: All chapters in one file
 * - Folder strand: Project folder with strand.yml and chapter files
 */

import type { Job, JobResult } from '../types'
import type { JobProcessor } from '../jobQueue'
import type { PublishProjectOptions, PublishProjectResult } from '@/lib/write/types'
import { publishProject } from '@/lib/write/projectPublisher'

/**
 * Payload for publish-project jobs
 */
export interface PublishProjectJobPayload extends PublishProjectOptions {
  // Inherits all options from PublishProjectOptions
}

/**
 * Result from publish-project jobs
 */
export interface PublishProjectJobResult extends PublishProjectResult {
  // Inherits all fields from PublishProjectResult
}

/**
 * Publish project job processor
 *
 * Workflow:
 * 1. Load project from store
 * 2. Collect chapter content
 * 3. Generate strand format (single file or folder)
 * 4. Write to vault
 * 5. Update database
 * 6. Update project publishing status
 */
export const publishProjectProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as PublishProjectJobPayload

  const result = await publishProject(payload, onProgress)

  if (!result.success) {
    throw new Error(result.error || 'Publishing failed')
  }

  return result
}
