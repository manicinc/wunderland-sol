/**
 * Selected Strands Context
 *
 * Provides shared state for strand selection across the app.
 * Used by:
 * - Sidebar MultiStrandPicker for learning studio features
 * - Ask interface ContextPicker for RAG context injection
 * - Oracle planner for task context
 *
 * @module components/quarry/contexts/SelectedStrandsContext
 */

'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface SelectedStrand {
  id: string
  path: string
  title: string
  content?: string
  wordCount?: number
  tags?: string[]
  subjects?: string[]
  topics?: string[]
}

/**
 * Selection mode for strand lists
 */
export type SelectionMode = 'single' | 'multi' | 'range'

export interface SelectedStrandsState {
  /** Currently selected strands for RAG context */
  strands: SelectedStrand[]
  /** Set of selected strand IDs for quick lookup */
  selectedIds: Set<string>
  /** Total word count of selected strands */
  totalWords: number
  /** Whether strands are being used as context in Ask */
  isActiveContext: boolean
  /** Current selection mode */
  selectionMode: SelectionMode
  /** Last selected strand ID (for range selection) */
  lastSelectedId?: string
  /** Anchor strand ID for shift-click range */
  anchorId?: string
  /** Whether selection toolbar should be visible */
  showSelectionToolbar: boolean
}

export interface SelectedStrandsActions {
  /** Add a strand to selection */
  addStrand: (strand: SelectedStrand) => void
  /** Remove a strand from selection */
  removeStrand: (strandId: string) => void
  /** Toggle strand selection */
  toggleStrand: (strand: SelectedStrand) => void
  /** Add multiple strands */
  addMultiple: (strands: SelectedStrand[]) => void
  /** Clear all selections */
  clearAll: () => void
  /** Set strands directly (replaces all) */
  setStrands: (strands: SelectedStrand[]) => void
  /** Toggle whether selection is used as active context */
  setActiveContext: (active: boolean) => void
  /** Set selection mode */
  setSelectionMode: (mode: SelectionMode) => void
  /** Select a range of strands (for shift-click) */
  selectRange: (fromId: string, toId: string, allStrands: SelectedStrand[]) => void
  /** Select all strands from a list */
  selectAll: (strands: SelectedStrand[]) => void
  /** Invert selection */
  invertSelection: (allStrands: SelectedStrand[]) => void
  /** Toggle selection toolbar visibility */
  setShowSelectionToolbar: (show: boolean) => void
  /** Handle click with modifier keys */
  handleStrandClick: (strand: SelectedStrand, event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, allStrands: SelectedStrand[]) => void
}

type SelectedStrandsContextValue = SelectedStrandsState & SelectedStrandsActions

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════════════════════ */

const SelectedStrandsContext = createContext<SelectedStrandsContextValue | null>(null)

/* ═══════════════════════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════════════════════ */

export interface SelectedStrandsProviderProps {
  children: ReactNode
  /** Initial strands (optional) */
  initialStrands?: SelectedStrand[]
}

export function SelectedStrandsProvider({
  children,
  initialStrands = [],
}: SelectedStrandsProviderProps) {
  const [strands, setStrandsState] = useState<SelectedStrand[]>(initialStrands)
  const [isActiveContext, setActiveContext] = useState(true)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('multi')
  const [lastSelectedId, setLastSelectedId] = useState<string | undefined>()
  const [anchorId, setAnchorId] = useState<string | undefined>()
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false)

  // Computed values
  const selectedIds = useMemo(() => new Set(strands.map((s) => s.id)), [strands])
  const totalWords = useMemo(
    () => strands.reduce((sum, s) => sum + (s.wordCount || 0), 0),
    [strands]
  )

  // Actions
  const addStrand = useCallback((strand: SelectedStrand) => {
    setStrandsState((prev) => {
      if (prev.some((s) => s.id === strand.id)) return prev
      return [...prev, strand]
    })
  }, [])

  const removeStrand = useCallback((strandId: string) => {
    setStrandsState((prev) => prev.filter((s) => s.id !== strandId))
  }, [])

  const toggleStrand = useCallback((strand: SelectedStrand) => {
    setStrandsState((prev) => {
      const exists = prev.some((s) => s.id === strand.id)
      if (exists) {
        return prev.filter((s) => s.id !== strand.id)
      }
      return [...prev, strand]
    })
  }, [])

  const addMultiple = useCallback((newStrands: SelectedStrand[]) => {
    setStrandsState((prev) => {
      const existingIds = new Set(prev.map((s) => s.id))
      const toAdd = newStrands.filter((s) => !existingIds.has(s.id))
      return [...prev, ...toAdd]
    })
  }, [])

  const clearAll = useCallback(() => {
    setStrandsState([])
  }, [])

  const setStrands = useCallback((newStrands: SelectedStrand[]) => {
    setStrandsState(newStrands)
  }, [])

  // Select a range of strands (for shift-click)
  const selectRange = useCallback(
    (fromId: string, toId: string, allStrands: SelectedStrand[]) => {
      const fromIndex = allStrands.findIndex((s) => s.id === fromId)
      const toIndex = allStrands.findIndex((s) => s.id === toId)

      if (fromIndex === -1 || toIndex === -1) return

      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangeStrands = allStrands.slice(start, end + 1)

      setStrandsState((prev) => {
        const existingIds = new Set(prev.map((s) => s.id))
        const toAdd = rangeStrands.filter((s) => !existingIds.has(s.id))
        return [...prev, ...toAdd]
      })
    },
    []
  )

  // Select all strands from a list
  const selectAll = useCallback((allStrands: SelectedStrand[]) => {
    setStrandsState(allStrands)
    setShowSelectionToolbar(allStrands.length > 0)
  }, [])

  // Invert selection
  const invertSelection = useCallback((allStrands: SelectedStrand[]) => {
    setStrandsState((prev) => {
      const selectedIds = new Set(prev.map((s) => s.id))
      return allStrands.filter((s) => !selectedIds.has(s.id))
    })
  }, [])

  // Handle click with modifier keys (shift, ctrl/cmd)
  const handleStrandClick = useCallback(
    (
      strand: SelectedStrand,
      event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
      allStrands: SelectedStrand[]
    ) => {
      const isMultiSelect = event.ctrlKey || event.metaKey
      const isRangeSelect = event.shiftKey

      if (isRangeSelect && anchorId) {
        // Range selection: select from anchor to clicked strand
        selectRange(anchorId, strand.id, allStrands)
        setLastSelectedId(strand.id)
      } else if (isMultiSelect) {
        // Multi-selection: toggle the strand
        setStrandsState((prev) => {
          const exists = prev.some((s) => s.id === strand.id)
          if (exists) {
            return prev.filter((s) => s.id !== strand.id)
          }
          return [...prev, strand]
        })
        setLastSelectedId(strand.id)
        setAnchorId(strand.id)
      } else {
        // Single selection: replace selection
        setStrandsState([strand])
        setLastSelectedId(strand.id)
        setAnchorId(strand.id)
      }

      // Show toolbar when there's a selection
      setShowSelectionToolbar(true)
    },
    [anchorId, selectRange]
  )

  // Context value
  const value = useMemo<SelectedStrandsContextValue>(
    () => ({
      strands,
      selectedIds,
      totalWords,
      isActiveContext,
      selectionMode,
      lastSelectedId,
      anchorId,
      showSelectionToolbar,
      addStrand,
      removeStrand,
      toggleStrand,
      addMultiple,
      clearAll,
      setStrands,
      setActiveContext,
      setSelectionMode,
      selectRange,
      selectAll,
      invertSelection,
      setShowSelectionToolbar,
      handleStrandClick,
    }),
    [
      strands,
      selectedIds,
      totalWords,
      isActiveContext,
      selectionMode,
      lastSelectedId,
      anchorId,
      showSelectionToolbar,
      addStrand,
      removeStrand,
      toggleStrand,
      addMultiple,
      clearAll,
      setStrands,
      selectRange,
      selectAll,
      invertSelection,
      handleStrandClick,
    ]
  )

  return (
    <SelectedStrandsContext.Provider value={value}>
      {children}
    </SelectedStrandsContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook to access selected strands context
 *
 * @example
 * const { strands, addStrand, clearAll } = useSelectedStrands()
 *
 * // Add a strand to context
 * addStrand({ id: '123', path: '/docs/intro.md', title: 'Introduction' })
 *
 * // Check if strand is selected
 * const isSelected = selectedIds.has('123')
 */
export function useSelectedStrands(): SelectedStrandsContextValue {
  const context = useContext(SelectedStrandsContext)

  if (!context) {
    throw new Error('useSelectedStrands must be used within a SelectedStrandsProvider')
  }

  return context
}

/**
 * Hook that returns null if not in provider (safe version)
 */
export function useSelectedStrandsSafe(): SelectedStrandsContextValue | null {
  return useContext(SelectedStrandsContext)
}

export default SelectedStrandsContext
