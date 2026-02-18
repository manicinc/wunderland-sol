/**
 * Quiz Popover - Quick quiz access from any strand
 * @module codex/ui/QuizPopover
 *
 * @remarks
 * Provides quick access to auto-generated quizzes:
 * - Multiple choice questions from definitions
 * - True/False questions from factual statements
 * - Fill-in-the-blank (cloze) questions
 * - Progressive generation with caching
 * - Score tracking and results
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ListChecks, Play, RotateCcw, Check, XCircle, Trophy,
  ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle,
  BookOpen, Zap, Brain
} from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useIsTouchDevice } from '../../hooks/useIsTouchDevice'
import { useQuizGeneration, type QuizQuestion, type QuizQuestionType } from '../../hooks/useQuizGeneration'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import { useStrandContent } from '../../hooks/useStrandContent'
import PopoverStrandSelector from '../common/PopoverStrandSelector'
import CacheActionsBar from '../common/CacheActionsBar'

interface QuizPopoverProps {
  /** Whether popover is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current strand slug */
  strandSlug?: string
  /** Current strand content for generation */
  content?: string
  /** Theme */
  theme?: string
  /** Strand title for display */
  strandTitle?: string
  /** Pre-loaded strands from parent (avoids re-fetching) */
  availableStrands?: Array<{ slug: string; title: string; path?: string }>
  /** Callback to fetch strand content by path */
  onFetchStrandContent?: (path: string) => Promise<string | null>
}

type QuizState = 'idle' | 'generating' | 'ready' | 'answering' | 'complete'

/**
 * Progress ring component for quiz completion
 */
function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  isDark,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  isDark: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isDark ? '#27272a' : '#e4e4e7'}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isDark ? '#8b5cf6' : '#7c3aed'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

/**
 * Question type badge
 */
function QuestionTypeBadge({
  type,
  isDark,
}: {
  type: QuizQuestionType
  isDark: boolean
}) {
  const config = {
    multiple_choice: { label: 'Multiple Choice', color: isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600' },
    true_false: { label: 'True/False', color: isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600' },
    fill_blank: { label: 'Fill Blank', color: isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600' },
  }

  const { label, color } = config[type]

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${color}`}>
      {label}
    </span>
  )
}

/**
 * Difficulty badge
 */
function DifficultyBadge({
  difficulty,
  isDark,
}: {
  difficulty: 'easy' | 'medium' | 'hard'
  isDark: boolean
}) {
  const config = {
    easy: { color: isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600' },
    medium: { color: isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600' },
    hard: { color: isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600' },
  }

  const { color } = config[difficulty]
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)

  return (
    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  )
}

/**
 * Answer option button
 */
function OptionButton({
  option,
  index,
  isSelected,
  isCorrect,
  showResult,
  onClick,
  isDark,
  isTouch,
}: {
  option: string
  index: number
  isSelected: boolean
  isCorrect: boolean
  showResult: boolean
  onClick: () => void
  isDark: boolean
  isTouch: boolean
}) {
  const letter = String.fromCharCode(65 + index) // A, B, C, D...

  let bgColor = isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'
  let borderColor = isDark ? 'border-zinc-700' : 'border-zinc-200'

  if (showResult) {
    if (isCorrect) {
      bgColor = isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'
      borderColor = isDark ? 'border-emerald-600' : 'border-emerald-400'
    } else if (isSelected && !isCorrect) {
      bgColor = isDark ? 'bg-red-900/30' : 'bg-red-50'
      borderColor = isDark ? 'border-red-600' : 'border-red-400'
    }
  } else if (isSelected) {
    bgColor = isDark ? 'bg-violet-900/30' : 'bg-violet-50'
    borderColor = isDark ? 'border-violet-600' : 'border-violet-400'
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={showResult}
      className={`
        w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all touch-manipulation
        ${bgColor} ${borderColor}
        ${showResult ? 'cursor-default' : 'cursor-pointer'}
        ${isTouch ? 'min-h-[52px]' : 'min-h-[44px]'}
      `}
    >
      <span className={`
        w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm
        ${isSelected
          ? isDark ? 'bg-violet-600 text-white' : 'bg-violet-500 text-white'
          : isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
        }
        ${showResult && isCorrect ? (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white') : ''}
        ${showResult && isSelected && !isCorrect ? (isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white') : ''}
      `}>
        {showResult && isCorrect ? <Check className="w-4 h-4" /> : showResult && isSelected ? <XCircle className="w-4 h-4" /> : letter}
      </span>
      <span className={`flex-1 text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
        {option}
      </span>
    </motion.button>
  )
}

/**
 * True/False buttons
 */
function TrueFalseButtons({
  selectedAnswer,
  correctAnswer,
  showResult,
  onSelect,
  isDark,
  isTouch,
}: {
  selectedAnswer: string | null
  correctAnswer: string
  showResult: boolean
  onSelect: (answer: string) => void
  isDark: boolean
  isTouch: boolean
}) {
  const options = ['True', 'False']

  return (
    <div className="flex gap-3">
      {options.map((option) => {
        const isSelected = selectedAnswer === option
        const isCorrect = option === correctAnswer

        let bgColor = isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'
        let borderColor = isDark ? 'border-zinc-700' : 'border-zinc-200'

        if (showResult) {
          if (isCorrect) {
            bgColor = isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'
            borderColor = isDark ? 'border-emerald-600' : 'border-emerald-400'
          } else if (isSelected && !isCorrect) {
            bgColor = isDark ? 'bg-red-900/30' : 'bg-red-50'
            borderColor = isDark ? 'border-red-600' : 'border-red-400'
          }
        } else if (isSelected) {
          bgColor = isDark ? 'bg-violet-900/30' : 'bg-violet-50'
          borderColor = isDark ? 'border-violet-600' : 'border-violet-400'
        }

        return (
          <motion.button
            key={option}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(option)}
            disabled={showResult}
            className={`
              flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-bold transition-all touch-manipulation
              ${bgColor} ${borderColor}
              ${showResult ? 'cursor-default' : 'cursor-pointer'}
              ${isTouch ? 'min-h-[60px] text-base' : 'min-h-[52px] text-sm'}
              ${isDark ? 'text-zinc-100' : 'text-zinc-800'}
            `}
          >
            {showResult && isCorrect && <Check className="w-5 h-5 text-emerald-500" />}
            {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
            {option}
          </motion.button>
        )
      })}
    </div>
  )
}

/**
 * Fill in the blank input
 */
function FillBlankInput({
  value,
  correctAnswer,
  showResult,
  onChange,
  onSubmit,
  isDark,
  isTouch,
}: {
  value: string
  correctAnswer: string
  showResult: boolean
  onChange: (value: string) => void
  onSubmit: () => void
  isDark: boolean
  isTouch: boolean
}) {
  const isCorrect = showResult && value.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
  const isIncorrect = showResult && !isCorrect

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          disabled={showResult}
          placeholder="Type your answer..."
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-center font-medium transition-all
            ${isDark
              ? 'bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder-zinc-500'
              : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400'
            }
            ${isCorrect ? (isDark ? 'border-emerald-600 bg-emerald-900/20' : 'border-emerald-400 bg-emerald-50') : ''}
            ${isIncorrect ? (isDark ? 'border-red-600 bg-red-900/20' : 'border-red-400 bg-red-50') : ''}
            focus:outline-none focus:ring-2 focus:ring-violet-500/30
            ${isTouch ? 'text-lg min-h-[52px]' : 'text-base'}
          `}
        />
        {showResult && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2`}>
            {isCorrect ? (
              <Check className="w-5 h-5 text-emerald-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      {showResult && isIncorrect && (
        <p className={`text-sm text-center ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Correct answer: <span className="font-semibold text-emerald-500">{correctAnswer}</span>
        </p>
      )}
    </div>
  )
}

/**
 * Main quiz popover
 */
export default function QuizPopover({
  isOpen,
  onClose,
  strandSlug,
  content,
  theme = 'light',
  strandTitle,
  availableStrands: propStrands,
  onFetchStrandContent,
}: QuizPopoverProps) {
  const [mounted, setMounted] = useState(false)
  const isDark = theme?.includes('dark')
  const { isMobile } = useBreakpoint()
  const isTouch = useIsTouchDevice()

  // Strand selection state
  const [strandMode, setStrandMode] = useState<'current' | 'select'>(strandSlug ? 'current' : 'select')
  const [selectedStrand, setSelectedStrand] = useState<{ slug: string; title: string; content?: string } | null>(null)
  
  // Use the active strand based on mode
  const activeStrandSlug = strandMode === 'current' ? strandSlug : selectedStrand?.slug
  const activeContent = strandMode === 'current' ? content : selectedStrand?.content
  const activeTitle = strandMode === 'current' 
    ? strandTitle || strandSlug?.split('/').pop()?.replace(/\.md$/, '') 
    : selectedStrand?.title

  // Strand content fetching for "Select" mode - use hook as fallback
  const { 
    strands: hookStrands, 
    loadingStrands: hookLoadingStrands,
    fetchStrandContent: hookFetchStrandContent,
    loadingContent: loadingStrandContent,
  } = useStrandContent({ autoLoadList: !propStrands || propStrands.length === 0 })

  // Use parent-provided strands if available
  const availableStrands = propStrands && propStrands.length > 0 ? propStrands : hookStrands
  const loadingStrands = propStrands && propStrands.length > 0 ? false : hookLoadingStrands

  // Handle strand selection
  const handleSelectStrand = useCallback(async (strand: { slug: string; title: string }) => {
    // Try parent callback first
    if (onFetchStrandContent) {
      const strandContent = await onFetchStrandContent(strand.slug)
      if (strandContent) {
        setSelectedStrand({
          slug: strand.slug,
          title: strand.title,
          content: strandContent,
        })
        setQuizState('idle')
        setCurrentIndex(0)
        setAnswers([])
        return
      }
    }
    // Fallback to hook
    const strandWithContent = await hookFetchStrandContent(strand.slug)
    if (strandWithContent) {
      setSelectedStrand({
        slug: strandWithContent.slug,
        title: strandWithContent.title,
        content: strandWithContent.content,
      })
      setQuizState('idle')
      setCurrentIndex(0)
      setAnswers([])
    }
  }, [onFetchStrandContent, hookFetchStrandContent])

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [fillBlankValue, setFillBlankValue] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<Array<{ questionId: string; answer: string; correct: boolean }>>([])

  // Quiz generation
  const {
    questions,
    generating,
    progress,
    error,
    stats,
    cacheInfo,
    generate,
    clear,
  } = useQuizGeneration({
    maxQuestions: 10,
    types: ['multiple_choice', 'true_false', 'fill_blank'],
    strandSlug: activeStrandSlug,
  })

  // Accessibility features
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnClickOutside: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'quiz-popover',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset state when popover closes
  useEffect(() => {
    if (!isOpen) {
      setQuizState('idle')
      setCurrentIndex(0)
      setSelectedAnswer(null)
      setFillBlankValue('')
      setShowResult(false)
      setAnswers([])
    }
  }, [isOpen])

  // Current question
  const currentQuestion = useMemo(() => {
    return questions[currentIndex] || null
  }, [questions, currentIndex])

  // Quiz progress
  const quizProgress = useMemo(() => {
    if (questions.length === 0) return 0
    return Math.round((answers.length / questions.length) * 100)
  }, [questions.length, answers.length])

  // Score calculation
  const score = useMemo(() => {
    const correct = answers.filter(a => a.correct).length
    const total = answers.length
    return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 }
  }, [answers])

  // Generate quiz
  const handleGenerate = useCallback(async () => {
    if (!activeContent || activeContent.length < 100) {
      return
    }
    setQuizState('generating')
    const generatedQuestions = await generate(activeContent)
    if (generatedQuestions.length > 0) {
      setQuizState('ready')
    } else {
      setQuizState('idle')
    }
  }, [activeContent, generate])

  // Handle clear cache
  const handleClearCache = useCallback(() => {
    clear()
    setQuizState('idle')
    setCurrentIndex(0)
    setAnswers([])
  }, [clear])

  // Start quiz
  const handleStart = useCallback(() => {
    setQuizState('answering')
    setCurrentIndex(0)
    setAnswers([])
  }, [])

  // Submit answer
  const handleSubmit = useCallback(() => {
    if (!currentQuestion) return

    let answer = ''
    let correct = false

    if (currentQuestion.type === 'fill_blank') {
      answer = fillBlankValue.trim()
      correct = answer.toLowerCase() === currentQuestion.answer.toLowerCase().trim()
    } else {
      answer = selectedAnswer || ''
      correct = answer === currentQuestion.answer
    }

    setShowResult(true)
    setAnswers(prev => [...prev, { questionId: currentQuestion.id, answer, correct }])
  }, [currentQuestion, selectedAnswer, fillBlankValue])

  // Next question
  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setQuizState('complete')
    } else {
      setCurrentIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setFillBlankValue('')
      setShowResult(false)
    }
  }, [currentIndex, questions.length])

  // Restart quiz
  const handleRestart = useCallback(() => {
    setQuizState('ready')
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setFillBlankValue('')
    setShowResult(false)
    setAnswers([])
  }, [])

  // Regenerate quiz
  const handleRegenerate = useCallback(async () => {
    clear()
    await handleGenerate()
  }, [clear, handleGenerate])

  if (!mounted) return null

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[299]"
            onClick={handleBackdropClick}
          />

          {/* Popover */}
          <motion.div
            ref={contentRef}
            {...modalProps}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
            className={`
              fixed z-[300] flex flex-col
              md:bottom-4 md:right-4 md:w-[min(92vw,520px)] md:max-h-[85vh]
              max-md:inset-0 max-md:w-full max-md:h-full
              overflow-hidden md:rounded-2xl md:shadow-2xl
              ${isDark
                ? 'bg-zinc-900/95 border border-zinc-700/50'
                : 'bg-white/95 border border-zinc-200/50'
              }
            `}
          >
            {/* Header */}
            <div className={`
              relative px-4 py-4 border-b shrink-0
              ${isDark
                ? 'border-zinc-800 bg-gradient-to-r from-violet-950/50 via-zinc-900 to-cyan-950/30'
                : 'border-zinc-200 bg-gradient-to-r from-violet-50/80 via-white to-cyan-50/50'
              }
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2.5 rounded-xl
                    ${isDark
                      ? 'bg-gradient-to-br from-violet-900/70 to-cyan-900/50 ring-1 ring-violet-700/50'
                      : 'bg-gradient-to-br from-violet-100 to-cyan-100 ring-1 ring-violet-200'
                    }
                  `}>
                    <ListChecks className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Quick Quiz
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {quizState === 'answering'
                        ? `Question ${currentIndex + 1} of ${questions.length}`
                        : quizState === 'complete'
                          ? `Score: ${score.correct}/${score.total}`
                          : activeTitle || 'Generate a quiz'
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className={`
                    rounded-xl transition-all touch-manipulation
                    ${isTouch ? 'p-2.5 min-w-[44px] min-h-[44px]' : 'p-2'}
                    ${isDark
                      ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                      : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                    }
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar */}
              {quizState === 'answering' && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${quizProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {score.correct}/{answers.length}
                  </span>
                </div>
              )}

              {/* Strand Selector - only show when not actively answering */}
              {quizState !== 'answering' && (
                <div className="mt-3">
                  <PopoverStrandSelector
                    mode={strandMode}
                    onModeChange={setStrandMode}
                    currentStrand={strandSlug ? { slug: strandSlug, title: strandSlug.split('/').pop()?.replace(/\.md$/, '') || strandSlug } : undefined}
                    selectedStrand={selectedStrand || undefined}
                    onSelectStrand={handleSelectStrand}
                    availableStrands={availableStrands}
                    loadingStrands={loadingStrands || loadingStrandContent}
                    isDark={isDark}
                    isTouch={isTouch}
                    compact
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Idle / Start Screen */}
              {quizState === 'idle' && (
                <div className="space-y-6">
                  {/* Info card */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                        Test Your Knowledge
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Generate a quiz from the current content to reinforce your learning.
                      Questions include multiple choice, true/false, and fill-in-the-blank.
                    </p>
                  </div>

                  {/* Generate button */}
                  {activeContent && activeContent.length >= 100 ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      className={`
                        w-full flex items-center justify-center gap-3 rounded-xl
                        bg-gradient-to-r from-violet-600 to-cyan-600
                        text-white font-bold
                        shadow-lg shadow-violet-500/20
                        hover:shadow-xl hover:shadow-violet-500/30
                        transition-shadow touch-manipulation
                        ${isTouch ? 'py-4 min-h-[56px] text-base' : 'py-4 text-lg'}
                      `}
                    >
                      <Sparkles className={isTouch ? 'w-5 h-5' : 'w-6 h-6'} />
                      Generate Quiz
                    </motion.button>
                  ) : (
                    <div className={`text-center py-8 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No Content Available</p>
                      <p className="text-sm mt-1 opacity-70">
                        Select a strand with content to generate a quiz
                      </p>
                    </div>
                  )}

                  {/* Research note */}
                  <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-zinc-800/30 text-zinc-500' : 'bg-zinc-50 text-zinc-400'}`}>
                    <p className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      <span className="font-medium">Smart Generation</span>
                    </p>
                    <p className="mt-1 leading-relaxed">
                      Questions are generated using NLP analysis of the content.
                      Results are cached for instant access on future visits.
                    </p>
                  </div>
                </div>
              )}

              {/* Generating */}
              {quizState === 'generating' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <ProgressRing progress={progress.percent} size={80} strokeWidth={6} isDark={isDark} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                        {progress.percent}%
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {progress.message || 'Generating quiz...'}
                  </p>
                  {cacheInfo?.fromCache && (
                    <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      Loading from cache...
                    </p>
                  )}
                </div>
              )}

              {/* Ready - Show stats before starting */}
              {quizState === 'ready' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                        {questions.length}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Questions
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {stats?.multipleChoice || 0}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        MCQ
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl text-center ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                      <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {(stats?.trueFalse || 0) + (stats?.fillBlank || 0)}
                      </p>
                      <p className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Other
                      </p>
                    </div>
                  </div>

                  {/* Start button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStart}
                    className={`
                      w-full flex items-center justify-center gap-3 rounded-xl
                      bg-gradient-to-r from-violet-600 to-cyan-600
                      text-white font-bold
                      shadow-lg shadow-violet-500/20
                      hover:shadow-xl hover:shadow-violet-500/30
                      transition-shadow touch-manipulation
                      ${isTouch ? 'py-4 min-h-[56px] text-base' : 'py-4 text-lg'}
                    `}
                  >
                    <Play className={isTouch ? 'w-5 h-5' : 'w-6 h-6'} />
                    Start Quiz
                  </motion.button>

                  {/* Regenerate option */}
                  <button
                    onClick={handleRegenerate}
                    className={`
                      w-full flex items-center justify-center gap-2 py-2 text-sm transition-colors
                      ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}
                    `}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Regenerate Questions
                  </button>
                </div>
              )}

              {/* Answering */}
              {quizState === 'answering' && currentQuestion && (
                <div className="space-y-4">
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <QuestionTypeBadge type={currentQuestion.type} isDark={isDark} />
                    <DifficultyBadge difficulty={currentQuestion.difficulty} isDark={isDark} />
                  </div>

                  {/* Question */}
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
                    <p className={`text-base font-medium leading-relaxed ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Answer options */}
                  <div className="space-y-2">
                    {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                      currentQuestion.options.map((option, index) => (
                        <OptionButton
                          key={index}
                          option={option}
                          index={index}
                          isSelected={selectedAnswer === option}
                          isCorrect={option === currentQuestion.answer}
                          showResult={showResult}
                          onClick={() => setSelectedAnswer(option)}
                          isDark={isDark}
                          isTouch={isTouch}
                        />
                      ))
                    )}

                    {currentQuestion.type === 'true_false' && (
                      <TrueFalseButtons
                        selectedAnswer={selectedAnswer}
                        correctAnswer={currentQuestion.answer}
                        showResult={showResult}
                        onSelect={setSelectedAnswer}
                        isDark={isDark}
                        isTouch={isTouch}
                      />
                    )}

                    {currentQuestion.type === 'fill_blank' && (
                      <FillBlankInput
                        value={fillBlankValue}
                        correctAnswer={currentQuestion.answer}
                        showResult={showResult}
                        onChange={setFillBlankValue}
                        onSubmit={handleSubmit}
                        isDark={isDark}
                        isTouch={isTouch}
                      />
                    )}
                  </div>

                  {/* Explanation (shown after answer) */}
                  {showResult && currentQuestion.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${isDark ? 'bg-cyan-900/20 border border-cyan-800/50' : 'bg-cyan-50 border border-cyan-200'}`}
                    >
                      <p className={`text-sm ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                        <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
                      </p>
                    </motion.div>
                  )}

                  {/* Submit / Next buttons */}
                  <div className="flex gap-3 pt-2">
                    {!showResult ? (
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={!selectedAnswer && !fillBlankValue.trim()}
                        className={`
                          flex-1 flex items-center justify-center gap-2 rounded-xl font-bold
                          transition-all touch-manipulation
                          ${(!selectedAnswer && !fillBlankValue.trim())
                            ? isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/20'
                          }
                          ${isTouch ? 'py-3.5 min-h-[52px] text-base' : 'py-3 text-sm'}
                        `}
                      >
                        <Check className="w-5 h-5" />
                        Submit Answer
                      </motion.button>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNext}
                        className={`
                          flex-1 flex items-center justify-center gap-2 rounded-xl font-bold
                          bg-gradient-to-r from-violet-600 to-cyan-600 text-white
                          shadow-lg shadow-violet-500/20
                          transition-all touch-manipulation
                          ${isTouch ? 'py-3.5 min-h-[52px] text-base' : 'py-3 text-sm'}
                        `}
                      >
                        {currentIndex >= questions.length - 1 ? 'See Results' : 'Next Question'}
                        <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {/* Complete */}
              {quizState === 'complete' && (
                <div className="text-center py-8 space-y-6">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                  >
                    <Trophy className={`w-16 h-16 mx-auto ${
                      score.percentage >= 80
                        ? isDark ? 'text-amber-400' : 'text-amber-500'
                        : score.percentage >= 60
                          ? isDark ? 'text-cyan-400' : 'text-cyan-500'
                          : isDark ? 'text-zinc-500' : 'text-zinc-400'
                    }`} />
                  </motion.div>

                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {score.percentage >= 80 ? 'Excellent!' : score.percentage >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      You scored {score.correct} out of {score.total} ({score.percentage}%)
                    </p>
                  </div>

                  {/* Score breakdown */}
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {score.correct}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Correct</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {score.total - score.correct}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Incorrect</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRestart}
                      className={`
                        w-full flex items-center justify-center gap-2 rounded-xl font-bold
                        bg-gradient-to-r from-violet-600 to-cyan-600 text-white
                        shadow-lg shadow-violet-500/20
                        transition-all touch-manipulation
                        ${isTouch ? 'py-3.5 min-h-[52px] text-base' : 'py-3 text-sm'}
                      `}
                    >
                      <RotateCcw className="w-5 h-5" />
                      Try Again
                    </motion.button>

                    <button
                      onClick={handleRegenerate}
                      className={`
                        w-full py-2 text-sm transition-colors
                        ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}
                      `}
                    >
                      Generate New Questions
                    </button>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 border border-red-800/50' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
                    <p className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => { clear(); setQuizState('idle') }}
                    className={`mt-3 text-sm ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Footer with Cache Actions */}
            <div className={`
              shrink-0
              ${isDark ? 'bg-zinc-950/50' : 'bg-zinc-50/50'}
            `}>
              <CacheActionsBar
                onRegenerate={handleRegenerate}
                onClearCache={handleClearCache}
                regenerating={generating}
                hasData={questions.length > 0}
                itemCount={questions.length}
                itemLabel="questions"
                cacheAge={cacheInfo?.fromCache ? 'cached' : undefined}
                isDark={isDark}
                isTouch={isTouch}
                disabled={!activeStrandSlug}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(popoverContent, document.body)
}

