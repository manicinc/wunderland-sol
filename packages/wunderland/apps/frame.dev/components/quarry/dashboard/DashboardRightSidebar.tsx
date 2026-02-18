/**
 * Dashboard Right Sidebar
 *
 * Compact right panel for dashboard with welcome banner, stats, and quick actions.
 * Designed for fixed 240px width within QuarryPageLayout.
 * @module components/quarry/dashboard/DashboardRightSidebar
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  CheckCircle2,
  PenLine,
  Calendar,
  ArrowRight,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Clock,
  TrendingUp,
  Flame,
  BarChart3,
  Music,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTasks } from '@/lib/planner/hooks/useTasks'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { useAmbienceSounds, type SoundscapeType } from '@/lib/audio/ambienceSounds'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardRightSidebarProps {
  theme: string
  onNavigate?: (path: string) => void
}

// ============================================================================
// GREETING HELPER
// ============================================================================

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { text: 'Good morning', icon: Sunrise }
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Good afternoon', icon: Sun }
  } else if (hour >= 17 && hour < 21) {
    return { text: 'Good evening', icon: Sunset }
  } else {
    return { text: 'Good night', icon: Moon }
  }
}

// ============================================================================
// MOTIVATIONAL QUOTES
// ============================================================================

const QUOTES = [
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small steps every day lead to big results.", author: "" },
  { text: "Focus on progress, not perfection.", author: "" },
  { text: "Your only limit is your mind.", author: "" },
]

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

// ============================================================================
// STATS CARD
// ============================================================================

interface StatCardProps {
  icon: typeof CheckCircle2
  label: string
  value: string | number
  subValue?: string
  color: string
  isDark: boolean
}

function StatCard({ icon: Icon, label, value, subValue, color, isDark }: StatCardProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-2.5 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <div className={cn('p-2 rounded-lg', isDark ? 'bg-zinc-700' : 'bg-white')}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
          {label}
        </p>
        <p className={cn('text-sm font-semibold tabular-nums', isDark ? 'text-zinc-100' : 'text-zinc-800')}>
          {value}
          {subValue && (
            <span className={cn('text-xs font-normal ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              {subValue}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// QUICK ACTION BUTTON
// ============================================================================

interface QuickActionProps {
  icon: typeof PenLine
  label: string
  color: string
  onClick: () => void
  isDark: boolean
}

function QuickAction({ icon: Icon, label, color, onClick, isDark }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors w-full',
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
      )}
    >
      <Icon className={cn('w-4 h-4', color)} />
      <span className={cn('text-sm', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
        {label}
      </span>
      <ArrowRight className={cn('w-3 h-3 ml-auto', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
    </button>
  )
}

// ============================================================================
// EXPLORE LINK
// ============================================================================

interface ExploreLinkProps {
  label: string
  color: string
  bgColor: string
  onClick: () => void
  isDark: boolean
}

function ExploreLink({ label, color, bgColor, onClick, isDark }: ExploreLinkProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-2 rounded-lg text-center transition-all hover:scale-[1.02]',
        bgColor,
        isDark ? 'hover:brightness-125' : 'hover:brightness-95'
      )}
    >
      <span className={cn('text-xs font-medium', color)}>
        {label}
      </span>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardRightSidebar({ theme, onNavigate }: DashboardRightSidebarProps) {
  const isDark = theme.includes('dark')
  const navigate = onNavigate || (() => {})
  const [currentTime, setCurrentTime] = useState(new Date())
  const { stats } = useTasks({ includeCompleted: false })
  const [clockExpanded, setClockExpanded] = useState(true)
  const [jukeboxExpanded, setJukeboxExpanded] = useState(true)
  // Ambience sounds hook - only need isPlaying and soundscape for the header display
  const { isPlaying, soundscape } = useAmbienceSounds()

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const greeting = getGreeting()
  const GreetingIcon = greeting.icon
  const quote = useMemo(() => getDailyQuote(), [])

  // Calculate mock writing stats (in real app, this would come from a hook)
  const writingStats = useMemo(() => {
    // Placeholder stats - would be replaced with actual data
    const todayWords = Math.floor(Math.random() * 500) + 100
    const streak = Math.floor(Math.random() * 7) + 1
    return { todayWords, streak }
  }, [])

  return (
    <div className="h-full flex flex-col p-3 space-y-4 overflow-y-auto">
      {/* Clock Section - Always at top */}
      <div className={cn(
        'rounded-xl overflow-hidden border',
        isDark ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      )}>
        <button
          onClick={() => setClockExpanded(!clockExpanded)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
            <span className={cn('text-xs font-semibold uppercase tracking-wide', isDark ? 'text-zinc-300' : 'text-zinc-600')}>
              Clock
            </span>
          </div>
          {clockExpanded ? (
            <ChevronUp className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
          ) : (
            <ChevronDown className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
          )}
        </button>
        {clockExpanded && (
          <div className="flex justify-center py-3">
            <ClockWidget theme={theme} size="medium" compact={false} onNavigate={navigate} />
          </div>
        )}
      </div>

      {/* Welcome Banner - Compact */}
      <div className={cn(
        'p-3 rounded-xl',
        isDark
          ? 'bg-gradient-to-br from-violet-500/20 via-rose-500/15 to-amber-500/10'
          : 'bg-gradient-to-br from-violet-50 via-rose-50 to-amber-50'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <GreetingIcon className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-500')} />
          <span className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
            {greeting.text}
          </span>
        </div>
        <h2 className={cn('text-lg font-bold', isDark ? 'text-zinc-100' : 'text-zinc-800')}>
          {format(currentTime, 'EEEE')}
        </h2>
        <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
          {format(currentTime, 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Today's Stats */}
      <div className="space-y-2">
        <h3 className={cn('text-xs font-semibold uppercase tracking-wider px-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Today's Progress
        </h3>
        <div className="space-y-1.5">
          <StatCard
            icon={CheckCircle2}
            label="Tasks Due"
            value={stats.dueToday}
            subValue={stats.overdue > 0 ? `(${stats.overdue} overdue)` : undefined}
            color="text-amber-500"
            isDark={isDark}
          />
          <StatCard
            icon={TrendingUp}
            label="Words Written"
            value={writingStats.todayWords.toLocaleString()}
            color="text-blue-500"
            isDark={isDark}
          />
          <StatCard
            icon={Flame}
            label="Writing Streak"
            value={`${writingStats.streak} days`}
            color="text-orange-500"
            isDark={isDark}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h3 className={cn('text-xs font-semibold uppercase tracking-wider px-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Quick Actions
        </h3>
        <div className="space-y-0.5">
          <QuickAction
            icon={PenLine}
            label="Start Writing"
            color="text-cyan-500"
            onClick={() => navigate('/quarry/new')}
            isDark={isDark}
          />
          <QuickAction
            icon={Calendar}
            label="Open Planner"
            color="text-rose-500"
            onClick={() => navigate('/quarry/plan')}
            isDark={isDark}
          />
          <QuickAction
            icon={BarChart3}
            label="View Analytics"
            color="text-emerald-500"
            onClick={() => navigate('/quarry/analytics')}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Explore Features */}
      <div className="space-y-2">
        <h3 className={cn('text-xs font-semibold uppercase tracking-wider px-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          Explore
        </h3>
        <div className="grid grid-cols-2 gap-1">
          <ExploreLink
            label="Evolution"
            color="text-teal-500"
            bgColor={isDark ? 'bg-teal-500/10' : 'bg-teal-50'}
            onClick={() => navigate('/quarry/evolution')}
            isDark={isDark}
          />
          <ExploreLink
            label="Graph"
            color="text-purple-500"
            bgColor={isDark ? 'bg-purple-500/10' : 'bg-purple-50'}
            onClick={() => navigate('/quarry/graph')}
            isDark={isDark}
          />
          <ExploreLink
            label="Learn"
            color="text-indigo-500"
            bgColor={isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}
            onClick={() => navigate('/quarry/learn')}
            isDark={isDark}
          />
          <ExploreLink
            label="Collections"
            color="text-amber-500"
            bgColor={isDark ? 'bg-amber-500/10' : 'bg-amber-50'}
            onClick={() => navigate('/quarry/collections')}
            isDark={isDark}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Daily Quote */}
      <div className={cn(
        'p-3 rounded-lg border',
        isDark ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      )}>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className={cn('w-3 h-3', isDark ? 'text-amber-400' : 'text-amber-500')} />
          <span className={cn('text-[10px] font-medium uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            Daily Inspiration
          </span>
        </div>
        <p className={cn('text-xs italic leading-relaxed', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          "{quote.text}"
        </p>
        {quote.author && (
          <p className={cn('text-[10px] mt-1', isDark ? 'text-zinc-600' : 'text-zinc-400')}>
            — {quote.author}
          </p>
        )}
      </div>

      {/* Ambience / Jukebox Section - Full controls with jukebox, visualization, and mic */}
      <div className={cn(
        'relative rounded-xl overflow-hidden border',
        isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white'
      )}>
        {/* Collapsible Header */}
        <button
          onClick={() => setJukeboxExpanded(!jukeboxExpanded)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 transition-all duration-200',
            'border-b',
            isDark
              ? 'hover:bg-zinc-800/50 border-zinc-800/50'
              : 'hover:bg-zinc-100/50 border-zinc-200/50'
          )}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              'relative p-1.5 rounded-lg transition-all duration-300',
              isPlaying
                ? isDark
                  ? 'bg-gradient-to-br from-violet-500/30 to-rose-500/30'
                  : 'bg-gradient-to-br from-violet-100 to-rose-100'
                : isDark
                  ? 'bg-zinc-800'
                  : 'bg-zinc-100'
            )}>
              <Music className={cn(
                'w-3.5 h-3.5 transition-colors duration-300',
                isPlaying
                  ? 'text-rose-500'
                  : isDark
                    ? 'text-zinc-500'
                    : 'text-zinc-400'
              )} />
              {isPlaying && (
                <div className="absolute inset-0 rounded-lg border border-rose-500/50 animate-ping" />
              )}
            </div>
            <span className={cn(
              'text-xs font-semibold tracking-wide uppercase',
              isDark ? 'text-zinc-300' : 'text-zinc-600'
            )}>
              Ambience
            </span>
            {isPlaying && soundscape && (
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium border backdrop-blur-sm',
                isDark
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-rose-100 text-rose-600 border-rose-200'
              )}>
                ● Playing
              </span>
            )}
          </div>
          <div className={cn(
            'p-1 rounded-md transition-colors',
            isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'
          )}>
            {jukeboxExpanded ? (
              <ChevronUp className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
            ) : (
              <ChevronDown className={cn('w-3.5 h-3.5', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
            )}
          </div>
        </button>

        {/* Ambience Content */}
        {jukeboxExpanded && (
          <div className="p-3">
            <AmbienceSection theme={theme as ThemeName} />
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className={cn(
        'flex items-center gap-2 px-2 py-1.5 text-xs',
        isDark ? 'text-zinc-600' : 'text-zinc-400'
      )}>
        <Clock className="w-3 h-3" />
        <span>Session active</span>
      </div>
    </div>
  )
}

export default DashboardRightSidebar

