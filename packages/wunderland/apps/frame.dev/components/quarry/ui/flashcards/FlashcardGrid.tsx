/**
 * Flashcard Grid Component
 * Shows all flashcards in a collapsible grid/carousel view
 * With inline editing and two-step delete confirmation
 *
 * @module codex/ui/FlashcardGrid
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, RotateCcw, Clock,
  Eye, EyeOff, Trash2, Grid3X3,
  Pencil, X,
} from 'lucide-react'
import type { Flashcard } from '../../hooks/useFlashcards'
import { formatInterval } from '@/lib/fsrs'
import { ConfirmableAction } from '../common/ConfirmableAction'
import { useVirtualGrid, useBreakpointColumns } from '@/lib/hooks/useVirtualGrid'
import { useTouchDevice } from '../../hooks/useMediaQuery'

/** Height of each card row in pixels */
const ROW_HEIGHT = 220

interface FlashcardGridProps {
  /** All flashcards to display */
  cards: Flashcard[]
  /** Theme */
  isDark?: boolean
  /** Callback when card is deleted */
  onDelete?: (cardId: string) => Promise<void>
  /** Callback when card is updated */
  onUpdate?: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>
  /** Callback when starting review with specific card */
  onStartReview?: (cardId?: string) => void
  /** Initially collapsed? */
  defaultCollapsed?: boolean
}

/**
 * Get difficulty color based on FSRS difficulty
 */
function getDifficultyColor(difficulty: number, isDark: boolean): string {
  if (difficulty <= 3) {
    return isDark ? 'text-emerald-400' : 'text-emerald-600'
  } else if (difficulty <= 6) {
    return isDark ? 'text-amber-400' : 'text-amber-600'
  } else {
    return isDark ? 'text-red-400' : 'text-red-600'
  }
}

/**
 * Get difficulty label
 */
function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Easy'
  if (difficulty <= 6) return 'Medium'
  return 'Hard'
}

/**
 * Individual flashcard in grid with inline editing
 */
function GridCard({
  card,
  isDark,
  onDelete,
  onUpdate,
  onStartReview,
  isTouch = false,
}: {
  card: Flashcard
  isDark: boolean
  onDelete?: (cardId: string) => Promise<void>
  onUpdate?: (cardId: string, updates: { front?: string; back?: string }) => Promise<void>
  onStartReview?: (cardId?: string) => void
  isTouch?: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFront, setEditedFront] = useState(card.front)
  const [editedBack, setEditedBack] = useState(card.back)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const frontInputRef = useRef<HTMLTextAreaElement>(null)
  const backInputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isDue = new Date(card.fsrs.nextReview) <= new Date()

  // Sync with external changes
  useEffect(() => {
    if (!isEditing) {
      setEditedFront(card.front)
      setEditedBack(card.back)
    }
  }, [card.front, card.back, isEditing])

  // Focus first input when entering edit mode
  useEffect(() => {
    if (isEditing && frontInputRef.current) {
      frontInputRef.current.focus()
      frontInputRef.current.select()
    }
  }, [isEditing])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Debounced save
  const debouncedSave = useCallback(async () => {
    if (!onUpdate) return
    if (editedFront === card.front && editedBack === card.back) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    setIsSaving(true)

    try {
      await onUpdate(card.id, { front: editedFront, back: editedBack })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to save card:', err)
      setSaveStatus('idle')
    } finally {
      setIsSaving(false)
    }
  }, [onUpdate, card.id, card.front, card.back, editedFront, editedBack])

  // Trigger debounced save on change
  const handleTextChange = useCallback((field: 'front' | 'back', value: string) => {
    if (field === 'front') {
      setEditedFront(value)
    } else {
      setEditedBack(value)
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(debouncedSave, 1000)
  }, [debouncedSave])

  // Enter edit mode
  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setShowActions(false)
  }, [])

  // Exit edit mode
  const handleExitEdit = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    // Save any pending changes
    if (editedFront !== card.front || editedBack !== card.back) {
      debouncedSave()
    }
    setIsEditing(false)
  }, [card.front, card.back, editedFront, editedBack, debouncedSave])

  // Handle key events in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      // Cancel changes
      setEditedFront(card.front)
      setEditedBack(card.back)
      setIsEditing(false)
    }
  }, [card.front, card.back])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (onDelete) {
      await onDelete(card.id)
    }
  }, [onDelete, card.id])

  // Handle card tap - different behavior for touch devices
  const handleCardClick = useCallback(() => {
    if (isTouch) {
      // On touch: toggle actions overlay
      setShowActions(!showActions)
    } else {
      // On desktop: flip card
      setIsFlipped(!isFlipped)
    }
  }, [isTouch, showActions, isFlipped])

  // Edit mode UI
  if (isEditing) {
    return (
      <motion.div
        layout
        className={`
          relative rounded-xl border overflow-hidden
          ${isDark
            ? 'bg-zinc-800 border-cyan-500/50 ring-2 ring-cyan-500/20'
            : 'bg-white border-cyan-400/50 ring-2 ring-cyan-400/20 shadow-lg'
          }
        `}
      >
        {/* Edit header */}
        <div className={`
          px-3 py-2 border-b flex items-center justify-between
          ${isDark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}
        `}>
          <span className={`text-xs font-medium ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
            Editing Card
          </span>
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[10px] text-emerald-500">
                Saved
              </span>
            )}
            <button
              onClick={handleExitEdit}
              className={`p-1 rounded-md transition-colors ${
                isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-500'
              }`}
              title="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Edit fields */}
        <div className="p-3 space-y-3">
          <div>
            <label className={`text-[10px] uppercase tracking-wide font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Front (Question)
            </label>
            <textarea
              ref={frontInputRef}
              value={editedFront}
              onChange={(e) => handleTextChange('front', e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className={`
                w-full mt-1 px-2 py-1.5 rounded-lg border text-sm resize-none
                transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-cyan-500'
                  : 'bg-white border-zinc-300 text-zinc-800 focus:border-cyan-500'
                }
              `}
              rows={3}
            />
          </div>
          <div>
            <label className={`text-[10px] uppercase tracking-wide font-medium ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Back (Answer)
            </label>
            <textarea
              ref={backInputRef}
              value={editedBack}
              onChange={(e) => handleTextChange('back', e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className={`
                w-full mt-1 px-2 py-1.5 rounded-lg border text-sm resize-none
                transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-cyan-500'
                  : 'bg-white border-zinc-300 text-zinc-800 focus:border-cyan-500'
                }
              `}
              rows={3}
            />
          </div>
        </div>

        {/* Edit footer with delete */}
        <div className={`
          px-3 py-2 border-t flex items-center justify-between
          ${isDark ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-100 bg-zinc-50/50'}
        `}>
          <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Press Esc to cancel
          </span>
          {onDelete && (
            <ConfirmableAction
              onConfirm={handleDelete}
              icon={Trash2}
              variant="danger"
              isDark={isDark}
              size="sm"
              iconOnly
              title="Delete card"
            />
          )}
        </div>
      </motion.div>
    )
  }

  // Normal display mode
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200
        ${isDark
          ? 'bg-zinc-800/70 border-zinc-700 hover:border-zinc-600'
          : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
        }
        ${isDue ? (isDark ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-emerald-400/30') : ''}
      `}
      onClick={handleCardClick}
      onMouseEnter={!isTouch ? () => setShowActions(true) : undefined}
      onMouseLeave={!isTouch ? () => setShowActions(false) : undefined}
    >
      {/* Card type badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <span className={`
          text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase
          ${card.type === 'cloze'
            ? isDark ? 'bg-cyan-900/60 text-cyan-300' : 'bg-cyan-100 text-cyan-700'
            : isDark ? 'bg-violet-900/60 text-violet-300' : 'bg-violet-100 text-violet-700'
          }
        `}>
          {card.type}
        </span>
        {isDue && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isDark ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
            Due
          </span>
        )}
      </div>

      {/* Difficulty badge */}
      <div className={`absolute top-2 right-2 z-10 text-[10px] font-medium ${getDifficultyColor(card.fsrs.difficulty, isDark)}`}>
        {getDifficultyLabel(card.fsrs.difficulty)}
      </div>

      {/* Card content */}
      <div className="p-4 pt-8 min-h-[140px] flex flex-col">
        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              className="flex-1 flex flex-col"
            >
              <p className={`text-sm font-medium line-clamp-4 flex-1 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                {card.front}
              </p>
              <div className={`flex items-center gap-1.5 mt-3 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                <RotateCcw className="w-3 h-3" />
                <span>{isTouch ? 'Tap for actions' : 'Tap to flip'}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -90 }}
              className="flex-1 flex flex-col"
            >
              <p className={`text-sm font-bold line-clamp-4 flex-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {card.back}
              </p>
              {card.hints && card.hints.length > 0 && (
                <p className={`text-[11px] mt-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  💡 {card.hints[0]}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with next review */}
      <div className={`
        px-4 py-2 border-t flex items-center justify-between
        ${isDark ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-100 bg-zinc-50/50'}
      `}>
        <div className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          <Clock className="w-3 h-3" />
          <span>
            {isDue ? 'Now' : formatInterval((new Date(card.fsrs.nextReview).getTime() - Date.now()) / 1000 / 60 / 60 / 24)}
          </span>
        </div>

        {/* Stability indicator */}
        <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          S: {card.fsrs.stability.toFixed(1)}
        </div>
      </div>

      {/* Hover/Tap actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
              absolute inset-0 flex items-center justify-center gap-3
              ${isDark ? 'bg-black/60' : 'bg-white/80'}
              backdrop-blur-sm
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Flip button - shown for touch devices */}
            {isTouch && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsFlipped(!isFlipped)
                }}
                className={`min-w-[44px] min-h-[44px] p-3 rounded-xl touch-manipulation ${isDark ? 'bg-violet-600 active:bg-violet-500' : 'bg-violet-500 active:bg-violet-600'} text-white`}
                title="Flip card"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>
            )}

            {/* Edit button */}
            {onUpdate && (
              <motion.button
                whileHover={!isTouch ? { scale: 1.1 } : undefined}
                whileTap={{ scale: 0.9 }}
                onClick={handleStartEdit}
                className={`min-w-[44px] min-h-[44px] p-3 rounded-xl touch-manipulation ${isDark ? 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-500' : 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-600'} text-white`}
                title="Edit card"
              >
                <Pencil className="w-5 h-5" />
              </motion.button>
            )}

            {/* Review button */}
            <motion.button
              whileHover={!isTouch ? { scale: 1.1 } : undefined}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onStartReview?.(card.id)
              }}
              className={`min-w-[44px] min-h-[44px] p-3 rounded-xl touch-manipulation ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-600'} text-white`}
              title="Review this card"
            >
              <Eye className="w-5 h-5" />
            </motion.button>

            {/* Delete button with confirmation */}
            {onDelete && (
              <ConfirmableAction
                onConfirm={handleDelete}
                icon={Trash2}
                variant="danger"
                isDark={isDark}
                size="lg"
                iconOnly
                title="Delete card"
                className="!min-w-[44px] !min-h-[44px] !p-3 !rounded-xl touch-manipulation"
              />
            )}

            {/* Close button for touch devices */}
            {isTouch && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(false)
                }}
                className={`absolute top-2 right-2 min-w-[36px] min-h-[36px] p-2 rounded-lg touch-manipulation ${isDark ? 'bg-zinc-700 active:bg-zinc-600' : 'bg-zinc-200 active:bg-zinc-300'}`}
                title="Close"
              >
                <X className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`} />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Main Flashcard Grid Component
 */
export default function FlashcardGrid({
  cards,
  isDark = false,
  onDelete,
  onUpdate,
  onStartReview,
  defaultCollapsed = false,
}: FlashcardGridProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [showOnlyDue, setShowOnlyDue] = useState(false)
  const isTouch = useTouchDevice()

  // Responsive columns: 2 on mobile, 3 on md, 4 on lg
  const columns = useBreakpointColumns({ sm: 2, md: 3, lg: 4 })

  const dueCards = useMemo(
    () => cards.filter(c => new Date(c.fsrs.nextReview) <= new Date()),
    [cards]
  )

  const filteredCards = useMemo(
    () => showOnlyDue ? dueCards : cards,
    [showOnlyDue, dueCards, cards]
  )

  // Virtualization - only renders visible rows
  const { parentRef, virtualRows, totalHeight, getRowItems } = useVirtualGrid({
    items: filteredCards,
    columns,
    rowHeight: ROW_HEIGHT,
    overscan: 2,
  })

  // Reset scroll when filter changes
  const handleFilterToggle = useCallback(() => {
    setShowOnlyDue(prev => !prev)
    if (parentRef.current) {
      parentRef.current.scrollTop = 0
    }
  }, [parentRef])

  if (cards.length === 0) {
    return null
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-between p-3 transition-colors ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-violet-900/40' : 'bg-violet-100'}`}>
            <Grid3X3 className={`w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
          </div>
          <div className="text-left">
            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              All Flashcards
            </span>
            <span className={`text-xs ml-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {cards.length} cards · {dueCards.length} due
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Filters */}
            <div className={`px-3 py-2 flex items-center gap-2 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <button
                onClick={handleFilterToggle}
                className={`
                  flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-colors touch-manipulation
                  ${showOnlyDue
                    ? isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    : isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  }
                `}
              >
                {showOnlyDue ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {showOnlyDue ? 'Due Only' : 'Show All'}
              </button>
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {filteredCards.length} cards
              </span>
            </div>

            {/* Virtualized Grid */}
            <div
              ref={parentRef}
              className={`p-3 border-t max-h-[500px] overflow-y-auto ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}
              style={{ scrollbarGutter: 'stable' }}
            >
              {filteredCards.length > 0 ? (
                <div
                  style={{
                    height: totalHeight,
                    position: 'relative',
                  }}
                >
                  {virtualRows.map((virtualRow) => {
                    const rowCards = getRowItems(virtualRow.index)
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute left-0 right-0 grid gap-3"
                        style={{
                          top: virtualRow.start,
                          height: ROW_HEIGHT,
                          gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        }}
                      >
                        {rowCards.map((card) => (
                          <GridCard
                            key={card.id}
                            card={card}
                            isDark={isDark}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            onStartReview={onStartReview}
                            isTouch={isTouch}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No cards match the filter</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
