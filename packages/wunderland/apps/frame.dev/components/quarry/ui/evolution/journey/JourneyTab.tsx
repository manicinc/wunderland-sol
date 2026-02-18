/**
 * JourneyTab
 * 
 * Main container for the journey timeline view.
 * Provides a three-panel layout with chronological list, branching tree, and entry editor.
 * 
 * @module components/quarry/ui/evolution/journey/JourneyTab
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw, Settings, Plus, Calendar, GitBranch, FileEdit, ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useJourneyData } from '@/components/quarry/hooks/useJourneyData'
import { useMediaQuery } from '@/components/quarry/hooks/useMediaQuery'
import { ChronologicalPanel } from './ChronologicalPanel'
import { BranchingTreePanel } from './BranchingTreePanel'
import { EntryEditorPanel } from './EntryEditorPanel'
import type { PeriodGranularity, JourneyEntryFormData, JourneyBranchFormData } from '@/lib/analytics/journeyTypes'
import { format } from 'date-fns'

// ============================================================================
// MOBILE PANEL TYPES
// ============================================================================

type MobilePanel = 'timeline' | 'branches' | 'editor'

// ============================================================================
// TYPES
// ============================================================================

export interface JourneyTabProps {
  isDark: boolean
}

// ============================================================================
// BRANCH CREATION MODAL
// ============================================================================

interface CreateBranchModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: JourneyBranchFormData) => Promise<void>
  parentId?: string | null
  isDark: boolean
}

function CreateBranchModal({ isOpen, onClose, onCreate, parentId, isDark }: CreateBranchModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<'coral' | 'teal' | 'purple' | 'blue' | 'emerald'>('teal')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      await onCreate({
        name: name.trim(),
        color,
        icon: 'folder',
        parentId: parentId ?? null,
      })
      setName('')
      onClose()
    } catch (err) {
      console.error('Failed to create branch:', err)
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'w-full max-w-md rounded-xl p-6',
          isDark ? 'bg-zinc-900' : 'bg-white'
        )}
      >
        <h3 className={cn(
          'text-lg font-bold mb-4',
          isDark ? 'text-zinc-100' : 'text-zinc-900'
        )}>
          Create Branch
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className={cn(
              'block text-sm font-medium mb-1',
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            )}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., School, Work, Personal..."
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm outline-none',
                isDark
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 focus:border-zinc-600'
                  : 'bg-zinc-50 text-zinc-900 border border-zinc-200 focus:border-zinc-300'
              )}
            />
          </div>
          
          <div>
            <label className={cn(
              'block text-sm font-medium mb-2',
              isDark ? 'text-zinc-300' : 'text-zinc-700'
            )}>
              Color
            </label>
            <div className="flex gap-2">
              {(['coral', 'teal', 'purple', 'blue', 'emerald'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    color === c && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900'
                  )}
                  style={{
                    backgroundColor: c === 'coral' ? '#f97066' 
                      : c === 'teal' ? '#2dd4bf'
                      : c === 'purple' ? '#a78bfa'
                      : c === 'blue' ? '#60a5fa'
                      : '#34d399',
                    ['--tw-ring-color' as string]: c === 'coral' ? '#f97066' 
                      : c === 'teal' ? '#2dd4bf'
                      : c === 'purple' ? '#a78bfa'
                      : c === 'blue' ? '#60a5fa'
                      : '#34d399',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg',
              isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-800'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg text-white',
              creating || !name.trim()
                ? 'bg-teal-400 cursor-not-allowed'
                : 'bg-teal-500 hover:bg-teal-600'
            )}
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function JourneyTab({ isDark }: JourneyTabProps) {
  const {
    data,
    loading,
    error,
    viewState,
    setViewState,
    selectedEntry,
    selectEntry,
    createBranch,
    toggleBranchCollapse,
    getSectionsForBranch,
    createEntry,
    updateEntry,
    deleteEntry,
    refresh,
    setSearchQuery,
    setPeriodGranularity,
  } = useJourneyData()

  // Mobile responsiveness
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('branches')
  const [showMobileEditor, setShowMobileEditor] = useState(false)

  const [periodGranularity, setLocalPeriodGranularity] = useState<PeriodGranularity>('year')
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [newBranchParentId, setNewBranchParentId] = useState<string | null>(null)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [newEntryDefaults, setNewEntryDefaults] = useState<{
    branchId?: string
    sectionId?: string | null
    date?: string
  }>({})

  // Auto-show editor when entry is selected on mobile
  useEffect(() => {
    if (isMobile && (selectedEntry || isCreatingEntry)) {
      setShowMobileEditor(true)
    }
  }, [isMobile, selectedEntry, isCreatingEntry])

  // Handle period granularity change
  const handleGranularityChange = useCallback((granularity: PeriodGranularity) => {
    setLocalPeriodGranularity(granularity)
    setPeriodGranularity(granularity)
  }, [setPeriodGranularity])

  // Handle entry selection
  const handleSelectEntry = useCallback((id: string) => {
    setIsCreatingEntry(false)
    selectEntry(id)
  }, [selectEntry])

  // Handle add entry
  const handleAddEntry = useCallback((branchId?: string, sectionId?: string | null, date?: string) => {
    setIsCreatingEntry(true)
    setNewEntryDefaults({
      branchId: branchId || data?.branches[0]?.id,
      sectionId,
      date: date || format(new Date(), 'yyyy-MM-dd'),
    })
    selectEntry(null)
  }, [data?.branches, selectEntry])

  // Handle save entry
  const handleSaveEntry = useCallback(async (formData: JourneyEntryFormData) => {
    if (isCreatingEntry) {
      await createEntry(formData)
      setIsCreatingEntry(false)
    } else if (selectedEntry) {
      await updateEntry(selectedEntry.id, formData)
    }
  }, [isCreatingEntry, selectedEntry, createEntry, updateEntry])

  // Handle delete entry
  const handleDeleteEntry = useCallback(async (id: string) => {
    await deleteEntry(id)
    setIsCreatingEntry(false)
  }, [deleteEntry])

  // Handle close editor
  const handleCloseEditor = useCallback(() => {
    setIsCreatingEntry(false)
    selectEntry(null)
  }, [selectEntry])

  // Handle add branch
  const handleAddBranch = useCallback((parentId?: string | null) => {
    setNewBranchParentId(parentId ?? null)
    setShowCreateBranch(true)
  }, [])

  // Handle create branch
  const handleCreateBranch = useCallback(async (data: JourneyBranchFormData) => {
    await createBranch(data)
  }, [createBranch])

  // Handle toggle section
  const handleToggleSection = useCallback((sectionId: string) => {
    setViewState(prev => {
      const newExpanded = new Set(prev.expandedSectionIds)
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId)
      } else {
        newExpanded.add(sectionId)
      }
      return { ...prev, expandedSectionIds: newExpanded }
    })
  }, [setViewState])

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className={cn(
          'w-8 h-8 animate-spin',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )} />
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          Loading journey data...
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertCircle className={cn('w-12 h-12', isDark ? 'text-red-400' : 'text-red-500')} />
        <p className={cn('text-lg font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
          Failed to load journey data
        </p>
        <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {error}
        </p>
        <button
          onClick={refresh}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            isDark
              ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  // Mobile panel navigation tabs
  const mobileTabs = [
    { id: 'timeline' as const, label: 'Timeline', icon: Calendar },
    { id: 'branches' as const, label: 'Branches', icon: GitBranch },
  ]

  return (
    <>
      {/* Mobile Navigation */}
      {isMobile && (
        <nav
          className={cn(
            'flex items-center gap-1 p-2 mt-4 rounded-lg',
            isDark ? 'bg-zinc-800' : 'bg-zinc-100'
          )}
          role="tablist"
          aria-label="Journey view navigation"
        >
          {mobileTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = mobilePanel === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setMobilePanel(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium transition-colors',
                  'touch-manipulation min-h-[48px]', // Touch optimization
                  isActive
                    ? isDark
                      ? 'bg-zinc-700 text-white'
                      : 'bg-white text-zinc-900 shadow-sm'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-700'
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      {/* Main Layout */}
      <div
        className={cn(
          'mt-4 md:mt-6 rounded-xl overflow-hidden border',
          isDark ? 'border-zinc-800' : 'border-zinc-200',
          // Responsive layout
          isMobile
            ? 'h-[calc(100vh-280px)] min-h-[400px]'
            : isTablet
              ? 'grid grid-cols-2 h-[calc(100vh-200px)] min-h-[500px]'
              : 'grid grid-cols-[280px_1fr_380px] h-[calc(100vh-200px)] min-h-[600px]'
        )}
        role="region"
        aria-label="Journey timeline"
      >
        {/* Left Panel - Chronological Timeline */}
        {(!isMobile || mobilePanel === 'timeline') && (
          <ChronologicalPanel
            periods={data?.periods ?? []}
            selectedEntryId={viewState.selectedEntryId}
            onSelectEntry={handleSelectEntry}
            onAddEntry={(date) => handleAddEntry(undefined, undefined, date)}
            granularity={periodGranularity}
            onChangeGranularity={handleGranularityChange}
            searchQuery={viewState.searchQuery}
            onSearchChange={setSearchQuery}
            isDark={isDark}
            className={cn(
              !isMobile && 'border-r',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}
          />
        )}

        {/* Center Panel - Branching Tree */}
        {(!isMobile || mobilePanel === 'branches') && (
          <BranchingTreePanel
            branches={data?.branches ?? []}
            selectedEntryId={viewState.selectedEntryId}
            onSelectEntry={handleSelectEntry}
            onAddEntry={(branchId, sectionId) => handleAddEntry(branchId, sectionId)}
            onAddBranch={handleAddBranch}
            onToggleBranch={toggleBranchCollapse}
            expandedBranchIds={viewState.expandedBranchIds}
            expandedSectionIds={viewState.expandedSectionIds}
            onToggleSection={handleToggleSection}
            getSectionsForBranch={getSectionsForBranch}
            isDark={isDark}
            className={cn(
              !isMobile && !isTablet && 'border-r',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}
          />
        )}

        {/* Right Panel - Entry Editor (Desktop only, modal on mobile/tablet) */}
        {!isMobile && !isTablet && (
          <EntryEditorPanel
            entry={selectedEntry}
            isNew={isCreatingEntry}
            defaultBranchId={newEntryDefaults.branchId}
            defaultSectionId={newEntryDefaults.sectionId}
            defaultDate={newEntryDefaults.date}
            onSave={handleSaveEntry}
            onDelete={handleDeleteEntry}
            onClose={handleCloseEditor}
            isDark={isDark}
          />
        )}
      </div>

      {/* Mobile/Tablet Editor Modal */}
      <AnimatePresence>
        {(isMobile || isTablet) && showMobileEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => {
              setShowMobileEditor(false)
              handleCloseEditor()
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Entry editor"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'absolute inset-x-0 bottom-0 top-16 rounded-t-2xl overflow-hidden',
                isDark ? 'bg-zinc-900' : 'bg-white'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile editor header */}
              <div className={cn(
                'flex items-center justify-between p-4 border-b',
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              )}>
                <button
                  onClick={() => {
                    setShowMobileEditor(false)
                    handleCloseEditor()
                  }}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium touch-manipulation min-h-[44px] px-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                  aria-label="Close editor"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
                <button
                  onClick={() => {
                    setShowMobileEditor(false)
                    handleCloseEditor()
                  }}
                  className={cn(
                    'p-2 rounded-full touch-manipulation',
                    isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                  )}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Editor content */}
              <div className="h-[calc(100%-60px)] overflow-y-auto">
                <EntryEditorPanel
                  entry={selectedEntry}
                  isNew={isCreatingEntry}
                  defaultBranchId={newEntryDefaults.branchId}
                  defaultSectionId={newEntryDefaults.sectionId}
                  defaultDate={newEntryDefaults.date}
                  onSave={async (data) => {
                    await handleSaveEntry(data)
                    setShowMobileEditor(false)
                  }}
                  onDelete={async (id) => {
                    await handleDeleteEntry(id)
                    setShowMobileEditor(false)
                  }}
                  onClose={() => {
                    setShowMobileEditor(false)
                    handleCloseEditor()
                  }}
                  isDark={isDark}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Branch Modal */}
      <AnimatePresence>
        {showCreateBranch && (
          <CreateBranchModal
            isOpen={showCreateBranch}
            onClose={() => setShowCreateBranch(false)}
            onCreate={handleCreateBranch}
            parentId={newBranchParentId}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default JourneyTab

