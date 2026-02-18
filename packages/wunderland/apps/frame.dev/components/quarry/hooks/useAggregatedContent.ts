/**
 * Aggregated Content Hook
 * @module codex/hooks/useAggregatedContent
 * 
 * Provides aggregated content from selected strands for:
 * - Flashcard generation
 * - Quiz generation
 * - Glossary generation
 * - RAG context for Ask interface
 * 
 * Features:
 * - Content fetching and caching
 * - Progress tracking
 * - Filtering by tags/subjects/topics
 * - Automatic content aggregation
 */

'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSelectedStrandsSafe, type SelectedStrand } from '../contexts/SelectedStrandsContext'

// ==================== Types ====================

export interface AggregatedStrand {
  id: string
  path: string
  title: string
  content: string
  wordCount: number
  tags: string[]
  subjects: string[]
  topics: string[]
}

export interface AggregationProgress {
  stage: 'idle' | 'fetching' | 'processing' | 'complete' | 'error'
  message: string
  current: number
  total: number
  percent: number
}

export interface AggregationStats {
  strandCount: number
  totalWords: number
  uniqueTags: string[]
  uniqueSubjects: string[]
  uniqueTopics: string[]
  estimatedGenerationTime: number // seconds
}

export interface AggregationFilters {
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  minWords?: number
  maxWords?: number
  /** Match mode: 'any' (OR) or 'all' (AND) */
  matchMode?: 'any' | 'all'
}

export interface UseAggregatedContentOptions {
  /** Content fetcher function */
  fetchContent?: (path: string) => Promise<string>
  /** Auto-load content when selection changes */
  autoLoad?: boolean
  /** Maximum strands to load at once */
  maxStrands?: number
  /** Cache content between loads */
  useCache?: boolean
}

export interface UseAggregatedContentReturn {
  // State
  aggregatedContent: AggregatedStrand[]
  combinedContent: string
  progress: AggregationProgress
  error: string | null
  isLoading: boolean
  
  // Stats
  stats: AggregationStats
  
  // Actions
  loadContent: () => Promise<AggregatedStrand[]>
  cancelLoading: () => void
  clearContent: () => void
  
  // Filtering
  applyFilters: (filters: AggregationFilters) => AggregatedStrand[]
  filteredContent: AggregatedStrand[]
  setFilters: (filters: AggregationFilters) => void
  filters: AggregationFilters
  
  // For generation
  getContentForGeneration: () => { content: string; strands: { id: string; path: string; title: string; content: string }[] }
}

// ==================== Content Cache ====================

const contentCache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedContent(path: string): string | null {
  const cached = contentCache.get(path)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    contentCache.delete(path)
    return null
  }
  
  return cached.content
}

function setCachedContent(path: string, content: string): void {
  contentCache.set(path, { content, timestamp: Date.now() })
}

// ==================== Helpers ====================

function countWords(content: string): number {
  return content.split(/\s+/).filter(w => w.length > 0).length
}

function matchesFilters(strand: AggregatedStrand, filters: AggregationFilters): boolean {
  const matchMode = filters.matchMode ?? 'any'
  const matches: boolean[] = []
  
  // Word count filters
  if (filters.minWords && strand.wordCount < filters.minWords) return false
  if (filters.maxWords && strand.wordCount > filters.maxWords) return false
  
  // Tag filter
  if (filters.tags?.length) {
    const hasTag = filters.tags.some(t =>
      strand.tags.some(st => st.toLowerCase() === t.toLowerCase())
    )
    matches.push(hasTag)
  }
  
  // Subject filter
  if (filters.subjects?.length) {
    const hasSubject = filters.subjects.some(s =>
      strand.subjects.some(ss => ss.toLowerCase() === s.toLowerCase())
    )
    matches.push(hasSubject)
  }
  
  // Topic filter
  if (filters.topics?.length) {
    const hasTopic = filters.topics.some(t =>
      strand.topics.some(st => st.toLowerCase() === t.toLowerCase())
    )
    matches.push(hasTopic)
  }
  
  if (matches.length === 0) return true
  
  return matchMode === 'any'
    ? matches.some(m => m)
    : matches.every(m => m)
}

// ==================== Default Content Fetcher ====================

async function defaultFetchContent(path: string): Promise<string> {
  // Try to fetch from API
  const response = await fetch(`/api/strand/content?path=${encodeURIComponent(path)}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch content for ${path}`)
  }
  
  const data = await response.json()
  return data.content || ''
}

// ==================== Hook ====================

export function useAggregatedContent(
  options: UseAggregatedContentOptions = {}
): UseAggregatedContentReturn {
  const {
    fetchContent = defaultFetchContent,
    autoLoad = false,
    maxStrands = 50,
    useCache = true,
  } = options
  
  const selectedStrandsContext = useSelectedStrandsSafe()
  const cancelRef = useRef(false)
  
  // State
  const [aggregatedContent, setAggregatedContent] = useState<AggregatedStrand[]>([])
  const [progress, setProgress] = useState<AggregationProgress>({
    stage: 'idle',
    message: '',
    current: 0,
    total: 0,
    percent: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AggregationFilters>({})
  
  // Get selected strands from context
  const selectedStrands = selectedStrandsContext?.strands ?? []
  
  // Combined content string
  const combinedContent = useMemo(() => {
    return aggregatedContent.map(s => s.content).join('\n\n---\n\n')
  }, [aggregatedContent])
  
  // Calculate stats
  const stats = useMemo<AggregationStats>(() => {
    const allTags = new Set<string>()
    const allSubjects = new Set<string>()
    const allTopics = new Set<string>()
    let totalWords = 0
    
    for (const strand of aggregatedContent) {
      strand.tags.forEach(t => allTags.add(t))
      strand.subjects.forEach(s => allSubjects.add(s))
      strand.topics.forEach(t => allTopics.add(t))
      totalWords += strand.wordCount
    }
    
    // Estimate generation time (rough: ~100 words per second for NLP, ~500 for LLM)
    const estimatedGenerationTime = Math.ceil(totalWords / 100)
    
    return {
      strandCount: aggregatedContent.length,
      totalWords,
      uniqueTags: Array.from(allTags),
      uniqueSubjects: Array.from(allSubjects),
      uniqueTopics: Array.from(allTopics),
      estimatedGenerationTime,
    }
  }, [aggregatedContent])
  
  // Filtered content
  const filteredContent = useMemo(() => {
    if (!filters.tags?.length && !filters.subjects?.length && !filters.topics?.length && !filters.minWords && !filters.maxWords) {
      return aggregatedContent
    }
    return aggregatedContent.filter(strand => matchesFilters(strand, filters))
  }, [aggregatedContent, filters])
  
  // Apply filters
  const applyFilters = useCallback(
    (newFilters: AggregationFilters): AggregatedStrand[] => {
      return aggregatedContent.filter(strand => matchesFilters(strand, newFilters))
    },
    [aggregatedContent]
  )
  
  // Load content from selected strands
  const loadContent = useCallback(async (): Promise<AggregatedStrand[]> => {
    if (selectedStrands.length === 0) {
      setError('No strands selected')
      return []
    }
    
    const strandsToLoad = selectedStrands.slice(0, maxStrands)
    cancelRef.current = false
    setError(null)
    
    const total = strandsToLoad.length
    const loaded: AggregatedStrand[] = []
    
    setProgress({
      stage: 'fetching',
      message: `Loading ${total} strand${total > 1 ? 's' : ''}...`,
      current: 0,
      total,
      percent: 0,
    })
    
    try {
      for (let i = 0; i < strandsToLoad.length; i++) {
        if (cancelRef.current) {
          setProgress(prev => ({
            ...prev,
            stage: 'idle',
            message: 'Cancelled',
          }))
          return loaded
        }
        
        const strand = strandsToLoad[i]
        
        setProgress({
          stage: 'fetching',
          message: `Loading "${strand.title}"...`,
          current: i,
          total,
          percent: Math.round((i / total) * 100),
        })
        
        try {
          // Check cache first
          let content = useCache ? getCachedContent(strand.path) : null
          
          if (!content) {
            // If strand already has content, use it
            if (strand.content) {
              content = strand.content
            } else {
              // Fetch content
              content = await fetchContent(strand.path)
            }
            
            if (useCache && content) {
              setCachedContent(strand.path, content)
            }
          }
          
          if (content) {
            const aggregated: AggregatedStrand = {
              id: strand.id,
              path: strand.path,
              title: strand.title,
              content,
              wordCount: countWords(content),
              tags: strand.tags || [],
              subjects: strand.subjects || [],
              topics: strand.topics || [],
            }
            
            loaded.push(aggregated)
          }
        } catch (err) {
          console.warn(`Failed to load strand ${strand.path}:`, err)
          // Continue loading other strands
        }
        
        // Small delay to keep UI responsive
        await new Promise(r => setTimeout(r, 10))
      }
      
      setAggregatedContent(loaded)
      
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
  }, [selectedStrands, maxStrands, fetchContent, useCache])
  
  // Cancel loading
  const cancelLoading = useCallback(() => {
    cancelRef.current = true
  }, [])
  
  // Clear content
  const clearContent = useCallback(() => {
    setAggregatedContent([])
    setProgress({
      stage: 'idle',
      message: '',
      current: 0,
      total: 0,
      percent: 0,
    })
    setError(null)
  }, [])
  
  // Get content formatted for generation
  const getContentForGeneration = useCallback(() => {
    const content = filteredContent.map(s => s.content).join('\n\n---\n\n')
    const strands = filteredContent.map(s => ({
      id: s.id,
      path: s.path,
      title: s.title,
      content: s.content,
    }))
    
    return { content, strands }
  }, [filteredContent])
  
  // Auto-load when selection changes
  useEffect(() => {
    if (autoLoad && selectedStrands.length > 0) {
      loadContent()
    }
  }, [autoLoad, selectedStrands.length]) // eslint-disable-line react-hooks/exhaustive-deps
  
  const isLoading = progress.stage === 'fetching' || progress.stage === 'processing'
  
  return {
    aggregatedContent,
    combinedContent,
    progress,
    error,
    isLoading,
    stats,
    loadContent,
    cancelLoading,
    clearContent,
    applyFilters,
    filteredContent,
    setFilters,
    filters,
    getContentForGeneration,
  }
}

export default useAggregatedContent

