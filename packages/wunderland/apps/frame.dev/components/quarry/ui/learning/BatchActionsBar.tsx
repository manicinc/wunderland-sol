/**
 * Batch Actions Bar
 * @module quarry/ui/learning/BatchActionsBar
 * 
 * Floating action bar for batch operations on selected items:
 * - Delete multiple items
 * - Export selected items
 * - Tag/categorize batch
 * - Reset/regenerate batch
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Trash2, Download, Tag, RefreshCw, Check,
  CreditCard, HelpCircle, Book, FolderOutput, Star
} from 'lucide-react'
import { ConfirmableAction } from '../common/ConfirmableAction'

export type ItemType = 'flashcard' | 'quiz' | 'glossary'

export interface BatchSelection {
  type: ItemType
  selectedIds: Set<string>
  totalCount: number
}

export interface BatchActionsBarProps {
  /** Theme */
  isDark?: boolean
  /** Current batch selection */
  selection: BatchSelection | null
  /** Clear selection */
  onClearSelection: () => void
  /** Delete selected items */
  onDeleteSelected?: () => Promise<void>
  /** Export selected items */
  onExportSelected?: () => Promise<void>
  /** Add tags to selected items */
  onTagSelected?: (tags: string[]) => Promise<void>
  /** Regenerate selected items */
  onRegenerateSelected?: () => Promise<void>
  /** Star/favorite selected items */
  onStarSelected?: () => Promise<void>
  /** Loading state */
  isLoading?: boolean
}

const TYPE_CONFIG = {
  flashcard: {
    icon: CreditCard,
    label: 'flashcard',
    pluralLabel: 'flashcards',
    color: { light: 'text-cyan-600', dark: 'text-cyan-400' },
  },
  quiz: {
    icon: HelpCircle,
    label: 'question',
    pluralLabel: 'questions',
    color: { light: 'text-violet-600', dark: 'text-violet-400' },
  },
  glossary: {
    icon: Book,
    label: 'term',
    pluralLabel: 'terms',
    color: { light: 'text-emerald-600', dark: 'text-emerald-400' },
  },
}

export function BatchActionsBar({
  isDark = false,
  selection,
  onClearSelection,
  onDeleteSelected,
  onExportSelected,
  onTagSelected,
  onRegenerateSelected,
  onStarSelected,
  isLoading = false,
}: BatchActionsBarProps) {
  const hasSelection = selection && selection.selectedIds.size > 0
  
  const selectionInfo = useMemo(() => {
    if (!selection) return null
    const config = TYPE_CONFIG[selection.type]
    const count = selection.selectedIds.size
    const label = count === 1 ? config.label : config.pluralLabel
    return { count, label, config }
  }, [selection])
  
  if (!hasSelection || !selectionInfo) return null
  
  const { count, label, config } = selectionInfo
  const Icon = config.icon
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className={`
          fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]
          flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl
          ${isDark
            ? 'bg-zinc-900 border border-zinc-700'
            : 'bg-white border border-zinc-200'
          }
        `}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-200 dark:border-zinc-700">
          <div className={`
            p-1.5 rounded-lg
            ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}
          `}>
            <Icon className={`w-4 h-4 ${isDark ? config.color.dark : config.color.light}`} />
          </div>
          <div>
            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {count}
            </span>
            <span className={`text-sm ml-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {label} selected
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Star */}
          {onStarSelected && (
            <button
              onClick={onStarSelected}
              disabled={isLoading}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-800 text-amber-400'
                  : 'hover:bg-zinc-100 text-amber-500'
                }
                disabled:opacity-50
              `}
              title="Star selected"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          
          {/* Export */}
          {onExportSelected && (
            <button
              onClick={onExportSelected}
              disabled={isLoading}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
                }
                disabled:opacity-50
              `}
              title="Export selected"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          
          {/* Regenerate */}
          {onRegenerateSelected && (
            <button
              onClick={onRegenerateSelected}
              disabled={isLoading}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-800 text-zinc-400'
                  : 'hover:bg-zinc-100 text-zinc-500'
                }
                disabled:opacity-50
              `}
              title="Regenerate selected"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          {/* Delete */}
          {onDeleteSelected && (
            <ConfirmableAction
              onConfirm={onDeleteSelected}
              icon={Trash2}
              variant="danger"
              isDark={isDark}
              size="sm"
              iconOnly
              title="Delete selected"
              confirmLabel={`Delete ${count}`}
            />
          )}
        </div>
        
        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className={`
            ml-2 p-2 rounded-lg transition-colors
            ${isDark
              ? 'hover:bg-zinc-800 text-zinc-500'
              : 'hover:bg-zinc-100 text-zinc-400'
            }
          `}
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

export default BatchActionsBar

