/**
 * Writer Right Sidebar
 * @module components/quarry/ui/writing/WriterRightSidebar
 *
 * @description
 * Right sidebar for the Write page with:
 * - Clock & Ambience controls
 * - Live word count tracking
 * - Session timer
 * - Writing stats and goals
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Target,
  Flame,
  TrendingUp,
  Calendar,
  Timer,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Music,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import {
  getWordCountStats,
  type WordCountStats,
} from '@/lib/write'
import type { ThemeName } from '@/types/theme'
import {
  isDarkTheme,
  getThemeCategory,
} from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface WriterRightSidebarProps {
  theme?: ThemeName
  className?: string
}

type SectionKey = 'clockAmbience' | 'liveStats' | 'timer' | 'goals' | 'analytics'

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const baseColors = {
    standard: {
      accent: 'emerald',
      bg: isDark ? 'bg-zinc-900' : 'bg-white',
      cardBg: isDark ? 'bg-zinc-800/50' : 'bg-zinc-50',
      border: isDark ? 'border-zinc-800' : 'border-zinc-200',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      muted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      subtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      accentColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      accentBg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      progressBg: isDark ? 'bg-zinc-700' : 'bg-zinc-200',
      progressFill: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
    },
    sepia: {
      accent: 'amber',
      bg: isDark ? 'bg-stone-900' : 'bg-amber-50/80',
      cardBg: isDark ? 'bg-stone-800/50' : 'bg-amber-100/50',
      border: isDark ? 'border-stone-700' : 'border-amber-200',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      muted: isDark ? 'text-stone-400' : 'text-stone-600',
      subtle: isDark ? 'text-stone-500' : 'text-stone-400',
      accentColor: isDark ? 'text-amber-400' : 'text-amber-600',
      accentBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      progressBg: isDark ? 'bg-stone-700' : 'bg-amber-200',
      progressFill: 'bg-gradient-to-r from-amber-500 to-orange-500',
    },
    terminal: {
      accent: 'green',
      bg: isDark ? 'bg-black' : 'bg-green-50/30',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-100/50',
      border: isDark ? 'border-green-900/50' : 'border-green-200',
      text: isDark ? 'text-green-100' : 'text-green-900',
      muted: isDark ? 'text-green-400' : 'text-green-600',
      subtle: isDark ? 'text-green-600' : 'text-green-500',
      accentColor: isDark ? 'text-green-400' : 'text-green-600',
      accentBg: isDark ? 'bg-green-500/10' : 'bg-green-100',
      progressBg: isDark ? 'bg-green-900/50' : 'bg-green-200',
      progressFill: 'bg-gradient-to-r from-green-500 to-lime-500',
    },
    oceanic: {
      accent: 'cyan',
      bg: isDark ? 'bg-slate-900' : 'bg-cyan-50/30',
      cardBg: isDark ? 'bg-slate-800/50' : 'bg-cyan-100/50',
      border: isDark ? 'border-slate-700' : 'border-cyan-200',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      muted: isDark ? 'text-slate-400' : 'text-slate-600',
      subtle: isDark ? 'text-slate-500' : 'text-slate-400',
      accentColor: isDark ? 'text-cyan-400' : 'text-cyan-600',
      accentBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
      progressBg: isDark ? 'bg-slate-700' : 'bg-cyan-200',
      progressFill: 'bg-gradient-to-r from-cyan-500 to-teal-500',
    },
  }

  return baseColors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COLLAPSIBLE SECTION
═══════════════════════════════════════════════════════════════════════════ */

interface CollapsibleSectionProps {
  icon: LucideIcon
  label: string
  colors: ReturnType<typeof getThemeColors>
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
}

function CollapsibleSection({
  icon: Icon,
  label,
  colors,
  isExpanded,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  return (
    <div className={cn('border-b', colors.border)}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/5'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-3.5 h-3.5', colors.muted)} />
          <span className={cn('text-xs font-medium', colors.text)}>{label}</span>
          {badge !== undefined && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              colors.accentBg,
              colors.accentColor
            )}>
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className={cn('w-3.5 h-3.5', colors.subtle)} />
        ) : (
          <ChevronDown className={cn('w-3.5 h-3.5', colors.subtle)} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS TIMER
═══════════════════════════════════════════════════════════════════════════ */

function FocusTimer({ colors }: { colors: ReturnType<typeof getThemeColors> }) {
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [targetMinutes, setTargetMinutes] = useState(25) // Pomodoro default

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = Math.min((seconds / (targetMinutes * 60)) * 100, 100)
  const isComplete = seconds >= targetMinutes * 60

  const reset = () => {
    setIsRunning(false)
    setSeconds(0)
  }

  return (
    <div className="space-y-3">
      {/* Timer display */}
      <div className={cn('text-center p-4 rounded-lg', colors.cardBg)}>
        <div className={cn(
          'text-3xl font-mono font-bold tabular-nums',
          isComplete ? 'text-green-500' : colors.text
        )}>
          {formatTime(seconds)}
        </div>
        <div className={cn('text-xs mt-1', colors.subtle)}>
          Goal: {targetMinutes} min
        </div>

        {/* Progress bar */}
        <div className={cn('h-1.5 rounded-full mt-3 overflow-hidden', colors.progressBg)}>
          <motion.div
            className={cn('h-full rounded-full', isComplete ? 'bg-green-500' : colors.progressFill)}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isRunning
              ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
              : cn(colors.accentBg, colors.accentColor, 'hover:opacity-80')
          )}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {seconds > 0 ? 'Resume' : 'Start'}
            </>
          )}
        </button>
        <button
          onClick={reset}
          className={cn(
            'p-2 rounded-lg transition-colors',
            colors.muted,
            'hover:bg-black/5 dark:hover:bg-white/5'
          )}
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex gap-1">
        {[15, 25, 45, 60].map((mins) => (
          <button
            key={mins}
            onClick={() => {
              setTargetMinutes(mins)
              if (!isRunning) setSeconds(0)
            }}
            className={cn(
              'flex-1 py-1.5 text-xs rounded transition-colors',
              targetMinutes === mins
                ? cn(colors.accentBg, colors.accentColor)
                : cn(colors.subtle, 'hover:bg-black/5 dark:hover:bg-white/5')
            )}
          >
            {mins}m
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE WORD COUNT STATS
═══════════════════════════════════════════════════════════════════════════ */

function LiveWordCountStats({ colors }: { colors: ReturnType<typeof getThemeColors> }) {
  const [stats, setStats] = useState<WordCountStats | null>(null)

  useEffect(() => {
    setStats(getWordCountStats())

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      setStats(getWordCountStats())
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  if (!stats) {
    return (
      <div className={cn('text-center py-4', colors.subtle)}>
        Loading stats...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn('p-3 rounded-lg text-center', colors.cardBg)}>
          <div className={cn('text-xl font-bold tabular-nums', colors.text)}>
            {stats.wordsToday.toLocaleString()}
          </div>
          <div className={cn('text-[10px] uppercase tracking-wide', colors.subtle)}>
            Today
          </div>
        </div>
        <div className={cn('p-3 rounded-lg text-center', colors.cardBg)}>
          <div className={cn('text-xl font-bold tabular-nums', colors.text)}>
            {stats.wordsThisWeek.toLocaleString()}
          </div>
          <div className={cn('text-[10px] uppercase tracking-wide', colors.subtle)}>
            This Week
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className={cn('flex items-center justify-between p-3 rounded-lg', colors.cardBg)}>
        <div className="flex items-center gap-2">
          <Flame className={cn('w-4 h-4', stats.currentStreak > 0 ? 'text-orange-500' : colors.subtle)} />
          <span className={cn('text-sm', colors.text)}>Writing Streak</span>
        </div>
        <span className={cn('text-sm font-bold', stats.currentStreak > 0 ? 'text-orange-500' : colors.muted)}>
          {stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Total words summary */}
      <div className={cn('p-3 rounded-lg', colors.cardBg)}>
        <div className={cn('text-[10px] uppercase tracking-wide mb-2', colors.subtle)}>
          Total Progress
        </div>
        <div className="flex items-center justify-between">
          <span className={cn('text-sm', colors.text)}>All Time</span>
          <span className={cn('text-sm font-bold', colors.text)}>
            {stats.totalWords.toLocaleString()} words
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={cn('text-sm', colors.text)}>This Month</span>
          <span className={cn('text-sm font-bold', colors.muted)}>
            {stats.wordsThisMonth.toLocaleString()} words
          </span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   GOALS PROGRESS
═══════════════════════════════════════════════════════════════════════════ */

function GoalsProgress({ colors }: { colors: ReturnType<typeof getThemeColors> }) {
  const [dailyGoal, setDailyGoal] = useState(() => {
    if (typeof window === 'undefined') return 500
    const stored = localStorage.getItem('write-daily-goal')
    return stored ? parseInt(stored, 10) : 500
  })

  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    if (typeof window === 'undefined') return 5000
    const stored = localStorage.getItem('write-weekly-goal')
    return stored ? parseInt(stored, 10) : 5000
  })

  const [stats, setStats] = useState<WordCountStats | null>(null)

  useEffect(() => {
    setStats(getWordCountStats())
  }, [])

  const dailyProgress = stats ? Math.min((stats.wordsToday / dailyGoal) * 100, 100) : 0
  const weeklyProgress = stats ? Math.min((stats.wordsThisWeek / weeklyGoal) * 100, 100) : 0

  return (
    <div className="space-y-3">
      {/* Daily goal */}
      <div className={cn('p-3 rounded-lg', colors.cardBg)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className={cn('w-4 h-4', dailyProgress >= 100 ? 'text-green-500' : colors.muted)} />
            <span className={cn('text-sm', colors.text)}>Daily</span>
          </div>
          <span className={cn('text-xs tabular-nums', colors.muted)}>
            {stats?.wordsToday.toLocaleString() || 0} / {dailyGoal.toLocaleString()}
          </span>
        </div>
        <div className={cn('h-2 rounded-full overflow-hidden', colors.progressBg)}>
          <motion.div
            className={cn('h-full rounded-full', dailyProgress >= 100 ? 'bg-green-500' : colors.progressFill)}
            initial={{ width: 0 }}
            animate={{ width: `${dailyProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Weekly goal */}
      <div className={cn('p-3 rounded-lg', colors.cardBg)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className={cn('w-4 h-4', weeklyProgress >= 100 ? 'text-green-500' : colors.muted)} />
            <span className={cn('text-sm', colors.text)}>Weekly</span>
          </div>
          <span className={cn('text-xs tabular-nums', colors.muted)}>
            {stats?.wordsThisWeek.toLocaleString() || 0} / {weeklyGoal.toLocaleString()}
          </span>
        </div>
        <div className={cn('h-2 rounded-full overflow-hidden', colors.progressBg)}>
          <motion.div
            className={cn('h-full rounded-full', weeklyProgress >= 100 ? 'bg-green-500' : colors.progressFill)}
            initial={{ width: 0 }}
            animate={{ width: `${weeklyProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Motivational message */}
      {dailyProgress >= 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn('text-center py-2 px-3 rounded-lg bg-green-500/10 text-green-500 text-sm')}
        >
          Daily goal achieved!
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function WriterRightSidebar({
  theme = 'dark',
  className,
}: WriterRightSidebarProps) {
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Audio hook - only need isPlaying for the badge indicator
  const { isPlaying } = useAmbienceSounds()

  // Section expanded states
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    clockAmbience: true,
    liveStats: true,
    timer: false,
    goals: true,
    analytics: false,
  })

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  return (
    <div className={cn('flex flex-col h-full overflow-auto', className)}>
      {/* Clock Section - Always at top */}
      <CollapsibleSection
        icon={Clock}
        label="Clock"
        colors={colors}
        isExpanded={expandedSections.clockAmbience}
        onToggle={() => toggleSection('clockAmbience')}
      >
        <div className="flex justify-center py-2">
          <ClockWidget theme={theme} size="medium" compact={false} onNavigate={() => {}} />
        </div>
      </CollapsibleSection>

      {/* Live Word Count Stats */}
      <CollapsibleSection
        icon={TrendingUp}
        label="Live Stats"
        colors={colors}
        isExpanded={expandedSections.liveStats}
        onToggle={() => toggleSection('liveStats')}
      >
        <LiveWordCountStats colors={colors} />
      </CollapsibleSection>

      {/* Focus Timer */}
      <CollapsibleSection
        icon={Timer}
        label="Focus Timer"
        colors={colors}
        isExpanded={expandedSections.timer}
        onToggle={() => toggleSection('timer')}
      >
        <FocusTimer colors={colors} />
      </CollapsibleSection>

      {/* Goals Progress */}
      <CollapsibleSection
        icon={Target}
        label="Goals"
        colors={colors}
        isExpanded={expandedSections.goals}
        onToggle={() => toggleSection('goals')}
      >
        <GoalsProgress colors={colors} />
      </CollapsibleSection>

      {/* Ambience Section - Full controls with jukebox, visualization, and mic */}
      <CollapsibleSection
        icon={Music}
        label="Ambience"
        colors={colors}
        isExpanded={true}
        onToggle={() => {}}
        badge={isPlaying ? '●' : undefined}
      >
        <AmbienceSection theme={theme} />
      </CollapsibleSection>

      {/* Bottom spacer - fills remaining space */}
      <div className="flex-1 min-h-[10px]" />
    </div>
  )
}
