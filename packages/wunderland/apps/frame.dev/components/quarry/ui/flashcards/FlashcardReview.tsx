/**
 * FlashcardReview Component
 * 
 * A beautiful, game-like flashcard review interface with:
 * - 3D flip animations
 * - FSRS-based spaced repetition
 * - Progress tracking
 * - Celebration effects
 * - Full keyboard accessibility
 * 
 * @module components/quarry/ui/FlashcardReview
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import {
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Star,
  Pause,
  X,
  Clock,
  Zap,
  Trophy,
  Flame,
  VolumeX,
  Volume2,
  Eye,
  EyeOff,
  HelpCircle,
  Sparkles
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import type { Flashcard, FlashcardRating } from '@/types/openstrand'
import { useFlashcards } from '../../hooks/useFlashcards'
import { formatInterval } from '@/lib/fsrs'

interface FlashcardReviewProps {
  /** Strand slug to load flashcards from */
  strandSlug?: string
  /** Pre-loaded cards to review */
  cards?: Flashcard[]
  /** Callback when session ends */
  onSessionEnd?: (stats: {
    reviewed: number
    correct: number
    xpEarned: number
    duration: number
  }) => void
  /** Callback when a card is reviewed */
  onCardReview?: (cardId: string, rating: FlashcardRating) => void
  /** Whether to auto-start the session */
  autoStart?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Rating button configuration
 */
const RATING_CONFIG: Record<FlashcardRating, {
  label: string
  shortcut: string
  color: string
  bgColor: string
  hoverColor: string
  description: string
}> = {
  1: {
    label: 'Again',
    shortcut: '1',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    hoverColor: 'hover:bg-red-500/20',
    description: "I didn't remember this"
  },
  2: {
    label: 'Hard',
    shortcut: '2',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    hoverColor: 'hover:bg-orange-500/20',
    description: 'I remembered with difficulty'
  },
  3: {
    label: 'Good',
    shortcut: '3',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    hoverColor: 'hover:bg-green-500/20',
    description: 'I remembered correctly'
  },
  4: {
    label: 'Easy',
    shortcut: '4',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    hoverColor: 'hover:bg-blue-500/20',
    description: 'This was too easy'
  }
}

/**
 * Animation variants
 */
const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? 45 : -45
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? -45 : 45,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  })
}

const flipVariants = {
  front: {
    rotateY: 0,
    transition: { type: 'spring', stiffness: 200, damping: 25 }
  },
  back: {
    rotateY: 180,
    transition: { type: 'spring', stiffness: 200, damping: 25 }
  }
}

const buttonPressVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
}

const celebrationVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20
    }
  },
  exit: {
    scale: 1.5,
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

/**
 * Confetti particle component
 */
const Confetti: React.FC<{ count?: number }> = ({ count = 50 }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 0.5,
    color: ['#FF6B6B', '#00C896', '#FFD93D', '#6BCB77', '#4D96FF'][Math.floor(Math.random() * 5)]
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ 
            backgroundColor: p.color,
            left: `${p.x}%`,
            top: '50%'
          }}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{
            y: [0, -200 - Math.random() * 200],
            x: [(Math.random() - 0.5) * 200],
            opacity: [1, 1, 0],
            scale: [1, 1.2, 0.5],
            rotate: [0, Math.random() * 360]
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  )
}

/**
 * XP gain animation
 */
const XPGain: React.FC<{ amount: number; onComplete?: () => void }> = ({ amount, onComplete }) => {
  return (
    <motion.div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
      initial={{ opacity: 0, scale: 0.5, y: 0 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 1], y: [0, -50, -100] }}
      transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1] }}
      onAnimationComplete={onComplete}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-6 py-3 rounded-full font-bold text-2xl shadow-lg">
        <Zap className="w-6 h-6" />
        +{amount} XP
      </div>
    </motion.div>
  )
}

/**
 * Main FlashcardReview component
 */
export function FlashcardReview({
  strandSlug,
  cards: initialCards,
  onSessionEnd,
  onCardReview,
  autoStart = false,
  className = ''
}: FlashcardReviewProps) {
  const { prefersReducedMotion } = useReducedMotion()
  
  const {
    cards: loadedCards,
    session,
    currentCard,
    intervalPreview,
    startSession,
    endSession,
    rateCard,
    skipCard,
    loading
  } = useFlashcards({ strandSlug, autoLoad: !initialCards })

  // State
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showConfetti, setShowConfetti] = useState(false)
  const [xpGain, setXpGain] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Timer for session duration
  useEffect(() => {
    if (!session.active) return
    
    const timer = setInterval(() => {
      if (session.startTime) {
        setElapsed(Math.floor((Date.now() - session.startTime.getTime()) / 1000))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [session.active, session.startTime])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !session.active && !loading) {
      const cardsToUse = initialCards || loadedCards
      if (cardsToUse.length > 0) {
        startSession(cardsToUse)
      }
    }
  }, [autoStart, session.active, loading, initialCards, loadedCards, startSession])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!session.active || !currentCard) return

      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (!isFlipped) {
            setIsFlipped(true)
          }
          break
        case '1':
        case '2':
        case '3':
        case '4':
          if (isFlipped) {
            e.preventDefault()
            handleRate(parseInt(e.key) as FlashcardRating)
          }
          break
        case 'h':
          if (!isFlipped && currentCard.hints?.length) {
            e.preventDefault()
            handleShowHint()
          }
          break
        case 's':
          e.preventDefault()
          handleSkip()
          break
        case 'Escape':
          e.preventDefault()
          handleEndSession()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [session.active, currentCard, isFlipped])

  /**
   * Handle showing a hint
   */
  const handleShowHint = useCallback(() => {
    if (!currentCard?.hints?.length) return
    setShowHint(true)
    setHintIndex(prev => Math.min(prev + 1, currentCard.hints!.length - 1))
  }, [currentCard])

  /**
   * Handle rating a card
   */
  const handleRate = useCallback(async (rating: FlashcardRating) => {
    if (!currentCard) return

    setDirection(1)
    const result = await rateCard(rating)
    
    // Trigger celebration for correct answers
    if (result.isCorrect && !prefersReducedMotion) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    }

    // Show XP gain
    if (result.xpEarned > 0) {
      setXpGain(result.xpEarned)
    }

    // Callback
    onCardReview?.(currentCard.id, rating)

    // Reset for next card
    setIsFlipped(false)
    setShowHint(false)
    setHintIndex(0)

    // Check if session is complete
    if (!result.nextCard) {
      const sessionStats = endSession()
      if (sessionStats) {
        onSessionEnd?.({
          reviewed: sessionStats.itemsReviewed,
          correct: sessionStats.correctCount,
          xpEarned: sessionStats.xpEarned,
          duration: sessionStats.duration
        })
      }
    }
  }, [currentCard, rateCard, endSession, onCardReview, onSessionEnd, prefersReducedMotion])

  /**
   * Handle skipping a card
   */
  const handleSkip = useCallback(() => {
    setDirection(-1)
    skipCard()
    setIsFlipped(false)
    setShowHint(false)
    setHintIndex(0)
  }, [skipCard])

  /**
   * Handle ending the session
   */
  const handleEndSession = useCallback(() => {
    const sessionStats = endSession()
    if (sessionStats) {
      onSessionEnd?.({
        reviewed: sessionStats.itemsReviewed,
        correct: sessionStats.correctCount,
        xpEarned: sessionStats.xpEarned,
        duration: sessionStats.duration
      })
    }
  }, [endSession, onSessionEnd])

  /**
   * Handle starting a new session
   */
  const handleStartSession = useCallback(() => {
    const cardsToUse = initialCards || loadedCards
    if (cardsToUse.length > 0) {
      startSession(cardsToUse)
      setElapsed(0)
    }
  }, [initialCards, loadedCards, startSession])

  /**
   * Format elapsed time
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <motion.div
          className="w-16 h-16 border-4 border-frame-green border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  // No cards state
  const allCards = initialCards || loadedCards
  if (allCards.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] gap-4 ${className}`}>
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-cyan-100 dark:from-emerald-900/30 dark:to-cyan-900/30 rounded-full flex items-center justify-center">
          <Zap className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-ink-800 dark:text-paper-100">
          No flashcards yet
        </h3>
        <p className="text-ink-500 dark:text-paper-400 text-center max-w-md mb-4">
          Create flashcards from your notes to start studying with spaced repetition.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onSessionEnd?.({ reviewed: 0, correct: 0, xpEarned: 0, duration: 0 })}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg font-medium shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-shadow"
          >
            <Sparkles className="w-4 h-4" />
            Generate Flashcards
          </button>
        </div>
        <p className="text-xs text-ink-400 dark:text-paper-500 mt-2">
          💡 Tip: Select text in your document and choose "Create Flashcard"
        </p>
      </div>
    )
  }

  // Session not started
  if (!session.active) {
    const dueCount = allCards.filter(c => 
      !c.suspended && new Date(c.fsrs.nextReview) <= new Date()
    ).length
    const newCount = allCards.filter(c => c.fsrs.state === 'new' && !c.suspended).length

    return (
      <div className={`flex flex-col items-center justify-center min-h-[400px] gap-6 ${className}`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-ink-800 dark:text-paper-100 mb-2">
            Ready to Study?
          </h2>
          <p className="text-ink-500 dark:text-paper-400">
            {dueCount > 0 ? (
              <>You have <span className="font-semibold text-frame-green">{dueCount} cards</span> due for review</>
            ) : newCount > 0 ? (
              <><span className="font-semibold text-blue-500">{newCount} new cards</span> to learn</>
            ) : (
              'All caught up! Check back later.'
            )}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-4 justify-center">
          <motion.button
            variants={buttonPressVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={handleStartSession}
            disabled={dueCount === 0 && newCount === 0}
            className="px-8 py-4 bg-gradient-to-r from-frame-green to-frame-green-light text-white rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-frame-green focus:ring-offset-2"
          >
            Start Studying
          </motion.button>
        </div>

        <div className="flex gap-6 text-sm text-ink-500 dark:text-paper-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span>New: {newCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>Learning: {allCards.filter(c => c.fsrs.state === 'learning').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Review: {allCards.filter(c => c.fsrs.state === 'review').length}</span>
          </div>
        </div>
      </div>
    )
  }

  // Session complete
  if (!currentCard) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`flex flex-col items-center justify-center min-h-[400px] gap-6 ${className}`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Trophy className="w-12 h-12 text-white" />
        </motion.div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-ink-800 dark:text-paper-100 mb-2">
            Session Complete!
          </h2>
          <p className="text-ink-500 dark:text-paper-400">
            Great job on your study session!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
              {session.reviewed}
            </div>
            <div className="text-sm text-ink-500 dark:text-paper-400">Cards Reviewed</div>
          </div>
          <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {Math.round((session.correct / Math.max(session.reviewed, 1)) * 100)}%
            </div>
            <div className="text-sm text-ink-500 dark:text-paper-400">Accuracy</div>
          </div>
          <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-500">
              +{session.xpEarned}
            </div>
            <div className="text-sm text-ink-500 dark:text-paper-400">XP Earned</div>
          </div>
          <div className="bg-paper-100 dark:bg-ink-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
              {formatTime(elapsed)}
            </div>
            <div className="text-sm text-ink-500 dark:text-paper-400">Time Spent</div>
          </div>
        </div>

        <motion.button
          variants={buttonPressVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={handleStartSession}
          className="px-6 py-3 bg-frame-green text-white rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-frame-green focus:ring-offset-2"
        >
          Study More
        </motion.button>
      </motion.div>
    )
  }

  // Active session - show flashcard
  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center gap-3 sm:gap-6 px-2 sm:px-0 ${className}`}
    >
      {/* Celebration effects */}
      {showConfetti && <Confetti />}
      {xpGain !== null && (
        <XPGain amount={xpGain} onComplete={() => setXpGain(null)} />
      )}

      {/* Session header - mobile optimized */}
      <div className="w-full max-w-lg flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Progress */}
          <div className="text-xs sm:text-sm text-ink-500 dark:text-paper-400 whitespace-nowrap">
            {session.currentIndex + 1} / {session.cards.length}
          </div>

          {/* Progress bar */}
          <div className="w-16 sm:w-32 h-1.5 sm:h-2 bg-paper-200 dark:bg-ink-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-frame-green to-frame-green-light"
              initial={{ width: 0 }}
              animate={{ width: `${((session.currentIndex) / session.cards.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1 text-xs sm:text-sm text-ink-500 dark:text-paper-400">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{formatTime(elapsed)}</span>
            <span className="xs:hidden">{Math.floor(elapsed / 60)}m</span>
          </div>

          {/* Streak */}
          {session.streak > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-orange-500 font-semibold"
            >
              <Flame className="w-3 h-3 sm:w-4 sm:h-4" />
              {session.streak}
            </motion.div>
          )}

          {/* XP */}
          <div className="flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm text-amber-500 font-semibold">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            {session.xpEarned}
          </div>

          {/* End session */}
          <button
            onClick={handleEndSession}
            className="p-1.5 sm:p-2 text-ink-400 hover:text-ink-600 dark:hover:text-paper-300 rounded-lg hover:bg-paper-200 dark:hover:bg-ink-700 transition-colors active:bg-paper-300 dark:active:bg-ink-600"
            aria-label="End session"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 w-full max-w-lg px-1 sm:px-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentCard.id}
            custom={direction}
            variants={prefersReducedMotion ? undefined : cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              className="relative w-full min-h-[200px] sm:min-h-[300px] cursor-pointer select-none"
              onClick={() => !isFlipped && setIsFlipped(true)}
              variants={prefersReducedMotion ? undefined : flipVariants}
              animate={isFlipped ? 'back' : 'front'}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of card */}
              <div
                className={`absolute inset-0 bg-white dark:bg-ink-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-8 flex flex-col backface-hidden ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                {/* Card metadata badges */}
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  {/* Difficulty badge */}
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${
                    currentCard.fsrs.difficulty <= 3
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : currentCard.fsrs.difficulty <= 6
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {currentCard.fsrs.difficulty <= 3 ? 'Easy' :
                     currentCard.fsrs.difficulty <= 6 ? 'Medium' : 'Hard'}
                  </span>

                  {/* Card state badge */}
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                    currentCard.fsrs.state === 'new'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : currentCard.fsrs.state === 'learning'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {currentCard.fsrs.state === 'new' ? 'New' :
                     currentCard.fsrs.state === 'learning' ? 'Learning' : 'Review'}
                  </span>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-auto">
                  <div className="text-base sm:text-xl text-ink-800 dark:text-paper-100 text-center prose dark:prose-invert prose-sm sm:prose-base max-w-full break-words">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{currentCard.front}</ReactMarkdown>
                  </div>
                </div>

                {/* Hint section */}
                {currentCard.hints && currentCard.hints.length > 0 && (
                  <div className="mt-2 sm:mt-4">
                    {showHint ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs sm:text-sm text-ink-500 dark:text-paper-400 bg-paper-100 dark:bg-ink-700 rounded-lg p-2 sm:p-3"
                      >
                        <span className="font-medium">Hint:</span>{' '}
                        {currentCard.hints[hintIndex]}
                        {hintIndex < currentCard.hints.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleShowHint()
                            }}
                            className="ml-2 text-frame-green hover:underline active:opacity-70"
                          >
                            Next hint
                          </button>
                        )}
                      </motion.div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShowHint()
                        }}
                        className="text-xs sm:text-sm text-ink-400 hover:text-ink-600 dark:hover:text-paper-300 flex items-center gap-1 active:opacity-70 p-1 -m-1"
                      >
                        <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Show hint (h)</span>
                        <span className="sm:hidden">Hint</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-2 sm:mt-4 text-center text-xs sm:text-sm text-ink-400 dark:text-paper-500">
                  <span className="hidden sm:inline">Click or press Space to reveal answer</span>
                  <span className="sm:hidden">Tap to reveal</span>
                </div>
              </div>

              {/* Back of card */}
              <div
                className={`absolute inset-0 bg-white dark:bg-ink-800 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-8 flex flex-col ${
                  !isFlipped ? 'pointer-events-none' : ''
                }`}
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div className="flex-1 flex items-center justify-center overflow-auto">
                  <div className="text-base sm:text-xl text-ink-800 dark:text-paper-100 text-center prose dark:prose-invert prose-sm sm:prose-base max-w-full break-words">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{currentCard.back}</ReactMarkdown>
                  </div>
                </div>

                {currentCard.notes && (
                  <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-ink-500 dark:text-paper-400 bg-paper-100 dark:bg-ink-700 rounded-lg p-2 sm:p-3 max-h-24 overflow-auto">
                    {currentCard.notes}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating buttons (visible when flipped) */}
      <AnimatePresence>
        {isFlipped && intervalPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-lg px-1 sm:px-0"
          >
            <div className="text-center text-xs sm:text-sm text-ink-500 dark:text-paper-400 mb-2 sm:mb-3">
              How well did you remember?
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {([1, 2, 3, 4] as FlashcardRating[]).map((rating) => {
                const config = RATING_CONFIG[rating]
                const interval = intervalPreview[rating]

                return (
                  <motion.button
                    key={rating}
                    variants={buttonPressVariants}
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => handleRate(rating)}
                    className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 border-transparent ${config.bgColor} ${config.hoverColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors active:scale-95`}
                    title={config.description}
                  >
                    <span className={`text-sm sm:text-base font-semibold ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] sm:text-xs text-ink-500 dark:text-paper-400 truncate max-w-full">
                      {formatInterval(interval)}
                    </span>
                    <kbd className="hidden sm:inline-block text-xs text-ink-400 bg-paper-200 dark:bg-ink-600 px-1.5 py-0.5 rounded">
                      {config.shortcut}
                    </kbd>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSkip}
          className="flex items-center gap-1 text-xs sm:text-sm text-ink-400 hover:text-ink-600 dark:hover:text-paper-300 transition-colors p-2 -m-2 active:opacity-70"
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Skip (s)</span>
          <span className="sm:hidden">Skip</span>
        </button>
      </div>

      {/* Keyboard shortcuts help - hidden on mobile */}
      <div className="hidden sm:block text-xs text-ink-400 dark:text-paper-500 text-center">
        <span className="opacity-75">Shortcuts: </span>
        <kbd className="mx-1">Space</kbd> reveal •
        <kbd className="mx-1">1-4</kbd> rate •
        <kbd className="mx-1">h</kbd> hint •
        <kbd className="mx-1">s</kbd> skip •
        <kbd className="mx-1">Esc</kbd> end
      </div>
    </div>
  )
}

export default FlashcardReview





