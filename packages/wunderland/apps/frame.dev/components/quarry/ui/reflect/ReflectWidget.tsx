/**
 * Reflect Widget
 * @module codex/ui/ReflectWidget
 *
 * @description
 * Sidebar widget for quick access to reflections.
 * Shows today's reflection with mood check-in and quick capture.
 * Replaces and extends DailyNoteWidget functionality.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
  Clock,
  ArrowRight,
  BookHeart,
  Flame,
} from 'lucide-react'
import {
  getTodayKey,
  getRelativeDateKey,
  formatDateDisplay,
  parseDateKey,
  getOrCreateReflection,
  getRecentReflections,
  getReflectionStreak,
  type Reflection,
  type ReflectionStreak,
  getReflectionTimeOfDay,
  MOOD_EMOJIS,
} from '@/lib/reflect'
import { getTodayCheckIn, type DailyCheckIn } from '@/lib/codex/dailyCheckIn'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface ReflectWidgetProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Navigate to reflection callback */
  onNavigate?: (path: string, isNew: boolean, template?: { content: string; frontmatter: Record<string, unknown> }) => void
  /** Compact mode for narrow sidebars */
  compact?: boolean
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

function getGreeting(): string {
  const timeOfDay = getReflectionTimeOfDay()
  switch (timeOfDay) {
    case 'morning': return 'Good morning'
    case 'afternoon': return 'Good afternoon'
    case 'evening': return 'Good evening'
    case 'night': return 'Good night'
  }
}

function TimeIcon() {
  const timeOfDay = getReflectionTimeOfDay()
  switch (timeOfDay) {
    case 'morning':
    case 'afternoon':
      return <Sun className="w-4 h-4 text-amber-400" />
    case 'evening':
    case 'night':
      return <Moon className="w-4 h-4 text-indigo-400" />
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function ReflectWidget({
  theme = 'dark',
  onNavigate,
  compact = false,
  className,
}: ReflectWidgetProps) {
  const [currentDateKey, setCurrentDateKey] = useState(getTodayKey())
  const [recentReflections, setRecentReflections] = useState<Reflection[]>([])
  const [streak, setStreak] = useState<ReflectionStreak | null>(null)
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRecent, setShowRecent] = useState(false)

  const isDark = theme === 'dark'
  const isToday = currentDateKey === getTodayKey()
  const currentDate = parseDateKey(currentDateKey)

  // Load recent reflections and streak
  useEffect(() => {
    async function loadData() {
      const [reflections, streakData] = await Promise.all([
        getRecentReflections(5),
        getReflectionStreak(),
      ])
      setRecentReflections(reflections)
      setStreak(streakData)
      setTodayCheckIn(getTodayCheckIn())
    }
    loadData()
  }, [])

  // Navigate to previous day
  const goToPrevious = useCallback(() => {
    const date = parseDateKey(currentDateKey)
    date.setDate(date.getDate() - 1)
    setCurrentDateKey(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    )
  }, [currentDateKey])

  // Navigate to next day
  const goToNext = useCallback(() => {
    const date = parseDateKey(currentDateKey)
    date.setDate(date.getDate() + 1)
    setCurrentDateKey(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    )
  }, [currentDateKey])

  // Go to today
  const goToToday = useCallback(() => {
    setCurrentDateKey(getTodayKey())
  }, [])

  // Open reflection
  const openReflection = useCallback(async (dateKey: string) => {
    if (!onNavigate) return

    setLoading(true)
    try {
      const result = await getOrCreateReflection(dateKey, {
        timeOfDay: getReflectionTimeOfDay(),
        mood: todayCheckIn?.mood,
        includePlanner: true,
        includeGratitude: true,
      })
      onNavigate(
        result.reflection.strandPath,
        result.isNew,
        result.template ? {
          content: result.template.content,
          frontmatter: result.template.frontmatter,
        } : undefined
      )
    } catch (error) {
      console.error('Failed to open reflection:', error)
    } finally {
      setLoading(false)
    }
  }, [onNavigate, todayCheckIn])

  // Compact mode - just a button
  if (compact) {
    return (
      <motion.button
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2 rounded-lg',
          'transition-colors',
          isDark
            ? 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-200'
            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800',
          className
        )}
        onClick={() => openReflection(getTodayKey())}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        disabled={loading}
      >
        <BookHeart className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium">Reflect</span>
        {streak && streak.current > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400 ml-auto">
            <Flame className="w-3 h-3" />
            {streak.current}
          </span>
        )}
        {loading && (
          <motion.div
            className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full ml-auto"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'px-4 py-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TimeIcon />
            <span className={cn(
              'text-sm',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              {getGreeting()}
            </span>
          </div>
          {streak && streak.current > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Flame className="w-3 h-3" />
              <span>{streak.current} day{streak.current > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevious}
            className={cn(
              'p-1 rounded-md transition-colors',
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <BookHeart className="w-4 h-4 text-purple-400" />
            <span className={cn(
              'text-sm font-medium',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              {isToday ? 'Today' : formatDateDisplay(currentDate)}
            </span>
            {todayCheckIn?.mood && isToday && (
              <span className="text-sm">
                {MOOD_EMOJIS[todayCheckIn.mood]}
              </span>
            )}
          </div>
          <button
            onClick={goToNext}
            className={cn(
              'p-1 rounded-md transition-colors',
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main action */}
      <div className="p-4">
        <motion.button
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
            'font-medium transition-colors',
            isDark
              ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200'
          )}
          onClick={() => openReflection(currentDateKey)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={loading}
        >
          {loading ? (
            <motion.div
              className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{isToday ? "Today's Reflection" : 'Open Reflection'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* Quick actions */}
        {isToday && (
          <div className="flex gap-2 mt-3">
            <button
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs',
                'transition-colors',
                isDark
                  ? 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              )}
              onClick={() => openReflection(getRelativeDateKey(-1))}
            >
              <ChevronLeft className="w-3 h-3" />
              Yesterday
            </button>
            <button
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs',
                'transition-colors',
                isDark
                  ? 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-400'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
              )}
              onClick={() => openReflection(getRelativeDateKey(1))}
            >
              Tomorrow
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Recent reflections */}
      {recentReflections.length > 0 && (
        <div className={cn(
          'border-t',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            className={cn(
              'w-full flex items-center justify-between px-4 py-2 text-xs',
              'transition-colors',
              isDark
                ? 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/50'
                : 'text-zinc-500 hover:text-zinc-600 hover:bg-zinc-50'
            )}
            onClick={() => setShowRecent(!showRecent)}
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Recent Reflections
            </span>
            <motion.div
              animate={{ rotate: showRecent ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showRecent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={cn(
                  'px-4 pb-3 space-y-1',
                  isDark ? 'bg-zinc-900/30' : 'bg-zinc-50/50'
                )}>
                  {recentReflections.map((reflection) => (
                    <button
                      key={reflection.date}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
                        'transition-colors text-left',
                        isDark
                          ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                          : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                      )}
                      onClick={() => openReflection(reflection.date)}
                    >
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{reflection.title}</span>
                      {reflection.metadata?.mood && (
                        <span className="ml-auto">
                          {MOOD_EMOJIS[reflection.metadata.mood]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {!isToday && (
        <div className={cn(
          'px-4 py-2 border-t text-center',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            className={cn(
              'text-xs',
              isDark ? 'text-zinc-600 hover:text-purple-400' : 'text-zinc-400 hover:text-purple-600'
            )}
            onClick={goToToday}
          >
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">/today</kbd> to jump back
          </button>
        </div>
      )}
    </div>
  )
}

export default ReflectWidget
