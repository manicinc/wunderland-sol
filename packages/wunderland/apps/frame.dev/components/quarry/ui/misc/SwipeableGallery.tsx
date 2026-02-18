/**
 * SwipeableGallery - Touch-friendly image gallery
 * @module codex/ui/SwipeableGallery
 *
 * Mobile-optimized gallery with swipe gestures, dot indicators,
 * and smooth animations. Perfect for viewing AI-generated illustrations.
 *
 * NOTE: framer-motion removed to fix React #311 hydration errors
 */

'use client'

// Force runtime require to prevent webpack from optimizing hooks through framer-motion
import React, { useState as useStateType, useCallback as useCallbackType, useRef as useRefType, useEffect as useEffectType } from 'react'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactRuntime = typeof window !== 'undefined' ? require('react') : React
const useState = ReactRuntime.useState as typeof useStateType
const useCallback = ReactRuntime.useCallback as typeof useCallbackType
const useRef = ReactRuntime.useRef as typeof useRefType
const useEffect = ReactRuntime.useEffect as typeof useEffectType
import { ChevronLeft, ChevronRight, ZoomIn, Wand2, X } from 'lucide-react'
import type { StrandIllustration } from '../../types'

interface SwipeableGalleryProps {
  /** Array of illustrations to display */
  illustrations: StrandIllustration[]
  /** Currently selected index */
  initialIndex?: number
  /** Callback when image is tapped for lightbox */
  onImageTap?: (illustration: StrandIllustration, index: number) => void
  /** Callback when index changes */
  onIndexChange?: (index: number) => void
  /** Whether to show navigation arrows (for non-touch) */
  showArrows?: boolean
  /** Whether to show dot indicators */
  showDots?: boolean
  /** Auto-advance interval in ms (0 = disabled) */
  autoAdvance?: number
  /** Height of the gallery container */
  height?: string
  /** Theme for styling */
  theme?: string
  /** Show close button */
  showClose?: boolean
  /** Close callback */
  onClose?: () => void
}

const SWIPE_THRESHOLD = 50 // Minimum swipe distance to trigger navigation

export default function SwipeableGallery({
  illustrations,
  initialIndex = 0,
  onImageTap,
  onIndexChange,
  showArrows = true,
  showDots = true,
  autoAdvance = 0,
  height = '200px',
  theme = 'light',
  showClose = false,
  onClose,
}: SwipeableGalleryProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoAdvanceRef = useRef<NodeJS.Timeout>()
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  // Ensure mounted before rendering
  useEffect(() => {
    setMounted(true)
    // Hide swipe hint after 2 seconds
    const timer = setTimeout(() => setShowSwipeHint(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const isSepia = theme?.includes('sepia')
  const isTerminal = theme?.includes('terminal')

  // Safe array access
  const safeIllustrations = illustrations ?? []
  const illustrationsLength = safeIllustrations.length

  // Navigate to specific index
  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= illustrationsLength || isAnimating) return
      setIsAnimating(true)
      setCurrentIndex(index)
      onIndexChange?.(index)
      setTimeout(() => setIsAnimating(false), 300)
    },
    [illustrationsLength, onIndexChange, isAnimating]
  )

  // Navigate next/prev
  const goNext = useCallback(() => {
    if (currentIndex < illustrationsLength - 1) {
      goToIndex(currentIndex + 1)
    }
  }, [currentIndex, illustrationsLength, goToIndex])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1)
    }
  }, [currentIndex, goToIndex])

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaX.current) > SWIPE_THRESHOLD) {
      if (touchDeltaX.current > 0 && currentIndex > 0) {
        goPrev()
      } else if (touchDeltaX.current < 0 && currentIndex < illustrationsLength - 1) {
        goNext()
      }
    }
    touchDeltaX.current = 0
  }, [currentIndex, illustrationsLength, goNext, goPrev])

  // Auto-advance functionality
  useEffect(() => {
    if (autoAdvance > 0 && illustrationsLength > 0) {
      autoAdvanceRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % illustrationsLength)
      }, autoAdvance)

      return () => {
        if (autoAdvanceRef.current) {
          clearInterval(autoAdvanceRef.current)
        }
      }
    }
  }, [autoAdvance, illustrationsLength])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  // Reset to initial index when illustrations change
  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, illustrations])

  if (illustrationsLength === 0) {
    return null
  }

  const currentIllustration = safeIllustrations[currentIndex]

  // Theme-aware frame styling
  const frameClasses = isSepia
    ? 'border-2 border-amber-300/50 shadow-[inset_0_0_15px_rgba(0,0,0,0.1)]'
    : isTerminal
      ? 'border border-current shadow-[0_0_10px_currentColor]'
      : 'border border-zinc-200 dark:border-zinc-700'

  // Don't render until mounted to prevent hydration mismatches
  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900"
        style={{ height }}
      >
        <div className="animate-pulse text-zinc-400">Loading gallery...</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`
        relative overflow-hidden rounded-xl
        ${frameClasses}
        bg-zinc-100 dark:bg-zinc-900
        touch-pan-y
      `}
      style={{ height }}
    >
      {/* Close button */}
      {showClose && onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full
            bg-black/50 hover:bg-black/70 text-white
            transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Main image area with touch swipe */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onImageTap?.(currentIllustration, currentIndex)}
      >
        <div
          className="w-full h-full transition-opacity duration-300"
          style={{ opacity: isAnimating ? 0.7 : 1 }}
        >
          <img
            src={currentIllustration.src}
            alt={currentIllustration.alt || `Illustration ${currentIndex + 1}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>

        {/* AI-generated badge */}
        {currentIllustration.aiGenerated && (
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded-full
            bg-gradient-to-r from-violet-500/90 to-pink-500/90
            text-[10px] font-bold text-white shadow-lg
            flex items-center gap-1"
          >
            <Wand2 className="w-3 h-3" />
            AI Generated
          </div>
        )}

        {/* Zoom indicator */}
        <div
          className="absolute bottom-2 right-2 p-1.5 rounded-full
          bg-black/50 text-white/80"
        >
          <ZoomIn className="w-4 h-4" />
        </div>
      </div>

      {/* Caption overlay */}
      {currentIllustration.caption && (
        <div
          className={`
          absolute bottom-0 left-0 right-0 p-3
          bg-gradient-to-t from-black/70 to-transparent
          text-white text-sm
          ${isSepia ? 'font-serif italic' : ''}
          ${isTerminal ? 'font-mono text-xs uppercase tracking-wider' : ''}
        `}
        >
          {currentIllustration.caption}
        </div>
      )}

      {/* Navigation arrows (visible on hover for non-touch devices) */}
      {showArrows && illustrations.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            disabled={currentIndex === 0}
            className={`
              absolute left-2 top-1/2 -translate-y-1/2 z-10
              p-2 rounded-full
              bg-black/50 hover:bg-black/70
              text-white
              transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed
              opacity-0 hover:opacity-100 focus:opacity-100
              group-hover:opacity-70
              md:block hidden
            `}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            disabled={currentIndex === illustrations.length - 1}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 z-10
              p-2 rounded-full
              bg-black/50 hover:bg-black/70
              text-white
              transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed
              opacity-0 hover:opacity-100 focus:opacity-100
              group-hover:opacity-70
              md:block hidden
            `}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && illustrations.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {illustrations.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                goToIndex(index)
              }}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${
                  index === currentIndex
                    ? isTerminal
                      ? 'bg-current w-4 shadow-[0_0_6px_currentColor]'
                      : isSepia
                        ? 'bg-amber-600 w-4'
                        : 'bg-cyan-500 w-4'
                    : 'bg-white/50 hover:bg-white/80'
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      <div
        className="absolute top-2 right-2 z-10
        px-2 py-1 rounded-full
        bg-black/50 text-white text-xs font-medium"
      >
        {currentIndex + 1} / {illustrations.length}
      </div>

      {/* Swipe hint (shows briefly on first view) */}
      {showSwipeHint && (
        <div
          className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none animate-in fade-in duration-300"
        >
          <div className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs flex items-center gap-2">
            <ChevronLeft className="w-3 h-3" />
            Swipe to navigate
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      )}
    </div>
  )
}
