/**
 * Study Insights Component
 * @module components/quarry/ui/learning/StudyInsights
 * 
 * @description
 * Displays spaced repetition insights and retention forecasts:
 * - Retention curve visualization
 * - Due cards forecast
 * - Optimal study times
 * - Memory strength indicators
 * 
 * @example
 * ```tsx
 * <StudyInsights
 *   cards={flashcards}
 *   studyHistory={history}
 *   isDark={isDark}
 * />
 * ```
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Calendar, Clock, 
  Brain, Target, Zap, AlertTriangle, ChevronRight,
  BarChart2, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from '@/components/quarry/ui/common/CollapsibleSection'

// ============================================================================
// TYPES
// ============================================================================

interface CardData {
  id: string
  stability: number
  difficulty: number
  lastReview?: string
  scheduledDays?: number
  reps: number
  lapses: number
}

interface StudySession {
  date: string
  cardsReviewed: number
  accuracy: number
  duration: number // minutes
}

interface StudyInsightsProps {
  cards: CardData[]
  studyHistory?: StudySession[]
  isDark?: boolean
  className?: string
  compact?: boolean
}

interface RetentionForecast {
  date: Date
  dueCards: number
  retention: number
}

// ============================================================================
// CALCULATIONS
// ============================================================================

function calculateRetention(stability: number, daysSinceReview: number): number {
  // FSRS retention formula: R = e^(-t/S) where t is time and S is stability
  return Math.exp(-daysSinceReview / Math.max(stability, 0.1))
}

function calculateForecast(cards: CardData[], days: number = 14): RetentionForecast[] {
  const forecast: RetentionForecast[] = []
  const now = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)

    let dueCards = 0
    let totalRetention = 0

    for (const card of cards) {
      const daysSinceReview = card.lastReview
        ? Math.floor((date.getTime() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      const retention = calculateRetention(card.stability, daysSinceReview)
      totalRetention += retention

      // Card is due if scheduled before this date
      if (card.scheduledDays !== undefined && daysSinceReview >= card.scheduledDays) {
        dueCards++
      }
    }

    forecast.push({
      date,
      dueCards,
      retention: cards.length > 0 ? totalRetention / cards.length : 1,
    })
  }

  return forecast
}

function calculateCardHealth(cards: CardData[]): {
  mature: number
  learning: number
  struggling: number
  new: number
} {
  let mature = 0
  let learning = 0
  let struggling = 0
  let newCards = 0

  for (const card of cards) {
    if (card.reps === 0) {
      newCards++
    } else if (card.lapses > card.reps * 0.3) {
      struggling++
    } else if (card.stability > 21) {
      mature++
    } else {
      learning++
    }
  }

  return { mature, learning, struggling, new: newCards }
}

function calculateOptimalStudyTime(history: StudySession[]): string {
  if (history.length < 5) return 'Not enough data'

  // Group sessions by hour
  const hourAccuracy: Record<number, { total: number; count: number }> = {}
  
  for (const session of history) {
    const hour = new Date(session.date).getHours()
    if (!hourAccuracy[hour]) {
      hourAccuracy[hour] = { total: 0, count: 0 }
    }
    hourAccuracy[hour].total += session.accuracy
    hourAccuracy[hour].count++
  }

  // Find best hour
  let bestHour = 9 // Default
  let bestAvg = 0

  for (const [hour, data] of Object.entries(hourAccuracy)) {
    const avg = data.total / data.count
    if (avg > bestAvg) {
      bestAvg = avg
      bestHour = parseInt(hour)
    }
  }

  // Format hour
  const period = bestHour >= 12 ? 'PM' : 'AM'
  const displayHour = bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour
  return `${displayHour}:00 ${period}`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
  isDark?: boolean
}

function StatCard({ icon: Icon, label, value, subtext, trend, color = 'cyan', isDark }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    cyan: isDark ? 'text-cyan-400' : 'text-cyan-600',
    green: isDark ? 'text-green-400' : 'text-green-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
    purple: isDark ? 'text-purple-400' : 'text-purple-600',
  }

  return (
    <div className={cn(
      'p-3 rounded-xl',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          isDark ? 'bg-zinc-700' : 'bg-white shadow-sm'
        )}>
          <Icon className={cn('w-4 h-4', colorClasses[color])} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className={cn(
              'text-lg font-bold',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              {value}
            </p>
            {trend && (
              <span className={cn(
                'flex items-center text-xs font-medium',
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-zinc-400'
              )}>
                {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
                 trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
              </span>
            )}
          </div>
          {subtext && (
            <p className={cn(
              'text-xs',
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            )}>
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface RetentionBarProps {
  label: string
  value: number
  count: number
  color: string
  isDark?: boolean
}

function RetentionBar({ label, value, count, color, isDark }: RetentionBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn(
        'w-20 text-sm',
        isDark ? 'text-zinc-400' : 'text-zinc-600'
      )}>
        {label}
      </span>
      <div className={cn(
        'flex-1 h-6 rounded-full overflow-hidden',
        isDark ? 'bg-zinc-700' : 'bg-zinc-200'
      )}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
      <span className={cn(
        'w-12 text-sm text-right tabular-nums',
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      )}>
        {count}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StudyInsights({
  cards,
  studyHistory = [],
  isDark = false,
  className,
  compact = false,
}: StudyInsightsProps) {
  // Calculate insights
  const health = useMemo(() => calculateCardHealth(cards), [cards])
  const forecast = useMemo(() => calculateForecast(cards, 7), [cards])
  const optimalTime = useMemo(() => calculateOptimalStudyTime(studyHistory), [studyHistory])
  
  // Current stats
  const avgRetention = useMemo(() => {
    if (cards.length === 0) return 0
    const total = cards.reduce((sum, card) => {
      const daysSince = card.lastReview
        ? Math.floor((Date.now() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24))
        : 0
      return sum + calculateRetention(card.stability, daysSince)
    }, 0)
    return Math.round((total / cards.length) * 100)
  }, [cards])

  const dueToday = useMemo(() => {
    const today = new Date()
    return cards.filter(card => {
      if (!card.lastReview || card.scheduledDays === undefined) return false
      const lastReview = new Date(card.lastReview)
      const dueDate = new Date(lastReview)
      dueDate.setDate(dueDate.getDate() + card.scheduledDays)
      return dueDate <= today
    }).length
  }, [cards])

  const avgAccuracy = useMemo(() => {
    if (studyHistory.length === 0) return 0
    return Math.round(studyHistory.reduce((sum, s) => sum + s.accuracy, 0) / studyHistory.length)
  }, [studyHistory])

  // Compact version
  if (compact) {
    return (
      <div className={cn('flex gap-4', className)}>
        <div className="flex items-center gap-2">
          <Target className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {avgRetention}% retention
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-600')} />
          <span className={cn('text-sm font-medium', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
            {dueToday} due today
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Target}
          label="Retention"
          value={`${avgRetention}%`}
          subtext="Current average"
          color="cyan"
          isDark={isDark}
        />
        <StatCard
          icon={Calendar}
          label="Due Today"
          value={dueToday}
          subtext={`of ${cards.length} cards`}
          color={dueToday > 20 ? 'amber' : 'green'}
          isDark={isDark}
        />
        <StatCard
          icon={Activity}
          label="Accuracy"
          value={`${avgAccuracy}%`}
          subtext="Recent sessions"
          trend={avgAccuracy > 80 ? 'up' : avgAccuracy < 60 ? 'down' : 'neutral'}
          color="purple"
          isDark={isDark}
        />
        <StatCard
          icon={Clock}
          label="Best Time"
          value={optimalTime}
          subtext="For studying"
          color="green"
          isDark={isDark}
        />
      </div>

      {/* Card health breakdown */}
      <CollapsibleSection
        title="Card Health"
        icon={<Brain className="w-4 h-4" />}
        badge={cards.length}
        defaultOpen
        isDark={isDark}
        bordered
      >
        <div className="space-y-2 pt-2">
          <RetentionBar
            label="Mature"
            value={(health.mature / Math.max(cards.length, 1)) * 100}
            count={health.mature}
            color="bg-green-500"
            isDark={isDark}
          />
          <RetentionBar
            label="Learning"
            value={(health.learning / Math.max(cards.length, 1)) * 100}
            count={health.learning}
            color="bg-cyan-500"
            isDark={isDark}
          />
          <RetentionBar
            label="New"
            value={(health.new / Math.max(cards.length, 1)) * 100}
            count={health.new}
            color="bg-purple-500"
            isDark={isDark}
          />
          <RetentionBar
            label="Struggling"
            value={(health.struggling / Math.max(cards.length, 1)) * 100}
            count={health.struggling}
            color="bg-red-500"
            isDark={isDark}
          />
        </div>
      </CollapsibleSection>

      {/* 7-day forecast */}
      <CollapsibleSection
        title="7-Day Forecast"
        icon={<BarChart2 className="w-4 h-4" />}
        defaultOpen={false}
        isDark={isDark}
        bordered
      >
        <div className="pt-2">
          <div className="flex items-end gap-1 h-24">
            {forecast.map((day, i) => {
              const height = Math.max(10, (day.dueCards / Math.max(...forecast.map(f => f.dueCards), 1)) * 100)
              const isToday = i === 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      'w-full rounded-t',
                      isToday
                        ? 'bg-cyan-500'
                        : day.dueCards > 20
                        ? 'bg-amber-500'
                        : isDark ? 'bg-zinc-600' : 'bg-zinc-300'
                    )}
                  />
                  <span className={cn(
                    'text-[10px]',
                    isToday 
                      ? isDark ? 'text-cyan-400 font-medium' : 'text-cyan-600 font-medium'
                      : isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    {isToday ? 'Today' : day.date.toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
          <div className={cn(
            'mt-3 text-xs text-center',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Cards due each day
          </div>
        </div>
      </CollapsibleSection>

      {/* Recommendations */}
      {(health.struggling > 0 || dueToday > 30) && (
        <div className={cn(
          'flex items-start gap-3 p-3 rounded-xl border',
          isDark 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-amber-50 border-amber-200'
        )}>
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className={cn(
              'font-medium text-sm',
              isDark ? 'text-amber-300' : 'text-amber-800'
            )}>
              Study Recommendation
            </p>
            <p className={cn(
              'text-sm mt-1',
              isDark ? 'text-amber-400/80' : 'text-amber-700'
            )}>
              {health.struggling > 0 
                ? `You have ${health.struggling} struggling cards. Consider reviewing them with shorter intervals.`
                : `You have ${dueToday} cards due today. Try to review at least 20 to stay on track.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudyInsights

