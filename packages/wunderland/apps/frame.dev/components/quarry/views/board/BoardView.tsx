/**
 * Board View Component
 *
 * Kanban-style board view for strands.
 * @module components/quarry/views/board/BoardView
 */

'use client'

import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Columns3,
  ChevronDown,
  Loader2,
  LayoutGrid,
} from 'lucide-react'
import { BoardColumn } from './BoardColumn'
import { useBoardGroups } from '../hooks/useBoardGroups'
import type { BoardViewProps, BoardGroupBy, StrandWithPath, BoardColumn as BoardColumnType } from '../types'
import { BOARD_GROUP_CONFIG } from '../types'

interface BoardViewExtendedProps extends Omit<BoardViewProps, 'columns'> {
  /** Board columns (computed internally if not provided) */
  columns?: BoardColumnType[]
  /** Collapsed columns */
  collapsedColumns?: string[]
  /** Column toggle handler */
  onColumnToggle?: (columnId: string) => void
}

const GROUP_OPTIONS: { value: BoardGroupBy; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'subject', label: 'Subject' },
  { value: 'topic', label: 'Topic' },
  { value: 'weave', label: 'Weave' },
]

export default function BoardView({
  strands,
  groupBy,
  onGroupByChange,
  onStrandMove,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  isLoading = false,
  columns: externalColumns,
  collapsedColumns: externalCollapsed,
  onColumnToggle: externalToggle,
}: BoardViewExtendedProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Use internal grouping if no external columns provided
  const {
    columns: internalColumns,
    toggleColumn: internalToggle,
  } = useBoardGroups(strands, {
    groupBy,
    initialCollapsed: externalCollapsed,
    onCollapsedChange: (collapsed) => {
      // Sync with external if needed
    },
  })

  const columns = externalColumns || internalColumns
  const toggleColumn = externalToggle || internalToggle

  const containerClasses = `
    flex flex-col h-full overflow-hidden rounded-lg border
    ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
  `

  const toolbarClasses = `
    flex items-center justify-between gap-3 p-3 border-b
    ${isDark ? 'border-zinc-700' : 'border-zinc-200'}
  `

  const totalStrands = columns.reduce((sum, col) => sum + col.strands.length, 0)

  return (
    <div className={containerClasses}>
      {/* Toolbar */}
      <div className={toolbarClasses}>
        <div className="flex items-center gap-3">
          <Columns3 className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />

          {/* Group by selector */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value as BoardGroupBy)}
              className={`
                appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg cursor-pointer
                ${isDark ? 'bg-zinc-800 text-zinc-200 border-zinc-700' : 'bg-zinc-100 text-zinc-800 border-zinc-200'}
                border focus:outline-none focus:ring-2 focus:ring-rose-500/50
              `}
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Group by {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`
                absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none
                ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
              `}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <span className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {columns.length} columns, {totalStrands} strands
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
          </div>
        ) : columns.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <LayoutGrid className="w-12 h-12 opacity-30" />
            <p className="text-sm">No strands to display</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full pb-4">
            {columns.map((column, index) => (
              <BoardColumn
                key={column.id}
                column={column}
                onToggle={() => toggleColumn(column.id)}
                onNavigate={onNavigate}
                onEdit={onEdit}
                onDelete={onDelete}
                theme={theme}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
