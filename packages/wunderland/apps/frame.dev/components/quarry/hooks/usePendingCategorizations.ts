/**
 * Hook for managing pending categorization results
 * @module components/quarry/hooks/usePendingCategorizations
 */

import { useState, useEffect, useCallback } from 'react'
import type { CategorizationResult, CategorizationResultStatus } from '@/lib/categorization/types'
import { getLocalCodexDb } from '@/lib/storage/localCodex'

export interface UsePendingCategorizationsOptions {
  /** Filter by status (default: ['pending']) */
  status?: CategorizationResultStatus[]
  /** Auto-refresh interval in ms (default: 5000) */
  refreshInterval?: number
  /** Job ID filter (optional) */
  jobId?: string
}

export interface UsePendingCategorizationsResult {
  /** Pending categorization results */
  results: CategorizationResult[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
  /** Refresh results manually */
  refresh: () => Promise<void>
  /** Approve a categorization */
  approve: (id: string, finalCategory?: string) => Promise<void>
  /** Reject a categorization */
  reject: (id: string, reviewNotes?: string) => Promise<void>
  /** Modify a categorization's suggested category */
  modify: (id: string, newCategory: string) => Promise<void>
  /** Bulk approve high confidence items */
  approveHighConfidence: (threshold?: number) => Promise<void>
}

/**
 * Hook to manage pending categorization results
 */
export function usePendingCategorizations(
  options: UsePendingCategorizationsOptions = {}
): UsePendingCategorizationsResult {
  const {
    status = ['pending'],
    refreshInterval = 5000,
    jobId,
  } = options

  const [results, setResults] = useState<CategorizationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load categorization results from database
   */
  const loadResults = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const db = await getLocalCodexDb()

      // Build query with filters
      const statusPlaceholders = status.map(() => '?').join(', ')
      let query = `
        SELECT *
        FROM categorization_results
        WHERE status IN (${statusPlaceholders})
      `
      const params: any[] = [...status]

      if (jobId) {
        query += ' AND job_id = ?'
        params.push(jobId)
      }

      query += ' ORDER BY confidence DESC, created_at DESC'

      const rows = (await db.all(query, params)) as CategorizationResult[]
      setResults(rows || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categorizations'
      setError(errorMessage)
      console.error('[usePendingCategorizations] Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [status, jobId])

  /**
   * Approve a categorization result
   */
  const approve = useCallback(async (id: string, finalCategory?: string) => {
    try {
      const db = await getLocalCodexDb()

      const result = results.find(r => r.id === id)
      if (!result) {
        throw new Error('Categorization result not found')
      }

      const category = finalCategory || result.suggested_category

      await db.run(
        `UPDATE categorization_results
         SET status = ?, final_category = ?, reviewed_at = ?, applied_at = ?
         WHERE id = ?`,
        ['approved', category, new Date().toISOString(), new Date().toISOString(), id]
      )

      // Create categorization action for GitHub sync
      // (This would normally be done by the job processor, but we do it here for manual approvals)
      await createActionForResult(db, id, result, category)

      await loadResults()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve categorization'
      setError(errorMessage)
      console.error('[usePendingCategorizations] Approve error:', err)
      throw err
    }
  }, [results, loadResults])

  /**
   * Reject a categorization result
   */
  const reject = useCallback(async (id: string, reviewNotes?: string) => {
    try {
      const db = await getLocalCodexDb()

      await db.run(
        `UPDATE categorization_results
         SET status = ?, review_notes = ?, reviewed_at = ?
         WHERE id = ?`,
        ['rejected', reviewNotes || 'Rejected by user', new Date().toISOString(), id]
      )

      await loadResults()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject categorization'
      setError(errorMessage)
      console.error('[usePendingCategorizations] Reject error:', err)
      throw err
    }
  }, [loadResults])

  /**
   * Modify categorization's suggested category
   */
  const modify = useCallback(async (id: string, newCategory: string) => {
    try {
      const db = await getLocalCodexDb()

      await db.run(
        `UPDATE categorization_results
         SET suggested_category = ?, status = ?
         WHERE id = ?`,
        [newCategory, 'modified', id]
      )

      await loadResults()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to modify categorization'
      setError(errorMessage)
      console.error('[usePendingCategorizations] Modify error:', err)
      throw err
    }
  }, [loadResults])

  /**
   * Bulk approve high confidence categorizations
   */
  const approveHighConfidence = useCallback(async (threshold = 0.8) => {
    try {
      const db = await getLocalCodexDb()
      const now = new Date().toISOString()

      const highConfidenceResults = results.filter(r => r.confidence >= threshold)

      for (const result of highConfidenceResults) {
        await db.run(
          `UPDATE categorization_results
           SET status = ?, final_category = ?, reviewed_at = ?, applied_at = ?
           WHERE id = ?`,
          ['approved', result.suggested_category, now, now, result.id]
        )

        await createActionForResult(db, result.id, result, result.suggested_category)
      }

      await loadResults()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk approve'
      setError(errorMessage)
      console.error('[usePendingCategorizations] Bulk approve error:', err)
      throw err
    }
  }, [results, loadResults])

  // Initial load
  useEffect(() => {
    loadResults()
  }, [loadResults])

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(() => {
      loadResults()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, loadResults])

  return {
    results,
    loading,
    error,
    refresh: loadResults,
    approve,
    reject,
    modify,
    approveHighConfidence,
  }
}

/**
 * Create categorization action for approved result
 */
async function createActionForResult(
  db: any,
  resultId: string,
  result: CategorizationResult,
  finalCategory: string
): Promise<void> {
  const { v4: uuidv4 } = await import('uuid')
  const actionId = uuidv4()

  // Load strand content
  const strand = (await db.get(
    'SELECT content, metadata FROM strands WHERE path = ?',
    [result.strand_path]
  )) as { content: string; metadata: string } | undefined

  if (!strand) {
    console.warn(`[createActionForResult] Strand not found: ${result.strand_path}`)
    return
  }

  // Determine action type based on confidence
  let actionType: 'move' | 'create_pr' | 'create_issue'
  if (result.confidence >= 0.95) {
    actionType = 'move'
  } else if (result.confidence >= 0.80) {
    actionType = 'create_pr'
  } else {
    actionType = 'create_issue'
  }

  // Calculate target path
  const filename = result.strand_path.split('/').pop() || 'untitled.md'
  const toPath = `${finalCategory}${filename}`

  await db.run(
    `INSERT INTO categorization_actions (
      id, result_id, action_type, from_path, to_path,
      strand_content, metadata, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actionId,
      resultId,
      actionType,
      result.strand_path,
      toPath,
      strand.content,
      strand.metadata || '{}',
      'pending',
      new Date().toISOString(),
    ]
  )
}
