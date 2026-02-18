/**
 * Mobile-Optimized Flashcard View
 * @module components/quarry/ui/learning/MobileFlashcardView
 * 
 * @description
 * A touch-optimized flashcard component for mobile devices featuring:
 * - Swipe gestures (left/right for rating, up/down for flip)
 * - Large touch targets (min 44px)
 * - Full-screen card display
 * - Haptic feedback on interactions
 * - Pull-to-refresh for regeneration
 * 
 * @example
 * ```tsx
 * <MobileFlashcardView
 *   cards={flashcards}
 *   onRate={handleRate}
 *   onFlip={handleFlip}
 * />
 * ```
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion'
import { 
  ChevronLeft, ChevronRight, RotateCcw, Edit, 
  Zap, Clock, Brain, CheckCircle, XCircle, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSwipeGesture } from '@/components/quarry/hooks/useSwipeGesture'
import { FSRSRatingTooltip, FeatureInfoBadge } from './LearningTooltips'

// ============================================================================
// TYPES
// ============================================================================

interface FlashcardData {
  id: string
  front: string
  back: string
  type: 'basic' | 'cloze' | 'reversed'
  tags?: string[]
  hint?: string
  scheduledDays?: number
  confidence?: number
}

interface MobileFlashcardViewProps {
  cards: FlashcardData[]
  currentIndex?: number
  onIndexChange?: (index: number) => void
  onRate?: (cardId: string, rating: 1 | 2 | 3 | 4) => void
  onEdit?: (cardId: string) => void
  onRegenerate?: () => void
  isDark?: boolean
  showProgress?: boolean
  className?: string
}

// ============================================================================
// RATING BUTTON
// ============================================================================

interface RatingButtonProps {
  rating: 1 | 2 | 3 | 4
  label: string
  interval?: string
  onClick: () => void
  isDark?: boolean
}

function RatingButton({ rating, label, interval, onClick, isDark }: RatingButtonProps) {
  const colors = {
    1: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
    2: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
    3: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
    4: 'bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700',
  }

  const ratingNames: Record<number, 'again' | 'hard' | 'good' | 'easy'> = {
    1: 'again',
    2: 'hard',
    3: 'good',
    4: 'easy',
  }

  return (
    <FSRSRatingTooltip rating={ratingNames[rating]} interval={interval}>
      <button
        onClick={onClick}
        className={cn(
          'flex-1 min-h-[56px] rounded-xl font-semibold text-white transition-all',
          'active:scale-95 touch-manipulation',
          colors[rating]
        )}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-base">{label}</span>
          {interval && (
            <span className="text-xs opacity-75">{interval}</span>
          )}
        </div>
      </button>
    </FSRSRatingTooltip>
  )
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface CardDisplayProps {
  card: FlashcardData
  isFlipped: boolean
  onFlip: () => void
  isDark?: boolean
  swipeProgress?: { x: number; y: number }
}

function CardDisplay({ card, isFlipped, onFlip, isDark, swipeProgress }: CardDisplayProps) {
  const controls = useAnimation()

  // Calculate rotation based on swipe
  const rotation = useMemo(() => {
    if (!swipeProgress) return 0
    return swipeProgress.x / 20
  }, [swipeProgress])

  return (
    <motion.div
      className={cn(
        'relative w-full aspect-[3/4] max-h-[60vh] rounded-2xl shadow-xl',
        'cursor-pointer touch-manipulation select-none',
        'flex items-center justify-center p-6',
        isDark ? 'bg-zinc-800' : 'bg-white'
      )}
      style={{ 
        rotateZ: rotation,
        perspective: 1000,
      }}
      onClick={onFlip}
      animate={controls}
      whileTap={{ scale: 0.98 }}
    >
      {/* Flip indicator */}
      <div className={cn(
        'absolute top-4 right-4 p-2 rounded-lg',
        isDark ? 'bg-zinc-700/50' : 'bg-zinc-100/50'
      )}>
        <RotateCcw className={cn(
          'w-4 h-4',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )} />
      </div>

      {/* Card type badge */}
      {card.type !== 'basic' && (
        <div className={cn(
          'absolute top-4 left-4 px-2 py-1 rounded-lg text-xs font-medium',
          isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
        )}>
          {card.type === 'cloze' ? 'Fill-in' : 'Reversed'}
        </div>
      )}

      {/* Card content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isFlipped ? 'back' : 'front'}
          initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: isFlipped ? 90 : -90 }}
          transition={{ duration: 0.3 }}
          className="text-center w-full"
        >
          <p className={cn(
            'text-xl md:text-2xl font-medium leading-relaxed',
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          )}>
            {isFlipped ? card.back : card.front}
          </p>

          {/* Hint (on front only) */}
          {!isFlipped && card.hint && (
            <p className={cn(
              'mt-4 text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              💡 {card.hint}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tags */}
      {card.tags && card.tags.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1 justify-center">
          {card.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={cn(
                'px-2 py-0.5 rounded-full text-xs',
                isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Swipe indicators */}
      {swipeProgress && Math.abs(swipeProgress.x) > 30 && (
        <div className={cn(
          'absolute inset-0 rounded-2xl flex items-center justify-center',
          swipeProgress.x > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
        )}>
          {swipeProgress.x > 0 ? (
            <CheckCircle className="w-16 h-16 text-green-500" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500" />
          )}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MobileFlashcardView({
  cards,
  currentIndex: controlledIndex,
  onIndexChange,
  onRate,
  onEdit,
  onRegenerate,
  isDark = false,
  showProgress = true,
  className,
}: MobileFlashcardViewProps) {
  // State
  const [internalIndex, setInternalIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  
  const currentIndex = controlledIndex ?? internalIndex
  const currentCard = cards[currentIndex]

  // Navigation
  const goToCard = useCallback((index: number) => {
    const bounded = Math.max(0, Math.min(cards.length - 1, index))
    setInternalIndex(bounded)
    onIndexChange?.(bounded)
    setIsFlipped(false)
  }, [cards.length, onIndexChange])

  const nextCard = useCallback(() => goToCard(currentIndex + 1), [currentIndex, goToCard])
  const prevCard = useCallback(() => goToCard(currentIndex - 1), [currentIndex, goToCard])

  // Flip handler
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  // Rating handler
  const handleRate = useCallback((rating: 1 | 2 | 3 | 4) => {
    if (currentCard) {
      onRate?.(currentCard.id, rating)
      // Auto-advance after rating
      if (currentIndex < cards.length - 1) {
        nextCard()
      }
    }
  }, [currentCard, onRate, currentIndex, cards.length, nextCard])

  // Swipe gesture
  const { ref: swipeRef, swipeState } = useSwipeGesture({
    onSwipeLeft: () => handleRate(1), // Again
    onSwipeRight: () => handleRate(3), // Good
    onSwipeUp: () => handleRate(4), // Easy
    onSwipeDown: () => handleFlip(),
    threshold: 80,
  })

  // Empty state
  if (cards.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6',
        className
      )}>
        <Brain className={cn(
          'w-16 h-16',
          isDark ? 'text-zinc-600' : 'text-zinc-300'
        )} />
        <p className={cn(
          'text-lg font-medium',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          No flashcards to review
        </p>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className={cn(
              'px-4 py-2 rounded-xl font-medium',
              'bg-cyan-500 text-white hover:bg-cyan-600'
            )}
          >
            Generate Flashcards
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Progress bar */}
      {showProgress && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              'text-sm font-medium',
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            )}>
              {currentIndex + 1} / {cards.length}
            </span>
            <div className={cn(
              'flex-1 h-1.5 rounded-full overflow-hidden',
              isDark ? 'bg-zinc-700' : 'bg-zinc-200'
            )}>
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(currentCard.id)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-zinc-700 text-zinc-400' 
                    : 'hover:bg-zinc-100 text-zinc-500'
                )}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Card area with swipe */}
      <div 
        ref={swipeRef as React.RefObject<HTMLDivElement>}
        className="flex-1 flex items-center justify-center px-4 py-6"
      >
        {currentCard && (
          <CardDisplay
            card={currentCard}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            isDark={isDark}
            swipeProgress={swipeState.swiping ? swipeState.distance : undefined}
          />
        )}
      </div>

      {/* Swipe hints */}
      <div className={cn(
        'flex justify-center gap-4 px-4 py-2 text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        <span>← Swipe left: Again</span>
        <span>Swipe right: Good →</span>
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-6"
        >
          <div className="flex gap-2">
            <RatingButton
              rating={1}
              label="Again"
              interval={currentCard?.scheduledDays ? '< 10m' : undefined}
              onClick={() => handleRate(1)}
              isDark={isDark}
            />
            <RatingButton
              rating={2}
              label="Hard"
              interval={currentCard?.scheduledDays ? '1d' : undefined}
              onClick={() => handleRate(2)}
              isDark={isDark}
            />
            <RatingButton
              rating={3}
              label="Good"
              interval={currentCard?.scheduledDays ? `${currentCard.scheduledDays}d` : undefined}
              onClick={() => handleRate(3)}
              isDark={isDark}
            />
            <RatingButton
              rating={4}
              label="Easy"
              interval={currentCard?.scheduledDays ? `${currentCard.scheduledDays * 2}d` : undefined}
              onClick={() => handleRate(4)}
              isDark={isDark}
            />
          </div>
        </motion.div>
      )}

      {/* Flip button when not flipped */}
      {!isFlipped && (
        <div className="px-4 pb-6">
          <button
            onClick={handleFlip}
            className={cn(
              'w-full min-h-[56px] rounded-xl font-semibold transition-all',
              'active:scale-98 touch-manipulation',
              isDark 
                ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            )}
          >
            Show Answer
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className={cn(
        'flex items-center justify-between px-4 pb-4 border-t',
        isDark ? 'border-zinc-700' : 'border-zinc-200'
      )}>
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          className={cn(
            'p-3 rounded-xl transition-colors',
            currentIndex === 0
              ? 'opacity-50 cursor-not-allowed'
              : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex gap-1">
          {cards.slice(
            Math.max(0, currentIndex - 2),
            Math.min(cards.length, currentIndex + 3)
          ).map((_, i) => {
            const actualIndex = Math.max(0, currentIndex - 2) + i
            return (
              <button
                key={actualIndex}
                onClick={() => goToCard(actualIndex)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  actualIndex === currentIndex
                    ? 'bg-cyan-500 w-6'
                    : isDark ? 'bg-zinc-600' : 'bg-zinc-300'
                )}
              />
            )
          })}
        </div>

        <button
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
          className={cn(
            'p-3 rounded-xl transition-colors',
            currentIndex === cards.length - 1
              ? 'opacity-50 cursor-not-allowed'
              : isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

export default MobileFlashcardView

