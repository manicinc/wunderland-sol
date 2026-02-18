/**
 * useWriterLocation Hook
 * @module components/quarry/ui/writer/hooks/useWriterLocation
 *
 * Manages target location (weave/loom) selection for the writer widget.
 * Provides location tree data, selection state, and quick presets.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useLocalTree } from '@/components/quarry/hooks/useLocalTree'

// ============================================================================
// TYPES
// ============================================================================

export interface LocationNode {
  id: string
  name: string
  path: string
  level: 'weave' | 'loom' | 'strand'
  children?: LocationNode[]
  description?: string
  icon?: string
  strandCount?: number
}

export interface LocationPreset {
  id: string
  path: string
  label: string
  icon: string
  description?: string
}

export interface UseWriterLocationState {
  /** Currently selected path */
  selectedPath: string
  /** AI-suggested path based on content */
  suggestedPath: string | null
  /** Reason for AI suggestion */
  suggestionReason: string | null
  /** Available location tree */
  locationTree: LocationNode[]
  /** Quick access presets */
  presets: LocationPreset[]
  /** Whether location picker modal is open */
  isPickerOpen: boolean
  /** Whether tree is loading */
  isLoading: boolean
  /** Auto-categorize enabled */
  autoCategorize: boolean
}

export interface UseWriterLocationActions {
  /** Select a path */
  selectPath: (path: string) => void
  /** Apply suggested path */
  applySuggestion: () => void
  /** Clear suggestion */
  clearSuggestion: () => void
  /** Suggest path based on content */
  suggestPathForContent: (content: string) => Promise<void>
  /** Open/close picker modal */
  setPickerOpen: (open: boolean) => void
  /** Toggle auto-categorize */
  setAutoCategorize: (enabled: boolean) => void
  /** Create new loom */
  createLoom: (parentPath: string, name: string) => Promise<LocationNode | null>
  /** Create new weave */
  createWeave: (name: string) => Promise<LocationNode | null>
  /** Refresh location tree */
  refreshTree: () => Promise<void>
}

export interface UseWriterLocationOptions {
  /** Initial selected path */
  initialPath?: string
  /** Enable AI auto-categorization */
  enableAutoCategorize?: boolean
  /** Callback when path changes */
  onPathChange?: (path: string) => void
}

export interface UseWriterLocationReturn extends UseWriterLocationState, UseWriterLocationActions {}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default capture location - uses Notes weave (seeded by default)
// TODO: Make this configurable via user settings
const DEFAULT_PATH = 'weaves/notes/'

const DEFAULT_PRESETS: LocationPreset[] = [
  {
    id: 'notes',
    path: 'weaves/notes/',
    label: 'Notes',
    icon: 'FileText',
    description: 'Quick notes & supernotes',
  },
  {
    id: 'writings',
    path: 'weaves/writings/',
    label: 'Writings',
    icon: 'Pencil',
    description: 'Writing drafts',
  },
  {
    id: 'reflections',
    path: 'weaves/reflections/',
    label: 'Reflections',
    icon: 'Heart',
    description: 'Journal & thoughts',
  },
  {
    id: 'wiki',
    path: 'weaves/wiki/',
    label: 'Wiki',
    icon: 'BookOpen',
    description: 'Knowledge base',
  },
]

const STORAGE_KEY = 'writer-location-preferences'

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

interface LocationPreferences {
  lastPath: string
  autoCategorize: boolean
  recentPaths: string[]
}

function loadPreferences(): LocationPreferences {
  if (typeof window === 'undefined') {
    return { lastPath: DEFAULT_PATH, autoCategorize: false, recentPaths: [] }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    console.error('[useWriterLocation] Failed to load preferences:', err)
  }

  return { lastPath: DEFAULT_PATH, autoCategorize: false, recentPaths: [] }
}

function savePreferences(prefs: Partial<LocationPreferences>): void {
  if (typeof window === 'undefined') return

  try {
    const current = loadPreferences()
    const updated = { ...current, ...prefs }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('[useWriterLocation] Failed to save preferences:', err)
  }
}

// ============================================================================
// CONTENT ANALYSIS FOR SUGGESTIONS
// ============================================================================

/**
 * Simple content analysis to suggest location
 * In production, this would use the NLP module
 */
async function analyzeContentForLocation(content: string): Promise<{
  path: string | null
  reason: string | null
}> {
  if (!content.trim()) {
    return { path: null, reason: null }
  }

  const lower = content.toLowerCase()

  // Simple keyword matching - in production use lib/nlp
  const categoryKeywords: Record<string, string[]> = {
    'weaves/wiki/tutorials/': ['tutorial', 'how to', 'step by step', 'guide', 'learn'],
    'weaves/wiki/reference/': ['api', 'reference', 'documentation', 'spec'],
    'weaves/wiki/concepts/': ['concept', 'theory', 'understanding', 'explain'],
    'weaves/research/': ['research', 'study', 'analysis', 'paper', 'findings'],
    'weaves/projects/': ['project', 'roadmap', 'milestone', 'sprint', 'task'],
    'weaves/ideas/': ['idea', 'brainstorm', 'thought', 'maybe', 'what if'],
    'weaves/notes/': ['note', 'meeting', 'log', 'journal', 'today'],
  }

  for (const [path, keywords] of Object.entries(categoryKeywords)) {
    const matched = keywords.filter(kw => lower.includes(kw))
    if (matched.length >= 2) {
      return {
        path,
        reason: `Contains keywords: ${matched.slice(0, 3).join(', ')}`,
      }
    }
  }

  // Check for code content
  if (content.includes('```') || content.includes('function ') || content.includes('const ')) {
    return {
      path: 'weaves/wiki/reference/',
      reason: 'Contains code snippets',
    }
  }

  return { path: null, reason: null }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useWriterLocation(options: UseWriterLocationOptions = {}): UseWriterLocationReturn {
  const {
    initialPath,
    enableAutoCategorize = false,
    onPathChange,
  } = options

  // Load stored preferences
  const storedPrefs = loadPreferences()

  // State
  const [selectedPath, setSelectedPathState] = useState(
    initialPath || storedPrefs.lastPath || DEFAULT_PATH
  )
  const [suggestedPath, setSuggestedPath] = useState<string | null>(null)
  const [suggestionReason, setSuggestionReason] = useState<string | null>(null)
  const [isPickerOpen, setPickerOpen] = useState(false)
  const [autoCategorize, setAutoCategorizeState] = useState(
    enableAutoCategorize || storedPrefs.autoCategorize
  )

  // Use local tree hook for data
  const { tree, loading: isLoading, refresh: refreshTree } = useLocalTree()

  // Transform tree to location nodes
  const locationTree = useMemo((): LocationNode[] => {
    if (!tree || !Array.isArray(tree)) return []

    const transformNode = (node: any): LocationNode => ({
      id: node.id || node.path,
      name: node.name,
      path: node.path,
      level: node.level || 'strand',
      children: node.children?.map(transformNode),
      description: node.description,
      strandCount: node.strandCount,
    })

    return tree.map(transformNode)
  }, [tree])

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const selectPath = useCallback((path: string) => {
    const normalizedPath = path.endsWith('/') ? path : `${path}/`
    setSelectedPathState(normalizedPath)
    savePreferences({ lastPath: normalizedPath })
    onPathChange?.(normalizedPath)
  }, [onPathChange])

  const applySuggestion = useCallback(() => {
    if (suggestedPath) {
      selectPath(suggestedPath)
      setSuggestedPath(null)
      setSuggestionReason(null)
    }
  }, [suggestedPath, selectPath])

  const clearSuggestion = useCallback(() => {
    setSuggestedPath(null)
    setSuggestionReason(null)
  }, [])

  const suggestPathForContent = useCallback(async (content: string) => {
    if (!autoCategorize) return

    const { path, reason } = await analyzeContentForLocation(content)
    if (path && path !== selectedPath) {
      setSuggestedPath(path)
      setSuggestionReason(reason)
    } else {
      setSuggestedPath(null)
      setSuggestionReason(null)
    }
  }, [autoCategorize, selectedPath])

  const setAutoCategorize = useCallback((enabled: boolean) => {
    setAutoCategorizeState(enabled)
    savePreferences({ autoCategorize: enabled })
    if (!enabled) {
      clearSuggestion()
    }
  }, [clearSuggestion])

  const createLoom = useCallback(async (
    parentPath: string,
    name: string
  ): Promise<LocationNode | null> => {
    // In production, this would call the actual API
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const normalizedParent = parentPath.endsWith('/') ? parentPath : `${parentPath}/`
    const newPath = `${normalizedParent}${slug}/`

    // For now, just return a virtual node
    const newNode: LocationNode = {
      id: newPath,
      name,
      path: newPath,
      level: 'loom',
      strandCount: 0,
    }

    // Refresh tree to pick up changes
    await refreshTree()

    return newNode
  }, [refreshTree])

  const createWeave = useCallback(async (name: string): Promise<LocationNode | null> => {
    // In production, this would call the actual API
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const newPath = `weaves/${slug}/`

    const newNode: LocationNode = {
      id: newPath,
      name,
      path: newPath,
      level: 'weave',
      strandCount: 0,
    }

    // Refresh tree
    await refreshTree()

    return newNode
  }, [refreshTree])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    selectedPath,
    suggestedPath,
    suggestionReason,
    locationTree,
    presets: DEFAULT_PRESETS,
    isPickerOpen,
    isLoading,
    autoCategorize,

    // Actions
    selectPath,
    applySuggestion,
    clearSuggestion,
    suggestPathForContent,
    setPickerOpen,
    setAutoCategorize,
    createLoom,
    createWeave,
    refreshTree,
  }
}

export default useWriterLocation

