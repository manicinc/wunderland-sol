/**
 * Multi-Strand Content Hook
 *
 * Aggregates content from multiple strands for Learning Studio features:
 * - Fetches and combines strand content
 * - Provides filtering by tags, subjects, and skills
 * - Supports spiral learning path selection
 * - Used by quiz, flashcard, and glossary generation
 *
 * @module hooks/useMultiStrandContent
 */

'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { StrandMetadata, GitHubFile } from '../types'
import { useSelectedStrandsSafe, type SelectedStrand } from '../contexts/SelectedStrandsContext'
import { normalizeTags as normalizeTagsUtil } from '@/lib/utils'

// ==================== Types ====================

/**
 * Minimal strand info for selection UI
 */
export interface StrandSummary {
  id: string
  path: string
  title: string
  tags: string[]
  subjects: string[]
  topics: string[]
  skills: string[]
  difficulty: string
  summary?: string
  strandCount?: number
}

/**
 * Full strand with content for generation
 */
export interface StrandWithContent extends StrandSummary {
  content: string
  metadata: StrandMetadata
}

/**
 * Selection filters for strands
 */
export interface StrandFilters {
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  skills?: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  search?: string
  /** Filter mode: 'any' for OR, 'all' for AND */
  matchMode?: 'any' | 'all'
}

/**
 * Loading progress state
 */
export interface ContentLoadProgress {
  stage: 'idle' | 'fetching' | 'processing' | 'complete' | 'error'
  message: string
  current: number
  total: number
  percent: number
}

/**
 * Stats about selected strands
 */
export interface SelectionStats {
  strandCount: number
  totalWords: number
  uniqueTags: string[]
  uniqueSubjects: string[]
  uniqueTopics: string[]
  difficulty: {
    beginner: number
    intermediate: number
    advanced: number
  }
}

/**
 * Hook return interface
 */
export interface UseMultiStrandContentReturn {
  // State
  availableStrands: StrandSummary[]
  selectedStrands: StrandSummary[]
  loadedContent: StrandWithContent[]
  progress: ContentLoadProgress
  error: string | null

  // Stats
  stats: SelectionStats

  // Selection
  selectStrand: (strand: StrandSummary) => void
  deselectStrand: (strandId: string) => void
  selectMultiple: (strands: StrandSummary[]) => void
  selectByFilter: (filters: StrandFilters) => void
  clearSelection: () => void
  toggleStrand: (strand: StrandSummary) => void
  isSelected: (strandId: string) => boolean

  // Loading
  loadContent: () => Promise<StrandWithContent[]>
  cancelLoading: () => void
  
  // Filters
  filterAvailable: (filters: StrandFilters) => StrandSummary[]
  getFilterOptions: () => {
    tags: string[]
    subjects: string[]
    topics: string[]
    skills: string[]
  }
}

// ==================== Helpers ====================

/**
 * Normalize tags to array (uses centralized utility with min length filter)
 */
function normalizeTags(tags: string | string[] | undefined): string[] {
  return normalizeTagsUtil(tags)
}

/**
 * Extract difficulty string from various formats
 */
function normalizeDifficulty(difficulty: unknown): string {
  if (!difficulty) return 'intermediate'
  if (typeof difficulty === 'string') return difficulty.toLowerCase()
  if (typeof difficulty === 'object' && difficulty !== null) {
    const d = difficulty as Record<string, unknown>
    if (d.overall) return String(d.overall).toLowerCase()
  }
  return 'intermediate'
}

/**
 * Count words in content
 */
function countWords(content: string): number {
  return content.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Match strand against filters
 */
function matchesFilters(strand: StrandSummary, filters: StrandFilters): boolean {
  const matchMode = filters.matchMode ?? 'any'

  // Search filter (always AND with other filters)
  if (filters.search) {
    const search = filters.search.toLowerCase()
    const matchesSearch =
      strand.title.toLowerCase().includes(search) ||
      strand.path.toLowerCase().includes(search) ||
      strand.summary?.toLowerCase().includes(search) ||
      strand.tags.some(t => t.toLowerCase().includes(search)) ||
      strand.subjects.some(s => s.toLowerCase().includes(search))

    if (!matchesSearch) return false
  }

  // Difficulty filter
  if (filters.difficulty && strand.difficulty !== filters.difficulty) {
    return false
  }

  // Collect all matches for array filters
  const matches: boolean[] = []

  if (filters.tags?.length) {
    const hasTag = filters.tags.some(t =>
      strand.tags.includes(t.toLowerCase())
    )
    matches.push(hasTag)
  }

  if (filters.subjects?.length) {
    const hasSubject = filters.subjects.some(s =>
      strand.subjects.some(ss => ss.toLowerCase() === s.toLowerCase())
    )
    matches.push(hasSubject)
  }

  if (filters.topics?.length) {
    const hasTopic = filters.topics.some(t =>
      strand.topics.some(st => st.toLowerCase() === t.toLowerCase())
    )
    matches.push(hasTopic)
  }

  if (filters.skills?.length) {
    const hasSkill = filters.skills.some(s =>
      strand.skills.some(sk => sk.toLowerCase() === s.toLowerCase())
    )
    matches.push(hasSkill)
  }

  if (matches.length === 0) return true

  return matchMode === 'any'
    ? matches.some(m => m)
    : matches.every(m => m)
}

/**
 * Hook options
 */
export interface UseMultiStrandContentOptions {
  /** Sync selections to shared Ask context for RAG */
  syncToAsk?: boolean
  /** Include content when syncing (more data but enables RAG) */
  syncContent?: boolean
}

// ==================== Hook ====================

/**
 * Multi-strand content hook
 */
export function useMultiStrandContent(
  allStrands: StrandSummary[],
  fetchContent: (strandPath: string) => Promise<{ content: string; metadata: StrandMetadata }>,
  options: UseMultiStrandContentOptions = {}
): UseMultiStrandContentReturn {
  const { syncToAsk = true, syncContent = false } = options

  // Shared strand context for Ask interface
  const sharedContext = useSelectedStrandsSafe()
  // State
  const [selectedStrands, setSelectedStrands] = useState<StrandSummary[]>([])
  const [loadedContent, setLoadedContent] = useState<StrandWithContent[]>([])
  const [progress, setProgress] = useState<ContentLoadProgress>({
    stage: 'idle',
    message: '',
    current: 0,
    total: 0,
    percent: 0,
  })
  const [error, setError] = useState<string | null>(null)

  // Cancel token
  const cancelRef = useRef(false)

  // Selected IDs for quick lookup
  const selectedIds = useMemo(
    () => new Set(selectedStrands.map(s => s.id)),
    [selectedStrands]
  )

  // Calculate stats
  const stats = useMemo<SelectionStats>(() => {
    const allTags = new Set<string>()
    const allSubjects = new Set<string>()
    const allTopics = new Set<string>()
    const difficulty = { beginner: 0, intermediate: 0, advanced: 0 }
    let totalWords = 0

    for (const strand of selectedStrands) {
      strand.tags.forEach(t => allTags.add(t))
      strand.subjects.forEach(s => allSubjects.add(s))
      strand.topics.forEach(t => allTopics.add(t))

      const diff = strand.difficulty as keyof typeof difficulty
      if (diff in difficulty) {
        difficulty[diff]++
      }
    }

    for (const content of loadedContent) {
      totalWords += countWords(content.content)
    }

    return {
      strandCount: selectedStrands.length,
      totalWords,
      uniqueTags: Array.from(allTags),
      uniqueSubjects: Array.from(allSubjects),
      uniqueTopics: Array.from(allTopics),
      difficulty,
    }
  }, [selectedStrands, loadedContent])

  // Sync selections to shared Ask context
  useEffect(() => {
    if (!syncToAsk || !sharedContext) return

    // Convert selected strands to shared format
    const sharedStrands: SelectedStrand[] = selectedStrands.map(strand => {
      // Find loaded content if available
      const loaded = loadedContent.find(c => c.id === strand.id)
      return {
        id: strand.id,
        path: strand.path,
        title: strand.title,
        content: syncContent && loaded ? loaded.content : undefined,
        wordCount: loaded ? countWords(loaded.content) : undefined,
        tags: strand.tags,
        subjects: strand.subjects,
        topics: strand.topics,
      }
    })

    // Update shared context
    sharedContext.setStrands(sharedStrands)
  }, [syncToAsk, syncContent, sharedContext, selectedStrands, loadedContent])

  // Get all filter options
  const getFilterOptions = useCallback(() => {
    const tags = new Set<string>()
    const subjects = new Set<string>()
    const topics = new Set<string>()
    const skills = new Set<string>()

    for (const strand of allStrands) {
      strand.tags.forEach(t => tags.add(t))
      strand.subjects.forEach(s => subjects.add(s))
      strand.topics.forEach(t => topics.add(t))
      strand.skills.forEach(s => skills.add(s))
    }

    return {
      tags: Array.from(tags).sort(),
      subjects: Array.from(subjects).sort(),
      topics: Array.from(topics).sort(),
      skills: Array.from(skills).sort(),
    }
  }, [allStrands])

  // Filter available strands
  const filterAvailable = useCallback(
    (filters: StrandFilters): StrandSummary[] => {
      return allStrands.filter(strand => matchesFilters(strand, filters))
    },
    [allStrands]
  )

  // Selection methods
  const isSelected = useCallback(
    (strandId: string) => selectedIds.has(strandId),
    [selectedIds]
  )

  const selectStrand = useCallback((strand: StrandSummary) => {
    setSelectedStrands(prev => {
      if (prev.some(s => s.id === strand.id)) return prev
      return [...prev, strand]
    })
  }, [])

  const deselectStrand = useCallback((strandId: string) => {
    setSelectedStrands(prev => prev.filter(s => s.id !== strandId))
    setLoadedContent(prev => prev.filter(c => c.id !== strandId))
  }, [])

  const selectMultiple = useCallback((strands: StrandSummary[]) => {
    setSelectedStrands(prev => {
      const existingIds = new Set(prev.map(s => s.id))
      const newStrands = strands.filter(s => !existingIds.has(s.id))
      return [...prev, ...newStrands]
    })
  }, [])

  const selectByFilter = useCallback(
    (filters: StrandFilters) => {
      const matching = filterAvailable(filters)
      selectMultiple(matching)
    },
    [filterAvailable, selectMultiple]
  )

  const toggleStrand = useCallback((strand: StrandSummary) => {
    setSelectedStrands(prev => {
      const exists = prev.some(s => s.id === strand.id)
      if (exists) {
        return prev.filter(s => s.id !== strand.id)
      }
      return [...prev, strand]
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStrands([])
    setLoadedContent([])
    setProgress({
      stage: 'idle',
      message: '',
      current: 0,
      total: 0,
      percent: 0,
    })
  }, [])

  // Load content for selected strands
  const loadContent = useCallback(async (): Promise<StrandWithContent[]> => {
    if (selectedStrands.length === 0) {
      setError('No strands selected')
      return []
    }

    cancelRef.current = false
    setError(null)
    setLoadedContent([])

    const total = selectedStrands.length
    const loaded: StrandWithContent[] = []

    setProgress({
      stage: 'fetching',
      message: `Loading ${total} strand${total > 1 ? 's' : ''}...`,
      current: 0,
      total,
      percent: 0,
    })

    try {
      for (let i = 0; i < selectedStrands.length; i++) {
        if (cancelRef.current) {
          setProgress(prev => ({
            ...prev,
            stage: 'idle',
            message: 'Cancelled',
          }))
          return loaded
        }

        const strand = selectedStrands[i]

        setProgress({
          stage: 'fetching',
          message: `Loading "${strand.title}"...`,
          current: i,
          total,
          percent: Math.round((i / total) * 100),
        })

        try {
          const { content, metadata } = await fetchContent(strand.path)

          const withContent: StrandWithContent = {
            ...strand,
            content,
            metadata,
          }

          loaded.push(withContent)

          // Update loaded content progressively
          setLoadedContent(prev => [...prev, withContent])
        } catch (err) {
          console.warn(`Failed to load strand ${strand.path}:`, err)
          // Continue loading other strands
        }

        // Small delay to keep UI responsive
        await new Promise(r => setTimeout(r, 10))
      }

      setProgress({
        stage: 'complete',
        message: `Loaded ${loaded.length} strand${loaded.length !== 1 ? 's' : ''}`,
        current: total,
        total,
        percent: 100,
      })

      return loaded
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load content'
      setError(message)
      setProgress({
        stage: 'error',
        message,
        current: loaded.length,
        total,
        percent: Math.round((loaded.length / total) * 100),
      })
      return loaded
    }
  }, [selectedStrands, fetchContent])

  const cancelLoading = useCallback(() => {
    cancelRef.current = true
  }, [])

  return {
    availableStrands: allStrands,
    selectedStrands,
    loadedContent,
    progress,
    error,
    stats,
    selectStrand,
    deselectStrand,
    selectMultiple,
    selectByFilter,
    clearSelection,
    toggleStrand,
    isSelected,
    loadContent,
    cancelLoading,
    filterAvailable,
    getFilterOptions,
  }
}

// ==================== Utility: Create Strand Summary from Metadata ====================

/**
 * Create a StrandSummary from file path and metadata
 */
export function createStrandSummary(
  path: string,
  metadata: StrandMetadata
): StrandSummary {
  return {
    id: metadata.id || path,
    path,
    title: metadata.title || path.split('/').pop()?.replace(/\.mdx?$/, '') || 'Untitled',
    tags: normalizeTags(metadata.tags),
    subjects: metadata.taxonomy?.subjects || [],
    topics: metadata.taxonomy?.topics || [],
    skills: metadata.skills || [],
    difficulty: normalizeDifficulty(metadata.difficulty),
    summary: metadata.summary || metadata.aiSummary,
  }
}

export default useMultiStrandContent









