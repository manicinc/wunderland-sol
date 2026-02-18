/**
 * Cache Actions Bar - Regenerate, Clear, and Edit actions for learning popovers
 * @module quarry/ui/common/CacheActionsBar
 * 
 * @remarks
 * Provides cache management controls:
 * - Regenerate: Re-generate content from source (replaces cache)
 * - Clear Cache: Remove cached data for the strand
 * - Edit: Open edit modal for content
 * - Cache age indicator with tooltip
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCcw,
  Trash2,
  Pencil,
  Clock,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'

export interface CacheActionsBarProps {
  /** Called when regenerate is clicked */
  onRegenerate: () => void
  /** Called when clear cache is confirmed */
  onClearCache: () => void
  /** Called when edit is clicked (optional) */
  onEdit?: () => void
  /** Whether regeneration is in progress */
  regenerating?: boolean
  /** Whether there is cached data to clear */
  hasData?: boolean
  /** Cache age string (e.g., "2 days ago") */
  cacheAge?: string
  /** Cache timestamp for tooltip */
  cacheTimestamp?: string
  /** Theme */
  isDark: boolean
  /** Touch device */
  isTouch?: boolean
  /** Total count of items (flashcards, questions, terms) */
  itemCount?: number
  /** Label for items (e.g., "cards", "questions", "terms") */
  itemLabel?: string
  /** Compact mode */
  compact?: boolean
  /** Disable all actions */
  disabled?: boolean
}

/**
 * Tooltip component for action buttons
 */
function ActionTooltip({
  content,
  children,
  isDark,
  position = 'top',
}: {
  content: string
  children: React.ReactNode
  isDark: boolean
  position?: 'top' | 'bottom'
}) {
  const [show, setShow] = useState(false)

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: position === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 4 : -4 }}
            className={`
              absolute left-1/2 -translate-x-1/2 z-50
              px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap
              shadow-lg pointer-events-none
              ${position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
              ${isDark 
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' 
                : 'bg-zinc-900 text-white'
              }
            `}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Confirmation dialog for destructive actions
 */
function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  isDark,
  isTouch,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  isDark: boolean
  isTouch?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        absolute bottom-full mb-2 right-0 z-50
        p-3 rounded-xl shadow-2xl min-w-[200px]
        ${isDark 
          ? 'bg-zinc-800 border border-zinc-700' 
          : 'bg-white border border-zinc-200'
        }
      `}
    >
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <div>
          <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
            {title}
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium
            transition-colors touch-manipulation
            ${isTouch ? 'py-2.5 min-h-[40px]' : 'py-2'}
            ${isDark 
              ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' 
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }
          `}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-medium
            transition-colors touch-manipulation
            ${isTouch ? 'py-2.5 min-h-[40px]' : 'py-2'}
            bg-red-600 text-white hover:bg-red-700
          `}
        >
          <Check className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>
    </motion.div>
  )
}

export default function CacheActionsBar({
  onRegenerate,
  onClearCache,
  onEdit,
  regenerating = false,
  hasData = false,
  cacheAge,
  cacheTimestamp,
  isDark,
  isTouch = false,
  itemCount,
  itemLabel = 'items',
  compact = false,
  disabled = false,
}: CacheActionsBarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearConfirm = () => {
    onClearCache()
    setShowClearConfirm(false)
  }

  return (
    <div className={`
      flex items-center justify-between gap-3
      ${compact ? '' : 'px-4 py-3 border-t'}
      ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
    `}>
      {/* Left side - Stats */}
      <div className="flex items-center gap-3">
        {/* Item count */}
        {itemCount !== undefined && (
          <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <span className="font-medium">{itemCount}</span> {itemLabel}
          </div>
        )}

        {/* Cache age */}
        {cacheAge && hasData && (
          <ActionTooltip
            content={cacheTimestamp ? `Generated ${cacheTimestamp}` : `Cached ${cacheAge}`}
            isDark={isDark}
          >
            <div className={`
              flex items-center gap-1 text-xs
              ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
            `}>
              <Clock className="w-3 h-3" />
              <span>{cacheAge}</span>
            </div>
          </ActionTooltip>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="relative flex items-center gap-1.5">
        {/* Clear Cache Confirmation */}
        <AnimatePresence>
          {showClearConfirm && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowClearConfirm(false)}
              />
              <ConfirmDialog
                title="Clear Cache?"
                message="This will remove all cached data for this strand."
                onConfirm={handleClearConfirm}
                onCancel={() => setShowClearConfirm(false)}
                isDark={isDark}
                isTouch={isTouch}
              />
            </>
          )}
        </AnimatePresence>

        {/* Edit Button */}
        {onEdit && (
          <ActionTooltip content="Edit content" isDark={isDark}>
            <button
              onClick={onEdit}
              disabled={disabled || !hasData}
              className={`
                flex items-center justify-center rounded-lg transition-colors touch-manipulation
                ${compact ? 'p-1.5' : isTouch ? 'p-2.5 min-h-[44px] min-w-[44px]' : 'p-2'}
                ${hasData && !disabled
                  ? isDark
                    ? 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800'
                    : 'text-zinc-500 hover:text-cyan-600 hover:bg-zinc-100'
                  : isDark
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-300 cursor-not-allowed'
                }
              `}
            >
              <Pencil className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </ActionTooltip>
        )}

        {/* Regenerate Button */}
        <ActionTooltip content="Re-generate from content" isDark={isDark}>
          <button
            onClick={onRegenerate}
            disabled={disabled || regenerating}
            className={`
              flex items-center justify-center rounded-lg transition-colors touch-manipulation
              ${compact ? 'p-1.5' : isTouch ? 'p-2.5 min-h-[44px] min-w-[44px]' : 'p-2'}
              ${!disabled && !regenerating
                ? isDark
                  ? 'text-zinc-400 hover:text-violet-400 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-violet-600 hover:bg-zinc-100'
                : isDark
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-300 cursor-not-allowed'
              }
            `}
          >
            <RefreshCcw className={`
              ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
              ${regenerating ? 'animate-spin' : ''}
            `} />
          </button>
        </ActionTooltip>

        {/* Clear Cache Button */}
        <ActionTooltip content="Clear cached data" isDark={isDark}>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={disabled || !hasData || regenerating}
            className={`
              flex items-center justify-center rounded-lg transition-colors touch-manipulation
              ${compact ? 'p-1.5' : isTouch ? 'p-2.5 min-h-[44px] min-w-[44px]' : 'p-2'}
              ${hasData && !disabled && !regenerating
                ? isDark
                  ? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-red-600 hover:bg-zinc-100'
                : isDark
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-300 cursor-not-allowed'
              }
            `}
          >
            <Trash2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </ActionTooltip>
      </div>
    </div>
  )
}

