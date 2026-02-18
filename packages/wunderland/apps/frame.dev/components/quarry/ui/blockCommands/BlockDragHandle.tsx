/**
 * BlockDragHandle - Drag handle for reordering blocks
 * @module quarry/ui/blockCommands/BlockDragHandle
 *
 * A draggable grip handle that appears on hover next to blocks.
 * Uses native HTML5 drag-and-drop for block reordering.
 */

'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical } from 'lucide-react'

export interface BlockDragHandleProps {
  /** Block index for drag data */
  blockIndex: number
  /** Whether the handle should be visible */
  isVisible: boolean
  /** Whether this block is currently being dragged */
  isDragging: boolean
  /** Called when drag starts */
  onDragStart: (blockIndex: number) => void
  /** Called when drag ends */
  onDragEnd: () => void
  /** Dark theme */
  isDark: boolean
}

export function BlockDragHandle({
  blockIndex,
  isVisible,
  isDragging,
  onDragStart,
  onDragEnd,
  isDark,
}: BlockDragHandleProps) {

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Set drag data
    e.dataTransfer.setData('text/plain', String(blockIndex))
    e.dataTransfer.effectAllowed = 'move'

    // Create drag image (optional - use default)
    // e.dataTransfer.setDragImage(...)

    onDragStart(blockIndex)
  }, [blockIndex, onDragStart])

  const handleDragEnd = useCallback(() => {
    onDragEnd()
  }, [onDragEnd])

  return (
    <AnimatePresence>
      {(isVisible || isDragging) && (
        <motion.div
          initial={{ opacity: 0, x: -8, scale: 0.8 }}
          animate={{
            opacity: isDragging ? 0.5 : 1,
            x: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, x: -8, scale: 0.8 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className="absolute -left-8 top-1/2 -translate-y-1/2 z-10"
        >
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={[
              'w-6 h-8 flex items-center justify-center rounded cursor-grab active:cursor-grabbing',
              'transition-colors',
              isDragging
                ? 'opacity-50'
                : isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100',
            ].join(' ')}
            title="Drag to reorder"
            aria-label={`Drag to reorder block ${blockIndex + 1}`}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export interface BlockDropZoneProps {
  /** Target block index for drop */
  blockIndex: number
  /** Whether a block is currently being dragged */
  isDragging: boolean
  /** Whether this zone is the current drop target */
  isDropTarget: boolean
  /** Called when a block is dropped here */
  onDrop: (fromIndex: number, toIndex: number) => void
  /** Called when dragged item enters this zone */
  onDragEnter: (blockIndex: number) => void
  /** Dark theme */
  isDark: boolean
}

export function BlockDropZone({
  blockIndex,
  isDragging,
  isDropTarget,
  onDrop,
  onDragEnter,
  isDark,
}: BlockDropZoneProps) {

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    onDragEnter(blockIndex)
  }, [blockIndex, onDragEnter])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!isNaN(fromIndex)) {
      onDrop(fromIndex, blockIndex)
    }
  }, [blockIndex, onDrop])

  if (!isDragging) return null

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      className="absolute inset-x-0 h-4 -top-2 z-20"
    >
      <AnimatePresence>
        {isDropTarget && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.5 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            className={[
              'absolute inset-x-4 top-1/2 -translate-y-1/2 h-1 rounded-full',
              isDark ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50' : 'bg-cyan-400 shadow-lg shadow-cyan-400/50',
            ].join(' ')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default BlockDragHandle
