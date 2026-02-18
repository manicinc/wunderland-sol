/**
 * Unified Strand Selector Component
 * @module quarry/ui/selection/UnifiedStrandSelector
 *
 * Tabbed interface for selecting content sources across the application.
 * Supports:
 * - Open Tabs: Documents currently open (like browser tabs)
 * - Sidebar Selection: Strands selected via multi-select
 * - All Strands: Complete knowledge base
 * - Custom: Ad-hoc filtered selection
 *
 * Used by Ask interface and Learning Studio for content selection.
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Layers,
  Database,
  Filter,
  Check,
  CheckSquare,
  Square,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react'
import {
  useContentSources,
  useContentSourcesSafe,
  type ContentSourceType,
  type UnifiedStrand,
  type ContentSourceGroup,
} from '../../contexts/ContentSourcesContext'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface UnifiedStrandSelectorProps {
  /** Theme */
  isDark: boolean
  /** Compact mode (for popovers) */
  compact?: boolean
  /** Hide sources with no content */
  hideEmptySources?: boolean
  /** Show strand count badges */
  showCounts?: boolean
  /** Allow multi-select within a source */
  allowMultiSelect?: boolean
  /** Callback when selection changes */
  onSelectionChange?: (strands: UnifiedStrand[], cacheKey: string) => void
  /** Show search filter */
  showSearch?: boolean
  /** Max height for strand list (with scroll) */
  maxListHeight?: number
  /** Show refresh button */
  showRefresh?: boolean
  /** Custom class name */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE TAB ICONS
═══════════════════════════════════════════════════════════════════════════ */

const SOURCE_ICONS: Record<ContentSourceType, typeof FileText> = {
  'open-tabs': FileText,
  'sidebar-selection': Layers,
  'all-strands': Database,
  'custom': Filter,
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAB BUTTON COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

interface TabButtonProps {
  source: ContentSourceGroup
  isActive: boolean
  isDark: boolean
  compact?: boolean
  onClick: () => void
}

function TabButton({ source, isActive, isDark, compact, onClick }: TabButtonProps) {
  const Icon = SOURCE_ICONS[source.type]
  const isDisabled = !source.isAvailable && source.type !== 'custom'

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={source.description}
      className={`
        relative flex-1 flex items-center justify-center gap-1.5
        ${compact ? 'py-1.5 px-2' : 'py-2 px-3'}
        rounded-lg transition-all text-xs font-medium
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${isActive
          ? isDark
            ? 'bg-gradient-to-br from-cyan-600 to-emerald-600 text-white shadow-sm'
            : 'bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-sm'
          : isDark
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
        }
      `}
    >
      <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {!compact && <span>{source.label}</span>}
      {source.count > 0 && (
        <span className={`
          ${compact ? 'text-[9px] px-1' : 'text-[10px] px-1.5'} py-0.5 rounded-full
          ${isActive
            ? 'bg-white/20'
            : isDark ? 'bg-zinc-700' : 'bg-zinc-200'
          }
        `}>
          {source.count}
        </span>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRAND LIST ITEM
═══════════════════════════════════════════════════════════════════════════ */

interface StrandItemProps {
  strand: UnifiedStrand
  isSelected: boolean
  isDark: boolean
  compact?: boolean
  allowMultiSelect?: boolean
  onToggle: () => void
}

function StrandItem({
  strand,
  isSelected,
  isDark,
  compact,
  allowMultiSelect,
  onToggle,
}: StrandItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onToggle}
      className={`
        w-full flex items-center gap-2 px-3 ${compact ? 'py-1.5' : 'py-2'} rounded-lg
        text-left transition-colors
        ${isSelected
          ? isDark
            ? 'bg-cyan-900/30 border border-cyan-700/50'
            : 'bg-cyan-100 border border-cyan-300'
          : isDark
            ? 'hover:bg-zinc-800 border border-transparent'
            : 'hover:bg-zinc-100 border border-transparent'
        }
      `}
    >
      {/* Selection checkbox */}
      {allowMultiSelect ? (
        isSelected ? (
          <CheckSquare className={`w-4 h-4 flex-shrink-0 ${
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          }`} />
        ) : (
          <Square className={`w-4 h-4 flex-shrink-0 ${
            isDark ? 'text-zinc-600' : 'text-zinc-400'
          }`} />
        )
      ) : (
        isSelected && (
          <Check className={`w-4 h-4 flex-shrink-0 ${
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          }`} />
        )
      )}

      {/* Strand info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        }`}>
          {strand.title}
        </div>
        {!compact && strand.path && (
          <div className={`text-xs truncate ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            {strand.path}
          </div>
        )}
      </div>

      {/* Word count */}
      {strand.wordCount && (
        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {strand.wordCount.toLocaleString()}w
        </span>
      )}

      {/* Content loaded indicator */}
      {!strand.isContentLoaded && (
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600'
        }`}>
          lazy
        </span>
      )}
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════════════════════════════════ */

interface EmptyStateProps {
  source: ContentSourceGroup
  isDark: boolean
}

function EmptyState({ source, isDark }: EmptyStateProps) {
  const Icon = SOURCE_ICONS[source.type]

  const messages: Record<ContentSourceType, { title: string; description: string }> = {
    'open-tabs': {
      title: 'No open tabs',
      description: 'Open some documents to select them as sources',
    },
    'sidebar-selection': {
      title: 'No sidebar selection',
      description: 'Select strands in the sidebar to use them here',
    },
    'all-strands': {
      title: 'No strands available',
      description: 'Add some strands to your knowledge base',
    },
    'custom': {
      title: 'Custom selection empty',
      description: 'Add strands from other sources to create a custom selection',
    },
  }

  const { title, description } = messages[source.type]

  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 text-center ${
      isDark ? 'text-zinc-500' : 'text-zinc-400'
    }`}>
      <Icon className="w-10 h-10 mb-3 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-xs mt-1 max-w-[200px]">{description}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SELECTION SUMMARY
═══════════════════════════════════════════════════════════════════════════ */

interface SelectionSummaryProps {
  selectedCount: number
  totalCount: number
  totalWords: number
  isDark: boolean
  compact?: boolean
  onSelectAll: () => void
  onClearAll: () => void
}

function SelectionSummary({
  selectedCount,
  totalCount,
  totalWords,
  isDark,
  compact,
  onSelectAll,
  onClearAll,
}: SelectionSummaryProps) {
  const isAllSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div className={`
      flex items-center justify-between px-3 ${compact ? 'py-1' : 'py-1.5'}
      border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
      ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'}
    `}>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {selectedCount} of {totalCount} selected
        </span>
        {totalWords > 0 && (
          <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            ({totalWords.toLocaleString()} words)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={isAllSelected ? onClearAll : onSelectAll}
          className={`
            flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors
            ${isDark
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
            }
          `}
        >
          {isAllSelected ? (
            <>
              <Minus className="w-3 h-3" />
              Clear
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              All
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function UnifiedStrandSelector({
  isDark,
  compact = false,
  hideEmptySources = false,
  showCounts = true,
  allowMultiSelect = true,
  onSelectionChange,
  showSearch = true,
  maxListHeight = 300,
  showRefresh = true,
  className = '',
}: UnifiedStrandSelectorProps) {
  const context = useContentSourcesSafe()
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle missing context gracefully
  if (!context) {
    return (
      <div className={`p-4 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm">Content sources not available</p>
      </div>
    )
  }

  const {
    sources,
    selection,
    setActiveSource,
    selectStrands,
    toggleStrand,
    selectAll,
    clearSelection,
    getSourceStrands,
    refreshSources,
  } = context

  // Filter sources if hiding empty
  const visibleSources = useMemo(() => {
    if (!hideEmptySources) return sources
    return sources.filter((s) => s.count > 0 || s.type === 'custom')
  }, [sources, hideEmptySources])

  // Get active source
  const activeSource = useMemo(() => {
    return sources.find((s) => s.type === selection.activeSource) || sources[0]
  }, [sources, selection.activeSource])

  // Filter strands by search query
  const filteredStrands = useMemo(() => {
    const strands = activeSource?.strands || []
    if (!searchQuery.trim()) return strands

    const query = searchQuery.toLowerCase()
    return strands.filter((s) =>
      s.title.toLowerCase().includes(query) ||
      s.path.toLowerCase().includes(query) ||
      s.tags?.some((t) => t.toLowerCase().includes(query))
    )
  }, [activeSource?.strands, searchQuery])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    refreshSources()
    // Small delay for visual feedback
    await new Promise((r) => setTimeout(r, 300))
    setIsRefreshing(false)
  }, [refreshSources])

  // Notify parent of selection changes
  const handleSelectionChange = useCallback(() => {
    if (onSelectionChange) {
      onSelectionChange(selection.selectedStrands, selection.cacheKey)
    }
  }, [onSelectionChange, selection])

  // Handle strand toggle with callback
  const handleToggleStrand = useCallback((strandId: string) => {
    toggleStrand(strandId)
    // Use setTimeout to get the updated state
    setTimeout(handleSelectionChange, 0)
  }, [toggleStrand, handleSelectionChange])

  // Handle select all with callback
  const handleSelectAll = useCallback(() => {
    selectAll()
    setTimeout(handleSelectionChange, 0)
  }, [selectAll, handleSelectionChange])

  // Handle clear selection with callback
  const handleClearSelection = useCallback(() => {
    clearSelection()
    setTimeout(handleSelectionChange, 0)
  }, [clearSelection, handleSelectionChange])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Source Tabs */}
      <div className={`
        flex gap-1 p-1 rounded-lg
        ${isDark ? 'bg-zinc-800/80' : 'bg-zinc-100'}
      `}>
        {visibleSources.map((source) => (
          <TabButton
            key={source.type}
            source={source}
            isActive={source.type === selection.activeSource}
            isDark={isDark}
            compact={compact}
            onClick={() => setActiveSource(source.type)}
          />
        ))}
      </div>

      {/* Source Description */}
      {!compact && activeSource && (
        <div className={`
          flex items-center gap-2 px-3 py-1.5 mt-2
          text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
        `}>
          <Info className="w-3.5 h-3.5" />
          <span>{activeSource.description}</span>
          {showRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`ml-auto p-1 rounded transition-colors ${
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Search */}
      {showSearch && activeSource && activeSource.count > 5 && (
        <div className={`
          flex items-center gap-2 px-3 py-2 mt-1
          border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
        `}>
          <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter strands..."
            className={`
              flex-1 bg-transparent text-sm outline-none
              ${isDark
                ? 'text-zinc-200 placeholder-zinc-600'
                : 'text-zinc-800 placeholder-zinc-400'
              }
            `}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`p-1 rounded ${
                isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Strand List */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: maxListHeight }}
      >
        {filteredStrands.length === 0 ? (
          activeSource ? (
            <EmptyState source={activeSource} isDark={isDark} />
          ) : null
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredStrands.map((strand) => (
                <StrandItem
                  key={strand.id}
                  strand={strand}
                  isSelected={selection.selectedIds.has(strand.id)}
                  isDark={isDark}
                  compact={compact}
                  allowMultiSelect={allowMultiSelect}
                  onToggle={() => handleToggleStrand(strand.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Selection Summary */}
      {allowMultiSelect && activeSource && activeSource.count > 0 && (
        <SelectionSummary
          selectedCount={selection.selectedIds.size}
          totalCount={activeSource.count}
          totalWords={selection.totalWords}
          isDark={isDark}
          compact={compact}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearSelection}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPACT VARIANT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Compact dropdown variant for toolbar usage
 */
export function UnifiedStrandSelectorDropdown({
  isDark,
  onSelectionChange,
  triggerLabel = 'Select Sources',
  className = '',
}: {
  isDark: boolean
  onSelectionChange?: (strands: UnifiedStrand[], cacheKey: string) => void
  triggerLabel?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const context = useContentSourcesSafe()

  const selectionCount = context?.selection.selectedIds.size || 0

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-colors border
          ${isDark
            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
          }
        `}
      >
        <Layers className="w-4 h-4" />
        <span>{triggerLabel}</span>
        {selectionCount > 0 && (
          <span className={`
            px-1.5 py-0.5 rounded-full text-xs
            ${isDark ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}
          `}>
            {selectionCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute top-full left-0 mt-1 z-50
                w-80 rounded-xl shadow-2xl border overflow-hidden
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
            >
              <UnifiedStrandSelector
                isDark={isDark}
                compact={true}
                onSelectionChange={onSelectionChange}
                maxListHeight={250}
                showRefresh={false}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UnifiedStrandSelector

