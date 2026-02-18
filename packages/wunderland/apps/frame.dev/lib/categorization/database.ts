/**
 * Database utilities for categorization system
 * @module lib/categorization/database
 *
 * CRUD operations for categorization results and actions
 */

import type {
  CategorizationResult,
  CategorizationAction,
  CreateCategorizationResultDTO,
  UpdateCategorizationResultDTO,
  CreateCategorizationActionDTO,
  UpdateCategorizationActionDTO,
  CategorizationResultStatus,
  CategorizationActionStatus,
} from './types'
import { getDb } from '@/lib/storage/localCodex'
import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// CATEGORIZATION RESULTS
// =============================================================================

/**
 * Create a new categorization result
 */
export async function createCategorizationResult(
  dto: CreateCategorizationResultDTO
): Promise<string> {
  const db = await getDb()
  const id = uuidv4()

  await db.run(
    `INSERT INTO categorization_results (
      id, job_id, strand_path, current_category, suggested_category,
      confidence, reasoning, alternatives, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      dto.job_id,
      dto.strand_path,
      dto.current_category,
      dto.suggested_category,
      dto.confidence,
      dto.reasoning,
      JSON.stringify(dto.alternatives),
      dto.status || 'pending',
      new Date().toISOString(),
    ]
  )

  return id
}

/**
 * Get categorization result by ID
 */
export async function getCategorizationResult(
  id: string
): Promise<CategorizationResult | null> {
  const db = await getDb()
  return db.get<CategorizationResult>(
    'SELECT * FROM categorization_results WHERE id = ?',
    [id]
  )
}

/**
 * List categorization results with filters
 */
export async function listCategorizationResults(filters: {
  jobId?: string
  status?: CategorizationResultStatus[]
  minConfidence?: number
  maxConfidence?: number
  limit?: number
  offset?: number
}): Promise<CategorizationResult[]> {
  const db = await getDb()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.jobId) {
    conditions.push('job_id = ?')
    params.push(filters.jobId)
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(`status IN (${filters.status.map(() => '?').join(', ')})`)
    params.push(...filters.status)
  }

  if (filters.minConfidence !== undefined) {
    conditions.push('confidence >= ?')
    params.push(filters.minConfidence)
  }

  if (filters.maxConfidence !== undefined) {
    conditions.push('confidence <= ?')
    params.push(filters.maxConfidence)
  }

  let query = 'SELECT * FROM categorization_results'
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY confidence DESC, created_at DESC'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  if (filters.offset) {
    query += ' OFFSET ?'
    params.push(filters.offset)
  }

  return db.all<CategorizationResult>(query, params)
}

/**
 * Update categorization result
 */
export async function updateCategorizationResult(
  id: string,
  dto: UpdateCategorizationResultDTO
): Promise<void> {
  const db = await getDb()
  const updates: string[] = []
  const params: any[] = []

  if (dto.status !== undefined) {
    updates.push('status = ?')
    params.push(dto.status)
  }

  if (dto.review_notes !== undefined) {
    updates.push('review_notes = ?')
    params.push(dto.review_notes)
  }

  if (dto.final_category !== undefined) {
    updates.push('final_category = ?')
    params.push(dto.final_category)
  }

  if (dto.reviewed_at !== undefined) {
    updates.push('reviewed_at = ?')
    params.push(dto.reviewed_at)
  }

  if (dto.applied_at !== undefined) {
    updates.push('applied_at = ?')
    params.push(dto.applied_at)
  }

  if (updates.length === 0) {
    return
  }

  params.push(id)
  await db.run(
    `UPDATE categorization_results SET ${updates.join(', ')} WHERE id = ?`,
    params
  )
}

/**
 * Delete categorization result
 */
export async function deleteCategorizationResult(id: string): Promise<void> {
  const db = await getDb()
  await db.run('DELETE FROM categorization_results WHERE id = ?', [id])
}

/**
 * Get statistics for categorization results
 */
export async function getCategorizationStatistics(jobId?: string): Promise<{
  total: number
  pending: number
  approved: number
  rejected: number
  modified: number
  avgConfidence: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}> {
  const db = await getDb()
  const where = jobId ? 'WHERE job_id = ?' : ''
  const params = jobId ? [jobId] : []

  const stats = await db.get<any>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN status = 'modified' THEN 1 ELSE 0 END) as modified,
      AVG(confidence) as avgConfidence,
      SUM(CASE WHEN confidence >= 0.8 THEN 1 ELSE 0 END) as highConfidence,
      SUM(CASE WHEN confidence >= 0.5 AND confidence < 0.8 THEN 1 ELSE 0 END) as mediumConfidence,
      SUM(CASE WHEN confidence < 0.5 THEN 1 ELSE 0 END) as lowConfidence
     FROM categorization_results ${where}`,
    params
  )

  return {
    total: stats?.total || 0,
    pending: stats?.pending || 0,
    approved: stats?.approved || 0,
    rejected: stats?.rejected || 0,
    modified: stats?.modified || 0,
    avgConfidence: stats?.avgConfidence || 0,
    highConfidence: stats?.highConfidence || 0,
    mediumConfidence: stats?.mediumConfidence || 0,
    lowConfidence: stats?.lowConfidence || 0,
  }
}

// =============================================================================
// CATEGORIZATION ACTIONS
// =============================================================================

/**
 * Create a new categorization action
 */
export async function createCategorizationAction(
  dto: CreateCategorizationActionDTO
): Promise<string> {
  const db = await getDb()
  const id = uuidv4()

  await db.run(
    `INSERT INTO categorization_actions (
      id, result_id, action_type, from_path, to_path,
      strand_content, metadata, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      dto.result_id,
      dto.action_type,
      dto.from_path,
      dto.to_path,
      dto.strand_content,
      JSON.stringify(dto.metadata || {}),
      'pending',
      new Date().toISOString(),
    ]
  )

  return id
}

/**
 * Get categorization action by ID
 */
export async function getCategorizationAction(
  id: string
): Promise<CategorizationAction | null> {
  const db = await getDb()
  return db.get<CategorizationAction>(
    'SELECT * FROM categorization_actions WHERE id = ?',
    [id]
  )
}

/**
 * List categorization actions with filters
 */
export async function listCategorizationActions(filters: {
  resultId?: string
  status?: CategorizationActionStatus[]
  actionType?: string
  limit?: number
  offset?: number
}): Promise<CategorizationAction[]> {
  const db = await getDb()
  const conditions: string[] = []
  const params: any[] = []

  if (filters.resultId) {
    conditions.push('result_id = ?')
    params.push(filters.resultId)
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(`status IN (${filters.status.map(() => '?').join(', ')})`)
    params.push(...filters.status)
  }

  if (filters.actionType) {
    conditions.push('action_type = ?')
    params.push(filters.actionType)
  }

  let query = 'SELECT * FROM categorization_actions'
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY created_at DESC'

  if (filters.limit) {
    query += ' LIMIT ?'
    params.push(filters.limit)
  }

  if (filters.offset) {
    query += ' OFFSET ?'
    params.push(filters.offset)
  }

  return db.all<CategorizationAction>(query, params)
}

/**
 * Update categorization action
 */
export async function updateCategorizationAction(
  id: string,
  dto: UpdateCategorizationActionDTO
): Promise<void> {
  const db = await getDb()
  const updates: string[] = []
  const params: any[] = []

  if (dto.status !== undefined) {
    updates.push('status = ?')
    params.push(dto.status)
  }

  if (dto.sync_error !== undefined) {
    updates.push('sync_error = ?')
    params.push(dto.sync_error)
  }

  if (dto.github_pr_number !== undefined) {
    updates.push('github_pr_number = ?')
    params.push(dto.github_pr_number)
  }

  if (dto.github_pr_url !== undefined) {
    updates.push('github_pr_url = ?')
    params.push(dto.github_pr_url)
  }

  if (dto.synced_at !== undefined) {
    updates.push('synced_at = ?')
    params.push(dto.synced_at)
  }

  if (updates.length === 0) {
    return
  }

  params.push(id)
  await db.run(
    `UPDATE categorization_actions SET ${updates.join(', ')} WHERE id = ?`,
    params
  )
}

/**
 * Delete categorization action
 */
export async function deleteCategorizationAction(id: string): Promise<void> {
  const db = await getDb()
  await db.run('DELETE FROM categorization_actions WHERE id = ?', [id])
}

/**
 * Retry failed action
 */
export async function retryFailedAction(id: string): Promise<void> {
  await updateCategorizationAction(id, {
    status: 'pending',
    sync_error: undefined,
  })
}

/**
 * Get action statistics
 */
export async function getActionStatistics(): Promise<{
  total: number
  pending: number
  syncing: number
  completed: number
  failed: number
  byType: Record<string, number>
}> {
  const db = await getDb()

  const stats = await db.get<any>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'syncing' THEN 1 ELSE 0 END) as syncing,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
     FROM categorization_actions`
  )

  const byType = await db.all<{ action_type: string; count: number }>(
    'SELECT action_type, COUNT(*) as count FROM categorization_actions GROUP BY action_type'
  )

  return {
    total: stats?.total || 0,
    pending: stats?.pending || 0,
    syncing: stats?.syncing || 0,
    completed: stats?.completed || 0,
    failed: stats?.failed || 0,
    byType: Object.fromEntries(byType?.map(r => [r.action_type, r.count]) || []),
  }
}
