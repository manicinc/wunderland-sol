/**
 * useSupertagItems - Hook to fetch items with a specific supertag
 * @module lib/supertags/useSupertagItems
 *
 * Provides data for ViewContainer (Table, Kanban views) by querying
 * all blocks that have a specific supertag applied.
 */

import { useState, useEffect, useCallback } from 'react'
import { getDatabase } from '@/lib/codexDatabase'
import {
  getSchemaByTagName,
  getFieldValues,
  type SupertagSchema,
} from './supertagManager'
import type { ViewItem } from '@/components/quarry/ui/views/ViewContainer'

interface UseSupertagItemsResult {
  items: ViewItem[]
  schema: SupertagSchema | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  totalCount: number
}

interface UseSupertagItemsOptions {
  limit?: number
  offset?: number
}

/**
 * Fetch all items with a specific supertag for use in views
 *
 * @param tagName - Tag name without # prefix
 * @param options - Query options
 * @returns Items formatted for ViewContainer
 */
export function useSupertagItems(
  tagName: string | null,
  options: UseSupertagItemsOptions = {}
): UseSupertagItemsResult {
  const [items, setItems] = useState<ViewItem[]>([])
  const [schema, setSchema] = useState<SupertagSchema | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { limit = 100, offset = 0 } = options

  const fetchItems = useCallback(async () => {
    if (!tagName) {
      setItems([])
      setSchema(null)
      setTotalCount(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get the schema
      const schemaResult = await getSchemaByTagName(tagName)
      if (!schemaResult) {
        setItems([])
        setSchema(null)
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      setSchema(schemaResult)

      const db = await getDatabase()
      if (!db) {
        setItems([])
        setTotalCount(0)
        setIsLoading(false)
        return
      }

      // Query strands that have this tag in their tags array
      // Tags are stored as JSON arrays in the tags column
      const rows = await db.all(
        `SELECT s.path, s.title, s.tags, s.created_at, s.updated_at
         FROM strands s
         WHERE s.tags LIKE ?
         ORDER BY s.updated_at DESC
         LIMIT ? OFFSET ?`,
        [`%"${tagName}"%`, limit, offset]
      ) as Array<{
        path: string
        title: string
        tags: string
        created_at: string
        updated_at: string
      }> | null

      // Also get count
      const countResult = await db.get(
        `SELECT COUNT(*) as count FROM strands WHERE tags LIKE ?`,
        [`%"${tagName}"%`]
      ) as { count: number } | null

      setTotalCount(countResult?.count || 0)

      if (!rows || rows.length === 0) {
        // Also check blocks with supertag field values
        const blockRows = await db.all(
          `SELECT DISTINCT sb.id, sb.strand_path, sb.content, sb.created_at, sb.updated_at
           FROM strand_blocks sb
           JOIN supertag_field_values sfv ON sfv.block_id = sb.id
           WHERE sfv.supertag_id = ?
           ORDER BY sb.updated_at DESC
           LIMIT ? OFFSET ?`,
          [schemaResult.id, limit, offset]
        ) as Array<{
          id: string
          strand_path: string
          content: string
          created_at: string
          updated_at: string
        }> | null

        if (blockRows && blockRows.length > 0) {
          const blockItems: ViewItem[] = []
          for (const row of blockRows) {
            const values = await getFieldValues(row.id, schemaResult.id)
            blockItems.push({
              id: row.id,
              path: row.strand_path,
              title: extractTitle(row.content) || 'Untitled',
              values,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            })
          }
          setItems(blockItems)
        } else {
          setItems([])
        }

        setIsLoading(false)
        return
      }

      // Convert rows to ViewItems
      const viewItems: ViewItem[] = []

      for (const row of rows) {
        // Get field values for this strand (if any)
        // For strands, we use the path as the "block" ID
        const values = await getFieldValuesForStrand(db, row.path, schemaResult.id)

        viewItems.push({
          id: row.path,
          path: row.path,
          title: row.title || 'Untitled',
          values,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })
      }

      setItems(viewItems)
    } catch (err) {
      console.error('[useSupertagItems] Error:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch items'))
    } finally {
      setIsLoading(false)
    }
  }, [tagName, limit, offset])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return {
    items,
    schema,
    isLoading,
    error,
    refresh: fetchItems,
    totalCount,
  }
}

/**
 * Get field values for a strand (checks first block with supertag values)
 */
async function getFieldValuesForStrand(
  db: Awaited<ReturnType<typeof getDatabase>>,
  strandPath: string,
  supertagId: string
): Promise<Record<string, unknown>> {
  if (!db) return {}

  try {
    // Get first block in this strand that has field values
    const row = await db.get(
      `SELECT sb.id
       FROM strand_blocks sb
       JOIN supertag_field_values sfv ON sfv.block_id = sb.id
       WHERE sb.strand_path = ? AND sfv.supertag_id = ?
       LIMIT 1`,
      [strandPath, supertagId]
    ) as { id: string } | null

    if (row) {
      return getFieldValues(row.id, supertagId)
    }

    return {}
  } catch {
    return {}
  }
}

/**
 * Extract title from block content (first line or first N chars)
 */
function extractTitle(content: string): string {
  if (!content) return ''
  const firstLine = content.split('\n')[0]
  const cleaned = firstLine.replace(/^#+\s*/, '').trim()
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned
}

export default useSupertagItems
