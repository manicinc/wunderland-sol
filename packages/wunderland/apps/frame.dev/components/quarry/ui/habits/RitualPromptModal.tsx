/**
 * Ritual Prompt Modal
 * 
 * Modal displayed when completing a ritual habit that surfaces lifecycle-relevant notes.
 * Provides morning/evening ritual experiences with note surfacing and reflection capture.
 * 
 * @module components/quarry/ui/habits/RitualPromptModal
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  X,
  Sunrise,
  Sunset,
  Sparkles,
  Clock,
  Eye,
  Edit3,
  Link2,
  RotateCcw,
  Check,
  Plus,
  ChevronRight,
  Lightbulb,
  FileText,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLifecycleData } from '@/components/quarry/hooks/useLifecycleData'
import type { StrandLifecycleWithMeta, RitualType, RitualPromptData } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

interface RitualPromptModalProps {
  isOpen: boolean
  onClose: () => void
  ritualType: RitualType
  onComplete: (data: {
    reviewedStrands: string[]
    intentions?: string[]
    reflections?: string[]
  }) => void
  isDark: boolean
}

// ============================================================================
// STRAND ITEM
// ============================================================================

function StrandItem({
  strand,
  isDark,
  isReviewed,
  onToggleReview,
  onResurface,
}: {
  strand: StrandLifecycleWithMeta
  isDark: boolean
  isReviewed: boolean
  onToggleReview: () => void
  onResurface?: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg transition-all border',
        isReviewed
          ? isDark
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-emerald-50 border-emerald-200'
          : isDark
            ? 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
            : 'bg-white border-zinc-200 hover:border-zinc-300'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleReview}
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors flex-shrink-0',
          isReviewed
            ? 'bg-emerald-500 text-white'
            : isDark
              ? 'border border-zinc-600 hover:border-zinc-500'
              : 'border border-zinc-300 hover:border-zinc-400'
        )}
      >
        {isReviewed && <Check className="w-3.5 h-3.5" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/quarry/app?path=${encodeURIComponent(strand.strandPath)}`}
          className={cn(
            'text-sm font-medium hover:underline line-clamp-1',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}
          target="_blank"
        >
          {strand.title}
        </Link>
        <div className={cn(
          'flex items-center gap-3 text-xs mt-0.5',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {strand.daysSinceAccess}d ago
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            {strand.connectionCount}
          </span>
        </div>
      </div>

      {/* Stage indicator */}
      <div className={cn(
        'text-xs px-2 py-0.5 rounded-full',
        strand.stage === 'faded'
          ? 'bg-zinc-500/10 text-zinc-500'
          : strand.stage === 'active'
            ? 'bg-amber-500/10 text-amber-500'
            : 'bg-emerald-500/10 text-emerald-500'
      )}>
        {strand.stage}
      </div>

      {/* Resurface button for faded strands */}
      {strand.stage === 'faded' && onResurface && (
        <button
          onClick={onResurface}
          className={cn(
            'p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100',
            isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )}
          title="Resurface"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// INTENTION/REFLECTION INPUT
// ============================================================================

function TextCapture({
  placeholder,
  items,
  onAdd,
  onRemove,
  isDark,
  icon: Icon,
}: {
  placeholder: string
  items: string[]
  onAdd: (text: string) => void
  onRemove: (index: number) => void
  isDark: boolean
  icon: React.ElementType
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-lg border',
        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <Icon className={cn('w-4 h-4 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex-1 text-sm bg-transparent outline-none',
            isDark ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-zinc-800 placeholder:text-zinc-400'
          )}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className={cn(
            'p-1 rounded transition-colors',
            input.trim()
              ? 'text-emerald-500 hover:bg-emerald-500/10'
              : isDark ? 'text-zinc-600' : 'text-zinc-300'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg text-sm',
                isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
              )}
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className={cn('flex-1', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
                {item}
              </span>
              <button
                onClick={() => onRemove(index)}
                className={cn(
                  'p-0.5 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RitualPromptModal({
  isOpen,
  onClose,
  ritualType,
  onComplete,
  isDark,
}: RitualPromptModalProps) {
  const [reviewedStrands, setReviewedStrands] = useState<Set<string>>(new Set())
  const [intentions, setIntentions] = useState<string[]>([])
  const [reflections, setReflections] = useState<string[]>([])

  const {
    getRitualPromptData,
    resurface,
    loading,
  } = useLifecycleData()

  const promptData = getRitualPromptData(ritualType)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setReviewedStrands(new Set())
      setIntentions([])
      setReflections([])
    }
  }, [isOpen])

  const toggleReview = (strandPath: string) => {
    setReviewedStrands((prev) => {
      const next = new Set(prev)
      if (next.has(strandPath)) {
        next.delete(strandPath)
      } else {
        next.add(strandPath)
      }
      return next
    })
  }

  const handleComplete = () => {
    onComplete({
      reviewedStrands: Array.from(reviewedStrands),
      intentions: ritualType === 'morning' ? intentions : undefined,
      reflections: ritualType === 'evening' ? reflections : undefined,
    })
    onClose()
  }

  const isMorning = ritualType === 'morning'
  const Icon = isMorning ? Sunrise : Sunset
  const title = isMorning ? 'Morning Setup' : 'Evening Reflection'
  const subtitle = isMorning
    ? 'Start your day with intention'
    : 'Reflect on what you accomplished'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
              'md:w-full md:max-w-2xl md:max-h-[85vh]',
              'rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden',
              isDark ? 'bg-zinc-900' : 'bg-white'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between p-6 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl',
                  isMorning ? 'bg-amber-500/10' : 'bg-indigo-500/10'
                )}>
                  <Icon className={cn(
                    'w-6 h-6',
                    isMorning ? 'text-amber-500' : 'text-indigo-500'
                  )} />
                </div>
                <div>
                  <h2 className={cn(
                    'text-xl font-semibold',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}>
                    {title}
                  </h2>
                  <p className={cn('text-sm', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                    {subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Relevant Strands Section */}
              {(isMorning ? promptData.relevantStrands : promptData.todayStrands).length > 0 && (
                <section>
                  <h3 className={cn(
                    'text-sm font-semibold mb-3 flex items-center gap-2',
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  )}>
                    <FileText className="w-4 h-4 text-cyan-500" />
                    {isMorning ? 'Notes for Today' : 'What You Worked On'}
                  </h3>
                  <p className={cn(
                    'text-xs mb-3',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {isMorning
                      ? 'These notes may be relevant to your work today. Mark as reviewed to reset their decay.'
                      : 'Notes you accessed today. Mark as reviewed to confirm engagement.'}
                  </p>
                  <div className="space-y-2">
                    {(isMorning ? promptData.relevantStrands : promptData.todayStrands)
                      .slice(0, 5)
                      .map((strand) => (
                        <StrandItem
                          key={strand.strandPath}
                          strand={strand}
                          isDark={isDark}
                          isReviewed={reviewedStrands.has(strand.strandPath)}
                          onToggleReview={() => toggleReview(strand.strandPath)}
                        />
                      ))}
                  </div>
                </section>
              )}

              {/* Fading Strands Section */}
              {promptData.fadingStrands.length > 0 && (
                <section>
                  <h3 className={cn(
                    'text-sm font-semibold mb-3 flex items-center gap-2',
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  )}>
                    <Clock className="w-4 h-4 text-amber-500" />
                    Worth Revisiting
                  </h3>
                  <p className={cn(
                    'text-xs mb-3',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    These notes are fading but have valuable connections. Consider resurfacing them.
                  </p>
                  <div className="space-y-2">
                    {promptData.fadingStrands.slice(0, 3).map((strand) => (
                      <StrandItem
                        key={strand.strandPath}
                        strand={strand}
                        isDark={isDark}
                        isReviewed={reviewedStrands.has(strand.strandPath)}
                        onToggleReview={() => toggleReview(strand.strandPath)}
                        onResurface={() => resurface(strand.strandPath)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Intentions (Morning) or Reflections (Evening) */}
              <section>
                <h3 className={cn(
                  'text-sm font-semibold mb-3 flex items-center gap-2',
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                )}>
                  <Lightbulb className={cn(
                    'w-4 h-4',
                    isMorning ? 'text-amber-500' : 'text-indigo-500'
                  )} />
                  {isMorning ? 'Set Your Intentions' : 'Capture Your Reflections'}
                </h3>
                <p className={cn(
                  'text-xs mb-3',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  {isMorning
                    ? 'What do you want to accomplish today?'
                    : 'What insights did you gain? What went well?'}
                </p>
                <TextCapture
                  placeholder={isMorning ? 'Add an intention...' : 'Add a reflection...'}
                  items={isMorning ? intentions : reflections}
                  onAdd={(text) => {
                    if (isMorning) {
                      setIntentions((prev) => [...prev, text])
                    } else {
                      setReflections((prev) => [...prev, text])
                    }
                  }}
                  onRemove={(index) => {
                    if (isMorning) {
                      setIntentions((prev) => prev.filter((_, i) => i !== index))
                    } else {
                      setReflections((prev) => prev.filter((_, i) => i !== index))
                    }
                  }}
                  isDark={isDark}
                  icon={isMorning ? Sparkles : Edit3}
                />
              </section>

              {/* Empty state */}
              {promptData.relevantStrands.length === 0 &&
                promptData.fadingStrands.length === 0 &&
                promptData.todayStrands.length === 0 && (
                  <div className={cn(
                    'py-8 text-center rounded-lg',
                    isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
                  )}>
                    <Sparkles className={cn(
                      'w-10 h-10 mx-auto mb-3',
                      isDark ? 'text-zinc-600' : 'text-zinc-300'
                    )} />
                    <p className={cn(
                      'text-sm',
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    )}>
                      No notes to surface right now.
                      <br />
                      {isMorning
                        ? 'Set your intentions for the day!'
                        : 'Capture any reflections from today!'}
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className={cn(
              'p-4 border-t flex items-center justify-between gap-4',
              isDark ? 'border-zinc-800' : 'border-zinc-100'
            )}>
              <div className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                {reviewedStrands.size > 0 && (
                  <span>{reviewedStrands.size} note{reviewedStrands.size !== 1 ? 's' : ''} marked as reviewed</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm transition-colors',
                    isDark
                      ? 'hover:bg-zinc-800 text-zinc-400'
                      : 'hover:bg-zinc-100 text-zinc-500'
                  )}
                >
                  Skip
                </button>
                <button
                  onClick={handleComplete}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                    'bg-emerald-500 hover:bg-emerald-600 text-white'
                  )}
                >
                  <Check className="w-4 h-4" />
                  Complete Ritual
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default RitualPromptModal

