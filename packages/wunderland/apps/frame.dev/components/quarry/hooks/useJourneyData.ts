/**
 * useJourneyData Hook
 * 
 * React hook for managing journey timeline data.
 * Provides branches, entries, periods, and CRUD operations.
 * 
 * @module components/quarry/hooks/useJourneyData
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchesWithMeta,
  toggleBranchCollapse,
  createSection,
  getSectionsForBranch,
  deleteSection,
  createEntry,
  updateEntry,
  deleteEntry,
  getEntry,
  getAllEntries,
  getEntriesByPeriod,
  getSyncSettings,
  updateSyncSettings,
  syncFromStrands,
  syncFromRituals,
} from '@/lib/analytics/journeyStore'
import type {
  JourneyBranch,
  JourneyBranchWithMeta,
  JourneyEntry,
  JourneyEntryWithMeta,
  JourneySection,
  JourneySectionWithMeta,
  JourneyPeriodWithEntries,
  JourneySyncSettings,
  JourneyBranchFormData,
  JourneyEntryFormData,
  JourneySectionFormData,
  JourneyViewState,
  PeriodGranularity,
  EntrySourceType,
  DEFAULT_JOURNEY_VIEW_STATE,
} from '@/lib/analytics/journeyTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface JourneyData {
  branches: JourneyBranchWithMeta[]
  entries: JourneyEntryWithMeta[]
  periods: JourneyPeriodWithEntries[]
  syncSettings: JourneySyncSettings
}

export interface UseJourneyDataReturn {
  // Data
  data: JourneyData | null
  loading: boolean
  error: string | null
  
  // View state
  viewState: JourneyViewState
  setViewState: React.Dispatch<React.SetStateAction<JourneyViewState>>
  
  // Selected entry
  selectedEntry: JourneyEntryWithMeta | null
  selectEntry: (id: string | null) => Promise<void>
  
  // Branch operations
  createBranch: (data: JourneyBranchFormData) => Promise<JourneyBranch | null>
  updateBranch: (id: string, data: Partial<JourneyBranchFormData>) => Promise<boolean>
  deleteBranch: (id: string) => Promise<boolean>
  toggleBranchCollapse: (id: string) => Promise<void>
  
  // Section operations
  createSection: (data: JourneySectionFormData) => Promise<JourneySection | null>
  deleteSection: (id: string) => Promise<boolean>
  getSectionsForBranch: (branchId: string) => Promise<JourneySectionWithMeta[]>
  
  // Entry operations
  createEntry: (data: JourneyEntryFormData, sourceType?: EntrySourceType, sourcePath?: string | null) => Promise<JourneyEntry | null>
  updateEntry: (id: string, data: Partial<JourneyEntryFormData>) => Promise<boolean>
  deleteEntry: (id: string) => Promise<boolean>
  
  // Sync operations
  updateSyncSettings: (settings: Partial<JourneySyncSettings>) => Promise<void>
  syncAll: () => Promise<{ strands: { created: number; updated: number }; rituals: { created: number; updated: number } }>
  
  // Refresh
  refresh: () => Promise<void>
  
  // Filters
  setDateFilter: (range: { start: string; end: string } | null) => void
  setBranchFilter: (branchIds: string[]) => void
  setSearchQuery: (query: string) => void
  setPeriodGranularity: (granularity: PeriodGranularity) => void
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useJourneyData(): UseJourneyDataReturn {
  const [data, setData] = useState<JourneyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JourneyEntryWithMeta | null>(null)
  const [periodGranularity, setPeriodGranularity] = useState<PeriodGranularity>('year')
  
  const [viewState, setViewState] = useState<JourneyViewState>({
    selectedEntryId: null,
    selectedBranchId: null,
    expandedBranchIds: new Set(),
    expandedPeriodIds: new Set(),
    expandedSectionIds: new Set(),
    filterBranchIds: [],
    dateRange: null,
    searchQuery: '',
  })

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [branches, entries, periods, syncSettings] = await Promise.all([
        getBranchesWithMeta(),
        getAllEntries({
          branchIds: viewState.filterBranchIds.length > 0 ? viewState.filterBranchIds : undefined,
          dateRange: viewState.dateRange ?? undefined,
          searchQuery: viewState.searchQuery || undefined,
        }),
        getEntriesByPeriod(periodGranularity),
        getSyncSettings(),
      ])
      
      setData({ branches, entries, periods, syncSettings })
    } catch (err) {
      console.error('Failed to fetch journey data:', err)
      setError('Failed to load journey data')
    } finally {
      setLoading(false)
    }
  }, [viewState.filterBranchIds, viewState.dateRange, viewState.searchQuery, periodGranularity])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Select entry
  const handleSelectEntry = useCallback(async (id: string | null) => {
    if (!id) {
      setSelectedEntry(null)
      setViewState(prev => ({ ...prev, selectedEntryId: null }))
      return
    }
    
    const entry = await getEntry(id)
    setSelectedEntry(entry)
    setViewState(prev => ({ ...prev, selectedEntryId: id }))
  }, [])

  // Branch operations
  const handleCreateBranch = useCallback(async (formData: JourneyBranchFormData) => {
    const branch = await createBranch(formData)
    if (branch) await fetchData()
    return branch
  }, [fetchData])

  const handleUpdateBranch = useCallback(async (id: string, formData: Partial<JourneyBranchFormData>) => {
    const success = await updateBranch(id, formData)
    if (success) await fetchData()
    return success
  }, [fetchData])

  const handleDeleteBranch = useCallback(async (id: string) => {
    const success = await deleteBranch(id)
    if (success) await fetchData()
    return success
  }, [fetchData])

  const handleToggleBranchCollapse = useCallback(async (id: string) => {
    await toggleBranchCollapse(id)
    setViewState(prev => {
      const newExpanded = new Set(prev.expandedBranchIds)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
      }
      return { ...prev, expandedBranchIds: newExpanded }
    })
  }, [])

  // Section operations
  const handleCreateSection = useCallback(async (formData: JourneySectionFormData) => {
    const section = await createSection(formData)
    if (section) await fetchData()
    return section
  }, [fetchData])

  const handleDeleteSection = useCallback(async (id: string) => {
    const success = await deleteSection(id)
    if (success) await fetchData()
    return success
  }, [fetchData])

  const handleGetSectionsForBranch = useCallback(async (branchId: string) => {
    return getSectionsForBranch(branchId)
  }, [])

  // Entry operations
  const handleCreateEntry = useCallback(async (
    formData: JourneyEntryFormData,
    sourceType: EntrySourceType = 'custom',
    sourcePath: string | null = null
  ) => {
    const entry = await createEntry(formData, sourceType, sourcePath)
    if (entry) await fetchData()
    return entry
  }, [fetchData])

  const handleUpdateEntry = useCallback(async (id: string, formData: Partial<JourneyEntryFormData>) => {
    const success = await updateEntry(id, formData)
    if (success) {
      await fetchData()
      if (selectedEntry?.id === id) {
        const updated = await getEntry(id)
        setSelectedEntry(updated)
      }
    }
    return success
  }, [fetchData, selectedEntry])

  const handleDeleteEntry = useCallback(async (id: string) => {
    const success = await deleteEntry(id)
    if (success) {
      await fetchData()
      if (selectedEntry?.id === id) {
        setSelectedEntry(null)
        setViewState(prev => ({ ...prev, selectedEntryId: null }))
      }
    }
    return success
  }, [fetchData, selectedEntry])

  // Sync operations
  const handleUpdateSyncSettings = useCallback(async (settings: Partial<JourneySyncSettings>) => {
    await updateSyncSettings(settings)
    await fetchData()
  }, [fetchData])

  const handleSyncAll = useCallback(async () => {
    // In a real implementation, you'd fetch strands and rituals from the analytics service
    // For now, we'll return empty results
    const strandsResult = { created: 0, updated: 0 }
    const ritualsResult = { created: 0, updated: 0 }
    
    await fetchData()
    return { strands: strandsResult, rituals: ritualsResult }
  }, [fetchData])

  // Filter operations
  const setDateFilter = useCallback((range: { start: string; end: string } | null) => {
    setViewState(prev => ({ ...prev, dateRange: range }))
  }, [])

  const setBranchFilter = useCallback((branchIds: string[]) => {
    setViewState(prev => ({ ...prev, filterBranchIds: branchIds }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setViewState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  return {
    data,
    loading,
    error,
    viewState,
    setViewState,
    selectedEntry,
    selectEntry: handleSelectEntry,
    createBranch: handleCreateBranch,
    updateBranch: handleUpdateBranch,
    deleteBranch: handleDeleteBranch,
    toggleBranchCollapse: handleToggleBranchCollapse,
    createSection: handleCreateSection,
    deleteSection: handleDeleteSection,
    getSectionsForBranch: handleGetSectionsForBranch,
    createEntry: handleCreateEntry,
    updateEntry: handleUpdateEntry,
    deleteEntry: handleDeleteEntry,
    updateSyncSettings: handleUpdateSyncSettings,
    syncAll: handleSyncAll,
    refresh: fetchData,
    setDateFilter,
    setBranchFilter,
    setSearchQuery,
    setPeriodGranularity,
  }
}



