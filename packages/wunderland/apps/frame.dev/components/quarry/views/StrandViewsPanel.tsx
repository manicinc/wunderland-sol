/**
 * Strand Views Panel
 *
 * Main orchestrator for database views (Table, Board, Gallery, Timeline).
 * Manages view state, preferences, and renders the appropriate view component.
 * @module components/quarry/views/StrandViewsPanel
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  RefreshCw,
  Download,
  Settings2,
  Loader2,
} from 'lucide-react'
import { StrandViewSwitcher } from './StrandViewSwitcher'
import TableView from './table/TableView'
import BoardView from './board/BoardView'
import GalleryView from './gallery/GalleryView'
import TimelineView from './timeline/TimelineView'
import { useStrandViews } from './hooks/useStrandViews'
import type {
  StrandWithPath,
  StrandViewMode,
  StrandViewPreferences,
} from './types'
import { DEFAULT_TABLE_COLUMNS } from './types'

interface StrandViewsPanelProps {
  /** Strands to display */
  strands: StrandWithPath[]
  /** Current theme */
  theme?: string
  /** Initial view mode */
  initialView?: StrandViewMode
  /** Loading state */
  isLoading?: boolean
  /** Navigate to strand handler */
  onNavigate: (path: string) => void
  /** Edit strand handler */
  onEdit?: (strand: StrandWithPath) => void
  /** Delete strand handler */
  onDelete?: (strand: StrandWithPath) => void
  /** Refresh data handler */
  onRefresh?: () => void
  /** Export handler */
  onExport?: (strands: StrandWithPath[]) => void
  /** Preferences changed handler */
  onPreferencesChange?: (prefs: StrandViewPreferences) => void
  /** Show header toolbar */
  showHeader?: boolean
  /** Custom header content */
  headerContent?: React.ReactNode
  /** Compact mode */
  compact?: boolean
}

export default function StrandViewsPanel({
  strands,
  theme = 'light',
  initialView = 'table',
  isLoading = false,
  onNavigate,
  onEdit,
  onDelete,
  onRefresh,
  onExport,
  onPreferencesChange,
  showHeader = true,
  headerContent,
  compact = false,
}: StrandViewsPanelProps) {
  const isDark = theme.includes('dark')

  // Main views hook
  const {
    view,
    setView,
    preferences,
    updatePreferences,
    // Table
    sortBy,
    sortDirection,
    toggleSort,
    sortedStrands,
    visibleColumns,
    setVisibleColumns,
    // Board
    boardGroupBy,
    setBoardGroupBy,
    boardColumns,
    toggleBoardColumn,
    // Gallery
    galleryLayout,
    setGalleryLayout,
    galleryColumns,
    setGalleryColumns,
    // Timeline
    timelineGroups,
    toggleTimelineGroup,
  } = useStrandViews(strands, {
    initialView,
    onPreferencesChange,
  })

  const containerClasses = `
    flex flex-col h-full
    ${isDark ? 'bg-zinc-900' : 'bg-white'}
  `

  const headerClasses = `
    flex items-center justify-between gap-4 p-3 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  return (
    <div className={containerClasses}>
      {/* Header */}
      {showHeader && (
        <div className={headerClasses}>
          <div className="flex items-center gap-3">
            <Database className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              Database Views
            </h2>
            <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {strands.length} strands
            </span>
            {headerContent}
          </div>

          <div className="flex items-center gap-3">
            {/* View switcher */}
            <StrandViewSwitcher
              view={view}
              onViewChange={setView}
              theme={theme}
              compact={compact}
              disabled={isLoading}
            />

            {/* Actions */}
            <div className="flex items-center gap-1">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}

              {onExport && (
                <button
                  onClick={() => onExport(strands)}
                  disabled={isLoading}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}
                  `}
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && strands.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              className="h-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'table' && (
                <TableView
                  strands={sortedStrands}
                  columns={DEFAULT_TABLE_COLUMNS}
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                  isLoading={isLoading}
                  onExport={onExport}
                />
              )}

              {view === 'board' && (
                <BoardView
                  strands={strands}
                  groupBy={boardGroupBy}
                  onGroupByChange={setBoardGroupBy}
                  columns={boardColumns}
                  onColumnToggle={toggleBoardColumn}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                  isLoading={isLoading}
                />
              )}

              {view === 'gallery' && (
                <GalleryView
                  strands={strands}
                  layout={galleryLayout}
                  onLayoutChange={setGalleryLayout}
                  columns={galleryColumns}
                  onColumnsChange={setGalleryColumns}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                  isLoading={isLoading}
                />
              )}

              {view === 'timeline' && (
                <TimelineView
                  strands={strands}
                  groups={timelineGroups}
                  onGroupToggle={toggleTimelineGroup}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                  isLoading={isLoading}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
