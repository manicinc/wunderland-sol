/**
 * useStrandTags - Hook to fetch all unique tags from strands
 *
 * Provides tag autocomplete suggestions for planner tasks
 * by aggregating tags from all strands in the knowledge base.
 *
 * Now integrated with supertags - every tag is a supertag with
 * optional fields and auto-generated icon/color.
 *
 * @module lib/planner/useStrandTags
 */

import { useState, useEffect, useCallback } from 'react'
import { getDatabase } from '../codexDatabase'
import { getAllTagsWithSchemas, getTagSchemaInfo, ensureTagSchema } from '../supertags/supertagManager'

/**
 * Tag with schema info for display
 */
export interface TagWithSchema {
  tagName: string
  displayName: string
  icon: string
  color: string
  hasFields: boolean
  usageCount: number
}

interface UseStrandTagsResult {
  tags: string[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

interface UseStrandTagsWithSchemasResult {
  tags: TagWithSchema[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Fetch all unique tags from strands in the database
 */
export function useStrandTags(): UseStrandTagsResult {
  const [tags, setTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const db = await getDatabase()
      if (!db) {
        setTags([])
        return
      }

      // Fetch tags from strands table
      // Tags are stored as JSON array in the 'tags' column
      const rows = await db.all(`
        SELECT DISTINCT tags FROM strands
        WHERE tags IS NOT NULL AND tags != '[]'
      `) as Array<{ tags: string }> | null

      if (!rows) {
        setTags([])
        return
      }

      // Parse and aggregate all unique tags
      const allTags = new Set<string>()

      rows.forEach((row) => {
        try {
          const parsedTags = JSON.parse(row.tags)
          if (Array.isArray(parsedTags)) {
            parsedTags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                allTags.add(tag.trim().toLowerCase())
              }
            })
          }
        } catch {
          // Skip invalid JSON
        }
      })

      // Also fetch tags from planner_tasks for consistency
      const taskRows = await db.all(`
        SELECT DISTINCT tags FROM planner_tasks
        WHERE tags IS NOT NULL AND tags != '[]'
      `) as Array<{ tags: string }> | null

      if (taskRows) {
        taskRows.forEach((row) => {
          try {
            const parsedTags = JSON.parse(row.tags)
            if (Array.isArray(parsedTags)) {
              parsedTags.forEach((tag: string) => {
                if (typeof tag === 'string' && tag.trim()) {
                  allTags.add(tag.trim().toLowerCase())
                }
              })
            }
          } catch {
            // Skip invalid JSON
          }
        })
      }

      // Sort alphabetically
      const sortedTags = Array.from(allTags).sort()
      setTags(sortedTags)
    } catch (err) {
      console.error('[useStrandTags] Failed to fetch tags:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tags'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    isLoading,
    error,
    refresh: fetchTags,
  }
}

/**
 * Get commonly used tags with their usage counts
 */
export async function getTagsWithCounts(): Promise<Map<string, number>> {
  const tagCounts = new Map<string, number>()

  try {
    const db = await getDatabase()
    if (!db) return tagCounts

    // Count from strands
    const strandRows = await db.all(`
      SELECT tags FROM strands
      WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (strandRows) {
      strandRows.forEach((row) => {
        try {
          const parsedTags = JSON.parse(row.tags)
          if (Array.isArray(parsedTags)) {
            parsedTags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                const normalizedTag = tag.trim().toLowerCase()
                tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1)
              }
            })
          }
        } catch {
          // Skip
        }
      })
    }

    // Count from tasks
    const taskRows = await db.all(`
      SELECT tags FROM planner_tasks
      WHERE tags IS NOT NULL AND tags != '[]'
    `) as Array<{ tags: string }> | null

    if (taskRows) {
      taskRows.forEach((row) => {
        try {
          const parsedTags = JSON.parse(row.tags)
          if (Array.isArray(parsedTags)) {
            parsedTags.forEach((tag: string) => {
              if (typeof tag === 'string' && tag.trim()) {
                const normalizedTag = tag.trim().toLowerCase()
                tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1)
              }
            })
          }
        } catch {
          // Skip
        }
      })
    }
  } catch (err) {
    console.error('[getTagsWithCounts] Error:', err)
  }

  return tagCounts
}

/**
 * Hook to fetch all tags with their supertag schema info
 * Returns tags sorted by usage count with icon, color, and field status
 */
export function useStrandTagsWithSchemas(): UseStrandTagsWithSchemasResult {
  const [tags, setTags] = useState<TagWithSchema[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const tagsWithSchemas = await getAllTagsWithSchemas()
      setTags(tagsWithSchemas)
    } catch (err) {
      console.error('[useStrandTagsWithSchemas] Failed to fetch tags:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tags'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  return {
    tags,
    isLoading,
    error,
    refresh: fetchTags,
  }
}

/**
 * Get schema info for a single tag
 * @param tagName - Tag name (with or without #)
 * @returns Icon, color, and whether schema exists
 */
export async function getTagInfo(tagName: string): Promise<{
  icon: string
  color: string
  hasSchema: boolean
}> {
  return getTagSchemaInfo(tagName)
}

/**
 * Ensure a tag has a supertag schema
 * Creates one with sensible defaults if it doesn't exist
 * @param tagName - Tag name (with or without #)
 */
export async function ensureTagHasSchema(tagName: string): Promise<void> {
  await ensureTagSchema(tagName)
}

/**
 * Get taxonomy data (topics and subjects) directly from database
 * This is a fallback when codex-index.json is not available
 */
export async function getTaxonomyFromDatabase(): Promise<{
  topics: Array<{ name: string; count: number; paths: string[] }>
  subjects: Array<{ name: string; count: number; paths: string[] }>
}> {
  const db = await getDatabase()
  if (!db) return { topics: [], subjects: [] }

  const topicMap = new Map<string, { count: number; paths: string[] }>()
  const subjectMap = new Map<string, { count: number; paths: string[] }>()

  try {
    const rows = await db.all(`
      SELECT path, metadata FROM strands
      WHERE metadata IS NOT NULL
    `) as Array<{ path: string; metadata: string }> | null

    if (rows) {
      for (const row of rows) {
        try {
          const meta = JSON.parse(row.metadata)
          const taxonomy = meta.taxonomy || {}

          // Extract subjects (handle both singular and plural forms)
          const rawSubjects = taxonomy.subjects || taxonomy.subject || []
          const subjects = Array.isArray(rawSubjects) ? rawSubjects : []
          subjects.forEach((s: string) => {
            const name = String(s).trim().toLowerCase()
            if (!name) return
            const existing = subjectMap.get(name) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(row.path)
            subjectMap.set(name, existing)
          })

          // Extract topics (handle both singular and plural forms)
          const rawTopics = taxonomy.topics || taxonomy.topic || []
          const topics = Array.isArray(rawTopics) ? rawTopics : []
          topics.forEach((t: string) => {
            const name = String(t).trim().toLowerCase()
            if (!name) return
            const existing = topicMap.get(name) || { count: 0, paths: [] }
            existing.count++
            existing.paths.push(row.path)
            topicMap.set(name, existing)
          })
        } catch {
          // Skip invalid JSON
        }
      }
    }
  } catch (err) {
    console.error('[getTaxonomyFromDatabase] Error:', err)
  }

  return {
    topics: Array.from(topicMap.entries()).map(([name, data]) => ({ name, ...data })),
    subjects: Array.from(subjectMap.entries()).map(([name, data]) => ({ name, ...data })),
  }
}

export default useStrandTags
