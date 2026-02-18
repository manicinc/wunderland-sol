/**
 * MoodSelector - Grid-based mood selector with animated character faces
 * @module components/quarry/ui/MoodSelector
 *
 * A visually stunning mood selector featuring 11 animated SVG characters.
 * Each mood is represented by an expressive character face with labels.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { MoodCharacter } from './MoodCharacters'
import type { MoodState } from '@/lib/codex/mood'
import { MOOD_CONFIG, getCurrentMood, setCurrentMood, clearCurrentMood } from '@/lib/codex/mood'
import { MOOD_DISPLAY_CONFIG } from '@/lib/reflect/types'

interface MoodSelectorProps {
  /** Currently selected mood (controlled mode) */
  selected?: MoodState | null
  /** Callback when mood is selected */
  onSelect?: (mood: MoodState | null) => void
  /** Called when mood is selected (legacy prop name) */
  onMoodChange?: (mood: MoodState | null) => void
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Show labels below characters */
  showLabels?: boolean
  /** Optional className */
  className?: string
  /** Current theme (for backwards compatibility) */
  theme?: string
}

/**
 * MoodCard - Individual mood selection card with animated character
 */
interface MoodCardProps {
  mood: typeof MOOD_DISPLAY_CONFIG[number]
  selected: boolean
  hovered: boolean
  onSelect: () => void
  onHover: (hovering: boolean) => void
  compact?: boolean
  showLabel?: boolean
}

function MoodCard({
  mood,
  selected,
  hovered,
  onSelect,
  onHover,
  compact = false,
  showLabel = true
}: MoodCardProps) {
  const size = compact ? 32 : 56

  return (
    <motion.button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`
        group relative flex flex-col items-center rounded-md
        transition-colors duration-200 touch-manipulation flex-shrink-0
        ${compact ? 'p-0' : 'p-2 gap-1'}
        ${selected
          ? compact
            ? 'ring-2 ring-amber-400 dark:ring-amber-500'
            : 'bg-zinc-100 dark:bg-zinc-800 ring-2 ring-offset-1 ring-zinc-300 dark:ring-zinc-600'
          : compact
            ? ''
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        }
      `}
      whileHover={compact ? { scale: 1.1 } : { scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      initial={false}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Character face */}
      <div className="relative">
        <MoodCharacter
          mood={mood.id}
          size={size}
          animated={selected || hovered}
          selected={selected}
        />

        {/* Check badge when selected */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-0.5 -right-0.5 rounded-full flex items-center justify-center shadow-sm ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
            style={{ backgroundColor: mood.color }}
          >
            <Check className={`text-white ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} strokeWidth={3} />
          </motion.div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className={`
            text-[10px] font-medium transition-colors leading-tight
            ${selected
              ? 'text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
            }
          `}
        >
          {mood.label}
        </span>
      )}
    </motion.button>
  )
}

/**
 * MoodSelector - Main component with grid of mood options
 */
export default function MoodSelector({
  selected: controlledSelected,
  onSelect,
  onMoodChange,
  compact = false,
  showLabels = true,
  className = ''
}: MoodSelectorProps) {
  // Support both controlled and uncontrolled modes
  const [internalMood, setInternalMood] = useState<MoodState | null>(null)
  const [hoveredMood, setHoveredMood] = useState<MoodState | null>(null)

  // Load current mood on mount (uncontrolled mode)
  useEffect(() => {
    if (controlledSelected === undefined) {
      const mood = getCurrentMood()
      setInternalMood(mood)
    }
  }, [controlledSelected])

  const currentMood = controlledSelected !== undefined ? controlledSelected : internalMood
  const handleChange = onSelect || onMoodChange

  const handleMoodSelect = (mood: MoodState) => {
    if (currentMood === mood) {
      // Deselect
      if (controlledSelected === undefined) {
        clearCurrentMood()
        setInternalMood(null)
      }
      handleChange?.(null)
    } else {
      // Select new mood
      if (controlledSelected === undefined) {
        setCurrentMood(mood)
        setInternalMood(mood)
      }
      handleChange?.(mood)
    }
  }

  const handleClear = () => {
    if (controlledSelected === undefined) {
      clearCurrentMood()
      setInternalMood(null)
    }
    handleChange?.(null)
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between min-h-[20px] mb-2">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            How are you feeling?
          </span>
          {/* Inline mood description on hover */}
          <AnimatePresence mode="wait">
            {hoveredMood && (
              <motion.span
                key={hoveredMood}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate"
              >
                {MOOD_DISPLAY_CONFIG.find(m => m.id === hoveredMood)?.description}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {currentMood && (
          <button
            onClick={handleClear}
            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mood grid - flexbox when compact for guaranteed single row */}
      <div
        className={
          compact
            ? 'flex justify-between items-center w-full'
            : 'grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1'
        }
      >
        {MOOD_DISPLAY_CONFIG.map((mood) => (
          <MoodCard
            key={mood.id}
            mood={mood}
            selected={currentMood === mood.id}
            hovered={hoveredMood === mood.id}
            onSelect={() => handleMoodSelect(mood.id)}
            onHover={(hovering) => setHoveredMood(hovering ? mood.id : null)}
            compact={compact}
            showLabel={showLabels}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * MoodSelectorCompact - Compact horizontal scrolling version
 */
export function MoodSelectorCompact({
  selected,
  onSelect,
  onMoodChange,
  className = ''
}: Omit<MoodSelectorProps, 'compact' | 'showLabels'>) {
  const handleChange = onSelect || onMoodChange

  return (
    <div className={`w-full overflow-x-auto hide-scrollbar ${className}`}>
      <div className="flex gap-1.5 pb-1 min-w-max">
        {MOOD_DISPLAY_CONFIG.map((mood) => (
          <motion.button
            key={mood.id}
            onClick={() => handleChange?.(mood.id)}
            className={`
              flex flex-col items-center gap-0.5 p-1.5 rounded-lg
              transition-colors duration-200
              ${selected === mood.id
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MoodCharacter
              mood={mood.id}
              size={32}
              animated={selected === mood.id}
              selected={selected === mood.id}
            />
            <span
              className={`
                text-[9px] font-medium
                ${selected === mood.id
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400'
                }
              `}
            >
              {mood.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

/**
 * MoodBadge - Small badge showing selected mood
 */
export function MoodBadge({
  mood,
  onClick,
  size = 24
}: {
  mood?: MoodState | null
  onClick?: () => void
  size?: number
}) {
  if (!mood) return null

  const config = MOOD_DISPLAY_CONFIG.find(m => m.id === mood)
  if (!config) return null

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <MoodCharacter mood={mood} size={size} animated={false} selected={false} />
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {config.label}
      </span>
    </motion.button>
  )
}

/**
 * MoodIndicator - Minimal indicator for lists/cards
 */
export function MoodIndicator({
  mood,
  size = 20,
  showTooltip = true
}: {
  mood?: MoodState | null
  size?: number
  showTooltip?: boolean
}) {
  if (!mood) return null

  const config = MOOD_DISPLAY_CONFIG.find(m => m.id === mood)
  if (!config) return null

  return (
    <div className="relative group">
      <MoodCharacter mood={mood} size={size} animated={false} selected={false} />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {config.label}
        </div>
      )}
    </div>
  )
}

/**
 * SidebarMoodSelector - Hover-reveal mood selector for sidebar
 * Shows "How are you feeling?" header, reveals mood grid on hover
 */
export function SidebarMoodSelector({
  selected,
  onSelect,
  className = ''
}: {
  selected?: MoodState | null
  onSelect?: (mood: MoodState | null) => void
  className?: string
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredMood, setHoveredMood] = useState<MoodState | null>(null)
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMoodSelect = (mood: MoodState) => {
    if (selected === mood) {
      onSelect?.(null)
    } else {
      onSelect?.(mood)
    }
  }

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    // Small delay to prevent flicker when moving between header and grid
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      setHoveredMood(null)
    }, 100)
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  const selectedConfig = selected ? MOOD_DISPLAY_CONFIG.find(m => m.id === selected) : null

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header - always visible, hoverable trigger */}
      <div className="flex items-start justify-between gap-2 cursor-pointer select-none group">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors">
            How are you
          </span>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
            feeling?
          </span>
        </div>

        {/* Right side: Selected mood or hover description */}
        <div className="flex items-center gap-2 min-h-[32px]">
          <AnimatePresence mode="wait">
            {hoveredMood ? (
              <motion.span
                key={`hover-${hoveredMood}`}
                initial={{ opacity: 0, x: 5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-[10px] text-zinc-400 dark:text-zinc-500 text-right"
              >
                {MOOD_DISPLAY_CONFIG.find(m => m.id === hoveredMood)?.description}
              </motion.span>
            ) : selected && selectedConfig && !isHovered ? (
              <motion.div
                key={`selected-${selected}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <MoodCharacter mood={selected} size={24} animated={false} selected={false} />
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium" style={{ color: selectedConfig.color }}>
                    {selectedConfig.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect?.(null)
                    }}
                    className="text-[9px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    clear
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Mood grid - slides in on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, height: 0, paddingTop: 0 }}
            animate={{ opacity: 1, height: 'auto', paddingTop: 8 }}
            exit={{ opacity: 0, height: 0, paddingTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-1">
              {MOOD_DISPLAY_CONFIG.map((mood) => (
                <motion.button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  onMouseEnter={() => setHoveredMood(mood.id)}
                  onMouseLeave={() => setHoveredMood(null)}
                  className={`
                    group relative flex flex-col items-center gap-0.5 p-1.5 rounded-lg
                    transition-colors duration-200
                    ${selected === mood.id
                      ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: MOOD_DISPLAY_CONFIG.indexOf(mood) * 0.02 }}
                >
                  <MoodCharacter
                    mood={mood.id}
                    size={28}
                    animated={selected === mood.id || hoveredMood === mood.id}
                    selected={selected === mood.id}
                  />
                  <span
                    className={`
                      text-[8px] font-medium transition-colors leading-tight
                      ${selected === mood.id
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 dark:text-zinc-400'
                      }
                    `}
                  >
                    {mood.label}
                  </span>
                  {selected === mood.id && (
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="w-2 h-2 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Legacy MoodIcons export for backwards compatibility
 * These are simple SVG icons, not the animated characters
 */
export const MoodIcons: Record<MoodState, React.FC<{ className?: string }>> = {
  focused: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  creative: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  curious: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 8v1" />
      <path d="M11 14h.01" />
    </svg>
  ),
  relaxed: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  energetic: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  reflective: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M19 3v4" />
      <path d="M21 5h-4" />
    </svg>
  ),
  anxious: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 15s1.5-2 4-2 4 2 4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  grateful: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  tired: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  peaceful: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  ),
  excited: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9l1-1-1-1" />
      <path d="M14 9l1-1-1-1" />
    </svg>
  ),
  neutral: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  ),
}
