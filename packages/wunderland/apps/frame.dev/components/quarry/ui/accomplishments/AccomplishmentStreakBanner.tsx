'use client'

/**
 * AccomplishmentStreakBanner Component
 *
 * Displays current task completion streak with gamification elements.
 * Shows:
 * - Current streak count with flame icon
 * - Longest streak record
 * - Progress towards next milestone
 * - "At risk" warning when streak needs maintenance
 *
 * @module components/quarry/ui/AccomplishmentStreakBanner
 */

import { useMemo } from 'react'
import { Flame, Trophy, AlertTriangle, Sparkles, Star, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTaskCompletionStreak } from '@/lib/hooks/useAccomplishmentStats'

// ============================================================================
// TYPES
// ============================================================================

interface AccomplishmentStreakBannerProps {
  variant?: 'default' | 'compact' | 'minimal'
  showMilestones?: boolean
  isDark?: boolean
  className?: string
}

// Milestone thresholds for celebrations
const MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365]

// ============================================================================
// HELPERS
// ============================================================================

function getStreakEmoji(streak: number): string {
  if (streak >= 365) return '🏆'
  if (streak >= 180) return '💎'
  if (streak >= 90) return '🌟'
  if (streak >= 60) return '⭐'
  if (streak >= 30) return '🔥'
  if (streak >= 14) return '✨'
  if (streak >= 7) return '💪'
  if (streak >= 3) return '👍'
  return '🌱'
}

function getStreakMessage(streak: number, isActiveToday: boolean): string {
  if (!isActiveToday && streak > 0) {
    return 'Complete a task to maintain your streak!'
  }
  if (streak >= 365) return 'Incredible! A full year of consistency!'
  if (streak >= 180) return 'Half a year strong!'
  if (streak >= 90) return 'Three months of excellence!'
  if (streak >= 60) return 'Two months of dedication!'
  if (streak >= 30) return 'A full month! Amazing!'
  if (streak >= 14) return 'Two weeks running!'
  if (streak >= 7) return 'A week of wins!'
  if (streak >= 3) return 'Building momentum!'
  if (streak >= 1) return 'Keep it going!'
  return 'Start your streak today!'
}

function getNextMilestone(current: number): number | null {
  return MILESTONES.find((m) => m > current) || null
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function MilestoneProgress({
  current,
  next,
  isDark,
}: {
  current: number
  next: number
  isDark: boolean
}) {
  const prevMilestone = MILESTONES.filter((m) => m < next).pop() || 0
  const progress = ((current - prevMilestone) / (next - prevMilestone)) * 100

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
          {prevMilestone || 0} days
        </span>
        <span className={isDark ? 'text-amber-300' : 'text-amber-600'}>
          {next} days
        </span>
      </div>
      <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-zinc-700' : 'bg-zinc-200')}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
        />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccomplishmentStreakBanner({
  variant = 'default',
  showMilestones = true,
  isDark = false,
  className = '',
}: AccomplishmentStreakBannerProps) {
  const { streak, loading, isActiveToday, isAtRisk } = useTaskCompletionStreak()

  const nextMilestone = useMemo(() => {
    if (!streak) return null
    return getNextMilestone(streak.current)
  }, [streak])

  const isMilestoneHit = useMemo(() => {
    if (!streak) return false
    return MILESTONES.includes(streak.current)
  }, [streak])

  if (loading || !streak) {
    return null
  }

  // Minimal variant - just the number
  if (variant === 'minimal') {
    if (streak.current === 0) return null

    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
          isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700',
          isAtRisk && 'animate-pulse',
          className
        )}
      >
        <Flame className="w-4 h-4" />
        {streak.current}
      </div>
    )
  }

  // Compact variant - horizontal bar
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg',
          isDark ? 'bg-zinc-800/80' : 'bg-zinc-50',
          isAtRisk && !isActiveToday && 'ring-2 ring-amber-500/50',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            'bg-gradient-to-br from-amber-500 to-amber-600'
          )}
        >
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
              {streak.current}
            </span>
            <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              day streak
            </span>
            {isAtRisk && !isActiveToday && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          {streak.longest > streak.current && (
            <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Best: {streak.longest} days
            </p>
          )}
        </div>
        {isActiveToday && <Sparkles className="w-5 h-5 text-emerald-500" />}
      </div>
    )
  }

  // Default variant - full card
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-100 border border-amber-200',
        isAtRisk && !isActiveToday && 'ring-2 ring-amber-500/50 animate-pulse',
        className
      )}
    >
      {/* Celebration effect for milestones */}
      {isMilestoneHit && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2"
        >
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
        </motion.div>
      )}

      <div className="flex items-start gap-4">
        {/* Streak icon */}
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-xl',
            'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
          )}
        >
          <Flame className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-bold', isDark ? 'text-zinc-100' : 'text-zinc-900')}>
              {streak.current}
            </span>
            <span className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
              day{streak.current !== 1 ? 's' : ''} {getStreakEmoji(streak.current)}
            </span>
          </div>

          <p className={cn('text-sm mt-0.5', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
            {getStreakMessage(streak.current, isActiveToday)}
          </p>

          {/* Record */}
          {streak.longest > 0 && (
            <div className={cn('flex items-center gap-1 mt-1 text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              <Trophy className="w-3 h-3" />
              Personal best: {streak.longest} days
            </div>
          )}

          {/* Milestone progress */}
          {showMilestones && nextMilestone && (
            <MilestoneProgress current={streak.current} next={nextMilestone} isDark={isDark} />
          )}
        </div>

        {/* Status indicator */}
        <div className="flex-shrink-0">
          {isActiveToday ? (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                'bg-emerald-500/20 text-emerald-500'
              )}
            >
              <Zap className="w-3 h-3" />
              Done
            </div>
          ) : isAtRisk ? (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                'bg-amber-500/20 text-amber-500'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              At risk
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
