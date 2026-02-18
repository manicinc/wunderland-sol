/**
 * Board Column Component
 *
 * Single column in board/kanban view.
 * @module components/quarry/views/board/BoardColumn
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
} from 'lucide-react'
import { BoardCard } from './BoardCard'
import type { BoardColumn as BoardColumnType, StrandWithPath } from '../types'

interface BoardColumnProps {
  /** Column data */
  column: BoardColumnType
  /** Toggle collapsed state */
  onToggle: () => void
  /** Navigate to strand */
  onNavigate: (path: string) => void
  /** Edit strand */
  onEdit?: (strand: StrandWithPath) => void
  /** Delete strand */
  onDelete?: (strand: StrandWithPath) => void
  /** Current theme */
  theme?: string
  /** Column index for animation */
  index?: number
}

export function BoardColumn({
  column,
  onToggle,
  onNavigate,
  onEdit,
  onDelete,
  theme = 'light',
  index = 0,
}: BoardColumnProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  const columnClasses = `
    flex flex-col min-w-[280px] max-w-[320px] flex-shrink-0
    rounded-lg overflow-hidden
    ${isDark ? 'bg-zinc-850' : 'bg-zinc-50'}
  `

  const headerClasses = `
    flex items-center justify-between px-3 py-2 cursor-pointer
    ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
    transition-colors
  `

  return (
    <motion.div
      className={columnClasses}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      {/* Header */}
      <div className={headerClasses} onClick={onToggle}>
        <div className="flex items-center gap-2">
          {column.isCollapsed ? (
            <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          )}

          {/* Color indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />

          <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {column.label}
          </h3>

          {/* Count badge */}
          <span
            className={`
              px-1.5 py-0.5 text-xs rounded-full
              ${isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-600'}
            `}
          >
            {column.strands.length}
          </span>
        </div>

        {/* More actions */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Column actions menu
          }}
          className={`
            p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
            ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'}
          `}
        >
          <MoreHorizontal className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        </button>
      </div>

      {/* Cards */}
      <AnimatePresence>
        {!column.isCollapsed && (
          <motion.div
            className="flex-1 overflow-y-auto p-2 space-y-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {column.strands.length === 0 ? (
              <div
                className={`
                  flex flex-col items-center justify-center py-8 text-center
                  ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
                `}
              >
                <p className="text-xs">No strands</p>
              </div>
            ) : (
              column.strands.map((strand, idx) => (
                <BoardCard
                  key={strand.path}
                  strand={strand}
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  theme={theme}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default BoardColumn
