/**
 * useHighlights - Hook for managing text highlights
 * @module codex/hooks/useHighlights
 *
 * @remarks
 * - Manages highlights stored in localStorage
 * - Supports grouping/categorization
 * - Provides CRUD operations for highlights
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Highlight, HighlightColor, HighlightGroup } from '@/lib/localStorage'
import {
  getHighlights,
  getHighlightsForFile,
  getHighlightsByGroup,
  addHighlight as addHighlightToStorage,
  updateHighlight as updateHighlightInStorage,
  removeHighlight as removeHighlightFromStorage,
  clearHighlights,
  getHighlightGroups,
  addHighlightGroup as addGroupToStorage,
  updateHighlightGroup as updateGroupInStorage,
  removeHighlightGroup as removeGroupFromStorage,
} from '@/lib/localStorage'

export interface UseHighlightsReturn {
  /** All highlights */
  highlights: Highlight[]
  /** All highlight groups */
  groups: HighlightGroup[]
  /** Currently selected group filter (null = show all) */
  selectedGroupId: string | null
  /** Set the group filter */
  setSelectedGroupId: (groupId: string | null) => void
  /** Add a new highlight */
  addHighlight: (data: {
    filePath: string
    content: string
    selectionType: 'text' | 'block'
    startOffset?: number
    endOffset?: number
    blockId?: string
    color?: HighlightColor
    groupId?: string
    notes?: string
  }) => Highlight
  /** Update an existing highlight */
  updateHighlight: (id: string, updates: Partial<Pick<Highlight, 'color' | 'groupId' | 'notes'>>) => void
  /** Remove a highlight */
  removeHighlight: (id: string) => void
  /** Clear all highlights */
  clearAllHighlights: () => void
  /** Add a custom group */
  addGroup: (name: string, color?: string, description?: string) => HighlightGroup
  /** Update a group */
  updateGroup: (id: string, updates: Partial<Pick<HighlightGroup, 'name' | 'color' | 'description'>>) => void
  /** Remove a group (moves highlights to default) */
  removeGroup: (id: string) => void
  /** Get highlights for a specific file */
  getFileHighlights: (filePath: string) => Highlight[]
  /** Refresh highlights from storage */
  refresh: () => void
}

/**
 * Hook for managing highlights with localStorage persistence
 */
export function useHighlights(): UseHighlightsReturn {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [groups, setGroups] = useState<HighlightGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    setHighlights(getHighlights())
    setGroups(getHighlightGroups())
  }, [])

  // Refresh from storage
  const refresh = useCallback(() => {
    setHighlights(getHighlights())
    setGroups(getHighlightGroups())
  }, [])

  // Get highlights for a specific file
  const getFileHighlights = useCallback((filePath: string): Highlight[] => {
    return getHighlightsForFile(filePath)
  }, [])

  // Add a new highlight
  const addHighlight = useCallback((data: {
    filePath: string
    content: string
    selectionType: 'text' | 'block'
    startOffset?: number
    endOffset?: number
    blockId?: string
    color?: HighlightColor
    groupId?: string
    notes?: string
  }): Highlight => {
    const newHighlight = addHighlightToStorage({
      filePath: data.filePath,
      content: data.content,
      selectionType: data.selectionType,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      blockId: data.blockId,
      color: data.color || 'yellow',
      groupId: data.groupId || 'default',
      notes: data.notes,
    })

    setHighlights(prev => [newHighlight, ...prev])
    return newHighlight
  }, [])

  // Update a highlight
  const updateHighlight = useCallback((
    id: string,
    updates: Partial<Pick<Highlight, 'color' | 'groupId' | 'notes'>>
  ) => {
    updateHighlightInStorage(id, updates)
    setHighlights(prev =>
      prev.map(h => h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h)
    )
  }, [])

  // Remove a highlight
  const removeHighlight = useCallback((id: string) => {
    removeHighlightFromStorage(id)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }, [])

  // Clear all highlights
  const clearAllHighlights = useCallback(() => {
    clearHighlights()
    setHighlights([])
  }, [])

  // Add a custom group
  const addGroup = useCallback((name: string, color?: string, description?: string): HighlightGroup => {
    const newGroup = addGroupToStorage(name, color, description)
    setGroups(prev => [...prev, newGroup])
    return newGroup
  }, [])

  // Update a group
  const updateGroup = useCallback((
    id: string,
    updates: Partial<Pick<HighlightGroup, 'name' | 'color' | 'description'>>
  ) => {
    updateGroupInStorage(id, updates)
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }, [])

  // Remove a group
  const removeGroup = useCallback((id: string) => {
    removeGroupFromStorage(id)
    // Refresh both groups and highlights (highlights may have been moved to default)
    setGroups(getHighlightGroups())
    setHighlights(getHighlights())
  }, [])

  // Filter highlights by selected group
  const filteredHighlights = selectedGroupId
    ? highlights.filter(h => h.groupId === selectedGroupId || (!h.groupId && selectedGroupId === 'default'))
    : highlights

  return {
    highlights: filteredHighlights,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    addHighlight,
    updateHighlight,
    removeHighlight,
    clearAllHighlights,
    addGroup,
    updateGroup,
    removeGroup,
    getFileHighlights,
    refresh,
  }
}

export default useHighlights
