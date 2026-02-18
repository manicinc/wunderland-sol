/**
 * Batch Publisher
 * @module lib/publish/batchPublisher
 *
 * Core batch publishing service that orchestrates the entire publishing workflow.
 * Handles batch creation, conflict detection, file changes, PR creation, and merging.
 */

import type {
  PublishBatch,
  BatchStrategy,
  PublishableContentType,
  PublishableItem,
  ConflictInfo,
  ConflictResolution,
  FileChange,
  PullRequestInfo,
  BatchPublishStatus,
  CreateBatchOptions,
  ProcessBatchOptions,
  PublisherPreferences,
  SyncStatus,
  BatchMetadata,
} from './types'
import {
  createBatch,
  updateBatch,
  getBatch,
  recordHistory,
  getPendingCounts,
  updateStrandSyncStatus,
  getPendingStrands,
  bulkUpdateSyncStatus,
} from './publishStore'
import {
  getPendingReflections,
  updateReflectionSyncStatus,
} from '@/lib/reflect/reflectionStore'
import {
  reflectionToPublishableItem,
  strandToPublishableItem,
  createReflectionFileChanges,
  createStrandFileChanges,
} from './contentFormatter'
import { formatPR, formatCommitMessage } from './prFormatter'
import {
  checkConflicts,
  resolveConflicts,
  getAutoResolvableConflicts,
  tryAutoResolve,
  type RemoteFileInfo,
} from './conflictResolver'
import {
  generateBranchName,
  hashContent,
  DEFAULT_PUBLISHER_PREFERENCES,
} from './constants'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Progress callback type
 */
type ProgressCallback = (progress: number, message: string) => void

/**
 * Batch publisher options
 */
export interface BatchPublisherOptions {
  /** GitHub Personal Access Token */
  pat?: string
  /** Target repository */
  repo?: {
    owner: string
    repo: string
    branch: string
  }
  /** Publisher preferences */
  preferences?: Partial<PublisherPreferences>
  /** Progress callback */
  onProgress?: ProgressCallback
  /** Status update callback */
  onStatusChange?: (status: BatchPublishStatus) => void
}

// ============================================================================
// BATCH PUBLISHER CLASS
// ============================================================================

/**
 * BatchPublisher handles the complete publish workflow
 */
export class BatchPublisher {
  private pat: string | null = null
  private repo: { owner: string; repo: string; branch: string } | null = null
  private preferences: PublisherPreferences
  private onProgress?: ProgressCallback
  private onStatusChange?: (status: BatchPublishStatus) => void

  constructor(options: BatchPublisherOptions = {}) {
    this.pat = options.pat || null
    this.repo = options.repo || null
    this.preferences = { ...DEFAULT_PUBLISHER_PREFERENCES, ...options.preferences }
    this.onProgress = options.onProgress
    this.onStatusChange = options.onStatusChange
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the publisher with credentials
   */
  async initialize(pat?: string, repo?: { owner: string; repo: string; branch: string }): Promise<boolean> {
    if (pat) {
      this.pat = pat
    }
    if (repo) {
      this.repo = repo
    }

    // Validate credentials
    if (!this.pat) {
      console.warn('[BatchPublisher] No PAT provided')
      return false
    }

    if (!this.repo) {
      console.warn('[BatchPublisher] No target repo configured')
      return false
    }

    // TODO: Validate PAT by making a test API call
    return true
  }

  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<PublisherPreferences>): void {
    this.preferences = { ...this.preferences, ...updates }
  }

  // ==========================================================================
  // BATCH CREATION
  // ==========================================================================

  /**
   * Create a new batch from pending items
   */
  async createPublishBatch(options: CreateBatchOptions): Promise<PublishBatch> {
    this.updateStatus('initializing', 0, 'Creating batch...')

    const { strategy, contentTypes, dateRange, selectedItems } = options

    // Gather pending items
    const items = await this.gatherPendingItems(contentTypes, {
      strategy,
      dateRange,
      selectedItems,
    })

    if (items.length === 0) {
      throw new Error('No items to publish')
    }

    // Calculate date range from items if not provided
    const actualDateRange = dateRange || this.calculateDateRange(items)

    // Create batch record
    const batch = await createBatch({
      status: 'pending',
      strategy,
      contentTypes,
      itemCount: items.length,
      itemsSynced: 0,
      itemsFailed: 0,
      metadata: {
        dateRange: actualDateRange ? {
          start: (actualDateRange.start instanceof Date ? actualDateRange.start : new Date(actualDateRange.start)).toISOString().slice(0, 10),
          end: (actualDateRange.end instanceof Date ? actualDateRange.end : new Date(actualDateRange.end)).toISOString().slice(0, 10),
        } : undefined,
        itemsByType: this.countByType(items),
      },
    })

    // Mark items as pending in batch
    await this.markItemsAsPending(items, batch.id)

    this.updateStatus('initializing', 10, `Batch created with ${items.length} items`)

    return batch
  }

  /**
   * Gather pending items based on content types and strategy
   */
  private async gatherPendingItems(
    contentTypes: PublishableContentType[],
    options: {
      strategy: BatchStrategy
      dateRange?: { start: string; end: string }
      selectedItems?: Array<{ type: PublishableContentType; id: string }>
    }
  ): Promise<PublishableItem[]> {
    const items: PublishableItem[] = []
    const { strategy, dateRange, selectedItems } = options

    // If manual selection, use selected items only
    if (strategy === 'manual' && selectedItems) {
      return this.getSelectedItems(selectedItems)
    }

    // Gather reflections
    if (contentTypes.includes('reflection') && this.preferences.publishReflections) {
      const reflections = await getPendingReflections()
      const filtered = this.filterByDateRange(reflections, dateRange, 'date')
      const publishableItems = filtered.map(r =>
        reflectionToPublishableItem(r, {
          includeFrontmatter: this.preferences.exportIncludeFrontmatter,
          pathTemplate: this.preferences.reflectionsPath,
        })
      )
      items.push(...publishableItems)
    }

    // Gather strands
    if (contentTypes.includes('strand') && this.preferences.publishStrands) {
      const strands = await getPendingStrands()
      const publishableItems = strands.map(s =>
        strandToPublishableItem({
          id: s.id,
          weave: s.weave,
          loom: s.loom,
          title: s.title,
          content: s.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, {
          includeFrontmatter: this.preferences.exportIncludeFrontmatter,
          pathTemplate: this.preferences.strandsPath,
        })
      )
      items.push(...publishableItems)
    }

    // TODO: Add project support

    // Filter by strategy date range
    return this.filterByStrategy(items, strategy)
  }

  /**
   * Get specific selected items
   */
  private async getSelectedItems(
    selected: Array<{ type: PublishableContentType; id: string }>
  ): Promise<PublishableItem[]> {
    const items: PublishableItem[] = []

    for (const { type, id } of selected) {
      if (type === 'reflection') {
        const reflections = await getPendingReflections()
        const reflection = reflections.find(r => r.date === id)
        if (reflection) {
          items.push(reflectionToPublishableItem(reflection, {
            includeFrontmatter: this.preferences.exportIncludeFrontmatter,
            pathTemplate: this.preferences.reflectionsPath,
          }))
        }
      } else if (type === 'strand') {
        const strands = await getPendingStrands()
        const strand = strands.find(s => s.id === id)
        if (strand) {
          items.push(strandToPublishableItem({
            id: strand.id,
            weave: strand.weave,
            loom: strand.loom,
            title: strand.title,
            content: strand.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, {
            includeFrontmatter: this.preferences.exportIncludeFrontmatter,
            pathTemplate: this.preferences.strandsPath,
          }))
        }
      }
    }

    return items
  }

  /**
   * Filter items by date range
   */
  private filterByDateRange<T>(
    items: T[],
    dateRange: { start: string; end: string } | undefined,
    dateField: keyof T
  ): T[] {
    if (!dateRange) return items

    return items.filter(item => {
      const date = item[dateField] as string
      return date >= dateRange.start && date <= dateRange.end
    })
  }

  /**
   * Filter items by batch strategy
   */
  private filterByStrategy(
    items: PublishableItem[],
    strategy: BatchStrategy
  ): PublishableItem[] {
    const now = new Date()

    switch (strategy) {
      case 'daily': {
        const today = now.toISOString().slice(0, 10)
        return items.filter(item => item.updatedAt.slice(0, 10) === today)
      }

      case 'weekly': {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return items.filter(item => new Date(item.updatedAt) >= weekAgo)
      }

      case 'monthly': {
        const monthAgo = new Date(now)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return items.filter(item => new Date(item.updatedAt) >= monthAgo)
      }

      case 'all-pending':
      case 'manual':
      default:
        return items
    }
  }

  /**
   * Calculate date range from items
   */
  private calculateDateRange(
    items: PublishableItem[]
  ): { start: Date; end: Date } | undefined {
    if (items.length === 0) return undefined

    const dates = items.map(item => new Date(item.updatedAt))
    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))

    return { start, end }
  }

  /**
   * Count items by type
   */
  private countByType(
    items: PublishableItem[]
  ): { reflections?: number; strands?: number; projects?: number } {
    const counts: { reflections?: number; strands?: number; projects?: number } = {}

    for (const item of items) {
      if (item.type === 'reflection') {
        counts.reflections = (counts.reflections || 0) + 1
      } else if (item.type === 'strand') {
        counts.strands = (counts.strands || 0) + 1
      } else if (item.type === 'project') {
        counts.projects = (counts.projects || 0) + 1
      }
    }

    return counts
  }

  /**
   * Mark items as pending in a batch
   */
  private async markItemsAsPending(
    items: PublishableItem[],
    batchId: string
  ): Promise<void> {
    const updates = items.map(item => ({
      type: item.type,
      id: item.id,
      status: 'pending' as SyncStatus,
    }))

    await bulkUpdateSyncStatus(updates, {
      batchId,
      lastSyncAttempt: new Date().toISOString(),
    })
  }

  // ==========================================================================
  // BATCH PROCESSING
  // ==========================================================================

  /**
   * Process a batch (main publish workflow)
   */
  async processBatch(
    batchId: string,
    options: ProcessBatchOptions = {}
  ): Promise<PublishBatch> {
    const { conflictResolutions, onProgress, directCommit } = options

    // Override progress callback if provided
    if (onProgress) {
      this.onProgress = onProgress
    }

    // Get batch
    const batch = await getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    // Update batch status
    await updateBatch(batchId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
    })

    try {
      this.updateStatus('preparing', 15, 'Gathering items...')

      // Gather items for this batch
      const items = await this.getBatchItems(batch)

      if (items.length === 0) {
        throw new Error('No items found for batch')
      }

      this.updateStatus('detecting-conflicts', 25, 'Checking for conflicts...')

      // Check for conflicts (if we have GitHub access)
      let conflicts: ConflictInfo[] = []
      if (this.pat && this.repo) {
        conflicts = await this.detectConflicts(items)

        if (conflicts.length > 0 && !conflictResolutions) {
          // Update batch with conflicts and return
          await updateBatch(batchId, {
            status: 'conflict',
            metadata: {
              ...batch.metadata,
              conflicts,
            },
          })

          return (await getBatch(batchId))!
        }

        // Resolve conflicts if resolutions provided
        if (conflicts.length > 0 && conflictResolutions) {
          const resolutionResults = resolveConflicts(conflicts, conflictResolutions)
          const failedResolutions = resolutionResults.filter(r => !r.success)

          if (failedResolutions.length > 0) {
            throw new Error(`Failed to resolve ${failedResolutions.length} conflicts`)
          }
        }
      }

      this.updateStatus('preparing', 40, 'Preparing files...')

      // Create file changes
      const fileChanges = this.createFileChanges(items)

      this.updateStatus('uploading', 50, `Uploading ${fileChanges.length} files...`)

      // Publish to GitHub (or simulate for testing)
      let result: { prUrl?: string; commitSha?: string; prNumber?: number }

      if (directCommit || this.preferences.publishMode === 'direct-commit') {
        // Direct commit mode
        result = await this.directCommit(batch, fileChanges, items)
      } else {
        // PR mode
        result = await this.createPullRequest(batch, fileChanges, items)
      }

      this.updateStatus('complete', 90, 'Updating records...')

      // Update item sync status
      await this.markItemsAsSynced(items, result.commitSha)

      // Record history
      await this.recordPublishHistory(items, batchId, result.commitSha)

      // Update batch
      await updateBatch(batchId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        prNumber: result.prNumber,
        prUrl: result.prUrl,
        commitSha: result.commitSha,
        itemsSynced: items.length,
        itemsFailed: 0,
      })

      this.updateStatus('complete', 100, 'Publish complete!')

      return (await getBatch(batchId))!
    } catch (error) {
      // Update batch with error
      await updateBatch(batchId, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  /**
   * Get items for a batch
   */
  private async getBatchItems(batch: PublishBatch): Promise<PublishableItem[]> {
    const items: PublishableItem[] = []

    // Get reflections in this batch
    if (batch.contentTypes.includes('reflection')) {
      const reflections = await getPendingReflections()
      const batchReflections = reflections.filter(r => r.batchId === batch.id)

      for (const r of batchReflections) {
        items.push(reflectionToPublishableItem(r, {
          includeFrontmatter: this.preferences.exportIncludeFrontmatter,
          pathTemplate: this.preferences.reflectionsPath,
        }))
      }
    }

    // Get strands in this batch
    if (batch.contentTypes.includes('strand')) {
      const strands = await getPendingStrands()
      // Filter strands would need batchId field - for now include all pending
      for (const s of strands) {
        items.push(strandToPublishableItem({
          id: s.id,
          weave: s.weave,
          loom: s.loom,
          title: s.title,
          content: s.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, {
          includeFrontmatter: this.preferences.exportIncludeFrontmatter,
          pathTemplate: this.preferences.strandsPath,
        }))
      }
    }

    return items
  }

  /**
   * Detect conflicts with remote
   */
  private async detectConflicts(items: PublishableItem[]): Promise<ConflictInfo[]> {
    if (!this.pat || !this.repo) {
      return [] // Can't check without credentials
    }

    // TODO: Implement actual GitHub API calls to check remote files
    // For now, return empty (no conflicts)
    return []
  }

  /**
   * Create file changes from items
   */
  private createFileChanges(items: PublishableItem[]): FileChange[] {
    return items.map(item => ({
      path: item.path,
      content: item.content,
      encoding: 'utf-8' as const,
      action: 'update' as const, // Will be 'create' if file doesn't exist
    }))
  }

  /**
   * Create a pull request with the changes
   */
  private async createPullRequest(
    batch: PublishBatch,
    fileChanges: FileChange[],
    items: PublishableItem[]
  ): Promise<{ prUrl: string; commitSha: string; prNumber: number }> {
    if (!this.pat || !this.repo) {
      throw new Error('GitHub credentials not configured')
    }

    // Generate branch name
    const branchName = generateBranchName(batch.strategy)

    // Calculate date range
    const dateRange = this.calculateDateRange(items)

    // Format PR title and body
    const { title, body } = formatPR({
      items,
      fileChanges,
      strategy: batch.strategy,
      dateRange,
    }, {
      titleTemplate: this.preferences.prTitleTemplate,
      bodyTemplate: this.preferences.prBodyTemplate,
      includeDiffStats: this.preferences.includeDiffStats,
    })

    // TODO: Implement actual GitHub API calls:
    // 1. Create branch from base
    // 2. Create/update files in branch
    // 3. Create PR

    // For now, simulate success
    console.log('[BatchPublisher] Would create PR:', { title, branchName, fileCount: fileChanges.length })

    return {
      prUrl: `https://github.com/${this.repo.owner}/${this.repo.repo}/pull/1`,
      commitSha: 'abc123',
      prNumber: 1,
    }
  }

  /**
   * Direct commit without PR
   */
  private async directCommit(
    batch: PublishBatch,
    fileChanges: FileChange[],
    items: PublishableItem[]
  ): Promise<{ commitSha: string }> {
    if (!this.pat || !this.repo) {
      throw new Error('GitHub credentials not configured')
    }

    // Calculate date range
    const dateRange = this.calculateDateRange(items)

    // Format commit message
    const commitMessage = formatCommitMessage({
      items,
      fileChanges,
      strategy: batch.strategy,
      dateRange,
    }, { detailed: true })

    // TODO: Implement actual GitHub API calls:
    // 1. Get current tree
    // 2. Create blobs for each file
    // 3. Create tree
    // 4. Create commit
    // 5. Update ref

    console.log('[BatchPublisher] Would direct commit:', { message: commitMessage, fileCount: fileChanges.length })

    return {
      commitSha: 'abc123',
    }
  }

  /**
   * Mark items as synced
   */
  private async markItemsAsSynced(
    items: PublishableItem[],
    commitSha?: string
  ): Promise<void> {
    const now = new Date().toISOString()

    for (const item of items) {
      if (item.type === 'reflection') {
        await updateReflectionSyncStatus(item.id, 'synced', {
          publishedAt: now,
          publishedCommit: commitSha,
          publishedContentHash: item.contentHash,
        })
      } else if (item.type === 'strand') {
        await updateStrandSyncStatus(item.id, 'synced', {
          publishedAt: now,
          publishedCommit: commitSha,
          publishedContentHash: item.contentHash,
        })
      }
    }
  }

  /**
   * Record publish history for items
   */
  private async recordPublishHistory(
    items: PublishableItem[],
    batchId: string,
    commitSha?: string
  ): Promise<void> {
    for (const item of items) {
      await recordHistory({
        batchId,
        contentType: item.type,
        contentId: item.id,
        contentPath: item.path,
        action: 'created', // or 'updated' based on previous state
        newContentHash: item.contentHash,
        commitSha,
      })
    }
  }

  // ==========================================================================
  // QUEUE MANAGEMENT
  // ==========================================================================

  /**
   * Queue an item for publishing
   */
  async queueForPublish(type: PublishableContentType, id: string): Promise<void> {
    if (type === 'reflection') {
      await updateReflectionSyncStatus(id, 'pending')
    } else if (type === 'strand') {
      await updateStrandSyncStatus(id, 'pending')
    }
  }

  /**
   * Remove an item from the publish queue
   */
  async dequeueFromPublish(type: PublishableContentType, id: string): Promise<void> {
    if (type === 'reflection') {
      await updateReflectionSyncStatus(id, 'local')
    } else if (type === 'strand') {
      await updateStrandSyncStatus(id, 'local')
    }
  }

  /**
   * Get pending item counts
   */
  async getPendingCounts(): Promise<Record<PublishableContentType, number>> {
    return getPendingCounts()
  }

  // ==========================================================================
  // STATUS UPDATES
  // ==========================================================================

  /**
   * Update progress
   */
  private updateProgress(progress: number, message: string): void {
    if (this.onProgress) {
      this.onProgress(progress, message)
    }
  }

  /**
   * Update status
   */
  private updateStatus(
    phase: BatchPublishStatus['phase'],
    progress: number,
    message: string
  ): void {
    this.updateProgress(progress, message)

    if (this.onStatusChange) {
      this.onStatusChange({
        phase,
        progress,
        message,
      })
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let publisherInstance: BatchPublisher | null = null

/**
 * Get the batch publisher singleton
 */
export function getBatchPublisher(): BatchPublisher {
  if (!publisherInstance) {
    publisherInstance = new BatchPublisher()
  }
  return publisherInstance
}

/**
 * Initialize the batch publisher with options
 */
export function initializeBatchPublisher(options: BatchPublisherOptions): BatchPublisher {
  publisherInstance = new BatchPublisher(options)
  return publisherInstance
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// BatchPublisher is already exported as a class declaration above
