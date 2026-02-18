/**
 * Publish Store
 * @module lib/publish/publishStore
 *
 * Database CRUD operations for the batch publishing system.
 * Handles publish_batches and publish_history tables.
 */

import { getDatabase } from '@/lib/codexDatabase'
import type {
  PublishBatch,
  StoredPublishBatch,
  PublishHistoryEntry,
  StoredPublishHistory,
  BatchStatus,
  BatchStrategy,
  PublishableContentType,
  PRState,
  PublishAction,
  SyncStatus,
  HistoryQueryOptions,
  BatchMetadata,
} from './types'
import { generateBatchId, generateHistoryId } from './constants'

// ============================================================================
// TYPE CONVERSION HELPERS
// ============================================================================

/**
 * Convert stored batch row to PublishBatch object
 */
function storedBatchToPublishBatch(row: StoredPublishBatch): PublishBatch {
  return {
    id: row.id,
    status: row.status as BatchStatus,
    strategy: row.strategy as BatchStrategy,
    contentTypes: JSON.parse(row.content_types) as PublishableContentType[],
    itemCount: row.item_count,
    itemsSynced: row.items_synced,
    itemsFailed: row.items_failed,
    prNumber: row.pr_number ?? undefined,
    prUrl: row.pr_url ?? undefined,
    prState: (row.pr_state as PRState) ?? undefined,
    commitSha: row.commit_sha ?? undefined,
    branchName: row.branch_name ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    error: row.error ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

/**
 * Convert stored history row to PublishHistoryEntry object
 */
function storedHistoryToEntry(row: StoredPublishHistory): PublishHistoryEntry {
  return {
    id: row.id,
    batchId: row.batch_id ?? undefined,
    contentType: row.content_type as PublishableContentType,
    contentId: row.content_id,
    contentPath: row.content_path,
    action: row.action as PublishAction,
    previousContentHash: row.previous_content_hash ?? undefined,
    newContentHash: row.new_content_hash ?? undefined,
    commitSha: row.commit_sha ?? undefined,
    createdAt: row.created_at,
  }
}

// ============================================================================
// BATCH CRUD OPERATIONS
// ============================================================================

/**
 * Create a new publish batch
 */
export async function createBatch(
  batch: Omit<PublishBatch, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PublishBatch> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const id = generateBatchId()
  const now = new Date().toISOString()

  const newBatch: PublishBatch = {
    ...batch,
    id,
    createdAt: now,
    updatedAt: now,
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT INTO publish_batches (
        id, status, strategy, content_types, item_count, items_synced, items_failed,
        pr_number, pr_url, pr_state, commit_sha, branch_name,
        started_at, completed_at, created_at, updated_at, error, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBatch.id,
        newBatch.status,
        newBatch.strategy,
        JSON.stringify(newBatch.contentTypes),
        newBatch.itemCount,
        newBatch.itemsSynced,
        newBatch.itemsFailed,
        newBatch.prNumber ?? null,
        newBatch.prUrl ?? null,
        newBatch.prState ?? null,
        newBatch.commitSha ?? null,
        newBatch.branchName ?? null,
        newBatch.startedAt ?? null,
        newBatch.completedAt ?? null,
        newBatch.createdAt,
        newBatch.updatedAt,
        newBatch.error ?? null,
        newBatch.metadata ? JSON.stringify(newBatch.metadata) : null,
      ]
    )

    return newBatch
  } catch (error) {
    console.error('[PublishStore] Failed to create batch:', error)
    throw error
  }
}

/**
 * Get a batch by ID
 */
export async function getBatch(id: string): Promise<PublishBatch | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT * FROM publish_batches WHERE id = ?`,
      [id]
    ) as StoredPublishBatch[] | null

    if (!rows || rows.length === 0) return null

    return storedBatchToPublishBatch(rows[0])
  } catch (error) {
    console.error('[PublishStore] Failed to get batch:', error)
    return null
  }
}

/**
 * Update a batch
 */
export async function updateBatch(
  id: string,
  updates: Partial<Omit<PublishBatch, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  const setClauses: string[] = ['updated_at = ?']
  const params: (string | number | null)[] = [new Date().toISOString()]

  if (updates.status !== undefined) {
    setClauses.push('status = ?')
    params.push(updates.status)
  }
  if (updates.strategy !== undefined) {
    setClauses.push('strategy = ?')
    params.push(updates.strategy)
  }
  if (updates.contentTypes !== undefined) {
    setClauses.push('content_types = ?')
    params.push(JSON.stringify(updates.contentTypes))
  }
  if (updates.itemCount !== undefined) {
    setClauses.push('item_count = ?')
    params.push(updates.itemCount)
  }
  if (updates.itemsSynced !== undefined) {
    setClauses.push('items_synced = ?')
    params.push(updates.itemsSynced)
  }
  if (updates.itemsFailed !== undefined) {
    setClauses.push('items_failed = ?')
    params.push(updates.itemsFailed)
  }
  if (updates.prNumber !== undefined) {
    setClauses.push('pr_number = ?')
    params.push(updates.prNumber ?? null)
  }
  if (updates.prUrl !== undefined) {
    setClauses.push('pr_url = ?')
    params.push(updates.prUrl ?? null)
  }
  if (updates.prState !== undefined) {
    setClauses.push('pr_state = ?')
    params.push(updates.prState ?? null)
  }
  if (updates.commitSha !== undefined) {
    setClauses.push('commit_sha = ?')
    params.push(updates.commitSha ?? null)
  }
  if (updates.branchName !== undefined) {
    setClauses.push('branch_name = ?')
    params.push(updates.branchName ?? null)
  }
  if (updates.startedAt !== undefined) {
    setClauses.push('started_at = ?')
    params.push(updates.startedAt ?? null)
  }
  if (updates.completedAt !== undefined) {
    setClauses.push('completed_at = ?')
    params.push(updates.completedAt ?? null)
  }
  if (updates.error !== undefined) {
    setClauses.push('error = ?')
    params.push(updates.error ?? null)
  }
  if (updates.metadata !== undefined) {
    setClauses.push('metadata = ?')
    params.push(updates.metadata ? JSON.stringify(updates.metadata) : null)
  }

  params.push(id)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `UPDATE publish_batches SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    )
  } catch (error) {
    console.error('[PublishStore] Failed to update batch:', error)
    throw error
  }
}

/**
 * Delete a batch
 */
export async function deleteBatch(id: string): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `DELETE FROM publish_batches WHERE id = ?`,
      [id]
    )
  } catch (error) {
    console.error('[PublishStore] Failed to delete batch:', error)
    throw error
  }
}

/**
 * Get recent batches
 */
export async function getRecentBatches(limit = 20): Promise<PublishBatch[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT * FROM publish_batches ORDER BY created_at DESC LIMIT ?`,
      [limit]
    ) as StoredPublishBatch[] | null

    if (!rows) return []

    return rows.map(storedBatchToPublishBatch)
  } catch (error) {
    console.error('[PublishStore] Failed to get recent batches:', error)
    return []
  }
}

/**
 * Get batches by status
 */
export async function getBatchesByStatus(status: BatchStatus): Promise<PublishBatch[]> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT * FROM publish_batches WHERE status = ? ORDER BY created_at DESC`,
      [status]
    ) as StoredPublishBatch[] | null

    if (!rows) return []

    return rows.map(storedBatchToPublishBatch)
  } catch (error) {
    console.error('[PublishStore] Failed to get batches by status:', error)
    return []
  }
}

/**
 * Get the most recent active batch (pending or processing)
 */
export async function getActiveBatch(): Promise<PublishBatch | null> {
  const db = await getDatabase()
  if (!db) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT * FROM publish_batches
       WHERE status IN ('pending', 'processing')
       ORDER BY created_at DESC
       LIMIT 1`
    ) as StoredPublishBatch[] | null

    if (!rows || rows.length === 0) return null

    return storedBatchToPublishBatch(rows[0])
  } catch (error) {
    console.error('[PublishStore] Failed to get active batch:', error)
    return null
  }
}

/**
 * Cancel all pending batches
 */
export async function cancelPendingBatches(): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    const now = new Date().toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).run(
      `UPDATE publish_batches
       SET status = 'cancelled', updated_at = ?, completed_at = ?
       WHERE status IN ('pending', 'processing')`,
      [now, now]
    )

    return result?.changes ?? 0
  } catch (error) {
    console.error('[PublishStore] Failed to cancel pending batches:', error)
    return 0
  }
}

// ============================================================================
// HISTORY CRUD OPERATIONS
// ============================================================================

/**
 * Record a publish history entry
 */
export async function recordHistory(
  entry: Omit<PublishHistoryEntry, 'id' | 'createdAt'>
): Promise<PublishHistoryEntry> {
  const db = await getDatabase()
  if (!db) throw new Error('Database not available')

  const id = generateHistoryId()
  const now = new Date().toISOString()

  const newEntry: PublishHistoryEntry = {
    ...entry,
    id,
    createdAt: now,
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `INSERT INTO publish_history (
        id, batch_id, content_type, content_id, content_path, action,
        previous_content_hash, new_content_hash, commit_sha, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newEntry.id,
        newEntry.batchId ?? null,
        newEntry.contentType,
        newEntry.contentId,
        newEntry.contentPath,
        newEntry.action,
        newEntry.previousContentHash ?? null,
        newEntry.newContentHash ?? null,
        newEntry.commitSha ?? null,
        newEntry.createdAt,
      ]
    )

    return newEntry
  } catch (error) {
    console.error('[PublishStore] Failed to record history:', error)
    throw error
  }
}

/**
 * Get publish history with optional filtering
 */
export async function getHistory(
  options: HistoryQueryOptions = {}
): Promise<PublishHistoryEntry[]> {
  const db = await getDatabase()
  if (!db) return []

  const whereClauses: string[] = []
  const params: (string | number)[] = []

  if (options.contentType) {
    whereClauses.push('content_type = ?')
    params.push(options.contentType)
  }
  if (options.contentId) {
    whereClauses.push('content_id = ?')
    params.push(options.contentId)
  }
  if (options.batchId) {
    whereClauses.push('batch_id = ?')
    params.push(options.batchId)
  }
  if (options.action) {
    whereClauses.push('action = ?')
    params.push(options.action)
  }
  if (options.startDate) {
    whereClauses.push('created_at >= ?')
    params.push(options.startDate)
  }
  if (options.endDate) {
    whereClauses.push('created_at <= ?')
    params.push(options.endDate)
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : ''

  const limit = options.limit ?? 100
  const offset = options.offset ?? 0

  params.push(limit, offset)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT * FROM publish_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      params
    ) as StoredPublishHistory[] | null

    if (!rows) return []

    return rows.map(storedHistoryToEntry)
  } catch (error) {
    console.error('[PublishStore] Failed to get history:', error)
    return []
  }
}

/**
 * Get history for a specific content item
 */
export async function getContentHistory(
  contentType: PublishableContentType,
  contentId: string
): Promise<PublishHistoryEntry[]> {
  return getHistory({ contentType, contentId })
}

/**
 * Get history for a batch
 */
export async function getBatchHistory(batchId: string): Promise<PublishHistoryEntry[]> {
  return getHistory({ batchId })
}

/**
 * Get the last publish action for a content item
 */
export async function getLastPublishAction(
  contentType: PublishableContentType,
  contentId: string
): Promise<PublishHistoryEntry | null> {
  const entries = await getHistory({
    contentType,
    contentId,
    limit: 1,
  })

  return entries[0] ?? null
}

/**
 * Get total history count (for pagination)
 */
export async function getHistoryCount(
  options: Omit<HistoryQueryOptions, 'limit' | 'offset'> = {}
): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  const whereClauses: string[] = []
  const params: string[] = []

  if (options.contentType) {
    whereClauses.push('content_type = ?')
    params.push(options.contentType)
  }
  if (options.contentId) {
    whereClauses.push('content_id = ?')
    params.push(options.contentId)
  }
  if (options.batchId) {
    whereClauses.push('batch_id = ?')
    params.push(options.batchId)
  }
  if (options.action) {
    whereClauses.push('action = ?')
    params.push(options.action)
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : ''

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT COUNT(*) as count FROM publish_history ${whereClause}`,
      params
    ) as Array<{ count: number }> | null

    return rows?.[0]?.count ?? 0
  } catch (error) {
    console.error('[PublishStore] Failed to get history count:', error)
    return 0
  }
}

// ============================================================================
// SYNC STATUS UTILITIES
// ============================================================================

/**
 * Get pending item counts by content type
 */
export async function getPendingCounts(): Promise<Record<PublishableContentType, number>> {
  const db = await getDatabase()
  if (!db) {
    return { reflection: 0, strand: 0, project: 0 }
  }

  try {
    // Count pending reflections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reflectionRows = await (db as any).all(
      `SELECT COUNT(*) as count FROM reflections
       WHERE sync_status IN ('pending', 'local', 'modified', 'failed')`
    ) as Array<{ count: number }> | null

    // Count pending strands
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strandRows = await (db as any).all(
      `SELECT COUNT(*) as count FROM strands
       WHERE sync_status IN ('pending', 'local', 'modified', 'failed')`
    ) as Array<{ count: number }> | null

    return {
      reflection: reflectionRows?.[0]?.count ?? 0,
      strand: strandRows?.[0]?.count ?? 0,
      project: 0, // TODO: Add project support
    }
  } catch (error) {
    console.error('[PublishStore] Failed to get pending counts:', error)
    return { reflection: 0, strand: 0, project: 0 }
  }
}

/**
 * Get total pending count
 */
export async function getTotalPendingCount(): Promise<number> {
  const counts = await getPendingCounts()
  return counts.reflection + counts.strand + counts.project
}

// ============================================================================
// BATCH STATISTICS
// ============================================================================

/**
 * Get batch statistics
 */
export async function getBatchStats(): Promise<{
  total: number
  completed: number
  failed: number
  pending: number
  itemsPublished: number
}> {
  const db = await getDatabase()
  if (!db) {
    return { total: 0, completed: 0, failed: 0, pending: 0, itemsPublished: 0 }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status IN ('pending', 'processing') THEN 1 ELSE 0 END) as pending,
         SUM(items_synced) as items_published
       FROM publish_batches`
    ) as Array<{
      total: number
      completed: number
      failed: number
      pending: number
      items_published: number
    }> | null

    const row = rows?.[0]
    return {
      total: row?.total ?? 0,
      completed: row?.completed ?? 0,
      failed: row?.failed ?? 0,
      pending: row?.pending ?? 0,
      itemsPublished: row?.items_published ?? 0,
    }
  } catch (error) {
    console.error('[PublishStore] Failed to get batch stats:', error)
    return { total: 0, completed: 0, failed: 0, pending: 0, itemsPublished: 0 }
  }
}

// ============================================================================
// STRAND SYNC STATUS
// ============================================================================

/**
 * Update strand sync status
 */
export async function updateStrandSyncStatus(
  strandId: string,
  status: SyncStatus,
  meta?: {
    publishedAt?: string
    publishedCommit?: string
    publishedContentHash?: string
    lastSyncAttempt?: string
    syncError?: string
    batchId?: string
  }
): Promise<void> {
  const db = await getDatabase()
  if (!db) return

  try {
    const updates: string[] = ['sync_status = ?']
    const params: (string | null)[] = [status]

    if (meta?.publishedAt !== undefined) {
      updates.push('published_at = ?')
      params.push(meta.publishedAt)
    }
    if (meta?.publishedCommit !== undefined) {
      updates.push('github_sha = ?')
      params.push(meta.publishedCommit)
    }
    if (meta?.publishedContentHash !== undefined) {
      updates.push('published_content_hash = ?')
      params.push(meta.publishedContentHash)
    }
    if (meta?.lastSyncAttempt !== undefined) {
      updates.push('last_sync_attempt = ?')
      params.push(meta.lastSyncAttempt)
    }
    if (meta?.syncError !== undefined) {
      updates.push('sync_error = ?')
      params.push(meta.syncError)
    }
    if (meta?.batchId !== undefined) {
      updates.push('publish_batch_id = ?')
      params.push(meta.batchId)
    }

    params.push(strandId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).run(
      `UPDATE strands SET ${updates.join(', ')} WHERE id = ?`,
      params
    )
  } catch (error) {
    console.error('[PublishStore] Failed to update strand sync status:', error)
  }
}

/**
 * Get pending strands for publishing
 */
export async function getPendingStrands(): Promise<Array<{
  id: string
  weave: string
  loom: string | null
  title: string
  content: string
  syncStatus: SyncStatus
}>> {
  const db = await getDatabase()
  if (!db) return []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (db as any).all(
      `SELECT id, weave, loom, title, content, sync_status
       FROM strands
       WHERE sync_status IN ('pending', 'local', 'modified', 'failed')
       ORDER BY updated_at DESC`
    ) as Array<{
      id: string
      weave: string
      loom: string | null
      title: string
      content: string
      sync_status: string | null
    }> | null

    if (!rows) return []

    return rows.map(row => ({
      id: row.id,
      weave: row.weave,
      loom: row.loom,
      title: row.title,
      content: row.content,
      syncStatus: (row.sync_status as SyncStatus) || 'local',
    }))
  } catch (error) {
    console.error('[PublishStore] Failed to get pending strands:', error)
    return []
  }
}

/**
 * Bulk update sync status for content items
 */
export async function bulkUpdateSyncStatus(
  items: Array<{
    type: PublishableContentType
    id: string
    status: SyncStatus
  }>,
  meta?: {
    batchId?: string
    lastSyncAttempt?: string
  }
): Promise<void> {
  const db = await getDatabase()
  if (!db || items.length === 0) return

  const reflectionIds = items.filter(i => i.type === 'reflection').map(i => i.id)
  const strandIds = items.filter(i => i.type === 'strand').map(i => i.id)

  try {
    // Update reflections
    if (reflectionIds.length > 0) {
      const placeholders = reflectionIds.map(() => '?').join(', ')
      const updates: string[] = ['sync_status = ?']
      const baseParams: (string | null)[] = [items[0].status] // Assume same status for bulk

      if (meta?.batchId !== undefined) {
        updates.push('batch_id = ?')
        baseParams.push(meta.batchId)
      }
      if (meta?.lastSyncAttempt !== undefined) {
        updates.push('last_sync_attempt = ?')
        baseParams.push(meta.lastSyncAttempt)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).run(
        `UPDATE reflections SET ${updates.join(', ')} WHERE date IN (${placeholders})`,
        [...baseParams, ...reflectionIds]
      )
    }

    // Update strands
    if (strandIds.length > 0) {
      const placeholders = strandIds.map(() => '?').join(', ')
      const updates: string[] = ['sync_status = ?']
      const baseParams: (string | null)[] = [items[0].status]

      if (meta?.batchId !== undefined) {
        updates.push('publish_batch_id = ?')
        baseParams.push(meta.batchId)
      }
      if (meta?.lastSyncAttempt !== undefined) {
        updates.push('last_sync_attempt = ?')
        baseParams.push(meta.lastSyncAttempt)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).run(
        `UPDATE strands SET ${updates.join(', ')} WHERE id IN (${placeholders})`,
        [...baseParams, ...strandIds]
      )
    }
  } catch (error) {
    console.error('[PublishStore] Failed to bulk update sync status:', error)
  }
}

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

/**
 * Clean up old completed batches (keep last N)
 */
export async function cleanupOldBatches(keepCount = 50): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    // Get IDs of batches to keep
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keepRows = await (db as any).all(
      `SELECT id FROM publish_batches
       ORDER BY created_at DESC
       LIMIT ?`,
      [keepCount]
    ) as Array<{ id: string }> | null

    if (!keepRows || keepRows.length < keepCount) {
      return 0 // Not enough batches to clean up
    }

    const keepIds = keepRows.map(r => r.id)
    const placeholders = keepIds.map(() => '?').join(', ')

    // Delete batches not in keep list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).run(
      `DELETE FROM publish_batches
       WHERE id NOT IN (${placeholders})
       AND status IN ('completed', 'failed', 'cancelled')`,
      keepIds
    )

    return result?.changes ?? 0
  } catch (error) {
    console.error('[PublishStore] Failed to cleanup old batches:', error)
    return 0
  }
}

/**
 * Clean up old history entries (keep last N days)
 */
export async function cleanupOldHistory(keepDays = 90): Promise<number> {
  const db = await getDatabase()
  if (!db) return 0

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - keepDays)
    const cutoffISO = cutoffDate.toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).run(
      `DELETE FROM publish_history WHERE created_at < ?`,
      [cutoffISO]
    )

    return result?.changes ?? 0
  } catch (error) {
    console.error('[PublishStore] Failed to cleanup old history:', error)
    return 0
  }
}
