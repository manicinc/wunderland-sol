/**
 * ML Auto-Trigger
 *
 * Orchestrator for automatic ML processing (block tagging, embeddings,
 * summarization) when strands are saved or published.
 *
 * Features:
 * - Smart staleness detection (only process changed content)
 * - Debouncing to prevent rapid-fire jobs
 * - Duplicate job prevention
 * - User-configurable settings
 *
 * @module lib/jobs/autoTrigger
 */

import type { StrandMetadata } from '@/components/quarry/types'
import type { ReindexStrandPayload } from './types'
import { jobQueue } from './jobQueue'
import { checkStrandStaleness } from './stalenessDetector'
import { hashContent } from '../search/embeddingStore'
import {
  getMLAutoTriggerSettings,
  getConfidenceThresholdForPreset,
  isLLMEnabledForPreset,
  type MLAutoTriggerSettings,
} from '../settings/mlAutoTriggerSettings'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trigger source - what initiated the ML processing
 */
export type TriggerSource = 'save' | 'publish' | 'manual' | 'batch'

/**
 * Result of auto-trigger attempt
 */
export interface AutoTriggerResult {
  /** Whether a job was triggered */
  triggered: boolean
  /** Job ID if triggered, null otherwise */
  jobId: string | null
  /** Reason for the result */
  reason: AutoTriggerReason
  /** Additional details */
  details?: string
}

/**
 * Reason for auto-trigger result
 */
export type AutoTriggerReason =
  | 'queued' // Job was successfully queued
  | 'disabled' // ML auto-trigger is disabled in settings
  | 'save_trigger_disabled' // Save trigger specifically disabled
  | 'publish_trigger_disabled' // Publish trigger specifically disabled
  | 'up_to_date' // Content hasn't changed, no processing needed
  | 'duplicate_job' // Similar job already pending/running
  | 'debounced' // Within debounce window
  | 'error' // An error occurred

// ============================================================================
// DEBOUNCE TRACKING
// ============================================================================

/**
 * Track last trigger time per strand for debouncing
 */
const lastTriggerTime = new Map<string, number>()

/**
 * Check if we should debounce this trigger
 */
function shouldDebounce(strandPath: string, debounceMs: number): boolean {
  const lastTime = lastTriggerTime.get(strandPath)
  if (!lastTime) return false

  const elapsed = Date.now() - lastTime
  return elapsed < debounceMs
}

/**
 * Record trigger time for debouncing
 */
function recordTriggerTime(strandPath: string): void {
  lastTriggerTime.set(strandPath, Date.now())
}

/**
 * Clear debounce tracking (useful for testing)
 */
export function clearDebounceTracking(): void {
  lastTriggerTime.clear()
}

// ============================================================================
// MAIN TRIGGER FUNCTION
// ============================================================================

/**
 * Trigger ML processing for a strand
 *
 * This is the main entry point for automatic ML processing.
 * Call this after saving or publishing a strand.
 *
 * @param strandPath - Path to the strand
 * @param content - Current content of the strand
 * @param metadata - Current metadata of the strand
 * @param trigger - What triggered this call ('save' | 'publish' | 'manual')
 * @param options - Optional settings
 * @returns AutoTriggerResult with outcome details
 *
 * @example
 * ```ts
 * // After saving a strand
 * const result = await triggerMLProcessing(
 *   selectedFile.path,
 *   fileContent,
 *   updatedMetadata,
 *   'save'
 * )
 * if (result.triggered) {
 *   toast.info(`Processing started: ${result.jobId}`)
 * }
 * ```
 */
export async function triggerMLProcessing(
  strandPath: string,
  content: string,
  metadata: StrandMetadata,
  trigger: TriggerSource,
  options?: {
    /** Force processing regardless of staleness */
    force?: boolean
    /** Override settings (for testing or manual triggers) */
    settingsOverride?: Partial<MLAutoTriggerSettings>
  }
): Promise<AutoTriggerResult> {
  try {
    // 1. Load settings (with optional override)
    const baseSettings = getMLAutoTriggerSettings()
    const settings = options?.settingsOverride
      ? { ...baseSettings, ...options.settingsOverride }
      : baseSettings

    // 2. Check if ML auto-trigger is enabled
    if (!settings.enabled && trigger !== 'manual') {
      return {
        triggered: false,
        jobId: null,
        reason: 'disabled',
        details: 'ML auto-trigger is disabled in settings',
      }
    }

    // 3. Check trigger type settings
    if (trigger === 'save' && !settings.triggerOnSave) {
      return {
        triggered: false,
        jobId: null,
        reason: 'save_trigger_disabled',
        details: 'Save trigger is disabled in settings',
      }
    }

    if (trigger === 'publish' && !settings.triggerOnPublish) {
      return {
        triggered: false,
        jobId: null,
        reason: 'publish_trigger_disabled',
        details: 'Publish trigger is disabled in settings',
      }
    }

    // 4. Check debounce (skip for manual triggers)
    if (trigger !== 'manual' && shouldDebounce(strandPath, settings.debounceMs)) {
      return {
        triggered: false,
        jobId: null,
        reason: 'debounced',
        details: `Within ${settings.debounceMs}ms debounce window`,
      }
    }

    // 5. Smart staleness check (unless forced)
    if (settings.requireContentChange && !options?.force) {
      const staleness = await checkStrandStaleness(strandPath, content, {
        skipEmbeddingCheck: !settings.autoUpdateEmbeddings,
      })

      if (!staleness.needsReprocessing) {
        return {
          triggered: false,
          jobId: null,
          reason: 'up_to_date',
          details: `No changes detected (${staleness.reason})`,
        }
      }

      console.log(
        `[AutoTrigger] Strand needs processing: ${strandPath} (${staleness.reason})`
      )
    }

    // 6. Build job payload
    const payload: ReindexStrandPayload = {
      strandPath,
      reindexBlocks: settings.autoTagBlocks && settings.autoTagPreset !== 'disabled',
      updateEmbeddings: settings.autoUpdateEmbeddings,
      runTagBubbling: settings.autoRunTagBubbling,
      // Pass auto-tag settings for the processor
      autoTagSettings: {
        useLLM: isLLMEnabledForPreset(settings.autoTagPreset),
        confidenceThreshold: getConfidenceThresholdForPreset(settings.autoTagPreset),
      },
    }

    // 7. Check for duplicate jobs
    const existingJob = jobQueue.hasSimilarJob('reindex-strand', { strandPath })
    if (existingJob) {
      return {
        triggered: false,
        jobId: existingJob.id,
        reason: 'duplicate_job',
        details: `Similar job already exists: ${existingJob.id}`,
      }
    }

    // 8. Enqueue the job
    const jobId = await jobQueue.enqueue('reindex-strand', payload)

    if (!jobId) {
      // This shouldn't happen after the duplicate check, but handle it
      return {
        triggered: false,
        jobId: null,
        reason: 'duplicate_job',
        details: 'Job was blocked by queue duplicate prevention',
      }
    }

    // 9. Record trigger time for debouncing
    recordTriggerTime(strandPath)

    console.log(
      `[AutoTrigger] Queued job ${jobId} for: ${strandPath} (trigger: ${trigger})`
    )

    return {
      triggered: true,
      jobId,
      reason: 'queued',
      details: `Job ${jobId} queued for processing`,
    }
  } catch (error) {
    console.error('[AutoTrigger] Error:', error)
    return {
      triggered: false,
      jobId: null,
      reason: 'error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Trigger ML processing for multiple strands
 *
 * Useful for batch operations like import or regenerate-all.
 *
 * @param strands - Array of {path, content, metadata} objects
 * @param options - Optional settings
 * @returns Map of path → AutoTriggerResult
 */
export async function triggerBatchMLProcessing(
  strands: Array<{
    path: string
    content: string
    metadata: StrandMetadata
  }>,
  options?: {
    force?: boolean
    settingsOverride?: Partial<MLAutoTriggerSettings>
  }
): Promise<Map<string, AutoTriggerResult>> {
  const results = new Map<string, AutoTriggerResult>()

  // Process sequentially to avoid overwhelming the job queue
  for (const strand of strands) {
    const result = await triggerMLProcessing(
      strand.path,
      strand.content,
      strand.metadata,
      'batch',
      options
    )
    results.set(strand.path, result)
  }

  // Log summary
  const triggered = Array.from(results.values()).filter((r) => r.triggered).length
  const skipped = results.size - triggered
  console.log(
    `[AutoTrigger] Batch complete: ${triggered} triggered, ${skipped} skipped`
  )

  return results
}

// ============================================================================
// MANUAL TRIGGER HELPERS
// ============================================================================

/**
 * Force ML processing for a strand (ignores settings and staleness)
 *
 * Use this for manual "regenerate" buttons in the UI.
 */
export async function forceMLProcessing(
  strandPath: string,
  content: string,
  metadata: StrandMetadata,
  options?: {
    /** Which processing to run */
    reindexBlocks?: boolean
    updateEmbeddings?: boolean
    runTagBubbling?: boolean
    useLLM?: boolean
  }
): Promise<AutoTriggerResult> {
  return triggerMLProcessing(strandPath, content, metadata, 'manual', {
    force: true,
    settingsOverride: {
      enabled: true,
      autoTagBlocks: options?.reindexBlocks ?? true,
      autoUpdateEmbeddings: options?.updateEmbeddings ?? true,
      autoRunTagBubbling: options?.runTagBubbling ?? true,
      autoTagPreset: options?.useLLM ? 'default' : 'nlp-only',
    },
  })
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if ML processing would be triggered for a strand
 *
 * Dry-run check without actually queuing a job.
 * Useful for UI indicators.
 */
export async function wouldTriggerMLProcessing(
  strandPath: string,
  content: string,
  trigger: TriggerSource
): Promise<{ wouldTrigger: boolean; reason: AutoTriggerReason }> {
  const settings = getMLAutoTriggerSettings()

  // Check basic settings
  if (!settings.enabled && trigger !== 'manual') {
    return { wouldTrigger: false, reason: 'disabled' }
  }

  if (trigger === 'save' && !settings.triggerOnSave) {
    return { wouldTrigger: false, reason: 'save_trigger_disabled' }
  }

  if (trigger === 'publish' && !settings.triggerOnPublish) {
    return { wouldTrigger: false, reason: 'publish_trigger_disabled' }
  }

  // Check staleness
  if (settings.requireContentChange) {
    const staleness = await checkStrandStaleness(strandPath, content)
    if (!staleness.needsReprocessing) {
      return { wouldTrigger: false, reason: 'up_to_date' }
    }
  }

  // Check for existing jobs
  const existingJob = jobQueue.hasSimilarJob('reindex-strand', { strandPath })
  if (existingJob) {
    return { wouldTrigger: false, reason: 'duplicate_job' }
  }

  return { wouldTrigger: true, reason: 'queued' }
}

/**
 * Get human-readable description of auto-trigger reason
 */
export function getAutoTriggerReasonDescription(reason: AutoTriggerReason): string {
  switch (reason) {
    case 'queued':
      return 'Processing started'
    case 'disabled':
      return 'Auto-processing is disabled'
    case 'save_trigger_disabled':
      return 'Auto-processing on save is disabled'
    case 'publish_trigger_disabled':
      return 'Auto-processing on publish is disabled'
    case 'up_to_date':
      return 'No changes detected'
    case 'duplicate_job':
      return 'Already processing'
    case 'debounced':
      return 'Too many recent saves'
    case 'error':
      return 'An error occurred'
  }
}
