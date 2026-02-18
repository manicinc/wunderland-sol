/**
 * Learning Sidebar - Full toolkit sidebar for Learning Studio
 * @module quarry/ui/LearningSidebar
 *
 * @description
 * Left sidebar for Learning Studio featuring:
 * - Collapsible Clock section (top) - Large analog clock
 * - Scrollable Quick Start + Your Progress (middle)
 * - Collapsible Ambience section (bottom) - Full RetroJukebox
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Zap,
  Target,
  Flame,
  Clock,
  Trophy,
  BarChart3,
  Library,
  Network,
  ListChecks,
  Lightbulb,
  ChevronDown,
  Music,
  GraduationCap,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import { CollapsibleSidebarSection } from '../sidebar/sections/CollapsibleSidebarSection'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface LearningSidebarProps {
  /** Current theme */
  theme?: ThemeName
  /** Callback to select strands */
  onSelectStrands?: () => void
  /** Callback to start flashcards */
  onStartFlashcards?: () => void
  /** Callback to start quiz */
  onStartQuiz?: () => void
  /** Callback to generate mindmap */
  onStartMindmap?: () => void
  /** Number of strands available */
  strandsCount?: number
  /** Number of strands selected */
  selectedCount?: number
  /** Stats for display */
  stats?: {
    dueToday: number
    streak: number
    mastered: number
    totalReviewed: number
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const colors = {
    standard: {
      primary: 'emerald',
      accent: 'cyan',
      cta: isDark ? 'from-emerald-600 to-cyan-600' : 'from-emerald-500 to-cyan-500',
      ctaHover: isDark ? 'hover:from-emerald-700 hover:to-cyan-700' : 'hover:from-emerald-600 hover:to-cyan-600',
      card: isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
      section: isDark ? 'border-zinc-800' : 'border-zinc-200',
      label: isDark ? 'text-zinc-500' : 'text-zinc-400',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      muted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      bg: isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50',
      cardHover: isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100',
    },
    sepia: {
      primary: 'amber',
      accent: 'orange',
      cta: isDark ? 'from-amber-600 to-orange-600' : 'from-amber-500 to-orange-500',
      ctaHover: isDark ? 'hover:from-amber-700 hover:to-orange-700' : 'hover:from-amber-600 hover:to-orange-600',
      card: isDark ? 'bg-stone-800/50 border-stone-700' : 'bg-amber-50/80 border-amber-200',
      section: isDark ? 'border-stone-700' : 'border-amber-200',
      label: isDark ? 'text-stone-500' : 'text-stone-400',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      muted: isDark ? 'text-stone-400' : 'text-stone-500',
      bg: isDark ? 'bg-stone-900/50' : 'bg-amber-50/30',
      cardHover: isDark ? 'hover:bg-stone-700/50' : 'hover:bg-amber-100',
    },
    terminal: {
      primary: 'green',
      accent: 'emerald',
      cta: isDark ? 'from-green-600 to-emerald-600' : 'from-green-500 to-emerald-500',
      ctaHover: isDark ? 'hover:from-green-700 hover:to-emerald-700' : 'hover:from-green-600 hover:to-emerald-600',
      card: isDark ? 'bg-gray-800/50 border-green-900/50' : 'bg-gray-100/80 border-green-300/50',
      section: isDark ? 'border-green-900/50' : 'border-green-300/50',
      label: isDark ? 'text-green-600' : 'text-green-500',
      text: isDark ? 'text-green-400' : 'text-green-700',
      muted: isDark ? 'text-green-600' : 'text-green-500',
      bg: isDark ? 'bg-gray-900/50' : 'bg-gray-50/50',
      cardHover: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200',
    },
    oceanic: {
      primary: 'cyan',
      accent: 'blue',
      cta: isDark ? 'from-cyan-600 to-blue-600' : 'from-cyan-500 to-blue-500',
      ctaHover: isDark ? 'hover:from-cyan-700 hover:to-blue-700' : 'hover:from-cyan-600 hover:to-blue-600',
      card: isDark ? 'bg-slate-800/50 border-cyan-900/50' : 'bg-sky-50/80 border-sky-200',
      section: isDark ? 'border-cyan-900/50' : 'border-sky-200',
      label: isDark ? 'text-cyan-600' : 'text-cyan-500',
      text: isDark ? 'text-cyan-300' : 'text-slate-700',
      muted: isDark ? 'text-cyan-500' : 'text-slate-500',
      bg: isDark ? 'bg-slate-900/50' : 'bg-sky-50/30',
      cardHover: isDark ? 'hover:bg-slate-700/50' : 'hover:bg-sky-100',
    },
  }

  return colors[category] || colors.standard
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  isDark: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2.5 rounded-lg border',
      isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'
    )}>
      <div className={cn('p-1.5 rounded-md', color)}>
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[10px] uppercase tracking-wide font-medium', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {label}
        </p>
        <p className={cn('text-sm font-bold tabular-nums', isDark ? 'text-zinc-100' : 'text-zinc-800')}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUICK START BUTTON COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function QuickStartButton({
  icon: Icon,
  label,
  description,
  onClick,
  primary = false,
  colors,
  isDark,
}: {
  icon: React.ElementType
  label: string
  description?: string
  onClick?: () => void
  primary?: boolean
  colors: ReturnType<typeof getThemeColors>
  isDark: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all',
        'border touch-manipulation',
        primary
          ? cn('bg-gradient-to-r text-white shadow-lg', colors.cta, colors.ctaHover)
          : cn(colors.card, colors.cardHover)
      )}
    >
      <div className={cn(
        'p-2 rounded-lg',
        primary
          ? 'bg-white/20'
          : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 text-left">
        <span className={cn(
          'text-sm font-semibold',
          primary ? 'text-white' : colors.text
        )}>
          {label}
        </span>
        {description && (
          <p className={cn(
            'text-xs mt-0.5',
            primary ? 'text-white/70' : colors.muted
          )}>
            {description}
          </p>
        )}
      </div>
      <ChevronRight className={cn(
        'w-4 h-4',
        primary ? 'text-white/70' : colors.muted
      )} />
    </motion.button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LearningSidebar({
  theme = 'light',
  onSelectStrands,
  onStartFlashcards,
  onStartQuiz,
  onStartMindmap,
  strandsCount = 0,
  selectedCount = 0,
  stats = { dueToday: 0, streak: 0, mastered: 0, totalReviewed: 0 },
}: LearningSidebarProps) {
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Section expansion states
  const [clockExpanded, setClockExpanded] = useState(true)
  const [ambienceExpanded, setAmbienceExpanded] = useState(true)
  const [showQuickStart, setShowQuickStart] = useState(true)
  const [showStats, setShowStats] = useState(true)

  // Ambience sounds hook - only need isPlaying for the badge indicator
  const { isPlaying } = useAmbienceSounds()

  return (
    <div className="flex flex-col h-full">
      {/* ═══════════════════════════════════════════════════════════════════
          CLOCK SECTION (Top, Collapsible)
      ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSidebarSection
        title="Clock"
        icon={Clock}
        defaultExpanded={true}
        isExpanded={clockExpanded}
        onToggle={setClockExpanded}
        isDark={isDark}
      >
        <div className="flex justify-center py-3">
          <ClockWidget
            theme={theme}
            size="medium"
            compact={false}
            onNavigate={() => {}}
          />
        </div>
      </CollapsibleSidebarSection>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT (Middle, Scrollable)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Quick Start Section */}
        <div className={cn('rounded-xl border p-3', colors.card)}>
          <button
            onClick={() => setShowQuickStart(!showQuickStart)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className={cn(
              'text-xs font-semibold uppercase tracking-wider flex items-center gap-2',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              <GraduationCap className="w-3.5 h-3.5" />
              Quick Start
            </h3>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 transition-transform',
              colors.muted,
              showQuickStart ? 'rotate-180' : ''
            )} />
          </button>

          <AnimatePresence>
            {showQuickStart && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                <QuickStartButton
                  icon={Library}
                  label="Select Strands"
                  description={selectedCount > 0 ? `${selectedCount} selected` : `${strandsCount} available`}
                  onClick={onSelectStrands}
                  primary
                  colors={colors}
                  isDark={isDark}
                />
                <QuickStartButton
                  icon={Zap}
                  label="Flashcards"
                  description="Spaced repetition"
                  onClick={onStartFlashcards}
                  colors={colors}
                  isDark={isDark}
                />
                <QuickStartButton
                  icon={ListChecks}
                  label="Quiz Mode"
                  description="Test your knowledge"
                  onClick={onStartQuiz}
                  colors={colors}
                  isDark={isDark}
                />
                <QuickStartButton
                  icon={Network}
                  label="Mind Map"
                  description="Visual connections"
                  onClick={onStartMindmap}
                  colors={colors}
                  isDark={isDark}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Learning Stats Section */}
        <div className={cn('rounded-xl border p-3', colors.card)}>
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between mb-2"
          >
            <h3 className={cn(
              'text-xs font-semibold uppercase tracking-wider flex items-center gap-2',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              <Brain className="w-3.5 h-3.5" />
              Your Progress
            </h3>
            <ChevronDown className={cn(
              'w-3.5 h-3.5 transition-transform',
              colors.muted,
              showStats ? 'rotate-180' : ''
            )} />
          </button>

          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    icon={Target}
                    label="Due Today"
                    value={stats.dueToday}
                    color="bg-emerald-500"
                    isDark={isDark}
                  />
                  <StatCard
                    icon={Flame}
                    label="Streak"
                    value={`${stats.streak} days`}
                    color="bg-orange-500"
                    isDark={isDark}
                  />
                  <StatCard
                    icon={Trophy}
                    label="Mastered"
                    value={stats.mastered}
                    color="bg-purple-500"
                    isDark={isDark}
                  />
                  <StatCard
                    icon={BarChart3}
                    label="Reviewed"
                    value={stats.totalReviewed}
                    color="bg-blue-500"
                    isDark={isDark}
                  />
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className={colors.muted}>Today's Progress</span>
                    <span className={cn('font-medium', colors.text)}>
                      {stats.dueToday === 0 ? 'All done!' : `${stats.dueToday} remaining`}
                    </span>
                  </div>
                  <div className={cn(
                    'h-2 rounded-full overflow-hidden',
                    isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                  )}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: stats.dueToday === 0 ? '100%' : `${Math.min(100, (stats.totalReviewed / Math.max(1, stats.totalReviewed + stats.dueToday)) * 100)}%`
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tips Section */}
        <div className={cn(
          'rounded-xl border p-3',
          isDark ? 'bg-emerald-900/20 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'
        )}>
          <div className="flex items-start gap-2">
            <Lightbulb className={cn(
              'w-4 h-4 flex-shrink-0 mt-0.5',
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            )} />
            <div>
              <p className={cn('text-xs font-medium', isDark ? 'text-emerald-300' : 'text-emerald-700')}>
                Learning Tip
              </p>
              <p className={cn('text-[11px] mt-0.5', isDark ? 'text-emerald-400/80' : 'text-emerald-600/80')}>
                Select multiple strands to create comprehensive study materials that connect related concepts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          AMBIENCE SECTION (Bottom, Collapsible)
      ═══════════════════════════════════════════════════════════════════ */}
      <CollapsibleSidebarSection
        title="Ambience"
        icon={Music}
        defaultExpanded={true}
        isExpanded={ambienceExpanded}
        onToggle={setAmbienceExpanded}
        isDark={isDark}
        badge={isPlaying ? (
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
        ) : undefined}
        noBorder
      >
        <AmbienceSection theme={theme} />
      </CollapsibleSidebarSection>

      {/* Footer with Strand Count */}
      <div className={cn(
        'flex-shrink-0 px-3 py-2 border-t',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'
      )}>
        <div className="flex items-center justify-between">
          <span className={cn('text-xs', colors.muted)}>
            {strandsCount} strands in library
          </span>
          {selectedCount > 0 && (
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
            )}>
              {selectedCount} selected
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
