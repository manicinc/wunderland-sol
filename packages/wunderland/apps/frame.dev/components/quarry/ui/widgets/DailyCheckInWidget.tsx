/**
 * Daily Check-In Widget
 * @module codex/ui/DailyCheckInWidget
 *
 * Sidebar widget for daily mood and sleep check-in.
 * Resets daily at midnight.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sparkles, Check, ChevronDown, TrendingUp } from 'lucide-react'
import {
  type MoodState,
  type SleepHours,
  MOOD_CONFIG,
  SLEEP_CONFIG,
} from '@/lib/codex/mood'
import {
  getTodayCheckIn,
  setDailyMood,
  setDailySleep,
  getCheckInStreak,
  type DailyCheckIn,
} from '@/lib/codex/dailyCheckIn'
import { cn } from '@/lib/utils'

export interface DailyCheckInWidgetProps {
  /** Theme */
  theme?: 'light' | 'dark'
  /** Compact mode */
  compact?: boolean
  /** Additional class names */
  className?: string
  /** Callback when check-in is complete */
  onComplete?: (checkIn: DailyCheckIn) => void
}

const MOOD_OPTIONS: MoodState[] = [
  'focused',
  'creative',
  'curious',
  'relaxed',
  'energetic',
  'reflective',
]

const SLEEP_OPTIONS: SleepHours[] = ['<4', '4-5', '5-6', '6-7', '7-8', '>8']

export function DailyCheckInWidget({
  theme = 'dark',
  compact = false,
  className,
  onComplete,
}: DailyCheckInWidgetProps) {
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null)
  const [streak, setStreak] = useState(0)
  const [showSleep, setShowSleep] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isDark = theme === 'dark'

  // Load current check-in
  useEffect(() => {
    const current = getTodayCheckIn()
    setCheckIn(current)
    setStreak(getCheckInStreak())

    // If mood is set but not sleep, show sleep selector
    if (current?.mood && !current?.sleepHours) {
      setShowSleep(true)
    }
  }, [])

  // Handle mood selection
  const handleMoodSelect = useCallback(
    (mood: MoodState) => {
      const updated = setDailyMood(mood)
      setCheckIn(updated)
      setShowSleep(true)

      // Update streak
      setStreak(getCheckInStreak())
    },
    []
  )

  // Handle sleep selection
  const handleSleepSelect = useCallback(
    (sleep: SleepHours) => {
      const updated = setDailySleep(sleep)
      setCheckIn(updated)

      if (updated.mood && updated.sleepHours) {
        onComplete?.(updated)
      }
    },
    [onComplete]
  )

  const isComplete = checkIn?.mood && checkIn?.sleepHours

  // Compact mode - just show status
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
        onClick={() => setIsCollapsed(!isCollapsed)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {checkIn?.mood ? (
          <span className="w-4 h-4 flex items-center justify-center text-base leading-none">{MOOD_CONFIG[checkIn.mood].emoji}</span>
        ) : (
          <Sparkles className="w-4 h-4 text-purple-400" />
        )}
        <span className="text-sm font-medium">
          {isComplete ? 'Checked in' : 'Daily Check-in'}
        </span>
        {isComplete && <Check className="w-4 h-4 text-green-400 ml-auto" />}
      </motion.button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200',
        className
      )}
    >
      {/* Header */}
      <button
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          'transition-colors',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className={cn(
              'w-4 h-4',
              isComplete ? 'text-green-400' : 'text-purple-400'
            )}
          />
          <span
            className={cn(
              'text-sm font-medium',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}
          >
            Daily Check-in
          </span>
          {isComplete && (
            <Check className="w-4 h-4 text-green-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {streak > 1 && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                isDark
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-amber-50 text-amber-600'
              )}
            >
              <TrendingUp className="w-3 h-3" />
              {streak} day streak
            </span>
          )}
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'px-4 pb-4 space-y-4',
                isDark ? 'border-t border-zinc-800' : 'border-t border-zinc-200'
              )}
            >
              {/* Mood Selection */}
              <div className="pt-4">
                <label
                  className={cn(
                    'block text-xs font-medium mb-2',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}
                >
                  How are you feeling today?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MOOD_OPTIONS.map((mood) => {
                    const config = MOOD_CONFIG[mood]
                    const isSelected = checkIn?.mood === mood

                    return (
                      <motion.button
                        key={mood}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-lg',
                          'transition-colors text-center',
                          isSelected
                            ? isDark
                              ? 'bg-purple-500/20 border border-purple-500/50'
                              : 'bg-purple-50 border border-purple-300'
                            : isDark
                              ? 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent'
                              : 'bg-zinc-100 hover:bg-zinc-200 border border-transparent'
                        )}
                        onClick={() => handleMoodSelect(mood)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-xl">{config.emoji}</span>
                        <span
                          className={cn(
                            'text-[10px]',
                            isSelected
                              ? isDark
                                ? 'text-purple-300'
                                : 'text-purple-700'
                              : isDark
                                ? 'text-zinc-400'
                                : 'text-zinc-600'
                          )}
                        >
                          {config.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Sleep Selection */}
              <AnimatePresence>
                {(showSleep || checkIn?.sleepHours) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-medium mb-2',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )}
                    >
                      <Moon className="w-3 h-3" />
                      How many hours did you sleep?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SLEEP_OPTIONS.map((sleep) => {
                        const config = SLEEP_CONFIG[sleep]
                        const isSelected = checkIn?.sleepHours === sleep

                        return (
                          <motion.button
                            key={sleep}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-lg',
                              'transition-colors text-center',
                              isSelected
                                ? isDark
                                  ? 'bg-blue-500/20 border border-blue-500/50'
                                  : 'bg-blue-50 border border-blue-300'
                                : isDark
                                  ? 'bg-zinc-800/50 hover:bg-zinc-700/50 border border-transparent'
                                  : 'bg-zinc-100 hover:bg-zinc-200 border border-transparent'
                            )}
                            onClick={() => handleSleepSelect(sleep)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <span className="text-lg">{config.emoji}</span>
                            <span
                              className={cn(
                                'text-[10px]',
                                isSelected
                                  ? isDark
                                    ? 'text-blue-300'
                                    : 'text-blue-700'
                                  : isDark
                                    ? 'text-zinc-400'
                                    : 'text-zinc-600'
                              )}
                            >
                              {sleep === '<4'
                                ? '<4h'
                                : sleep === '>8'
                                  ? '8+h'
                                  : `${sleep}h`}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completion message */}
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg text-sm',
                    isDark
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-green-50 text-green-700'
                  )}
                >
                  <Check className="w-4 h-4" />
                  <span>You're all checked in for today!</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DailyCheckInWidget
