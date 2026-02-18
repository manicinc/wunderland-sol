/**
 * Selection Toolbar Component
 * @module codex/ui/transform/SelectionToolbar
 *
 * Floating action bar that appears when strands are selected.
 * Provides quick actions: Transform, Add Tag, Archive, Delete, Clear Selection
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Wand2,
  Tag,
  Archive,
  Trash2,
  CheckSquare,
  Square,
  SquareStack,
  ArrowUpDown,
} from 'lucide-react'
import { useSelectedStrands } from '@/components/quarry/contexts/SelectedStrandsContext'

interface SelectionToolbarProps {
  /** All strands available for selection (for select all/invert) */
  allStrands?: Array<{ id: string; path: string; title: string }>
  /** Called when transform action is triggered */
  onTransform?: () => void
  /** Called when add tag action is triggered */
  onAddTag?: () => void
  /** Called when archive action is triggered */
  onArchive?: () => void
  /** Called when delete action is triggered */
  onDelete?: () => void
  /** Position of the toolbar */
  position?: 'top' | 'bottom'
  /** Optional class name */
  className?: string
}

/**
 * Selection Toolbar - Floating action bar for multi-select operations
 *
 * @example
 * ```tsx
 * <SelectionToolbar
 *   allStrands={strands}
 *   onTransform={() => setShowTransformModal(true)}
 *   onAddTag={() => setShowTagModal(true)}
 * />
 * ```
 */
export default function SelectionToolbar({
  allStrands = [],
  onTransform,
  onAddTag,
  onArchive,
  onDelete,
  position = 'bottom',
  className = '',
}: SelectionToolbarProps) {
  const {
    strands,
    selectedIds,
    clearAll,
    selectAll,
    invertSelection,
    showSelectionToolbar,
    setShowSelectionToolbar,
  } = useSelectedStrands()

  const count = strands.length
  const allSelected = allStrands.length > 0 && count === allStrands.length

  if (!showSelectionToolbar || count === 0) {
    return null
  }

  const positionClasses = {
    top: 'top-4',
    bottom: 'bottom-4',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: position === 'bottom' ? 20 : -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`
          fixed left-1/2 -translate-x-1/2 z-50
          ${positionClasses[position]}
          ${className}
        `}
      >
        <div
          className="
            flex items-center gap-1.5 px-3 py-2 rounded-xl
            bg-neutral-900 dark:bg-neutral-950
            border border-neutral-700 dark:border-neutral-800
            shadow-xl shadow-black/20
          "
        >
          {/* Selection count */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-neutral-700">
            <SquareStack className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-medium text-white">
              {count} selected
            </span>
          </div>

          {/* Selection actions */}
          <div className="flex items-center gap-0.5 px-1 border-r border-neutral-700">
            <ToolbarButton
              icon={allSelected ? CheckSquare : Square}
              label={allSelected ? 'Deselect All' : 'Select All'}
              onClick={() => {
                if (allSelected) {
                  clearAll()
                  setShowSelectionToolbar(false)
                } else if (allStrands.length > 0) {
                  selectAll(allStrands as any)
                }
              }}
            />
            <ToolbarButton
              icon={ArrowUpDown}
              label="Invert Selection"
              onClick={() => invertSelection(allStrands as any)}
            />
          </div>

          {/* Transform action - Primary */}
          <div className="px-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onTransform}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                bg-primary-600 hover:bg-primary-500
                text-white text-sm font-medium
                transition-colors duration-150
              "
              title="Transform to Supertag"
            >
              <Wand2 className="w-4 h-4" />
              <span>Transform</span>
            </motion.button>
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-700">
            <ToolbarButton
              icon={Tag}
              label="Add Tag"
              onClick={onAddTag}
            />
            <ToolbarButton
              icon={Archive}
              label="Archive"
              onClick={onArchive}
            />
            <ToolbarButton
              icon={Trash2}
              label="Delete"
              onClick={onDelete}
              variant="danger"
            />
          </div>

          {/* Close button */}
          <div className="pl-1 border-l border-neutral-700">
            <ToolbarButton
              icon={X}
              label="Clear Selection"
              onClick={() => {
                clearAll()
                setShowSelectionToolbar(false)
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
}: ToolbarButtonProps) {
  const variantClasses = {
    default: 'text-neutral-400 hover:text-white hover:bg-neutral-800',
    danger: 'text-neutral-400 hover:text-red-400 hover:bg-red-900/20',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-colors duration-150
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={label}
      aria-label={label}
    >
      <Icon className="w-4 h-4" />
    </motion.button>
  )
}
