'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, RotateCcw, Check } from 'lucide-react'

/**
 * FlashcardDemo - Interactive flashcard demonstration
 * Embedded inline in the landing page to showcase the FSRS spaced repetition system
 */

interface DemoCard {
  id: string
  front: string
  back: string
  type: 'basic' | 'cloze'
  difficulty: number
  hint?: string
}

// Demo flashcards showcasing Quarry's features
const DEMO_CARDS: DemoCard[] = [
  {
    id: 'demo-1',
    front: 'What is the primary benefit of using a knowledge graph for note organization?',
    back: 'Discovering connections between ideas automatically — relationships emerge organically as you write.',
    type: 'basic',
    difficulty: 3,
    hint: 'Think about relationships between notes...',
  },
  {
    id: 'demo-2',
    front: 'What does FSRS stand for in spaced repetition?',
    back: 'Free Spaced Repetition Scheduler — a modern, open-source algorithm based on memory research.',
    type: 'basic',
    difficulty: 4,
    hint: 'An algorithm for optimal learning...',
  },
  {
    id: 'demo-3',
    front: 'In OpenStrand, a [...] is the atomic unit of knowledge.',
    back: 'Strand',
    type: 'cloze',
    difficulty: 2,
    hint: 'The smallest unit in the hierarchy...',
  },
]

// Rating button configurations with visual intervals
const RATINGS = [
  { label: 'Again', interval: '<1m', color: 'red', value: 1 },
  { label: 'Hard', interval: '6m', color: 'amber', value: 2 },
  { label: 'Good', interval: '10m', color: 'emerald', value: 3 },
  { label: 'Easy', interval: '4d', color: 'cyan', value: 4 },
]

interface FlashcardDemoProps {
  theme?: 'light' | 'dark'
}

export function FlashcardDemo({ theme }: FlashcardDemoProps) {
  const [isDark, setIsDark] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)

  // Detect dark mode if not provided
  useEffect(() => {
    if (theme) {
      setIsDark(theme === 'dark')
    } else {
      const checkDark = () => {
        setIsDark(document.documentElement.classList.contains('dark'))
      }
      checkDark()
      const observer = new MutationObserver(checkDark)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return () => observer.disconnect()
    }
  }, [theme])

  const currentCard = DEMO_CARDS[currentIndex]

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped)
    setShowHint(false)
  }, [isFlipped])

  const handleRate = useCallback((_rating: number) => {
    // Visual feedback - show success then advance
    setIsFlipped(false)
    setShowHint(false)

    // Advance to next card after animation
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % DEMO_CARDS.length)
    }, 300)
  }, [])

  const handleReset = useCallback(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowHint(false)
  }, [])

  return (
    <div
      className={`
        rounded-2xl border-2 overflow-hidden
        ${isDark
          ? 'bg-zinc-900/90 border-zinc-700'
          : 'bg-white border-gray-200'
        }
      `}
    >
      {/* Header */}
      <div
        className={`
          px-4 py-3 flex items-center justify-between border-b
          ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-gray-100 bg-gray-50/50'}
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`
            p-1.5 rounded-lg
            ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}
          `}>
            <Brain className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <span className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
            Try It — Interactive Demo
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {currentIndex + 1} of {DEMO_CARDS.length}
          </span>
          <button
            onClick={handleReset}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Reset demo"
            aria-label="Reset flashcard demo"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Card Area */}
      <div className="p-4">
        {/* Flashcard with flip animation */}
        <div
          className="relative w-full h-[200px] perspective-1000 cursor-pointer"
          onClick={handleFlip}
        >
          <motion.div
            className="w-full h-full relative"
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 25 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front Side */}
            <div
              className={`
                absolute inset-0 rounded-xl p-5 backface-hidden
                flex flex-col
                border-2
                ${isDark
                  ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700'
                  : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
                }
              `}
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Card type badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`
                  px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase
                  ${currentCard.type === 'cloze'
                    ? isDark ? 'bg-cyan-900/50 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
                    : isDark ? 'bg-violet-900/50 text-violet-400' : 'bg-violet-100 text-violet-600'
                  }
                `}>
                  {currentCard.type}
                </span>
                <span className={`
                  px-2 py-0.5 rounded-full text-[10px] font-semibold
                  ${currentCard.difficulty <= 3
                    ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                    : isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'
                  }
                `}>
                  {currentCard.difficulty <= 3 ? 'Easy' : 'Medium'}
                </span>
              </div>

              {/* Question */}
              <p className={`
                flex-1 flex items-center justify-center text-center text-sm font-medium leading-relaxed
                ${isDark ? 'text-zinc-100' : 'text-gray-800'}
              `}>
                {currentCard.front}
              </p>

              {/* Hint button */}
              {currentCard.hint && !showHint && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowHint(true)
                  }}
                  className={`
                    mt-2 text-xs transition-colors
                    ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}
                  `}
                >
                  Show hint
                </button>
              )}
              {showHint && (
                <p className={`mt-2 text-xs italic ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Hint: {currentCard.hint}
                </p>
              )}
            </div>

            {/* Back Side */}
            <div
              className={`
                absolute inset-0 rounded-xl p-5 backface-hidden
                flex flex-col items-center justify-center text-center
                border-2
                ${isDark
                  ? 'bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-700/50'
                  : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
                }
              `}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <Check className={`w-6 h-6 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-100' : 'text-gray-800'}`}>
                {currentCard.back}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Tap to flip hint */}
        <AnimatePresence>
          {!isFlipped && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-center text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}
            >
              Tap the card to reveal the answer
            </motion.p>
          )}
        </AnimatePresence>

        {/* Rating buttons - show when flipped */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <p className={`text-center text-xs mb-3 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                How well did you know this?
              </p>
              <div className="flex gap-2">
                {RATINGS.map((rating) => (
                  <button
                    key={rating.value}
                    onClick={() => handleRate(rating.value)}
                    className={`
                      flex-1 py-2 px-2 rounded-lg text-center transition-all
                      hover:scale-[1.02] active:scale-[0.98]
                      ${rating.color === 'red'
                        ? isDark
                          ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50'
                          : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                        : rating.color === 'amber'
                          ? isDark
                            ? 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-800/50'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200'
                          : rating.color === 'emerald'
                            ? isDark
                              ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200'
                            : isDark
                              ? 'bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-800/50'
                              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200'
                      }
                    `}
                  >
                    <div className="text-xs font-semibold">{rating.label}</div>
                    <div className="text-[10px] opacity-70">{rating.interval}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className={`
          px-4 py-2 border-t flex items-center justify-center gap-1.5
          ${isDark ? 'border-zinc-700 bg-zinc-800/30' : 'border-gray-100 bg-gray-50/30'}
        `}
      >
        <Sparkles className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          Powered by FSRS spaced repetition algorithm
        </span>
      </div>
    </div>
  )
}
