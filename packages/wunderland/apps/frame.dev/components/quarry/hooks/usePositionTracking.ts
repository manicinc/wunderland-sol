/**
 * Hook for tracking tree node positions during filtering
 * @module codex/hooks/usePositionTracking
 *
 * @remarks
 * - Snapshots tree positions before filtering
 * - Tracks hidden items' original positions
 * - Calculates adjusted indices for drag-drop with hidden siblings
 * - Generates move operations including hidden items
 *
 * @example
 * ```tsx
 * const { snapshotPositions, getAdjustedIndex, hasHiddenItems } = usePositionTracking()
 * ```
 */

import { useState, useCallback, useMemo } from 'react'
import type { PositionData, PositionTrackingState } from '../types'
import type { CodexTreeNode, MoveOperation } from '../tree/types'

/**
 * Default position tracking state
 */
const DEFAULT_STATE: PositionTrackingState = {
  positions: {},
  lastSnapshot: 0,
  isDirty: false,
}

interface UsePositionTrackingResult {
  /** Current position tracking state */
  state: PositionTrackingState
  /** Take a snapshot of current tree positions */
  snapshotPositions: (tree: CodexTreeNode[], hiddenPaths?: Set<string>) => void
  /** Get original position for a node */
  getOriginalPosition: (path: string) => PositionData | null
  /** Get all hidden items in a directory */
  getHiddenSiblings: (parentPath: string) => PositionData[]
  /** Calculate adjusted index accounting for hidden siblings */
  getAdjustedIndex: (parentPath: string, visibleIndex: number) => number
  /** Update position after a move */
  updatePosition: (path: string, newParentPath: string, newIndex: number) => void
  /** Mark position as hidden/visible */
  setHidden: (path: string, isHidden: boolean) => void
  /** Get all dirty positions as move operations */
  getDirtyMoveOperations: () => MoveOperation[]
  /** Clear dirty flag */
  clearDirty: () => void
  /** Reset all position tracking */
  reset: () => void
  /** Whether there are any hidden items */
  hasHiddenItems: boolean
  /** Count of hidden items */
  hiddenItemCount: number
}

/**
 * Traverse tree and record positions
 */
function buildPositionMap(
  nodes: CodexTreeNode[],
  parentPath: string,
  hiddenPaths: Set<string>
): Record<string, PositionData> {
  const positions: Record<string, PositionData> = {}
  const timestamp = Date.now()

  nodes.forEach((node, index) => {
    positions[node.path] = {
      parentPath,
      index,
      timestamp,
      isHidden: hiddenPaths.has(node.path),
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
      const childPositions = buildPositionMap(node.children, node.path, hiddenPaths)
      Object.assign(positions, childPositions)
    }
  })

  return positions
}

/**
 * Track tree node positions for drag-drop with filtering
 *
 * @remarks
 * When items are filtered (hidden), their positions must be preserved so that:
 * 1. When filters are cleared, items return to their original positions
 * 2. When drag-drop occurs, hidden items are accounted for in index calculations
 * 3. When saving/creating PRs, position updates include hidden items
 *
 * @example
 * ```tsx
 * function TreeWithFilters({ tree, hiddenPaths }: Props) {
 *   const {
 *     snapshotPositions,
 *     getAdjustedIndex,
 *     hasHiddenItems
 *   } = usePositionTracking()
 *
 *   useEffect(() => {
 *     snapshotPositions(tree, hiddenPaths)
 *   }, [tree, hiddenPaths])
 *
 *   const handleMove = ({ parentId, index }) => {
 *     const adjustedIndex = getAdjustedIndex(parentId, index)
 *     // Use adjustedIndex for actual tree operations
 *   }
 *
 *   return (
 *     <>
 *       {hasHiddenItems && <HiddenItemsWarning />}
 *       <Tree onMove={handleMove} />
 *     </>
 *   )
 * }
 * ```
 */
export function usePositionTracking(): UsePositionTrackingResult {
  const [state, setState] = useState<PositionTrackingState>(DEFAULT_STATE)

  // Snapshot current tree positions
  const snapshotPositions = useCallback(
    (tree: CodexTreeNode[], hiddenPaths: Set<string> = new Set()) => {
      const positions = buildPositionMap(tree, '', hiddenPaths)
      setState({
        positions,
        lastSnapshot: Date.now(),
        isDirty: false,
      })
    },
    []
  )

  // Get original position for a path
  const getOriginalPosition = useCallback(
    (path: string): PositionData | null => {
      return state.positions[path] || null
    },
    [state.positions]
  )

  // Get all hidden siblings in a parent directory
  const getHiddenSiblings = useCallback(
    (parentPath: string): PositionData[] => {
      const siblings: PositionData[] = []
      for (const [path, position] of Object.entries(state.positions)) {
        if (position.parentPath === parentPath && position.isHidden) {
          siblings.push({ ...position })
        }
      }
      // Sort by original index
      return siblings.sort((a, b) => a.index - b.index)
    },
    [state.positions]
  )

  // Calculate adjusted index accounting for hidden siblings
  const getAdjustedIndex = useCallback(
    (parentPath: string, visibleIndex: number): number => {
      const hiddenSiblings = getHiddenSiblings(parentPath)
      if (hiddenSiblings.length === 0) return visibleIndex

      // Count how many hidden items come before this visible index
      let adjustedIndex = visibleIndex
      let visibleCount = 0

      // Get all siblings in this parent, sorted by original index
      const allSiblings: Array<{ index: number; isHidden: boolean }> = []
      for (const position of Object.values(state.positions)) {
        if (position.parentPath === parentPath) {
          allSiblings.push({ index: position.index, isHidden: position.isHidden })
        }
      }
      allSiblings.sort((a, b) => a.index - b.index)

      // Walk through to find the adjusted position
      for (const sibling of allSiblings) {
        if (!sibling.isHidden) {
          if (visibleCount === visibleIndex) {
            return sibling.index
          }
          visibleCount++
        }
      }

      // If visible index is at the end, return after all items
      return allSiblings.length
    },
    [state.positions, getHiddenSiblings]
  )

  // Update a node's position
  const updatePosition = useCallback(
    (path: string, newParentPath: string, newIndex: number) => {
      setState(prev => ({
        ...prev,
        positions: {
          ...prev.positions,
          [path]: {
            parentPath: newParentPath,
            index: newIndex,
            timestamp: Date.now(),
            isHidden: prev.positions[path]?.isHidden || false,
          },
        },
        isDirty: true,
      }))
    },
    []
  )

  // Set hidden state for a path
  const setHidden = useCallback((path: string, isHidden: boolean) => {
    setState(prev => {
      const existing = prev.positions[path]
      if (!existing) return prev

      return {
        ...prev,
        positions: {
          ...prev.positions,
          [path]: { ...existing, isHidden },
        },
      }
    })
  }, [])

  // Get all positions that need move operations
  const getDirtyMoveOperations = useCallback((): MoveOperation[] => {
    const operations: MoveOperation[] = []
    const now = Date.now()

    for (const [path, position] of Object.entries(state.positions)) {
      // Only include positions that changed since last snapshot
      if (position.timestamp > state.lastSnapshot) {
        const name = path.split('/').pop() || path
        const oldPath = path // This would need original path tracking for full implementation

        // Only create operation if path actually moved
        // In a full implementation, we'd track the original path too
        operations.push({
          type: 'move',
          sourcePath: oldPath,
          destPath: path,
          name,
          nodeType: 'file', // Would need to track this too
          timestamp: now,
        })
      }
    }

    return operations
  }, [state])

  // Clear dirty flag
  const clearDirty = useCallback(() => {
    setState(prev => ({ ...prev, isDirty: false, lastSnapshot: Date.now() }))
  }, [])

  // Reset all tracking
  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  // Computed values
  const hasHiddenItems = useMemo(() => {
    return Object.values(state.positions).some(p => p.isHidden)
  }, [state.positions])

  const hiddenItemCount = useMemo(() => {
    return Object.values(state.positions).filter(p => p.isHidden).length
  }, [state.positions])

  return {
    state,
    snapshotPositions,
    getOriginalPosition,
    getHiddenSiblings,
    getAdjustedIndex,
    updatePosition,
    setHidden,
    getDirtyMoveOperations,
    clearDirty,
    reset,
    hasHiddenItems,
    hiddenItemCount,
  }
}

export default usePositionTracking
