'use client'

/**
 * Stats Widget
 * @module components/quarry/ui/meditate/widgets/StatsWidget
 * 
 * Productivity statistics widget showing:
 * - Work time (today, week, month, all time)
 * - Session counts
 * - Streak tracking
 * - Charts and graphs
 */

import React, { useMemo, useState } from 'react'
import { Flame, Clock, Target, TrendingUp, Calendar, Pen, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import {
  getTodayStats,
  getWeeklyStats,
  getProgress,
  getAllDailyStats,
  type DailyStats,
} from '@/lib/focus/focusAnalytics'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface StatsWidgetProps {
  theme: ThemeName
}

interface PomodoroSession {
  id: string
  mode: string
  duration: number
  completedAt: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

function loadSessions(): PomodoroSession[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem('pomodoro-sessions')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

type StatsView = 'pomodoro' | 'focus'

export default function StatsWidget({ theme }: StatsWidgetProps) {
  const isDark = isDarkTheme(theme)
  const [view, setView] = useState<StatsView>('focus')
  const sessions = useMemo(() => loadSessions(), [])

  // Focus analytics data
  const focusData = useMemo(() => {
    const today = getTodayStats()
    const weekly = getWeeklyStats()
    const progress = getProgress()

    return {
      today,
      weekly,
      progress,
    }
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())

    const workSessions = sessions.filter((s) => s.mode === 'work')

    const todaySessions = workSessions.filter(
      (s) => new Date(s.completedAt) >= today
    )
    const weekSessions = workSessions.filter(
      (s) => new Date(s.completedAt) >= weekAgo
    )
    const monthSessions = workSessions.filter(
      (s) => new Date(s.completedAt) >= monthAgo
    )

    const todayTime = todaySessions.reduce((sum, s) => sum + s.duration, 0)
    const weekTime = weekSessions.reduce((sum, s) => sum + s.duration, 0)
    const monthTime = monthSessions.reduce((sum, s) => sum + s.duration, 0)
    const allTime = workSessions.reduce((sum, s) => sum + s.duration, 0)

    // Calculate streak
    let streak = 0
    const checkDate = new Date(today)
    while (true) {
      const dayStart = new Date(checkDate)
      const dayEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      const hasSession = workSessions.some((s) => {
        const date = new Date(s.completedAt)
        return date >= dayStart && date < dayEnd
      })
      if (!hasSession && checkDate < today) break
      if (hasSession) streak++
      checkDate.setDate(checkDate.getDate() - 1)
      if (streak > 365) break // Safety limit
    }

    // Weekly chart data (last 7 days)
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(today.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const dayTotal = workSessions
        .filter((s) => {
          const d = new Date(s.completedAt)
          return d >= date && d < dayEnd
        })
        .reduce((sum, s) => sum + s.duration, 0)
      return {
        day: date.toLocaleDateString(undefined, { weekday: 'short' }),
        minutes: Math.round(dayTotal / 60),
      }
    })

    return {
      todayTime,
      weekTime,
      monthTime,
      allTime,
      todaySessions: todaySessions.length,
      weekSessions: weekSessions.length,
      totalSessions: workSessions.length,
      streak,
      weeklyData,
    }
  }, [sessions])

  // Format time helper
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Max for chart scaling
  const maxMinutes = Math.max(...stats.weeklyData.map((d) => d.minutes), 1)

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      {/* View tabs */}
      <div className={cn(
        'flex gap-1 p-1 rounded-lg mb-4',
        isDark ? 'bg-white/5' : 'bg-black/5'
      )}>
        <button
          onClick={() => setView('focus')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            view === 'focus'
              ? isDark
                ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30'
                : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
              : isDark
              ? 'text-white/50 hover:text-white/70'
              : 'text-black/50 hover:text-black/70'
          )}
        >
          <Zap className="w-3 h-3" />
          Focus
        </button>
        <button
          onClick={() => setView('pomodoro')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            view === 'pomodoro'
              ? isDark
                ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
                : 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
              : isDark
              ? 'text-white/50 hover:text-white/70'
              : 'text-black/50 hover:text-black/70'
          )}
        >
          <Clock className="w-3 h-3" />
          Pomodoro
        </button>
      </div>

      {view === 'focus' ? (
        <FocusStatsView focusData={focusData} isDark={isDark} formatTime={formatTime} />
      ) : (
        <>
          {/* Top stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard
              icon={Clock}
              label="Today"
              value={formatTime(stats.todayTime)}
              subValue={`${stats.todaySessions} sessions`}
              isDark={isDark}
            />
            <StatCard
              icon={Flame}
              label="Streak"
              value={`${stats.streak}`}
              subValue="days"
              isDark={isDark}
              highlight
            />
            <StatCard
              icon={Target}
              label="Total"
              value={formatTime(stats.allTime)}
              subValue={`${stats.totalSessions} sessions`}
              isDark={isDark}
            />
          </div>

      {/* Weekly chart with holographic styling */}
      <div 
        className="flex-1 p-3 rounded-xl relative overflow-hidden"
        style={{
          background: isDark 
            ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.05) 50%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.04) 50%, rgba(99,102,241,0.08) 100%)',
          border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(99,102,241,0.15)',
        }}
      >
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: isDark 
              ? 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <TrendingUp className={cn(
            'w-4 h-4',
            isDark ? 'text-purple-400' : 'text-indigo-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-white/90' : 'text-slate-700'
          )}>
            This Week
          </span>
          <span className={cn(
            'text-xs ml-auto font-medium',
            isDark ? 'text-purple-300/70' : 'text-indigo-500/70'
          )}>
            {formatTime(stats.weekTime)} total
          </span>
        </div>

        {/* Bar chart with gradient bars */}
        <div className="flex items-end justify-between h-24 gap-1.5 relative z-10">
          {stats.weeklyData.map((day, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-t transition-all duration-500 relative overflow-hidden"
                style={{
                  height: `${Math.max((day.minutes / maxMinutes) * 100, 6)}%`,
                  background: day.minutes > 0
                    ? isDark 
                      ? 'linear-gradient(180deg, rgba(167,139,250,0.9) 0%, rgba(139,92,246,0.7) 50%, rgba(99,102,241,0.5) 100%)'
                      : 'linear-gradient(180deg, rgba(129,140,248,0.9) 0%, rgba(99,102,241,0.7) 50%, rgba(79,70,229,0.5) 100%)'
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)',
                  boxShadow: day.minutes > 0
                    ? isDark 
                      ? '0 0 10px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : '0 0 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.4)'
                    : 'none',
                }}
              >
                {/* Shimmer effect on bars */}
                {day.minutes > 0 && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"
                    style={{ height: '50%' }}
                  />
                )}
              </div>
              <span className={cn(
                'text-[10px] mt-1.5 font-medium',
                isDark ? 'text-white/50' : 'text-slate-500'
              )}>
                {day.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional stats */}
      <div className={cn(
        'flex items-center justify-between mt-4 pt-4',
        'border-t',
        isDark ? 'border-white/10' : 'border-black/10'
      )}>
        <div className="flex items-center gap-2">
          <Calendar className={cn(
            'w-4 h-4',
            isDark ? 'text-white/40' : 'text-black/40'
          )} />
          <span className={cn(
            'text-xs',
            isDark ? 'text-white/60' : 'text-black/60'
          )}>
            This month: {formatTime(stats.monthTime)}
          </span>
        </div>
        <span className={cn(
          'text-xs',
          isDark ? 'text-white/40' : 'text-black/40'
        )}>
          {stats.weekSessions} sessions this week
        </span>
      </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOCUS STATS VIEW
═══════════════════════════════════════════════════════════════════════════ */

interface FocusStatsViewProps {
  focusData: {
    today: DailyStats
    weekly: ReturnType<typeof getWeeklyStats>
    progress: ReturnType<typeof getProgress>
  }
  isDark: boolean
  formatTime: (seconds: number) => string
}

function FocusStatsView({ focusData, isDark, formatTime }: FocusStatsViewProps) {
  const { today, weekly, progress } = focusData

  return (
    <>
      {/* Top stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard
          icon={Clock}
          label="Today"
          value={formatTime(today.totalFocusTime)}
          subValue={`${today.sessionsCompleted} sessions`}
          isDark={isDark}
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${progress.currentStreak}`}
          subValue="days"
          isDark={isDark}
          highlight
        />
        <StatCard
          icon={Pen}
          label="Words"
          value={today.wordsWritten.toLocaleString()}
          subValue={today.averageWpm > 0 ? `${today.averageWpm} wpm` : 'today'}
          isDark={isDark}
        />
      </div>

      {/* Progress bars */}
      <div className={cn(
        'p-3 rounded-xl mb-4',
        isDark ? 'bg-white/5' : 'bg-black/5'
      )}>
        <div className="space-y-3">
          <ProgressBar
            label="Focus Time"
            progress={progress.focusTimeProgress}
            isDark={isDark}
            color="purple"
          />
          <ProgressBar
            label="Word Count"
            progress={progress.wordCountProgress}
            isDark={isDark}
            color="blue"
          />
          <ProgressBar
            label="Weekly Sessions"
            progress={progress.weeklySessionProgress}
            isDark={isDark}
            color="green"
          />
        </div>
      </div>

      {/* Weekly chart */}
      <div
        className="flex-1 p-3 rounded-xl relative overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.05) 50%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.04) 50%, rgba(99,102,241,0.08) 100%)',
          border: isDark ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(99,102,241,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className={cn('w-4 h-4', isDark ? 'text-purple-400' : 'text-indigo-500')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-white/90' : 'text-slate-700')}>
            This Week
          </span>
          <span className={cn('text-xs ml-auto font-medium', isDark ? 'text-purple-300/70' : 'text-indigo-500/70')}>
            {formatTime(weekly.totalFocusTime)} total
          </span>
        </div>

        {/* Bar chart */}
        <div className="flex items-end justify-between h-20 gap-1.5">
          {weekly.dailyStats.map((day, i) => {
            const maxTime = Math.max(...weekly.dailyStats.map((d) => d.totalFocusTime), 1)
            const height = Math.max((day.totalFocusTime / maxTime) * 100, 6)
            const dayName = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })

            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t transition-all duration-500 relative overflow-hidden"
                  style={{
                    height: `${height}%`,
                    background:
                      day.totalFocusTime > 0
                        ? isDark
                          ? 'linear-gradient(180deg, rgba(167,139,250,0.9) 0%, rgba(139,92,246,0.7) 50%, rgba(99,102,241,0.5) 100%)'
                          : 'linear-gradient(180deg, rgba(129,140,248,0.9) 0%, rgba(99,102,241,0.7) 50%, rgba(79,70,229,0.5) 100%)'
                        : isDark
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)',
                  }}
                />
                <span className={cn('text-[10px] mt-1.5 font-medium', isDark ? 'text-white/50' : 'text-slate-500')}>
                  {dayName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Distractions */}
      {today.totalDistractions > 0 && (
        <div className={cn(
          'flex items-center gap-2 mt-4 pt-4 border-t',
          isDark ? 'border-white/10' : 'border-black/10'
        )}>
          <AlertTriangle className={cn('w-4 h-4', isDark ? 'text-amber-400/70' : 'text-amber-500/70')} />
          <span className={cn('text-xs', isDark ? 'text-white/60' : 'text-black/60')}>
            {today.totalDistractions} distraction{today.totalDistractions !== 1 ? 's' : ''} today
          </span>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════════════════════════════════════════ */

interface ProgressBarProps {
  label: string
  progress: number
  isDark: boolean
  color: 'purple' | 'blue' | 'green' | 'orange'
}

function ProgressBar({ label, progress, isDark, color }: ProgressBarProps) {
  const colors = {
    purple: isDark ? 'from-purple-500 to-purple-400' : 'from-indigo-500 to-indigo-400',
    blue: isDark ? 'from-blue-500 to-cyan-400' : 'from-blue-500 to-cyan-400',
    green: isDark ? 'from-green-500 to-emerald-400' : 'from-green-500 to-emerald-400',
    orange: isDark ? 'from-orange-500 to-amber-400' : 'from-orange-500 to-amber-400',
  }

  return (
    <div className="flex items-center gap-3">
      <span className={cn('text-xs w-24 flex-shrink-0', isDark ? 'text-white/60' : 'text-black/60')}>
        {label}
      </span>
      <div className={cn('flex-1 h-2 rounded-full overflow-hidden', isDark ? 'bg-white/10' : 'bg-black/10')}>
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', colors[color])}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={cn('text-xs w-8 text-right font-medium', isDark ? 'text-white/70' : 'text-black/70')}>
        {progress}%
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════════════════════ */

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  subValue?: string
  isDark: boolean
  highlight?: boolean
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  isDark,
  highlight,
}: StatCardProps) {
  return (
    <div
      className="p-3 rounded-xl relative overflow-hidden"
      style={{
        background: highlight
          ? isDark 
            ? 'linear-gradient(135deg, rgba(251,146,60,0.2) 0%, rgba(244,63,94,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(251,146,60,0.15) 0%, rgba(244,63,94,0.1) 100%)'
          : isDark
            ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)',
        border: highlight
          ? isDark ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(244,63,94,0.2)'
          : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: highlight
          ? isDark ? '0 0 20px rgba(251,146,60,0.15)' : '0 0 15px rgba(244,63,94,0.1)'
          : 'none',
      }}
    >
      {/* Subtle highlight shimmer */}
      {highlight && (
        <div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(251,146,60,0.5), transparent)',
          }}
        />
      )}
      
      <div className="flex items-center gap-1.5 mb-1">
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            highlight
              ? 'text-orange-400'
              : isDark
                ? 'text-purple-400/70'
                : 'text-indigo-500/70'
          )}
          style={highlight ? { filter: 'drop-shadow(0 0 4px rgba(251,146,60,0.5))' } : {}}
        />
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wide',
            isDark ? 'text-white/50' : 'text-slate-500'
          )}
        >
          {label}
        </span>
      </div>
      <div
        className={cn(
          'text-xl font-bold',
          highlight
            ? 'text-orange-400'
            : isDark
              ? 'text-white'
              : 'text-slate-800'
        )}
        style={highlight ? { textShadow: '0 0 20px rgba(251,146,60,0.4)' } : {}}
      >
        {value}
      </div>
      {subValue && (
        <div
          className={cn(
            'text-[10px]',
            isDark ? 'text-white/40' : 'text-slate-400'
          )}
        >
          {subValue}
        </div>
      )}
    </div>
  )
}


