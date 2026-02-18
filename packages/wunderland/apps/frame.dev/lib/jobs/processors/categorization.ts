/**
 * Categorization Job Processor
 * @module lib/jobs/processors/categorization
 *
 * Processes categorization jobs using Web Worker for background execution.
 */

import type { Job, JobResult } from '../types'
import type {
  CategorizationJobPayload,
  CategorizationJobResult,
  CategorizationInput,
  CategorizationWorkerMessage,
  CategorizationWorkerResponse,
  CategorizationTask,
  CategorizationTaskProgress,
  CategorizationTaskResult,
  CategoryResult,
  CategorizationResultStatus,
  CategorizationActionType,
} from '@/lib/categorization/types'
import type { JobProcessor } from '../jobQueue'
import { DEFAULT_CONFIG } from '@/lib/categorization/algorithm'
import { getDb } from '@/lib/storage/localCodex'
import { v4 as uuidv4 } from 'uuid'

/**
 * Categorization processor
 *
 * Workflow:
 * 1. Load inbox files from specified paths
 * 2. Load categorization config from settings (or use default)
 * 3. Spawn Web Worker with files + config
 * 4. Stream progress updates to job queue
 * 5. Store results in categorization_results table
 * 6. Create categorization_actions for items meeting threshold
 * 7. Return summary statistics
 */
export const categorizationProcessor: JobProcessor = async (
  job: Job,
  onProgress: (progress: number, message: string) => void
): Promise<JobResult> => {
  const payload = job.payload as CategorizationJobPayload
  const {
    inboxPaths,
    autoApply = false,
    autoApplyThreshold = 0.95,
  } = payload

  onProgress(0, 'Initializing categorization...')

  // Load categorization config from settings or use default
  const db = await getDb()
  let config = DEFAULT_CONFIG

  try {
    const configRow = await db.get<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      ['categorization_config']
    )
    if (configRow) {
      config = JSON.parse(configRow.value)
    }
  } catch (error) {
    console.warn('[CategorizationProcessor] Failed to load config, using default:', error)
  }

  // Override thresholds from payload
  if (autoApplyThreshold) {
    config.auto_apply_threshold = autoApplyThreshold
  }

  onProgress(5, 'Loading inbox files...')

  // Load files from storage
  const inputs: CategorizationInput[] = []
  for (const path of inboxPaths) {
    try {
      // Read strand content from storage
      const strand = await db.get<{ path: string; title: string; content: string; metadata: string }>(
        'SELECT path, title, content, metadata FROM strands WHERE path = ?',
        [path]
      )

      if (strand) {
        inputs.push({
          path: strand.path,
          title: strand.title,
          content: strand.content,
          frontmatter: strand.metadata ? JSON.parse(strand.metadata) : undefined,
          config,
        })
      }
    } catch (error) {
      console.warn(`[CategorizationProcessor] Failed to load strand ${path}:`, error)
    }
  }

  if (inputs.length === 0) {
    throw new Error('No valid files found to categorize')
  }

  onProgress(10, `Loaded ${inputs.length} files, starting categorization...`)

  // Spawn Web Worker
  const worker = new Worker('/workers/categorization.worker.js', { type: 'module' })

  const result = await new Promise<CategorizationTaskResult>((resolve, reject) => {
    let progressTimeout: NodeJS.Timeout

    // Handle worker messages
    worker.addEventListener('message', (event: MessageEvent<CategorizationWorkerResponse>) => {
      const response = event.data

      switch (response.type) {
        case 'progress': {
          const progress = response.data as CategorizationTaskProgress
          // Map 10-90% progress to worker progress
          const mappedProgress = 10 + Math.round(progress.progress * 0.8)
          onProgress(
            mappedProgress,
            progress.message || `Processing ${progress.processed}/${progress.total} files...`
          )
          break
        }

        case 'complete': {
          const taskResult = response.data as CategorizationTaskResult
          clearTimeout(progressTimeout)
          worker.terminate()
          resolve(taskResult)
          break
        }

        case 'error': {
          clearTimeout(progressTimeout)
          worker.terminate()
          reject(new Error(response.error))
          break
        }
      }
    })

    worker.addEventListener('error', (event: ErrorEvent) => {
      clearTimeout(progressTimeout)
      worker.terminate()
      reject(new Error(`Worker error: ${event.message}`))
    })

    // Send task to worker
    const task: CategorizationTask = {
      id: job.id,
      inputs,
      config,
    }

    const message: CategorizationWorkerMessage = {
      type: 'categorize',
      task,
    }

    worker.postMessage(message)

    // Timeout after 10 minutes
    progressTimeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('Categorization timed out after 10 minutes'))
    }, 10 * 60 * 1000)
  })

  onProgress(90, 'Storing results...')

  // Store results in database
  const resultIds: string[] = []
  let autoApplied = 0
  let pendingReview = 0
  let failed = result.errors?.length || 0

  for (const categoryResult of result.results) {
    const resultId = uuidv4()
    resultIds.push(resultId)

    // Determine initial status
    let status: CategorizationResultStatus = 'pending'
    if (autoApply && categoryResult.action === 'auto-apply') {
      status = 'approved'
      autoApplied++
    } else {
      pendingReview++
    }

    // Insert categorization result
    await db.run(
      `INSERT INTO categorization_results (
        id, job_id, strand_path, current_category, suggested_category,
        confidence, reasoning, alternatives, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        job.id,
        categoryResult.filePath,
        categoryResult.currentPath,
        categoryResult.suggestion.category,
        categoryResult.suggestion.confidence,
        categoryResult.suggestion.reasoning,
        JSON.stringify(categoryResult.suggestion.alternatives),
        status,
        new Date().toISOString(),
      ]
    )

    // Create action if approved
    if (status === 'approved') {
      await createCategorizationAction(db, resultId, categoryResult)
    }
  }

  onProgress(100, 'Categorization complete')

  // Return job result
  const jobResult: CategorizationJobResult = {
    filesProcessed: result.results.length,
    autoApplied,
    pendingReview,
    failed,
    resultIds,
  }

  return jobResult
}

/**
 * Create categorization action in database
 */
async function createCategorizationAction(
  db: any,
  resultId: string,
  categoryResult: CategoryResult
): Promise<void> {
  const actionId = uuidv4()

  // Load strand content for the action
  const strand = (await db.get(
    'SELECT content, metadata FROM strands WHERE path = ?',
    [categoryResult.filePath]
  )) as { content: string; metadata: string } | undefined

  if (!strand) {
    throw new Error(`Strand not found: ${categoryResult.filePath}`)
  }

  // Determine action type based on confidence
  let actionType: CategorizationActionType
  if (categoryResult.suggestion.confidence >= 0.95) {
    actionType = 'move'
  } else if (categoryResult.suggestion.confidence >= 0.80) {
    actionType = 'create_pr'
  } else {
    actionType = 'create_issue'
  }

  // Calculate target path (move from current path to suggested category)
  const filename = categoryResult.filePath.split('/').pop() || 'untitled.md'
  const toPath = `${categoryResult.suggestion.category}${filename}`

  await db.run(
    `INSERT INTO categorization_actions (
      id, result_id, action_type, from_path, to_path,
      strand_content, metadata, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actionId,
      resultId,
      actionType,
      categoryResult.filePath,
      toPath,
      strand.content,
      strand.metadata || '{}',
      'pending',
      new Date().toISOString(),
    ]
  )
}
