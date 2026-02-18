/**
 * Achievement System Components
 * 
 * Game-like achievement and gamification UI:
 * - Achievement cards with unlock animations
 * - Trophy case display
 * - XP progress with level up celebrations
 * - Activity streak tracking
 * - Achievement unlock notifications
 * 
 * @module components/quarry/ui/AchievementSystem
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import {
  Trophy,
  Star,
  Flame,
  Zap,
  Target,
  BookOpen,
  Award,
  Crown,
  Sparkles,
  Lock,
  Check,
  ChevronRight,
  Clock,
  Calendar,
  TrendingUp,
  Gift,
  Medal
} from 'lucide-react'
import type { 
  Achievement, 
  AchievementProgress, 
  AchievementRarity 
} from '@/types/openstrand'
import { useProfile } from '../../hooks/useProfile'

// ============================================================================
// DEFAULT ACHIEVEMENTS
// ============================================================================

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // Study achievements
  {
    id: 'first-review',
    title: 'First Steps',
    description: 'Complete your first flashcard review',
    icon: '🎯',
    trigger: { type: 'count', target: 1, metric: 'flashcards_reviewed' },
    xpReward: 25,
    rarity: 'common',
    secret: false,
    category: 'study'
  },
  {
    id: 'review-10',
    title: 'Getting Started',
    description: 'Review 10 flashcards',
    icon: '📚',
    trigger: { type: 'count', target: 10, metric: 'flashcards_reviewed' },
    xpReward: 50,
    rarity: 'common',
    secret: false,
    category: 'study'
  },
  {
    id: 'review-100',
    title: 'Dedicated Learner',
    description: 'Review 100 flashcards',
    icon: '🎓',
    trigger: { type: 'count', target: 100, metric: 'flashcards_reviewed' },
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    category: 'study'
  },
  {
    id: 'review-500',
    title: 'Knowledge Seeker',
    description: 'Review 500 flashcards',
    icon: '🔮',
    trigger: { type: 'count', target: 500, metric: 'flashcards_reviewed' },
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    category: 'study'
  },
  {
    id: 'review-1000',
    title: 'Master Scholar',
    description: 'Review 1,000 flashcards',
    icon: '👑',
    trigger: { type: 'count', target: 1000, metric: 'flashcards_reviewed' },
    xpReward: 500,
    rarity: 'epic',
    secret: false,
    category: 'study'
  },
  
  // Streak achievements
  {
    id: 'streak-3',
    title: 'On Fire',
    description: 'Study 3 days in a row',
    icon: '🔥',
    trigger: { type: 'streak', target: 3, metric: 'study_days' },
    xpReward: 75,
    rarity: 'common',
    secret: false,
    category: 'study'
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Study 7 days in a row',
    icon: '⚡',
    trigger: { type: 'streak', target: 7, metric: 'study_days' },
    xpReward: 200,
    rarity: 'uncommon',
    secret: false,
    category: 'study'
  },
  {
    id: 'streak-30',
    title: 'Monthly Master',
    description: 'Study 30 days in a row',
    icon: '🌟',
    trigger: { type: 'streak', target: 30, metric: 'study_days' },
    xpReward: 500,
    rarity: 'rare',
    secret: false,
    category: 'study'
  },
  {
    id: 'streak-100',
    title: 'Unstoppable',
    description: 'Study 100 days in a row',
    icon: '💎',
    trigger: { type: 'streak', target: 100, metric: 'study_days' },
    xpReward: 1000,
    rarity: 'legendary',
    secret: false,
    category: 'study'
  },
  
  // Quiz achievements
  {
    id: 'first-quiz',
    title: 'Quiz Taker',
    description: 'Complete your first quiz',
    icon: '📝',
    trigger: { type: 'count', target: 1, metric: 'quizzes_taken' },
    xpReward: 50,
    rarity: 'common',
    secret: false,
    category: 'study'
  },
  {
    id: 'perfect-quiz',
    title: 'Perfect Score',
    description: 'Get 100% on a quiz',
    icon: '💯',
    trigger: { type: 'perfect', target: 1, metric: 'perfect_quizzes' },
    xpReward: 100,
    rarity: 'uncommon',
    secret: false,
    category: 'study'
  },
  {
    id: 'perfect-10',
    title: 'Perfectionist',
    description: 'Get 10 perfect quiz scores',
    icon: '🏆',
    trigger: { type: 'count', target: 10, metric: 'perfect_quizzes' },
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    category: 'study'
  },
  
  // Creation achievements
  {
    id: 'first-card',
    title: 'Card Creator',
    description: 'Create your first flashcard',
    icon: '✨',
    trigger: { type: 'count', target: 1, metric: 'flashcards_created' },
    xpReward: 25,
    rarity: 'common',
    secret: false,
    category: 'creation'
  },
  {
    id: 'deck-builder',
    title: 'Deck Builder',
    description: 'Create 50 flashcards',
    icon: '🃏',
    trigger: { type: 'count', target: 50, metric: 'flashcards_created' },
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    category: 'creation'
  },
  
  // Exploration achievements
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'View 10 different strands',
    icon: '🧭',
    trigger: { type: 'count', target: 10, metric: 'strands_viewed' },
    xpReward: 50,
    rarity: 'common',
    secret: false,
    category: 'exploration'
  },
  {
    id: 'cartographer',
    title: 'Cartographer',
    description: 'View 50 different strands',
    icon: '🗺️',
    trigger: { type: 'count', target: 50, metric: 'strands_viewed' },
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    category: 'exploration'
  },
  
  // Teaching achievements (Teach Mode / Feynman Technique)
  {
    id: 'first-lesson',
    title: 'First Lesson',
    description: 'Complete your first teach session',
    icon: '🎤',
    trigger: { type: 'count', target: 1, metric: 'teach_sessions_completed' },
    xpReward: 75,
    rarity: 'common',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'professor',
    title: 'Professor',
    description: 'Complete 10 teach sessions',
    icon: '👨‍🏫',
    trigger: { type: 'count', target: 10, metric: 'teach_sessions_completed' },
    xpReward: 200,
    rarity: 'uncommon',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'master-teacher',
    title: 'Master Teacher',
    description: 'Achieve 95%+ coverage in 5 teach sessions',
    icon: '🏅',
    trigger: { type: 'count', target: 5, metric: 'teach_high_coverage' },
    xpReward: 400,
    rarity: 'rare',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'socratic-scholar',
    title: 'Socratic Scholar',
    description: 'Complete 10 sessions with Devil\'s Advocate persona',
    icon: '🤔',
    trigger: { type: 'count', target: 10, metric: 'teach_devils_advocate' },
    xpReward: 250,
    rarity: 'rare',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'gap-hunter',
    title: 'Gap Hunter',
    description: 'Identify and fill 50 knowledge gaps',
    icon: '🔍',
    trigger: { type: 'count', target: 50, metric: 'teach_gaps_filled' },
    xpReward: 350,
    rarity: 'epic',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'feynman-master',
    title: 'Feynman Master',
    description: 'Teach 50 different topics',
    icon: '🧠',
    trigger: { type: 'count', target: 50, metric: 'teach_unique_topics' },
    xpReward: 500,
    rarity: 'epic',
    secret: false,
    category: 'teaching'
  },
  {
    id: 'teach-streak-7',
    title: 'Teaching Habit',
    description: 'Complete teach sessions 7 days in a row',
    icon: '📆',
    trigger: { type: 'streak', target: 7, metric: 'teach_days' },
    xpReward: 200,
    rarity: 'uncommon',
    secret: false,
    category: 'teaching'
  },

  // Habit achievements
  {
    id: 'first-habit',
    title: 'Habit Starter',
    description: 'Complete your first habit',
    icon: '🌱',
    trigger: { type: 'count', target: 1, metric: 'habits_completed' },
    xpReward: 50,
    rarity: 'common',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-3',
    title: 'Building Momentum',
    description: 'Maintain a 3-day habit streak',
    icon: '🔥',
    trigger: { type: 'streak', target: 3, metric: 'habit_streak' },
    xpReward: 75,
    rarity: 'common',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-7',
    title: 'Week of Wins',
    description: 'Maintain a 7-day habit streak',
    icon: '🔥',
    trigger: { type: 'streak', target: 7, metric: 'habit_streak' },
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-21',
    title: 'Habit Formed',
    description: 'Maintain a 21-day habit streak (habits take 21 days to form!)',
    icon: '💪',
    trigger: { type: 'streak', target: 21, metric: 'habit_streak' },
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day habit streak',
    icon: '🌟',
    trigger: { type: 'streak', target: 30, metric: 'habit_streak' },
    xpReward: 400,
    rarity: 'rare',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-100',
    title: 'Unstoppable Force',
    description: 'Maintain a 100-day habit streak',
    icon: '💎',
    trigger: { type: 'streak', target: 100, metric: 'habit_streak' },
    xpReward: 1000,
    rarity: 'legendary',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-streak-365',
    title: 'Year of Excellence',
    description: 'Maintain a 365-day habit streak',
    icon: '👑',
    trigger: { type: 'streak', target: 365, metric: 'habit_streak' },
    xpReward: 2000,
    rarity: 'legendary',
    secret: false,
    category: 'habits'
  },
  {
    id: 'five-habits',
    title: 'Habit Collector',
    description: 'Maintain 5 active habits simultaneously',
    icon: '🎯',
    trigger: { type: 'count', target: 5, metric: 'active_habits' },
    xpReward: 200,
    rarity: 'uncommon',
    secret: false,
    category: 'habits'
  },
  {
    id: 'perfect-week',
    title: 'Perfect Week',
    description: 'Complete all habits every day for a week',
    icon: '✨',
    trigger: { type: 'streak', target: 7, metric: 'perfect_habit_days' },
    xpReward: 250,
    rarity: 'rare',
    secret: false,
    category: 'habits'
  },
  {
    id: 'morning-person',
    title: 'Morning Person',
    description: 'Complete a morning habit 30 days in a row',
    icon: '🌅',
    trigger: { type: 'streak', target: 30, metric: 'morning_habit_streak' },
    xpReward: 300,
    rarity: 'rare',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-centurion',
    title: 'Habit Centurion',
    description: 'Complete 100 habit check-ins total',
    icon: '🏛️',
    trigger: { type: 'count', target: 100, metric: 'total_habit_completions' },
    xpReward: 350,
    rarity: 'rare',
    secret: false,
    category: 'habits'
  },
  {
    id: 'habit-titan',
    title: 'Habit Titan',
    description: 'Complete 1,000 habit check-ins total',
    icon: '🗿',
    trigger: { type: 'count', target: 1000, metric: 'total_habit_completions' },
    xpReward: 750,
    rarity: 'epic',
    secret: false,
    category: 'habits'
  },
  {
    id: 'comeback-kid',
    title: 'Comeback Kid',
    description: 'Recover a broken streak and build it back to 7 days',
    icon: '🦅',
    trigger: { type: 'milestone', target: 1, metric: 'streak_recovery' },
    xpReward: 150,
    rarity: 'uncommon',
    secret: false,
    category: 'habits'
  },
  {
    id: 'freeze-saver',
    title: 'Strategic Planner',
    description: 'Use a streak freeze to protect your streak',
    icon: '🧊',
    trigger: { type: 'count', target: 1, metric: 'streak_freezes_used' },
    xpReward: 50,
    rarity: 'common',
    secret: false,
    category: 'habits'
  },

  // Secret achievements
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Study after midnight',
    icon: '🦉',
    trigger: { type: 'milestone', target: 1, metric: 'late_night_study' },
    xpReward: 50,
    rarity: 'uncommon',
    secret: true,
    category: 'special'
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Study before 6 AM',
    icon: '🐦',
    trigger: { type: 'milestone', target: 1, metric: 'early_morning_study' },
    xpReward: 50,
    rarity: 'uncommon',
    secret: true,
    category: 'special'
  },
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Review 50 cards in 5 minutes',
    icon: '⚡',
    trigger: { type: 'speed', target: 50, metric: 'cards_in_5min' },
    xpReward: 100,
    rarity: 'rare',
    secret: true,
    category: 'special'
  }
]

// ============================================================================
// RARITY STYLES
// ============================================================================

const RARITY_STYLES: Record<AchievementRarity, {
  border: string
  bg: string
  glow: string
  text: string
}> = {
  common: {
    border: 'border-ink-300 dark:border-ink-600',
    bg: 'bg-paper-100 dark:bg-ink-700',
    glow: '',
    text: 'text-ink-500 dark:text-paper-400'
  },
  uncommon: {
    border: 'border-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    glow: 'shadow-green-500/20',
    text: 'text-green-600 dark:text-green-400'
  },
  rare: {
    border: 'border-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400'
  },
  epic: {
    border: 'border-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    glow: 'shadow-purple-500/40',
    text: 'text-purple-600 dark:text-purple-400'
  },
  legendary: {
    border: 'border-amber-400',
    bg: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    glow: 'shadow-amber-500/50 animate-pulse',
    text: 'text-amber-600 dark:text-amber-400'
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Single achievement card
 */
export const AchievementCard: React.FC<{
  achievement: Achievement
  progress?: AchievementProgress
  onClick?: () => void
  compact?: boolean
}> = ({ achievement, progress, onClick, compact = false }) => {
  const isUnlocked = progress?.unlocked
  const progressPercent = progress 
    ? Math.min((progress.currentValue / achievement.trigger.target) * 100, 100)
    : 0
  const styles = RARITY_STYLES[achievement.rarity]

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full text-left rounded-xl border-2 p-4 transition-all
        ${styles.border} ${styles.bg}
        ${isUnlocked ? `shadow-lg ${styles.glow}` : 'opacity-75'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {/* Secret overlay */}
      {achievement.secret && !isUnlocked && (
        <div className="absolute inset-0 bg-ink-900/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-8 h-8 text-ink-400 mx-auto mb-2" />
            <span className="text-ink-400 text-sm">Secret Achievement</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          text-3xl ${compact ? 'text-2xl' : 'text-3xl'}
          ${isUnlocked ? '' : 'grayscale opacity-50'}
        `}>
          {achievement.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} text-ink-800 dark:text-paper-100 truncate`}>
              {achievement.title}
            </h4>
            {isUnlocked && (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            )}
          </div>

          {/* Description */}
          <p className={`text-ink-500 dark:text-paper-400 ${compact ? 'text-xs' : 'text-sm'} mt-0.5`}>
            {achievement.description}
          </p>

          {/* Progress bar */}
          {!isUnlocked && !achievement.secret && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-ink-400 dark:text-paper-500 mb-1">
                <span>{progress?.currentValue || 0} / {achievement.trigger.target}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-1.5 bg-paper-200 dark:bg-ink-600 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-frame-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Rewards */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-amber-500">
              <Zap className="w-3 h-3" />
              <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>
                +{achievement.xpReward} XP
              </span>
            </div>
            <span className={`${styles.text} ${compact ? 'text-xs' : 'text-sm'} capitalize`}>
              {achievement.rarity}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Achievement unlock notification
 */
export const AchievementUnlockNotification: React.FC<{
  achievement: Achievement
  onClose: () => void
}> = ({ achievement, onClose }) => {
  const { prefersReducedMotion } = useReducedMotion()
  const styles = RARITY_STYLES[achievement.rarity]

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div className={`
        rounded-2xl border-2 p-4 shadow-2xl
        ${styles.border} ${styles.bg} ${styles.glow}
      `}>
        {/* Celebration animation */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute -top-2 -right-2"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Sparkles className="w-8 h-8 text-amber-400" />
          </motion.div>
        )}

        <div className="flex items-center gap-1 text-amber-500 mb-2">
          <Trophy className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Achievement Unlocked!
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-4xl">{achievement.icon}</div>
          <div>
            <h4 className="font-bold text-ink-800 dark:text-paper-100">
              {achievement.title}
            </h4>
            <p className="text-sm text-ink-500 dark:text-paper-400">
              {achievement.description}
            </p>
            <div className="flex items-center gap-1 text-amber-500 mt-1">
              <Zap className="w-3 h-3" />
              <span className="text-sm font-medium">+{achievement.xpReward} XP</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-ink-400 hover:text-ink-600 dark:hover:text-paper-300"
        >
          <span className="sr-only">Close</span>
          ×
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Level up celebration
 */
export const LevelUpCelebration: React.FC<{
  level: number
  title: string
  onClose: () => void
}> = ({ level, title, onClose }) => {
  const { prefersReducedMotion } = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rays animation */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 2.5] }}
            transition={{ duration: 1.5, times: [0, 0.3, 1] }}
          >
            <div className="w-64 h-64 bg-gradient-radial from-amber-400/30 to-transparent rounded-full" />
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/50">
            <Crown className="w-16 h-16 text-white" />
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <div className="text-amber-400 text-lg font-bold uppercase tracking-wider mb-2">
              Level Up!
            </div>
            <div className="text-white text-5xl font-bold mb-2">
              Level {level}
            </div>
            <div className="text-amber-200 text-xl">
              {title}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/**
 * XP Progress bar
 */
export const XPProgressBar: React.FC<{
  currentXp: number
  xpForCurrentLevel: number
  xpToNextLevel: number
  level: number
  title: string
  compact?: boolean
}> = ({ currentXp, xpForCurrentLevel, xpToNextLevel, level, title, compact = false }) => {
  const progress = xpToNextLevel > 0 
    ? ((currentXp - xpForCurrentLevel) / (xpToNextLevel - xpForCurrentLevel)) * 100
    : 100

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`
            bg-gradient-to-br from-amber-400 to-orange-500 rounded-full 
            flex items-center justify-center font-bold text-white
            ${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}
          `}>
            {level}
          </div>
          <div>
            <div className={`font-semibold text-ink-800 dark:text-paper-100 ${compact ? 'text-sm' : ''}`}>
              {title}
            </div>
            {!compact && (
              <div className="text-xs text-ink-500 dark:text-paper-400">
                {currentXp.toLocaleString()} XP
              </div>
            )}
          </div>
        </div>
        <div className={`text-ink-500 dark:text-paper-400 ${compact ? 'text-xs' : 'text-sm'}`}>
          {xpToNextLevel - currentXp > 0 
            ? `${(xpToNextLevel - currentXp).toLocaleString()} to next`
            : 'Max level!'}
        </div>
      </div>
      
      <div className={`bg-paper-200 dark:bg-ink-700 rounded-full overflow-hidden ${compact ? 'h-2' : 'h-3'}`}>
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/**
 * Streak display
 */
export const StreakDisplay: React.FC<{
  currentStreak: number
  longestStreak: number
  isActive: boolean
}> = ({ currentStreak, longestStreak, isActive }) => {
  return (
    <div className="flex items-center gap-4">
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-xl
        ${isActive 
          ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-500' 
          : 'bg-paper-100 dark:bg-ink-700 text-ink-400 dark:text-paper-500'}
      `}>
        <Flame className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
        <div>
          <div className="text-2xl font-bold">{currentStreak}</div>
          <div className="text-xs opacity-75">day streak</div>
        </div>
      </div>
      
      <div className="text-center">
        <div className="flex items-center gap-1 text-ink-500 dark:text-paper-400">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">{longestStreak}</span>
        </div>
        <div className="text-xs text-ink-400 dark:text-paper-500">best</div>
      </div>
    </div>
  )
}

/**
 * Trophy case - displays featured achievements
 */
export const TrophyCase: React.FC<{
  achievements: Achievement[]
  progress: AchievementProgress[]
  featuredIds: string[]
  onViewAll?: () => void
}> = ({ achievements, progress, featuredIds, onViewAll }) => {
  const featuredAchievements = featuredIds
    .map(id => achievements.find(a => a.id === id))
    .filter((a): a is Achievement => a !== undefined && progress.find(p => p.achievementId === a.id)?.unlocked === true)

  const unlockedCount = progress.filter(p => p.unlocked).length

  return (
    <div className="bg-white dark:bg-ink-800 rounded-xl p-4 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-ink-800 dark:text-paper-100">
            Trophy Case
          </h3>
        </div>
        <div className="text-sm text-ink-500 dark:text-paper-400">
          {unlockedCount} / {achievements.length}
        </div>
      </div>

      {featuredAchievements.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {featuredAchievements.slice(0, 3).map((achievement) => (
            <div
              key={achievement.id}
              className="text-center"
              title={`${achievement.title}: ${achievement.description}`}
            >
              <div className="text-3xl mb-1">{achievement.icon}</div>
              <div className="text-xs text-ink-600 dark:text-paper-300 truncate">
                {achievement.title}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-ink-400 dark:text-paper-500">
          <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Unlock achievements to display them here!</p>
        </div>
      )}

      {onViewAll && (
        <button
          onClick={onViewAll}
          className="flex items-center justify-center gap-1 w-full mt-4 py-2 text-sm text-frame-green hover:text-frame-green-dark transition-colors"
        >
          View All Achievements
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Full achievements panel
 */
export const AchievementsPanel: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const { achievements: userProgress, stats } = useProfile()
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')
  const [category, setCategory] = useState<string>('all')

  const filteredAchievements = DEFAULT_ACHIEVEMENTS.filter(a => {
    const progress = userProgress.find(p => p.achievementId === a.id)
    const isUnlocked = progress?.unlocked

    if (filter === 'unlocked' && !isUnlocked) return false
    if (filter === 'locked' && isUnlocked) return false
    if (category !== 'all' && a.category !== category) return false
    
    return true
  })

  const categories = ['all', ...new Set(DEFAULT_ACHIEVEMENTS.map(a => a.category))]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-paper-100 dark:bg-ink-700 rounded-lg p-1">
          {['all', 'unlocked', 'locked'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-3 py-1 rounded-md text-sm transition-colors capitalize ${
                filter === f
                  ? 'bg-white dark:bg-ink-600 shadow-sm text-ink-800 dark:text-paper-100'
                  : 'text-ink-500 dark:text-paper-400 hover:text-ink-700 dark:hover:text-paper-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-paper-100 dark:bg-ink-700 rounded-lg p-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-md text-sm transition-colors capitalize ${
                category === c
                  ? 'bg-white dark:bg-ink-600 shadow-sm text-ink-800 dark:text-paper-100'
                  : 'text-ink-500 dark:text-paper-400 hover:text-ink-700 dark:hover:text-paper-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Achievement list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredAchievements.map((achievement) => {
          const progress = userProgress.find(p => p.achievementId === achievement.id)
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              progress={progress}
            />
          )
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8 text-ink-400 dark:text-paper-500">
          <Medal className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No achievements match your filters</p>
        </div>
      )}
    </div>
  )
}
