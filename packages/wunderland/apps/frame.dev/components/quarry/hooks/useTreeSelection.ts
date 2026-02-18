'use client'

/**
 * Tree Selection Hook
 * @module codex/hooks/useTreeSelection
 * 
 * Manages multi-selection state for the sidebar tree.
 * Supports selecting strands, looms, and weaves.
 */

import { useState, useCallback, useMemo } from 'react'
import type { CodexTreeNode } from '../tree/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type NodeLevel = 'weave' | 'loom' | 'strand' | 'other'

export interface SelectionStats {
  total: number
  strands: number
  looms: number
  weaves: number
}

export interface UseTreeSelectionReturn {
  /** Currently selected paths */
  selectedPaths: Set<string>
  /** Whether selection mode is active */
  selectionMode: boolean
  /** Selection statistics */
  stats: SelectionStats
  /** Loading state for async operations */
  isLoading: boolean
  
  // Mode control
  /** Toggle selection mode on/off */
  toggleSelectionMode: () => void
  /** Enable selection mode */
  enableSelectionMode: () => void
  /** Disable selection mode */
  disableSelectionMode: () => void
  
  // Selection operations
  /** Toggle a single path */
  togglePath: (path: string, level?: NodeLevel) => void
  /** Select a path */
  selectPath: (path: string) => void
  /** Deselect a path */
  deselectPath: (path: string) => void
  /** Select multiple paths */
  selectPaths: (paths: string[]) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Select all children of a node */
  selectChildren: (parentPath: string, allNodes: CodexTreeNode[]) => void
  /** Deselect all children of a node */
  deselectChildren: (parentPath: string, allNodes: CodexTreeNode[]) => void
  /** Check if a path is selected */
  isSelected: (path: string) => boolean
  /** Select a path and all provided descendant paths (async, batched for performance) */
  selectRecursive: (parentPath: string, allPaths: string[]) => Promise<void>
  /** Toggle a path and all its descendants - if parent is selected, deselect all; otherwise select all */
  toggleRecursive: (parentPath: string, allPaths: string[]) => Promise<void>
  /** Check if a path or any of its ancestors is selected */
  isSelectedOrAncestorSelected: (path: string, ancestorPaths: string[]) => boolean
  
  // Batch operations
  /** Get selected paths by level */
  getSelectedByLevel: () => { strands: string[]; looms: string[]; weaves: string[] }
  /** Get all selected strand paths (resolving looms/weaves to their strands) */
  getAllStrandPaths: (allNodes: CodexTreeNode[]) => string[]
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Determine the level of a path based on its structure
 */
function getPathLevel(path: string): NodeLevel {
  const parts = path.split('/')
  
  // Check for common patterns
  if (parts.includes('strands') || path.endsWith('.md')) return 'strand'
  if (parts.includes('looms')) return 'loom'
  if (parts.includes('weaves')) return 'weave'
  
  return 'other'
}

/**
 * Find all strand paths under a node
 */
function findStrandPaths(node: CodexTreeNode): string[] {
  const strands: string[] = []
  
  if (node.level === 'strand' || (node.type === 'file' && node.path.endsWith('.md'))) {
    strands.push(node.path)
  }
  
  if (node.children) {
    for (const child of node.children) {
      strands.push(...findStrandPaths(child))
    }
  }
  
  return strands
}

/**
 * Find a node by path in the tree
 */
function findNodeByPath(nodes: CodexTreeNode[], path: string): CodexTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children) {
      const found = findNodeByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}

/**
 * Get all descendant paths of a node
 */
function getDescendantPaths(node: CodexTreeNode): string[] {
  const paths: string[] = []
  
  if (node.children) {
    for (const child of node.children) {
      paths.push(child.path)
      paths.push(...getDescendantPaths(child))
    }
  }
  
  return paths
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */

export function useTreeSelection(): UseTreeSelectionReturn {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [pathLevels, setPathLevels] = useState<Map<string, NodeLevel>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  
  // Calculate stats
  const stats = useMemo((): SelectionStats => {
    let strands = 0
    let looms = 0
    let weaves = 0
    
    for (const path of selectedPaths) {
      const level = pathLevels.get(path) || getPathLevel(path)
      switch (level) {
        case 'strand': strands++; break
        case 'loom': looms++; break
        case 'weave': weaves++; break
      }
    }
    
    return { total: selectedPaths.size, strands, looms, weaves }
  }, [selectedPaths, pathLevels])
  
  // Mode control
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        // Clearing selection when exiting mode
        setSelectedPaths(new Set())
        setPathLevels(new Map())
      }
      return !prev
    })
  }, [])
  
  const enableSelectionMode = useCallback(() => {
    setSelectionMode(true)
  }, [])
  
  const disableSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedPaths(new Set())
    setPathLevels(new Map())
  }, [])
  
  // Selection operations
  const togglePath = useCallback((path: string, level?: NodeLevel) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        if (level) {
          setPathLevels(prevLevels => new Map(prevLevels).set(path, level))
        }
      }
      return next
    })
  }, [])
  
  const selectPath = useCallback((path: string) => {
    setSelectedPaths(prev => new Set(prev).add(path))
  }, [])
  
  const deselectPath = useCallback((path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }, [])
  
  const selectPaths = useCallback((paths: string[]) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      for (const path of paths) {
        next.add(path)
      }
      return next
    })
  }, [])
  
  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set())
    setPathLevels(new Map())
  }, [])
  
  const selectChildren = useCallback((parentPath: string, allNodes: CodexTreeNode[]) => {
    const node = findNodeByPath(allNodes, parentPath)
    if (!node) return
    
    const descendantPaths = getDescendantPaths(node)
    selectPaths([parentPath, ...descendantPaths])
  }, [selectPaths])
  
  const deselectChildren = useCallback((parentPath: string, allNodes: CodexTreeNode[]) => {
    const node = findNodeByPath(allNodes, parentPath)
    if (!node) return
    
    const descendantPaths = getDescendantPaths(node)
    setSelectedPaths(prev => {
      const next = new Set(prev)
      next.delete(parentPath)
      for (const path of descendantPaths) {
        next.delete(path)
      }
      return next
    })
  }, [])
  
  const isSelected = useCallback((path: string): boolean => {
    return selectedPaths.has(path)
  }, [selectedPaths])

  /**
   * Check if a path is selected OR if any of its ancestor paths are selected
   * This is used to show checkboxes on children when a parent folder is selected
   */
  const isSelectedOrAncestorSelected = useCallback((path: string, ancestorPaths: string[]): boolean => {
    if (selectedPaths.has(path)) return true
    for (const ancestor of ancestorPaths) {
      if (selectedPaths.has(ancestor)) return true
    }
    return false
  }, [selectedPaths])
  
  /**
   * Select a path and all its descendants recursively
   * Uses batched updates for performance on large selections
   * Yields to the event loop periodically to keep UI responsive
   */
  const selectRecursive = useCallback(async (parentPath: string, allPaths: string[]): Promise<void> => {
    // For small selections, do it synchronously
    if (allPaths.length <= 100) {
      setSelectedPaths(prev => {
        const next = new Set(prev)
        for (const path of allPaths) {
          next.add(path)
        }
        return next
      })
      return
    }
    
    // For large selections, batch and yield to keep UI responsive
    setIsLoading(true)
    
    try {
      const BATCH_SIZE = 50
      const batches = Math.ceil(allPaths.length / BATCH_SIZE)
      
      for (let i = 0; i < batches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, allPaths.length)
        const batch = allPaths.slice(start, end)
        
        setSelectedPaths(prev => {
          const next = new Set(prev)
          for (const path of batch) {
            next.add(path)
          }
          return next
        })
        
        // Yield to event loop every batch to keep UI responsive
        if (i < batches - 1) {
          await new Promise(resolve => requestAnimationFrame(resolve))
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Toggle selection of a path and all its descendants
   * If the parent is already selected, deselect all; otherwise select all
   */
  const toggleRecursive = useCallback(async (parentPath: string, allPaths: string[]): Promise<void> => {
    const isParentSelected = selectedPaths.has(parentPath)

    if (isParentSelected) {
      // Deselect the parent and all descendants
      setSelectedPaths(prev => {
        const next = new Set(prev)
        next.delete(parentPath)
        for (const path of allPaths) {
          next.delete(path)
        }
        return next
      })
    } else {
      // Select the parent and all descendants
      await selectRecursive(parentPath, allPaths)
    }
  }, [selectedPaths, selectRecursive])

  // Batch operations
  const getSelectedByLevel = useCallback(() => {
    const strands: string[] = []
    const looms: string[] = []
    const weaves: string[] = []
    
    for (const path of selectedPaths) {
      const level = pathLevels.get(path) || getPathLevel(path)
      switch (level) {
        case 'strand': strands.push(path); break
        case 'loom': looms.push(path); break
        case 'weave': weaves.push(path); break
      }
    }
    
    return { strands, looms, weaves }
  }, [selectedPaths, pathLevels])
  
  const getAllStrandPaths = useCallback((allNodes: CodexTreeNode[]): string[] => {
    const strandPaths = new Set<string>()
    
    for (const path of selectedPaths) {
      const level = pathLevels.get(path) || getPathLevel(path)
      
      if (level === 'strand') {
        strandPaths.add(path)
      } else {
        // Find the node and get all strand descendants
        const node = findNodeByPath(allNodes, path)
        if (node) {
          const strands = findStrandPaths(node)
          for (const strand of strands) {
            strandPaths.add(strand)
          }
        }
      }
    }
    
    return Array.from(strandPaths)
  }, [selectedPaths, pathLevels])
  
  return {
    selectedPaths,
    selectionMode,
    stats,
    isLoading,
    toggleSelectionMode,
    enableSelectionMode,
    disableSelectionMode,
    togglePath,
    selectPath,
    deselectPath,
    selectPaths,
    clearSelection,
    selectChildren,
    deselectChildren,
    isSelected,
    isSelectedOrAncestorSelected,
    selectRecursive,
    toggleRecursive,
    getSelectedByLevel,
    getAllStrandPaths,
  }
}

export default useTreeSelection









