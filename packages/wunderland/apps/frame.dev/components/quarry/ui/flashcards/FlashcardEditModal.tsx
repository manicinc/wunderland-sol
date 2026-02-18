/**
 * Flashcard Edit Modal
 * Full-featured modal for creating and editing flashcards
 * 
 * Features:
 * - Front/back text editors
 * - Card type selector (basic, cloze, reversed)
 * - Tags and hints fields
 * - Difficulty preset
 * - Preview with flip animation
 * 
 * @module codex/ui/flashcards/FlashcardEditModal
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, RotateCcw, Plus, Trash2, Tag, Lightbulb,
  CreditCard, GripVertical, Check, AlertCircle
} from 'lucide-react'
import type { Flashcard, FlashcardType } from '@/types/openstrand'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'

export interface FlashcardEditModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Card to edit (null for new card) */
  card?: Flashcard | null
  /** Strand slug for new cards */
  strandSlug: string
  /** Theme */
  isDark?: boolean
  /** Save callback */
  onSave: (data: FlashcardFormData) => Promise<void>
  /** Delete callback (for existing cards) */
  onDelete?: () => Promise<void>
}

export interface FlashcardFormData {
  front: string
  back: string
  type: FlashcardType
  tags: string[]
  hints: string[]
}

const CARD_TYPES: { value: FlashcardType; label: string; description: string }[] = [
  { value: 'basic', label: 'Basic', description: 'Question → Answer' },
  { value: 'cloze', label: 'Cloze', description: 'Fill in the blank' },
]

/**
 * Preview card component with flip animation
 */
function PreviewCard({
  front,
  back,
  type,
  isDark,
}: {
  front: string
  back: string
  type: FlashcardType
  isDark: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className="relative w-full h-40 cursor-pointer perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="w-full h-full relative"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className={`
            absolute inset-0 rounded-xl p-4 flex flex-col
            border-2 backface-hidden
            ${isDark
              ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
              : 'bg-gradient-to-br from-white to-zinc-50 border-zinc-200'
            }
          `}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase w-fit ${
            type === 'cloze'
              ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
              : isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
          }`}>
            {type}
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto py-2">
            <p className={`text-base font-medium text-center ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
              {front || 'Enter front text...'}
            </p>
          </div>
          <div className={`flex items-center justify-center gap-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <RotateCcw className="w-3 h-3" />
            <span>Tap to flip</span>
          </div>
        </div>

        {/* Back */}
        <div
          className={`
            absolute inset-0 rounded-xl p-4 flex flex-col
            border-2 backface-hidden
            ${isDark
              ? 'bg-gradient-to-br from-emerald-950/50 to-zinc-900 border-emerald-800/50'
              : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
            }
          `}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className={`flex items-center gap-1 text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <Check className="w-3 h-3" />
            Answer
          </div>
          <div className="flex-1 flex items-center justify-center overflow-y-auto py-2">
            <p className={`text-base font-bold text-center ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              {back || 'Enter back text...'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Tag input component
 */
function TagInput({
  tags,
  onChange,
  isDark,
  placeholder = 'Add tag...',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  isDark: boolean
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInput('')
    }
  }

  const handleRemove = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span
            key={tag}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium
              ${isDark
                ? 'bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 text-zinc-700'
              }
            `}
          >
            {tag}
            <button
              onClick={() => handleRemove(tag)}
              className={`hover:text-red-500 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            flex-1 px-3 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
              : 'bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
            }
            focus:outline-none focus:ring-2 focus:ring-cyan-500/30
          `}
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim()}
          className={`
            px-3 py-2 rounded-lg transition-colors
            ${isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 disabled:opacity-50'
            }
          `}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Main FlashcardEditModal component
 */
export default function FlashcardEditModal({
  isOpen,
  onClose,
  card,
  strandSlug,
  isDark = false,
  onSave,
  onDelete,
}: FlashcardEditModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [type, setType] = useState<FlashcardType>('basic')
  const [tags, setTags] = useState<string[]>([])
  const [hints, setHints] = useState<string[]>([])

  // Initialize form when card changes
  useEffect(() => {
    if (card) {
      setFront(card.front)
      setBack(card.back)
      setType(card.type)
      setTags(card.tags || [])
      setHints(card.hints || [])
    } else {
      // Reset for new card
      setFront('')
      setBack('')
      setType('basic')
      setTags(['custom'])
      setHints([])
    }
    setError(null)
  }, [card, isOpen])

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'flashcard-edit-modal',
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!front.trim()) {
      setError('Front side is required')
      return
    }
    if (!back.trim()) {
      setError('Back side is required')
      return
    }
    if (front.trim().length < 5) {
      setError('Front side must be at least 5 characters')
      return
    }

    setSaving(true)
    try {
      await onSave({
        front: front.trim(),
        back: back.trim(),
        type,
        tags,
        hints: hints.filter(h => h.trim()),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save flashcard')
    } finally {
      setSaving(false)
    }
  }, [front, back, type, tags, hints, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    setSaving(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flashcard')
    } finally {
      setSaving(false)
    }
  }, [onDelete, onClose])

  const isEditing = !!card

  if (!isOpen || !isMounted) return null

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400]"
            onClick={handleBackdropClick}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className={`
              fixed z-[401] flex flex-col
              left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-[min(95vw,560px)] max-h-[90vh]
              overflow-hidden rounded-2xl shadow-2xl
              ${isDark
                ? 'bg-zinc-900 border border-zinc-700'
                : 'bg-white border border-zinc-200'
              }
            `}
          >
            {/* Header */}
            <div className={`
              px-5 py-4 border-b flex items-center justify-between shrink-0
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-xl
                  ${isDark
                    ? 'bg-gradient-to-br from-cyan-900/60 to-emerald-900/40'
                    : 'bg-gradient-to-br from-cyan-100 to-emerald-100'
                  }
                `}>
                  <CreditCard className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {isEditing ? 'Edit Flashcard' : 'New Flashcard'}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {strandSlug}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={saving}
                className={`
                  p-2 rounded-xl transition-colors
                  ${isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                  }
                `}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Preview */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Preview
                </label>
                <PreviewCard front={front} back={back} type={type} isDark={isDark} />
              </div>

              {/* Card Type */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Card Type
                </label>
                <div className="flex gap-2">
                  {CARD_TYPES.map(ct => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setType(ct.value)}
                      className={`
                        flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                        ${type === ct.value
                          ? isDark
                            ? 'bg-cyan-900/50 border-cyan-600 text-cyan-300'
                            : 'bg-cyan-50 border-cyan-300 text-cyan-700'
                          : isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }
                      `}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Front */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Front (Question)
                </label>
                <textarea
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  placeholder={type === 'cloze' ? 'React [...] provide a way to use state.' : 'What is React?'}
                  rows={3}
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/30
                  `}
                />
              </div>

              {/* Back */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Back (Answer)
                </label>
                <textarea
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  placeholder={type === 'cloze' ? 'hooks' : 'A JavaScript library for building user interfaces.'}
                  rows={3}
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-cyan-500/30
                  `}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Tag className="w-3 h-3" />
                  Tags
                </label>
                <TagInput tags={tags} onChange={setTags} isDark={isDark} />
              </div>

              {/* Hints */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Lightbulb className="w-3 h-3" />
                  Hints (optional)
                </label>
                <TagInput
                  tags={hints}
                  onChange={setHints}
                  isDark={isDark}
                  placeholder="Add hint..."
                />
              </div>

              {/* Error */}
              {error && (
                <div className={`
                  flex items-center gap-2 p-3 rounded-xl text-sm
                  ${isDark
                    ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                    : 'bg-red-50 text-red-600 border border-red-200'
                  }
                `}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </form>

            {/* Footer */}
            <div className={`
              px-5 py-4 border-t flex items-center justify-between shrink-0
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              {/* Delete button (only for existing cards) */}
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${isDark
                      ? 'text-red-400 hover:bg-red-900/30'
                      : 'text-red-600 hover:bg-red-50'
                    }
                    disabled:opacity-50
                  `}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${isDark
                      ? 'text-zinc-400 hover:bg-zinc-800'
                      : 'text-zinc-600 hover:bg-zinc-100'
                    }
                    disabled:opacity-50
                  `}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={saving || !front.trim() || !back.trim()}
                  className={`
                    flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold
                    bg-gradient-to-r from-cyan-600 to-emerald-600 text-white
                    shadow-lg shadow-cyan-500/20
                    hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                    transition-all disabled:opacity-50 disabled:hover:scale-100
                  `}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Save Changes' : 'Create Card'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}

