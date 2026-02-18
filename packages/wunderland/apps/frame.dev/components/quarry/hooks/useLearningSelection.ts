/**
 * Learning Selection Hook
 * @module codex/hooks/useLearningSelection
 *
 * Bridges sidebar tree selection with Learning Studio's multi-strand features.
 * Syncs between:
 * - useTreeSelection (sidebar checkboxes)
 * - SelectedStrandsContext (shared app state)
 * - LearningStudio's internal selection state
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useSelectedStrandsSafe, type SelectedStrand } from '../contexts/SelectedStrandsContext'
import type { SelectionStats } from './useTreeSelection'

export interface UseLearningSelectionOptions {
  /** Whether to auto-sync tree selection to context */
  autoSync?: boolean
}

export interface UseLearningSelectionReturn {
  // Selection state
  selectedStrands: SelectedStrand[]
  selectedCount: number
  selectionStats: SelectionStats

  // Aggregated content info
  totalWords: number
  uniqueTags: string[]
  uniqueSubjects: string[]
  uniqueTopics: string[]

  // Actions
  syncFromTreeSelection: (paths: Set<string>, strandMetadata: Map<string, StrandMeta>) => void
  addStrand: (strand: SelectedStrand) => void
  removeStrand: (strandId: string) => void
  clearSelection: () => void
  setStrands: (strands: SelectedStrand[]) => void

  // Loading
  isLoading: boolean
}

interface StrandMeta {
  id: string
  path: string
  title: string
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  wordCount?: number
}

export function useLearningSelection(
  options: UseLearningSelectionOptions = {}
): UseLearningSelectionReturn {
  const { autoSync = true } = options
  const context = useSelectedStrandsSafe()
  const [isLoading, setIsLoading] = useState(false)

  // Fallback to local state if context not available
  const [localStrands, setLocalStrands] = useState<SelectedStrand[]>([])

  const strands = context?.strands ?? localStrands
  const setStrands = context?.setStrands ?? setLocalStrands

  // Calculate selection stats
  const selectionStats: SelectionStats = useMemo(() => {
    return {
      total: strands.length,
      strands: strands.length,
      looms: 0,
      weaves: 0,
    }
  }, [strands])

  // Aggregate unique tags/subjects/topics
  const aggregatedMeta = useMemo(() => {
    const tagsSet = new Set<string>()
    const subjectsSet = new Set<string>()
    const topicsSet = new Set<string>()
    let totalWords = 0

    for (const strand of strands) {
      strand.tags?.forEach(t => tagsSet.add(t))
      strand.subjects?.forEach(s => subjectsSet.add(s))
      strand.topics?.forEach(t => topicsSet.add(t))
      totalWords += strand.wordCount ?? 0
    }

    return {
      uniqueTags: Array.from(tagsSet),
      uniqueSubjects: Array.from(subjectsSet),
      uniqueTopics: Array.from(topicsSet),
      totalWords,
    }
  }, [strands])

  // Sync from tree selection to strands context
  const syncFromTreeSelection = useCallback(
    (paths: Set<string>, strandMetadata: Map<string, StrandMeta>) => {
      setIsLoading(true)
      try {
        const newStrands: SelectedStrand[] = []

        paths.forEach(path => {
          const meta = strandMetadata.get(path)
          if (meta) {
            newStrands.push({
              id: meta.id || path,
              path: meta.path || path,
              title: meta.title || path.split('/').pop() || path,
              tags: meta.tags,
              subjects: meta.subjects,
              topics: meta.topics,
              wordCount: meta.wordCount,
            })
          } else {
            // Create minimal strand info from path
            newStrands.push({
              id: path,
              path,
              title: path.split('/').pop()?.replace('.md', '') || path,
            })
          }
        })

        setStrands(newStrands)
      } finally {
        setIsLoading(false)
      }
    },
    [setStrands]
  )

  // Add a strand
  const addStrand = useCallback(
    (strand: SelectedStrand) => {
      if (context) {
        context.addStrand(strand)
      } else {
        setLocalStrands(prev => {
          if (prev.some(s => s.id === strand.id)) return prev
          return [...prev, strand]
        })
      }
    },
    [context]
  )

  // Remove a strand
  const removeStrand = useCallback(
    (strandId: string) => {
      if (context) {
        context.removeStrand(strandId)
      } else {
        setLocalStrands(prev => prev.filter(s => s.id !== strandId))
      }
    },
    [context]
  )

  // Clear all
  const clearSelection = useCallback(() => {
    if (context) {
      context.clearAll()
    } else {
      setLocalStrands([])
    }
  }, [context])

  return {
    selectedStrands: strands,
    selectedCount: strands.length,
    selectionStats,
    totalWords: aggregatedMeta.totalWords,
    uniqueTags: aggregatedMeta.uniqueTags,
    uniqueSubjects: aggregatedMeta.uniqueSubjects,
    uniqueTopics: aggregatedMeta.uniqueTopics,
    syncFromTreeSelection,
    addStrand,
    removeStrand,
    clearSelection,
    setStrands,
    isLoading,
  }
}

export default useLearningSelection
