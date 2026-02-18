/**
 * Activity Summary Component for Quarry Codex
 * @module components/quarry/ui/ActivitySummary
 * 
 * @description
 * A collapsible card showing a summary of user activity:
 * - Strands viewed today/this week
 * - Writing streak
 * - Most active times
 * - Recent themes
 * 
 * Replaces the old activity-based random facts.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Eye,
  Clock,
  Calendar,
  Flame,
  BookOpen,
  TrendingUp,
} from 'lucide-react'
import type { HistoryEntry } from '@/lib/localStorage'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ActivitySummaryProps {
  /** View history from local storage */
  history: HistoryEntry[]
  /** Total strands in repository */
  totalStrands: number
  /** Feature flags */
  featureFlags?: {
    enableFlashcards?: boolean
    enableQuizzes?: boolean
  }
  /** Study stats from learning studio */
  studyStats?: {
    cardsReviewedToday?: number
    streakDays?: number
    lastStudyDate?: string
  }
  /** Theme for styling */
  theme?: string
  /** Custom class name */
  className?: string
}

interface ActivityMetrics {
  viewedToday: number
  viewedThisWeek: number
  uniqueStrands: number
  mostActiveHour: string
  mostActiveDay: string
  viewingStreak: number
  recentTopics: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function calculateMetrics(history: HistoryEntry[]): ActivityMetrics {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  
  // Views today and this week
  const viewedToday = history.filter(h => new Date(h.viewedAt) >= todayStart).length
  const viewedThisWeek = history.filter(h => new Date(h.viewedAt) >= weekStart).length
  
  // Unique strands
  const uniqueStrands = new Set(history.map(h => h.path)).size
  
  // Most active hour
  const hourCounts = new Array(24).fill(0)
  history.forEach(h => {
    const hour = new Date(h.viewedAt).getHours()
    hourCounts[hour]++
  })
  const maxHourCount = Math.max(...hourCounts)
  const mostActiveHourNum = hourCounts.indexOf(maxHourCount)
  const mostActiveHour = formatHour(mostActiveHourNum)
  
  // Most active day
  const dayCounts: Record<string, number> = {}
  history.forEach(h => {
    const day = new Date(h.viewedAt).toLocaleDateString('en-US', { weekday: 'long' })
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  const mostActiveDay = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data'
  
  // Viewing streak (consecutive days with views)
  const viewDays = new Set(
    history.map(h => new Date(h.viewedAt).toDateString())
  )
  let streak = 0
  let checkDate = new Date(now)
  while (viewDays.has(checkDate.toDateString())) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  // Recent topics (from paths)
  const topicCounts: Record<string, number> = {}
  const recentHistory = history.filter(h => new Date(h.viewedAt) >= weekStart)
  recentHistory.forEach(h => {
    const parts = h.path.split('/').filter(p => p.length > 0)
    // Take first meaningful path segment (skip common folders)
    const topic = parts.find(p => 
      !['weaves', 'looms', 'docs', 'notes', 'content', 'data'].includes(p.toLowerCase())
    )
    if (topic) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1
    }
  })
  const recentTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic)
  
  return {
    viewedToday,
    viewedThisWeek,
    uniqueStrands,
    mostActiveHour,
    mostActiveDay,
    viewingStreak: streak,
    recentTopics,
  }
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:00 ${ampm}`
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ActivitySummary({
  history,
  totalStrands,
  featureFlags = {},
  studyStats,
  theme = 'light',
  className = '',
}: ActivitySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isDark = theme?.includes('dark')
  
  const metrics = useMemo(() => calculateMetrics(history), [history])
  
  // Coverage percentage - cap at 100% since history may include deleted strands
  const coveragePercent = totalStrands > 0 
    ? Math.min(100, Math.round((metrics.uniqueStrands / totalStrands) * 100)) 
    : 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-xl
        ${isDark 
          ? 'bg-gradient-to-br from-zinc-800/90 to-zinc-900/90 border border-zinc-700/50' 
          : 'bg-gradient-to-br from-white to-zinc-50 border border-zinc-200/50'
        }
        shadow-lg
        ${className}
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between p-3
          ${isDark ? 'hover:bg-zinc-700/30' : 'hover:bg-zinc-100/50'}
          transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`
            p-1.5 rounded-lg
            ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}
          `}>
            <Activity className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className="text-left">
            <h3 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Your Activity
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {metrics.viewedToday} viewed today · {coveragePercent}% explored
            </p>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
        </motion.div>
      </button>
      
      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`
              px-3 pb-3 pt-1 space-y-3
              border-t ${isDark ? 'border-zinc-700/50' : 'border-zinc-200/50'}
            `}>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatItem
                  icon={Eye}
                  label="This Week"
                  value={metrics.viewedThisWeek}
                  isDark={isDark}
                />
                <StatItem
                  icon={BookOpen}
                  label="Unique Strands"
                  value={metrics.uniqueStrands}
                  isDark={isDark}
                />
                <StatItem
                  icon={Clock}
                  label="Peak Time"
                  value={metrics.mostActiveHour}
                  isDark={isDark}
                />
                <StatItem
                  icon={Calendar}
                  label="Best Day"
                  value={metrics.mostActiveDay.slice(0, 3)}
                  isDark={isDark}
                />
              </div>
              
              {/* Streak */}
              {metrics.viewingStreak > 0 && (
                <div className={`
                  flex items-center gap-2 px-2 py-1.5 rounded-lg
                  ${isDark ? 'bg-orange-900/20' : 'bg-orange-50'}
                `}>
                  <Flame className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                  <span className={`text-xs font-medium ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                    {metrics.viewingStreak} day viewing streak!
                  </span>
                </div>
              )}
              
              {/* Recent Topics */}
              {metrics.recentTopics.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className={`w-3 h-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] uppercase tracking-wider font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Recent Focus
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {metrics.recentTopics.map((topic) => (
                      <span
                        key={topic}
                        className={`
                          px-2 py-0.5 rounded text-xs
                          ${isDark 
                            ? 'bg-zinc-700 text-zinc-300' 
                            : 'bg-zinc-100 text-zinc-700'
                          }
                        `}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Study Stats (if available) */}
              {studyStats && studyStats.streakDays && studyStats.streakDays > 0 && (
                <div className={`
                  flex items-center gap-2 px-2 py-1.5 rounded-lg
                  ${isDark ? 'bg-purple-900/20' : 'bg-purple-50'}
                `}>
                  <span className="text-sm">📚</span>
                  <span className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                    {studyStats.streakDays} day study streak · {studyStats.cardsReviewedToday || 0} cards today
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StatItem({
  icon: Icon,
  label,
  value,
  isDark,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  isDark: boolean
}) {
  return (
    <div className={`
      flex items-center gap-2 px-2 py-1.5 rounded-lg
      ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100/50'}
    `}>
      <Icon className={`w-3 h-3 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {value}
        </span>
        <span className={`text-[9px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {label}
        </span>
      </div>
    </div>
  )
}

