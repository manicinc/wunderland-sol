/**
 * Mindmap Generation Hook
 * @module hooks/useMindmapGeneration
 *
 * State management hook for automatic mindmap generation
 * Supports three mindmap types (hierarchy, graph, concept)
 * with dual view modes (single, multi) and generation modes (content, tags)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPE DEFINITIONS
═══════════════════════════════════════════════════════════════════════════ */

export type MindmapType = 'hierarchy' | 'graph' | 'concept'
export type ViewMode = 'single' | 'multi'
export type GenerationMode = 'content' | 'tags'

export interface MindmapState {
  mindmapType: MindmapType
  viewMode: ViewMode
  generationMode: GenerationMode
  loading: boolean
  progress: number
  error: string | null
  lastGenerated: Date | null
}

export interface HierarchyData {
  markdown: string
  headingCount: number
}

export interface GraphNode {
  id: string
  name: string
  type: 'current' | 'parent' | 'child' | 'sibling' | 'prerequisite' | 'reference' | 'tag-related'
  path: string
  weight: number
  difficulty?: string
  subject?: string
}

export interface GraphLink {
  source: string
  target: string
  strength: number
  type: 'hierarchy' | 'reference' | 'prerequisite' | 'tag'
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface ConceptNode {
  id: string
  text: string
  type: 'entity' | 'topic' | 'action' | 'attribute'
  weight: number
  color: string
}

export interface ConceptEdge {
  source: string
  target: string
  type: 'related' | 'acts-on' | 'has-attribute'
  strength: number
}

export interface ConceptData {
  nodes: ConceptNode[]
  edges: ConceptEdge[]
}

export interface MindmapCache {
  hierarchy: Map<string, HierarchyData>
  graph: Map<string, GraphData>
  concept: Map<string, ConceptData>
}

export interface UseMindmapGenerationOptions {
  initialMindmapType?: MindmapType
  initialViewMode?: ViewMode
  initialGenerationMode?: GenerationMode
  cacheEnabled?: boolean
}

export interface UseMindmapGenerationReturn {
  // State
  mindmapType: MindmapType
  viewMode: ViewMode
  generationMode: GenerationMode

  // Generated data
  hierarchyData: HierarchyData | null
  graphData: GraphData | null
  conceptData: ConceptData | null

  // Loading states
  loading: boolean
  progress: number
  error: string | null

  // Actions
  setMindmapType: (type: MindmapType) => void
  setViewMode: (mode: ViewMode) => void
  setGenerationMode: (mode: GenerationMode) => void

  // Generation
  generate: (content: string, metadata?: Record<string, unknown>) => Promise<void>
  regenerate: () => Promise<void>
  cancel: () => void
  clearCache: () => void

  // Cache info
  cacheSize: number
  hasCachedData: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   CACHE KEY GENERATION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generate cache key from content hash
 */
function generateCacheKey(content: string, metadata?: Record<string, unknown>): string {
  // Simple hash function for cache key
  let hash = 0
  const str = content + JSON.stringify(metadata || {})
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `mk-${Math.abs(hash).toString(36)}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useMindmapGeneration(
  options: UseMindmapGenerationOptions = {}
): UseMindmapGenerationReturn {
  const {
    initialMindmapType = 'hierarchy',
    initialViewMode = 'single',
    initialGenerationMode = 'content',
    cacheEnabled = true,
  } = options

  /* ────────────────────────────────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────────────────────────────────── */

  const [state, setState] = useState<MindmapState>({
    mindmapType: initialMindmapType,
    viewMode: initialViewMode,
    generationMode: initialGenerationMode,
    loading: false,
    progress: 0,
    error: null,
    lastGenerated: null,
  })

  // Generated data
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [conceptData, setConceptData] = useState<ConceptData | null>(null)

  // Cache
  const [cache] = useState<MindmapCache>(() => ({
    hierarchy: new Map(),
    graph: new Map(),
    concept: new Map(),
  }))

  // Last generated content (for regeneration)
  const [lastContent, setLastContent] = useState<string>('')
  const [lastMetadata, setLastMetadata] = useState<Record<string, unknown> | undefined>()

  // Abort controller for cancellation
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  /* ────────────────────────────────────────────────────────────────────────
     ACTIONS
  ──────────────────────────────────────────────────────────────────────── */

  const setMindmapType = useCallback((type: MindmapType) => {
    setState(prev => ({ ...prev, mindmapType: type, error: null }))
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode, error: null }))
  }, [])

  const setGenerationMode = useCallback((mode: GenerationMode) => {
    setState(prev => ({ ...prev, generationMode: mode, error: null }))
  }, [])

  const clearCache = useCallback(() => {
    cache.hierarchy.clear()
    cache.graph.clear()
    cache.concept.clear()
  }, [cache])

  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setState(prev => ({
        ...prev,
        loading: false,
        progress: 0,
        error: 'Generation cancelled',
      }))
    }
  }, [abortController])

  /* ────────────────────────────────────────────────────────────────────────
     GENERATION LOGIC
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Generate mindmap from content
   */
  const generate = useCallback(async (
    content: string,
    metadata?: Record<string, unknown>
  ) => {
    // Store for regeneration
    setLastContent(content)
    setLastMetadata(metadata)

    // Create abort controller
    const controller = new AbortController()
    setAbortController(controller)

    // Check cache
    const cacheKey = generateCacheKey(content, metadata)

    try {
      setState(prev => ({ ...prev, loading: true, progress: 0, error: null }))

      // Check cache for current mindmap type
      if (cacheEnabled) {
        const cachedData = cache[state.mindmapType].get(cacheKey)
        if (cachedData) {
          // Use cached data
          if (state.mindmapType === 'hierarchy') {
            setHierarchyData(cachedData as HierarchyData)
          } else if (state.mindmapType === 'graph') {
            setGraphData(cachedData as GraphData)
          } else if (state.mindmapType === 'concept') {
            setConceptData(cachedData as ConceptData)
          }

          setState(prev => ({
            ...prev,
            loading: false,
            progress: 100,
            lastGenerated: new Date(),
          }))
          setAbortController(null)
          return
        }
      }

      // Generate based on mindmap type
      // Content is passed as JSON string from LearningStudio
      setState(prev => ({ ...prev, progress: 20 }))

      if (state.mindmapType === 'hierarchy') {
        const hierarchyResult: HierarchyData = JSON.parse(content)
        setState(prev => ({ ...prev, progress: 80 }))

        setHierarchyData(hierarchyResult)
        if (cacheEnabled) {
          cache.hierarchy.set(cacheKey, hierarchyResult)
        }

      } else if (state.mindmapType === 'graph') {
        const graphResult: GraphData = JSON.parse(content)
        setState(prev => ({ ...prev, progress: 80 }))

        setGraphData(graphResult)
        if (cacheEnabled) {
          cache.graph.set(cacheKey, graphResult)
        }

      } else if (state.mindmapType === 'concept') {
        const conceptResult: ConceptData = JSON.parse(content)
        setState(prev => ({ ...prev, progress: 80 }))

        setConceptData(conceptResult)
        if (cacheEnabled) {
          cache.concept.set(cacheKey, conceptResult)
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        progress: 100,
        lastGenerated: new Date(),
      }))

    } catch (err) {
      if (controller.signal.aborted) {
        setState(prev => ({
          ...prev,
          loading: false,
          progress: 0,
          error: 'Generation cancelled',
        }))
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          progress: 0,
          error: err instanceof Error ? err.message : 'Failed to generate mindmap',
        }))
      }
    } finally {
      setAbortController(null)
    }
  }, [state.mindmapType, cache, cacheEnabled])

  /**
   * Regenerate with last content
   */
  const regenerate = useCallback(async () => {
    if (lastContent) {
      // Clear current data for this type
      if (state.mindmapType === 'hierarchy') {
        setHierarchyData(null)
      } else if (state.mindmapType === 'graph') {
        setGraphData(null)
      } else if (state.mindmapType === 'concept') {
        setConceptData(null)
      }

      // Regenerate
      await generate(lastContent, lastMetadata)
    }
  }, [lastContent, lastMetadata, generate, state.mindmapType])

  /* ────────────────────────────────────────────────────────────────────────
     COMPUTED VALUES
  ──────────────────────────────────────────────────────────────────────── */

  const cacheSize = useMemo(() => {
    return cache.hierarchy.size + cache.graph.size + cache.concept.size
  }, [cache])

  const hasCachedData = useMemo(() => {
    return cacheSize > 0
  }, [cacheSize])

  /* ────────────────────────────────────────────────────────────────────────
     CLEANUP
  ──────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      // Cancel any in-progress generation on unmount
      if (abortController) {
        abortController.abort()
      }
    }
  }, [abortController])

  /* ────────────────────────────────────────────────────────────────────────
     RETURN
  ──────────────────────────────────────────────────────────────────────── */

  return {
    // State
    mindmapType: state.mindmapType,
    viewMode: state.viewMode,
    generationMode: state.generationMode,

    // Data
    hierarchyData,
    graphData,
    conceptData,

    // Loading
    loading: state.loading,
    progress: state.progress,
    error: state.error,

    // Actions
    setMindmapType,
    setViewMode,
    setGenerationMode,
    generate,
    regenerate,
    cancel,
    clearCache,

    // Cache
    cacheSize,
    hasCachedData,
  }
}
