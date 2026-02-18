/**
 * BlockInsertHandle - The "+" button for inserting blocks
 * @module quarry/ui/blockCommands/BlockInsertHandle
 *
 * A floating button that appears in the left margin between blocks.
 * Clicking opens the BlockCommandPalette for inserting new blocks.
 *
 * Features:
 * - Appears on hover in left gutter area
 * - Smooth fade-in animation
 * - Keyboard accessible
 * - Touch-friendly on mobile
 */

'use client'

import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { BlockInsertHandleProps } from './types'

/**
 * BlockInsertHandle Component
 */
export function BlockInsertHandle({
  blockIndex,
  onOpenMenu,
  isDark,
  forceVisible = false,
}: BlockInsertHandleProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isHighlighted = forceVisible || isHovered || isFocused

  /**
   * Handle click to open command palette
   */
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      onOpenMenu(blockIndex, {
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      })
    }
  }, [onOpenMenu, blockIndex])

  /**
   * Handle keyboard activation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }, [handleClick])

  return (
    <div
      className="relative h-0 w-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hit area for hover detection */}
      <div className="absolute -left-8 -right-0 h-8 -top-4 cursor-pointer" />

      {/* The + button - always visible with reduced opacity, full opacity on hover */}
      <motion.div
        initial={{ opacity: 0.4, scale: 1 }}
        animate={{
          opacity: isHighlighted ? 1 : 0.4,
          scale: isHighlighted ? 1 : 0.9
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute -left-10 top-1/2 -translate-y-1/2 z-10"
      >
        <button
          ref={buttonRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={[
            'w-6 h-6 flex items-center justify-center rounded-full',
            'transition-all duration-150 shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2',
            isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white focus:ring-offset-zinc-900'
              : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-500 hover:text-zinc-700 focus:ring-offset-white',
          ].join(' ')}
          title={`Insert block at position ${blockIndex}`}
          aria-label={`Insert block at position ${blockIndex}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Visual separator line (optional, subtle) - only on hover */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={[
              'absolute left-0 right-0 h-px top-0',
              isDark ? 'bg-zinc-700' : 'bg-zinc-200',
            ].join(' ')}
            style={{ transformOrigin: 'left' }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * BlockInsertHandleWrapper - Wrapper for managing multiple handles
 *
 * Used to render a handle at the start of the document
 * and between each block.
 */
export interface BlockInsertHandleWrapperProps {
  /** Total number of blocks */
  blockCount: number
  /** Current block index being hovered */
  hoveredBlockIndex: number | null
  /** Callback when a handle is clicked */
  onOpenMenu: (blockIndex: number, position: { x: number; y: number }) => void
  /** Dark theme */
  isDark: boolean
}

export function BlockInsertHandleWrapper({
  blockCount,
  hoveredBlockIndex,
  onOpenMenu,
  isDark,
}: BlockInsertHandleWrapperProps) {
  // Render handles at each block boundary
  const handles = []

  for (let i = 0; i <= blockCount; i++) {
    handles.push(
      <BlockInsertHandle
        key={`handle-${i}`}
        blockIndex={i}
        onOpenMenu={onOpenMenu}
        isDark={isDark}
        forceVisible={hoveredBlockIndex === i || hoveredBlockIndex === i - 1}
      />
    )
  }

  return <>{handles}</>
}

export default BlockInsertHandle
