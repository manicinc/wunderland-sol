/**
 * HabitCard Component
 *
 * Displays a single habit with streak visualization
 * and completion toggle.
 *
 * @module components/quarry/ui/HabitCard
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Check,
  MoreVertical,
  Trash2,
  Snowflake,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Repeat,
} from 'lucide-react'
import type { HabitWithStreak, HabitFrequency, StreakStatus } from '@/lib/planner/habits/types'
import { getStreakStatus } from '@/lib/planner/habits/habitStreakManager'

// ============================================================================
// TYPES
// ============================================================================

interface HabitCardProps {
  habit: HabitWithStreak
  isCompletedToday: boolean
  onComplete: () => void
  onUncomplete: () => void
  onDelete?: () => void
  onUseFreeze?: () => void
  compact?: boolean
  showDetails?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  weekdays: 'Weekdays',
  custom: 'Custom',
}

const FREQUENCY_COLORS: Record<HabitFrequency, string> = {
  daily: 'text-green-500',
  weekly: 'text-purple-500',
  weekdays: 'text-blue-500',
  custom: 'text-gray-500',
}

// ============================================================================
// STREAK FIRE COMPONENT
// ============================================================================

const StreakFire: React.FC<{
  streak: number
  isActive: boolean
  size?: 'sm' | 'md' | 'lg'
}> = ({ streak, isActive, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  if (streak === 0) {
    return (
      <div className="flex items-center gap-1 text-ink-400 dark:text-paper-500">
        <Flame className={`${sizeClasses[size]} opacity-30`} />
        <span className={textSizes[size]}>0</span>
      </div>
    )
  }

  return (
    <motion.div
      className={`flex items-center gap-1 ${isActive ? 'text-orange-500' : 'text-orange-300'}`}
      initial={false}
      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <Flame
        className={`${sizeClasses[size]} ${isActive ? 'animate-pulse' : ''}`}
        fill={isActive ? 'currentColor' : 'none'}
      />
      <span className={`font-bold ${textSizes[size]}`}>{streak}</span>
    </motion.div>
  )
}

// ============================================================================
// COMPLETION BUTTON
// ============================================================================

const CompletionButton: React.FC<{
  isCompleted: boolean
  onComplete: () => void
  onUncomplete: () => void
  disabled?: boolean
}> = ({ isCompleted, onComplete, onUncomplete, disabled }) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = useCallback(() => {
    if (disabled) return

    setIsAnimating(true)
    if (isCompleted) {
      onUncomplete()
    } else {
      onComplete()
    }

    setTimeout(() => setIsAnimating(false), 500)
  }, [isCompleted, onComplete, onUncomplete, disabled])

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      className={`
        relative w-10 h-10 rounded-full flex items-center justify-center
        transition-all duration-300
        ${isCompleted
          ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
          : 'bg-paper-100 dark:bg-ink-700 text-ink-400 dark:text-paper-500 hover:bg-paper-200 dark:hover:bg-ink-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <AnimatePresence mode="wait">
        {isCompleted ? (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Check className="w-5 h-5" />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-5 h-5 rounded-full border-2 border-current"
          />
        )}
      </AnimatePresence>

      {/* Celebration particles */}
      {isAnimating && isCompleted && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI) / 3) * 30,
                y: Math.sin((i * Math.PI) / 3) * 30,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ left: '50%', top: '50%', marginLeft: -4, marginTop: -4 }}
            />
          ))}
        </motion.div>
      )}
    </motion.button>
  )
}

// ============================================================================
// STATUS BADGE
// ============================================================================

const StatusBadge: React.FC<{
  status: StreakStatus
  frequency: HabitFrequency
}> = ({ status, frequency }) => {
  if (!status.isActive && status.currentStreak === 0) {
    return null
  }

  if (status.inGracePeriod) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-xs">
        <AlertTriangle className="w-3 h-3" />
        <span>{status.daysUntilBreak}d left</span>
      </div>
    )
  }

  if (status.isFrozen) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs">
        <Snowflake className="w-3 h-3" />
        <span>Frozen</span>
      </div>
    )
  }

  return null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  isCompletedToday,
  onComplete,
  onUncomplete,
  onDelete,
  onUseFreeze,
  compact = false,
  showDetails: initialShowDetails = false,
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showDetails, setShowDetails] = useState(initialShowDetails)

  const streakStatus = getStreakStatus(habit.streak, habit.frequency)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-white dark:bg-ink-800 rounded-xl border border-paper-200 dark:border-ink-700
        ${streakStatus.inGracePeriod && habit.streak.currentStreak > 0
          ? 'border-amber-300 dark:border-amber-700'
          : ''
        }
        ${isCompletedToday ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
        ${compact ? 'p-3' : 'p-4'}
        transition-colors duration-200
      `}
    >
      <div className="flex items-center gap-3">
        {/* Completion button */}
        <CompletionButton
          isCompleted={isCompletedToday}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
        />

        {/* Habit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={`
                font-medium text-ink-800 dark:text-paper-100 truncate
                ${isCompletedToday ? 'line-through text-ink-400 dark:text-paper-500' : ''}
              `}
            >
              {habit.title}
            </h4>
            <StatusBadge status={streakStatus} frequency={habit.frequency} />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-1 text-xs text-ink-500 dark:text-paper-400">
            <span className={`flex items-center gap-1 ${FREQUENCY_COLORS[habit.frequency]}`}>
              <Repeat className="w-3 h-3" />
              {FREQUENCY_LABELS[habit.frequency]}
            </span>

            {habit.preferredTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {habit.preferredTime}
              </span>
            )}
          </div>
        </div>

        {/* Streak */}
        <StreakFire
          streak={habit.streak.currentStreak}
          isActive={streakStatus.isActive}
          size={compact ? 'sm' : 'md'}
        />

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-ink-400 hover:text-ink-600 dark:text-paper-500 dark:hover:text-paper-300 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-1 w-40 bg-white dark:bg-ink-700 rounded-lg shadow-lg border border-paper-200 dark:border-ink-600 py-1 z-10"
              >
                {onUseFreeze && habit.streak.streakFreezesRemaining > 0 && (
                  <button
                    onClick={() => {
                      onUseFreeze()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-paper-50 dark:hover:bg-ink-600 text-ink-700 dark:text-paper-200"
                  >
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    Use Freeze ({habit.streak.streakFreezesRemaining})
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-paper-50 dark:hover:bg-ink-600 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Habit
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expand button */}
        {!compact && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-ink-400 hover:text-ink-600 dark:text-paper-500 dark:hover:text-paper-300"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {showDetails && !compact && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-paper-100 dark:border-ink-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-ink-800 dark:text-paper-100">
                    {habit.streak.currentStreak}
                  </div>
                  <div className="text-xs text-ink-500 dark:text-paper-400">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">
                    {habit.streak.longestStreak}
                  </div>
                  <div className="text-xs text-ink-500 dark:text-paper-400">Best Streak</div>
                </div>
              </div>

              {/* Recent completions calendar */}
              <div className="mt-4">
                <div className="text-xs text-ink-500 dark:text-paper-400 mb-2">Last 7 days</div>
                <div className="flex gap-1">
                  {[...Array(7)].map((_, i) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (6 - i))
                    const dateStr = date.toISOString().split('T')[0]
                    const isCompleted = (habit.streak?.completionHistory ?? []).includes(dateStr)
                    const isToday = i === 6

                    return (
                      <div
                        key={i}
                        className={`
                          flex-1 h-8 rounded flex items-center justify-center text-xs font-medium
                          ${isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-paper-100 dark:bg-ink-700 text-ink-400 dark:text-paper-500'
                          }
                          ${isToday ? 'ring-2 ring-blue-500' : ''}
                        `}
                        title={date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      >
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()]}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default HabitCard
