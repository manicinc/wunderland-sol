/**
 * Quiz Question Edit Modal
 * Full-featured modal for creating and editing quiz questions
 * 
 * Features:
 * - Question text editor
 * - Dynamic answer/options editor based on type
 * - Question type selector (multiple choice, true/false, fill blank)
 * - Difficulty selector
 * - Explanation field
 * 
 * @module codex/ui/learning/QuizEditModal
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, Plus, Trash2, GripVertical, Check, AlertCircle,
  HelpCircle, CheckCircle, Circle, Type, ToggleLeft, AlignLeft
} from 'lucide-react'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'

export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  question: string
  correctAnswer: string
  options?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
  strandSlug?: string
}

export interface QuizEditModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Question to edit (null for new question) */
  question?: QuizQuestion | null
  /** Strand slug for new questions */
  strandSlug: string
  /** Theme */
  isDark?: boolean
  /** Save callback */
  onSave: (data: QuizFormData) => Promise<void>
  /** Delete callback (for existing questions) */
  onDelete?: () => Promise<void>
}

export interface QuizFormData {
  type: QuizQuestionType
  question: string
  correctAnswer: string
  options?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation?: string
}

const QUESTION_TYPES: { value: QuizQuestionType; label: string; icon: React.ElementType }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle },
  { value: 'true_false', label: 'True / False', icon: ToggleLeft },
  { value: 'fill_blank', label: 'Fill in Blank', icon: Type },
  { value: 'short_answer', label: 'Short Answer', icon: AlignLeft },
]

const DIFFICULTY_OPTIONS: { value: 'easy' | 'medium' | 'hard'; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: 'text-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500' },
  { value: 'hard', label: 'Hard', color: 'text-red-500' },
]

/**
 * Options editor for multiple choice questions
 */
function OptionsEditor({
  options,
  correctAnswer,
  onChange,
  onSelectCorrect,
  isDark,
}: {
  options: string[]
  correctAnswer: string
  onChange: (options: string[]) => void
  onSelectCorrect: (answer: string) => void
  isDark: boolean
}) {
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    const wasCorrect = newOptions[index] === correctAnswer
    newOptions[index] = value
    onChange(newOptions)
    // Update correct answer if this option was selected
    if (wasCorrect) {
      onSelectCorrect(value)
    }
  }

  const handleAddOption = () => {
    onChange([...options, `Option ${String.fromCharCode(65 + options.length)}`])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return // Minimum 2 options
    const removedOption = options[index]
    const newOptions = options.filter((_, i) => i !== index)
    onChange(newOptions)
    // If we removed the correct answer, select the first option
    if (removedOption === correctAnswer && newOptions.length > 0) {
      onSelectCorrect(newOptions[0])
    }
  }

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div
          key={index}
          className={`
            flex items-center gap-2 p-2 rounded-xl border
            ${correctAnswer === option
              ? isDark
                ? 'bg-emerald-900/20 border-emerald-700/50'
                : 'bg-emerald-50 border-emerald-200'
              : isDark
                ? 'bg-zinc-800/50 border-zinc-700'
                : 'bg-white border-zinc-200'
            }
          `}
        >
          {/* Correct answer indicator */}
          <button
            type="button"
            onClick={() => onSelectCorrect(option)}
            className={`
              w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
              transition-colors
              ${correctAnswer === option
                ? isDark
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-emerald-500 bg-emerald-500 text-white'
                : isDark
                  ? 'border-zinc-600 hover:border-zinc-500'
                  : 'border-zinc-300 hover:border-zinc-400'
              }
            `}
            title={correctAnswer === option ? 'Correct answer' : 'Set as correct answer'}
          >
            {correctAnswer === option && <Check className="w-3 h-3" />}
          </button>

          {/* Option text */}
          <input
            type="text"
            value={option}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            className={`
              flex-1 px-2 py-1 bg-transparent text-sm
              focus:outline-none
              ${isDark ? 'text-zinc-100' : 'text-zinc-800'}
            `}
            placeholder={`Option ${String.fromCharCode(65 + index)}`}
          />

          {/* Remove button */}
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => handleRemoveOption(index)}
              className={`
                p-1 rounded-lg transition-colors
                ${isDark
                  ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-700'
                  : 'text-zinc-400 hover:text-red-500 hover:bg-zinc-100'
                }
              `}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {/* Add option button */}
      {options.length < 6 && (
        <button
          type="button"
          onClick={handleAddOption}
          className={`
            w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed
            text-sm font-medium transition-colors
            ${isDark
              ? 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
              : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
            }
          `}
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      )}
    </div>
  )
}

/**
 * True/False selector
 */
function TrueFalseSelector({
  value,
  onChange,
  isDark,
}: {
  value: string
  onChange: (value: string) => void
  isDark: boolean
}) {
  return (
    <div className="flex gap-3">
      {['True', 'False'].map(option => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`
            flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all
            ${value === option
              ? option === 'True'
                ? isDark
                  ? 'bg-emerald-900/30 border-emerald-600 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-700'
                : isDark
                  ? 'bg-red-900/30 border-red-600 text-red-400'
                  : 'bg-red-50 border-red-400 text-red-700'
              : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
            }
          `}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

/**
 * Main QuizEditModal component
 */
export default function QuizEditModal({
  isOpen,
  onClose,
  question,
  strandSlug,
  isDark = false,
  onSave,
  onDelete,
}: QuizEditModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [type, setType] = useState<QuizQuestionType>('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [options, setOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D'])
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [explanation, setExplanation] = useState('')

  // Initialize form when question changes
  useEffect(() => {
    if (question) {
      setType(question.type)
      setQuestionText(question.question)
      setCorrectAnswer(question.correctAnswer)
      setOptions(question.options || ['Option A', 'Option B', 'Option C', 'Option D'])
      setDifficulty(question.difficulty)
      setExplanation(question.explanation || '')
    } else {
      // Reset for new question
      setType('multiple_choice')
      setQuestionText('')
      setCorrectAnswer('')
      setOptions(['Option A', 'Option B', 'Option C', 'Option D'])
      setDifficulty('medium')
      setExplanation('')
    }
    setError(null)
  }, [question, isOpen])

  // Update correct answer when type changes
  useEffect(() => {
    if (type === 'true_false' && !['True', 'False'].includes(correctAnswer)) {
      setCorrectAnswer('True')
    } else if (type === 'multiple_choice' && options.length > 0 && !options.includes(correctAnswer)) {
      setCorrectAnswer(options[0])
    }
  }, [type, options, correctAnswer])

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
    modalId: 'quiz-edit-modal',
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!questionText.trim()) {
      setError('Question text is required')
      return
    }
    if (!correctAnswer.trim()) {
      setError('Correct answer is required')
      return
    }

    setSaving(true)
    try {
      await onSave({
        type,
        question: questionText.trim(),
        correctAnswer: correctAnswer.trim(),
        options: type === 'multiple_choice' ? options.filter(o => o.trim()) : undefined,
        difficulty,
        explanation: explanation.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save question')
    } finally {
      setSaving(false)
    }
  }, [type, questionText, correctAnswer, options, difficulty, explanation, onSave, onClose])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    setSaving(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question')
    } finally {
      setSaving(false)
    }
  }, [onDelete, onClose])

  const isEditing = !!question

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
                    ? 'bg-gradient-to-br from-violet-900/60 to-fuchsia-900/40'
                    : 'bg-gradient-to-br from-violet-100 to-fuchsia-100'
                  }
                `}>
                  <HelpCircle className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {isEditing ? 'Edit Question' : 'New Question'}
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
              {/* Question Type */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Question Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {QUESTION_TYPES.map(qt => {
                    const Icon = qt.icon
                    return (
                      <button
                        key={qt.value}
                        type="button"
                        onClick={() => setType(qt.value)}
                        className={`
                          flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                          ${type === qt.value
                            ? isDark
                              ? 'bg-violet-900/50 border-violet-600 text-violet-300'
                              : 'bg-violet-50 border-violet-300 text-violet-700'
                            : isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        {qt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Question
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={
                    type === 'fill_blank'
                      ? 'The _______ pattern allows objects to observe state changes.'
                      : 'What is the main purpose of React hooks?'
                  }
                  rows={3}
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-violet-500/30
                  `}
                />
              </div>

              {/* Answer section - varies by type */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {type === 'multiple_choice' ? 'Options (select correct answer)' : 'Correct Answer'}
                </label>

                {type === 'multiple_choice' ? (
                  <OptionsEditor
                    options={options}
                    correctAnswer={correctAnswer}
                    onChange={setOptions}
                    onSelectCorrect={setCorrectAnswer}
                    isDark={isDark}
                  />
                ) : type === 'true_false' ? (
                  <TrueFalseSelector
                    value={correctAnswer}
                    onChange={setCorrectAnswer}
                    isDark={isDark}
                  />
                ) : (
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder={type === 'fill_blank' ? 'Observer' : 'Enter the correct answer...'}
                    className={`
                      w-full px-4 py-3 rounded-xl border text-sm
                      ${isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                      }
                      focus:outline-none focus:ring-2 focus:ring-violet-500/30
                    `}
                  />
                )}
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDifficulty(opt.value)}
                      className={`
                        flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-all
                        ${difficulty === opt.value
                          ? isDark
                            ? `bg-zinc-800 border-zinc-600 ${opt.color}`
                            : `bg-zinc-100 border-zinc-300 ${opt.color}`
                          : isDark
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-2">
                <label className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Explanation (optional)
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why this answer is correct..."
                  rows={2}
                  className={`
                    w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400'
                    }
                    focus:outline-none focus:ring-2 focus:ring-violet-500/30
                  `}
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
              {/* Delete button (only for existing questions) */}
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
                  disabled={saving || !questionText.trim() || !correctAnswer.trim()}
                  className={`
                    flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold
                    bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white
                    shadow-lg shadow-violet-500/20
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
                      {isEditing ? 'Save Changes' : 'Create Question'}
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

