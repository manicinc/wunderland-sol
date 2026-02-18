/**
 * Codex Welcome Stats Component
 * @module codex/ui/QuarryWelcomeStats
 *
 * @remarks
 * A premium welcome panel displayed in the right sidebar on the Codex home page.
 * Features mood selection, daily prompts, quotes, random facts, and stats.
 * Only shown when no file is selected.
 */

'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Layers,
  FolderTree,
  Clock,
  ArrowRight,
  Network,
  Tags,
  Shuffle,
  Lightbulb,
  CalendarDays,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react'
import type { ThemeName } from '@/types/theme'
import type { Bookmark, HistoryEntry, VisitData } from '@/lib/localStorage'
import { getUserProfile, trackVisit, isFirstVisit as checkIsFirstVisit } from '@/lib/localStorage'
import { getGreetingWithContext } from '@/lib/codex/greetings'
import { getCurrentMood, setCurrentMood as persistMood, type MoodState } from '@/lib/codex/mood'
import { setDailyMood, getTodayCheckIn } from '@/lib/codex/dailyCheckIn'
import { getOrCreateReflection, saveReflection, getTodayKey } from '@/lib/reflect'
import { getDailyPrompt, type WritingPrompt } from '@/lib/codex/prompts'
import { getDailyQuote, type Quote } from '@/lib/codex/quotes'
import { SidebarMoodSelector } from '../mood/MoodSelector'
import DailyPrompt from '../prompts/DailyPrompt'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import QuoteDisplay from '../misc/QuoteDisplay'
import ProceduralBanner from '../misc/ProceduralBanner'
import ActivitySummary from '../analytics/ActivitySummary'
import InsightFacts from '../misc/InsightFacts'
import FeaturedTemplatesWidget from '../widgets/FeaturedTemplatesWidget'

interface QuarryWelcomeStatsProps {
  /** Current theme */
  theme?: ThemeName
  /** Total strand count */
  totalStrands: number
  /** Total weave count */
  totalWeaves: number
  /** Total loom count */
  totalLooms: number
  /** Reading history entries */
  history: HistoryEntry[]
  /** Bookmarked strands */
  bookmarks: Bookmark[]
  /** Navigate to a path */
  onNavigate: (path: string) => void
  /** Panel size */
  panelSize?: 's' | 'm' | 'l'
  /** Whether tree data is loading */
  loading?: boolean
  /** Error message if any */
  error?: string | null
  /** Random facts from user content */
  randomFacts?: string[]
  /** Callback to start writing from prompt */
  onStartWriting?: (prompt: WritingPrompt) => void
  /** Whether we're on mobile */
  isMobile?: boolean
  /** Whether this is the home page (show welcome on mobile only on home) */
  isHomePage?: boolean
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get file name from path
 */
function getFileName(path: string): string {
  const parts = path.split('/')
  const name = parts[parts.length - 1] || path
  return name.replace(/\.mdx?$/, '')
}

/**
 * Compact neumorphic achievement badge for stats
 */
function StatPill({ value, label, icon: Icon, color }: {
  value: number
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -1 }}
      className="flex items-center gap-1 px-2 py-1 rounded-md
        bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900
        border border-zinc-200/80 dark:border-zinc-700/60
        shadow-[0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]
        dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]
        cursor-default"
    >
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
        {label}
      </span>
    </motion.div>
  )
}

/**
 * Clean navigation button
 */
function NavButton({ onClick, icon: Icon, label, color, delay = 0 }: {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  delay?: number
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg
        bg-zinc-50 dark:bg-zinc-800/60
        border border-zinc-200 dark:border-zinc-700/50
        hover:border-zinc-300 dark:hover:border-zinc-600
        transition-all duration-150 group`}
    >
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 
        dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 transition-all ml-auto" />
    </motion.button>
  )
}

/**
 * Codex Welcome Stats - Premium home page right sidebar content
 */
export default function QuarryWelcomeStats({
  theme = 'light',
  totalStrands,
  totalWeaves,
  totalLooms,
  history,
  bookmarks,
  onNavigate,
  panelSize = 'm',
  loading = false,
  error = null,
  randomFacts = [],
  onStartWriting,
  isMobile = false,
  isHomePage = true,
}: QuarryWelcomeStatsProps) {
  // On mobile, only show the welcome panel on the home page
  if (isMobile && !isHomePage) {
    return null
  }
  const resolvePath = useQuarryPath()
  const [currentMood, setCurrentMood] = useState<MoodState | null>(null)
  const [visitData, setVisitData] = useState<VisitData | null>(null)
  const [displayName, setDisplayName] = useState<string>('Traveler')
  const [isFirstTime, setIsFirstTime] = useState(false)

  // Track visit and load profile on mount
  useEffect(() => {
    // Check if first visit BEFORE tracking (tracking creates the record)
    const firstTime = checkIsFirstVisit()
    setIsFirstTime(firstTime)

    // Track the visit
    const data = trackVisit()
    setVisitData(data)

    // Load profile
    const profile = getUserProfile()
    setDisplayName(profile.displayName || 'Traveler')

    // Load mood - check daily check-in first (persists full day), fall back to session mood
    const todayCheckIn = getTodayCheckIn()
    const dailyMood = todayCheckIn?.mood || null
    const sessionMood = getCurrentMood()
    setCurrentMood(dailyMood || sessionMood)
  }, [])

  // Get smart personalized greeting
  const { greeting, subtitle, emoji } = useMemo(() =>
    getGreetingWithContext({
      displayName,
      mood: currentMood ?? undefined,
      isFirstVisit: isFirstTime,
      isFirstVisitToday: visitData ? visitData.visitCount === 1 : false,
      streak: visitData?.currentStreak,
      visitCount: visitData?.visitCount,
    }),
    [currentMood, displayName, isFirstTime, visitData]
  )

  // Get recent history (last 3)
  const recentHistory = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, 3)
  }, [history])
  
  // Handle prompt start writing
  const handleStartWriting = useCallback((prompt: WritingPrompt) => {
    if (onStartWriting) {
      onStartWriting(prompt)
    } else {
      // Default: navigate to new strand page with prompt ID
      window.location.href = `/quarry/new?prompt=${encodeURIComponent(prompt.id)}`
    }
  }, [onStartWriting])

  // Handle mood change - persists to daily check-in and reflection
  const handleMoodChange = useCallback(async (mood: MoodState | null) => {
    // Update local state
    setCurrentMood(mood)

    if (!mood) return

    // Persist to session (mood tracking system)
    persistMood(mood)

    // Persist to daily check-in system
    setDailyMood(mood)

    // Also update today's reflection metadata
    try {
      const todayKey = getTodayKey()
      const result = await getOrCreateReflection(todayKey)
      if (result.reflection) {
        const updated = {
          ...result.reflection,
          metadata: {
            ...result.reflection.metadata,
            mood,
            moodSetAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        }
        await saveReflection(updated, result.content)
      }
    } catch (error) {
      console.error('Failed to update reflection mood:', error)
    }
  }, [])

  // Size-based styling
  const sizeClasses = {
    s: 'text-xs',
    m: 'text-sm',
    l: 'text-base',
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-red-500 dark:text-red-400 mb-2">
          Failed to load Codex
        </div>
        <div className="text-xs text-zinc-500">{error}</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-full min-h-0 overflow-y-auto p-4 space-y-6 ${sizeClasses[panelSize]}`}
    >
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        {/* Procedural decorative banner */}
        <div className="mb-3">
          <ProceduralBanner 
            theme={theme} 
            width={180}
            height={50}
            animated
          />
        </div>
        
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5"
        >
          {greeting}!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-xs text-zinc-500 dark:text-zinc-400"
        >
          {subtitle || 'Welcome to Quarry'}
        </motion.p>
      </motion.div>

      {/* Mood Selector - Hover to reveal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="px-1"
      >
        <SidebarMoodSelector
          selected={currentMood}
          onSelect={handleMoodChange}
        />
      </motion.div>
      
      {/* Daily Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <QuoteDisplay 
          daily 
          allowRefresh 
          compact={panelSize === 's'}
          theme={theme}
        />
      </motion.div>

      {/* Stats - Clean Horizontal Pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {loading ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-8 w-24 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            <StatPill
              value={totalStrands}
              label="strands"
              icon={BookOpen}
              color="text-emerald-500"
            />
            <StatPill
              value={totalWeaves}
              label="weaves"
              icon={Layers}
              color="text-cyan-500"
            />
            <StatPill
              value={totalLooms}
              label="looms"
              icon={FolderTree}
              color="text-amber-500"
            />
          </div>
        )}
      </motion.div>
      
      {/* Daily Prompt */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 
          uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" />
          Today's Prompt
        </h3>
        <DailyPrompt 
          mood={currentMood}
          onStartWriting={handleStartWriting}
          compact={panelSize === 's'}
          theme={theme}
        />
      </motion.div>
      
      {/* Activity Summary - Collapsible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <ActivitySummary
          history={history}
          totalStrands={totalStrands}
          theme={theme}
        />
      </motion.div>

      {/* Insights from your Codex */}
      {history.length > 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <InsightFacts
            history={history}
            theme={theme}
            maxFacts={3}
          />
        </motion.div>
      )}

      {/* Recent Activity */}
      {recentHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 
            uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Recent Activity
          </h3>
          <div className="space-y-1">
            {recentHistory.map((entry, index) => (
              <motion.button
                key={entry.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.03 }}
                onClick={() => onNavigate(entry.path)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                  hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group text-left
                  border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
              >
                <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate font-medium">
                  {entry.title || getFileName(entry.path)}
                </span>
                <span className="text-[9px] text-zinc-400 group-hover:text-zinc-600 
                  dark:group-hover:text-zinc-300 flex-shrink-0">
                  {formatRelativeTime(entry.viewedAt)}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Productivity Widget */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.62 }}
        className="pt-4 border-t border-zinc-200 dark:border-zinc-700"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400
            uppercase tracking-wide flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" />
            Today&apos;s Focus
          </h3>
          <a
            href={resolvePath('/quarry/plan')}
            className="text-[9px] text-rose-500 hover:text-rose-600 font-medium"
          >
            Open Planner →
          </a>
        </div>
        <div className="space-y-2">
          {/* Quick task stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <Circle className="w-4 h-4 text-amber-500 mb-1" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">0</span>
              <span className="text-[9px] text-zinc-500">Pending</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <AlertCircle className="w-4 h-4 text-red-500 mb-1" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">0</span>
              <span className="text-[9px] text-zinc-500">Overdue</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">0</span>
              <span className="text-[9px] text-zinc-500">Done</span>
            </div>
          </div>
          {/* Empty state hint */}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center py-2">
            Add tasks with checkboxes in your strands or visit the planner
          </p>
        </div>
      </motion.div>

      {/* Quick Navigation - Premium Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
      >
        <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400
          uppercase tracking-wide mb-3">
          Quick Navigation
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <NavButton
            onClick={() => onNavigate('weaves')}
            icon={Layers}
            label="Explore"
            color="text-emerald-500"
            delay={0.66}
          />
          <NavButton
            onClick={() => onNavigate('tags')}
            icon={Tags}
            label="Tags"
            color="text-cyan-500"
            delay={0.67}
          />
          <NavButton
            onClick={() => onNavigate('graph')}
            icon={Network}
            label="Graph"
            color="text-purple-500"
            delay={0.68}
          />
          <NavButton
            onClick={() => onNavigate('planner')}
            icon={CalendarDays}
            label="Planner"
            color="text-rose-500"
            delay={0.69}
          />
        </div>
      </motion.div>

      {/* Featured Templates */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.72 }}
        className="pt-4 border-t border-zinc-200 dark:border-zinc-700"
      >
        <FeaturedTemplatesWidget
          isDark={theme?.includes('dark')}
          maxTemplates={4}
          compact
          onOpenGallery={() => onNavigate('new')}
          onSelectTemplate={(template) => {
            // Navigate to new strand page with template
            window.location.href = `/quarry/new?template=${encodeURIComponent(template.id)}`
          }}
        />
      </motion.div>

      {/* Bookmarks Summary */}
      {bookmarks.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="pt-4 border-t border-zinc-200 dark:border-zinc-700"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Bookmarks
            </h3>
            <span className="text-[9px] text-zinc-400 px-1.5 py-0.5 rounded-full 
              bg-zinc-100 dark:bg-zinc-800">
              {bookmarks.length} saved
            </span>
          </div>
          <button
            onClick={() => onNavigate('bookmarks')}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-lg
              border border-zinc-200 dark:border-zinc-700
              text-xs text-zinc-600 dark:text-zinc-400 font-medium
              hover:bg-zinc-100 dark:hover:bg-zinc-800
              hover:border-zinc-300 dark:hover:border-zinc-600
              transition-all duration-200"
          >
            View all bookmarks
            <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Footer hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="text-center pb-4"
      >
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
          Select a strand to view its details
        </p>
      </motion.div>
    </motion.div>
  )
}
