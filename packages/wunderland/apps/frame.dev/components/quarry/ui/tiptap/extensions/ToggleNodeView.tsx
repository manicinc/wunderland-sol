'use client'

/**
 * Toggle Node View for TipTap Editor
 * @module quarry/ui/tiptap/extensions/ToggleNodeView
 *
 * Renders collapsible toggle blocks with header and content.
 * Click the chevron or header to expand/collapse.
 */

import React, { useCallback } from 'react'
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react'
import { ChevronRight, Trash2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function ToggleNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { title, isOpen } = node.attrs

  // Toggle open/closed state
  const handleToggle = useCallback(() => {
    updateAttributes({ isOpen: !isOpen })
  }, [isOpen, updateAttributes])

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: e.target.value })
  }, [updateAttributes])

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  return (
    <NodeViewWrapper className="relative my-2 group/toggle">
      <div
        className={cn(
          'rounded-lg border transition-colors',
          'bg-zinc-50 dark:bg-zinc-800/50',
          'border-zinc-200 dark:border-zinc-700',
          selected && 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-zinc-900'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 cursor-pointer select-none',
            'hover:bg-zinc-100 dark:hover:bg-zinc-700/50',
            'rounded-t-lg transition-colors',
            !isOpen && 'rounded-b-lg'
          )}
          onClick={handleToggle}
        >
          {/* Drag handle (visible on hover) */}
          <div
            className={cn(
              'opacity-0 group-hover/toggle:opacity-100 transition-opacity',
              'cursor-grab active:cursor-grabbing',
              'text-zinc-400 dark:text-zinc-500'
            )}
            data-drag-handle
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Chevron */}
          <motion.div
            initial={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-zinc-500 dark:text-zinc-400"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>

          {/* Title input */}
          <input
            type="text"
            value={title || ''}
            onChange={handleTitleChange}
            onClick={(e) => e.stopPropagation()}
            placeholder="Toggle title..."
            className={cn(
              'flex-1 bg-transparent font-medium text-sm',
              'text-zinc-800 dark:text-zinc-200',
              'placeholder-zinc-400 dark:placeholder-zinc-500',
              'focus:outline-none'
            )}
          />

          {/* Delete button (visible on hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete()
            }}
            className={cn(
              'opacity-0 group-hover/toggle:opacity-100 transition-opacity',
              'p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30',
              'text-zinc-400 hover:text-red-500'
            )}
            title="Delete toggle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Content (collapsible) */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'px-4 py-2 pl-10',
                  'border-t border-zinc-200 dark:border-zinc-700'
                )}
              >
                <NodeViewContent className="prose dark:prose-invert prose-sm max-w-none" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NodeViewWrapper>
  )
}
