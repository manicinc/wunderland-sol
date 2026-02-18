/**
 * Analytics Empty States
 * @module components/quarry/analytics/AnalyticsEmptyStates
 *
 * Contextual empty states with actionable buttons and skeleton loaders
 * for each analytics tab section.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  FileText,
  Tag,
  Activity,
  Search,
  CheckCircle2,
  GitBranch,
  Timer,
  GraduationCap,
  Plus,
  BookOpen,
  Sparkles,
  TrendingUp,
  Brain,
  Zap,
  ArrowRight,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface EmptyStateConfig {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  tips: string[]
  actions: {
    label: string
    href?: string
    onClick?: () => void
    primary?: boolean
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

interface AnalyticsEmptyStateProps {
  type: 'growth' | 'tags' | 'activity' | 'research' | 'accomplishments' | 'git' | 'usage' | 'learning'
  isDark: boolean
  onAction?: (action: string) => void
}

interface SkeletonProps {
  isDark: boolean
  className?: string
}

// ============================================================================
// EMPTY STATE CONFIGURATIONS
// ============================================================================

const EMPTY_STATE_CONFIG: Record<string, EmptyStateConfig> = {
  growth: {
    icon: TrendingUp,
    title: 'No content growth data yet',
    description: 'Create strands to start tracking your content growth over time.',
    tips: [
      'Each strand you create is tracked with timestamps',
      'Growth rate compares current period vs previous',
      'Categories show content distribution by weave',
    ],
    actions: [
      { label: 'Create First Strand', href: '/quarry/new', primary: true, icon: Plus },
      { label: 'Import Content', href: '/quarry?import=true', icon: FileText },
    ],
  },
  tags: {
    icon: Tag,
    title: 'No tags found',
    description: 'Add tags to your strands to see topic distribution and trends.',
    tips: [
      'Use frontmatter tags: tags: [topic1, topic2]',
      'Subjects and topics are extracted from metadata',
      'Tag analytics show your most covered topics',
    ],
    actions: [
      { label: 'Browse Strands', href: '/quarry', primary: true, icon: BookOpen },
      { label: 'Learn About Tags', href: '/docs/tags', icon: Tag },
    ],
  },
  activity: {
    icon: Activity,
    title: 'No activity recorded',
    description: 'Your reading and editing activity will appear here as you use the app.',
    tips: [
      'Views, edits, and searches are tracked locally',
      'Session data shows your usage patterns',
      'Peak activity times help optimize your workflow',
    ],
    actions: [
      { label: 'Start Reading', href: '/quarry', primary: true, icon: BookOpen },
    ],
  },
  research: {
    icon: Search,
    title: 'No research activity',
    description: 'Search for content to build your research analytics profile.',
    tips: [
      'Semantic search queries are tracked',
      'Topic clouds show your research interests',
      'Source distribution reveals preferred content types',
    ],
    actions: [
      { label: 'Search Codex', href: '/quarry?focus=search', primary: true, icon: Search },
    ],
  },
  accomplishments: {
    icon: CheckCircle2,
    title: 'No accomplishments yet',
    description: 'Complete tasks, habits, and subtasks to track your productivity.',
    tips: [
      'Tasks and subtasks are tracked with completion dates',
      'Habits build streaks when completed daily',
      'Project breakdown shows focus areas',
    ],
    actions: [
      { label: 'View Planner', href: '/quarry/plan', primary: true, icon: CheckCircle2 },
      { label: 'Create Task', href: '/quarry/plan?new=task', icon: Plus },
    ],
  },
  git: {
    icon: GitBranch,
    title: 'No git history available',
    description: 'Commit changes to your strands to see version control analytics.',
    tips: [
      'Git sync runs automatically on page load',
      'Commit messages are analyzed for patterns',
      'Line changes show contribution volume',
    ],
    actions: [
      { label: 'Sync Git History', primary: true, icon: GitBranch },
      { label: 'Edit a Strand', href: '/quarry', icon: FileText },
    ],
  },
  usage: {
    icon: Timer,
    title: 'No usage data yet',
    description: 'Feature usage and session data will appear as you explore the app.',
    tips: [
      'Session duration and frequency are tracked',
      'Feature usage shows most-used capabilities',
      'Peak hours reveal your productivity patterns',
    ],
    actions: [
      { label: 'Explore Features', href: '/quarry', primary: true, icon: Zap },
    ],
  },
  learning: {
    icon: GraduationCap,
    title: 'No learning data',
    description: 'Generate flashcards or take quizzes to start tracking your learning progress.',
    tips: [
      'Flashcard sessions track retention with FSRS',
      'Quiz scores show topic mastery',
      'Streaks encourage consistent study habits',
    ],
    actions: [
      { label: 'Open Learning Studio', href: '/quarry/learn', primary: true, icon: Brain },
      { label: 'Generate Flashcards', icon: Sparkles },
    ],
  },
}

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

export function StatCardSkeleton({ isDark, className = '' }: SkeletonProps) {
  return (
    <div
      className={`
        rounded-xl border p-4 animate-pulse
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-6 w-16 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
          <div className={`h-4 w-24 rounded ${isDark ? 'bg-zinc-700/70' : 'bg-zinc-100'}`} />
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton({ isDark, className = '' }: SkeletonProps) {
  return (
    <div
      className={`
        rounded-xl border p-6 animate-pulse
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        ${className}
      `}
    >
      <div className={`h-5 w-32 rounded mb-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-100'}`}
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function ListSkeleton({ isDark, rows = 5, className = '' }: SkeletonProps & { rows?: number }) {
  return (
    <div
      className={`
        rounded-xl border p-6 animate-pulse
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        ${className}
      `}
    >
      <div className={`h-5 w-24 rounded mb-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className={`h-4 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} style={{ width: `${40 + Math.random() * 30}%` }} />
            <div className={`h-4 w-8 rounded ${isDark ? 'bg-zinc-700/70' : 'bg-zinc-100'}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsSkeletonGrid({ isDark }: SkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton isDark={isDark} />
        <StatCardSkeleton isDark={isDark} />
        <StatCardSkeleton isDark={isDark} />
        <StatCardSkeleton isDark={isDark} />
      </div>
      
      {/* Chart */}
      <ChartSkeleton isDark={isDark} />
      
      {/* Two column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <ListSkeleton isDark={isDark} />
        <ListSkeleton isDark={isDark} />
      </div>
    </div>
  )
}

// ============================================================================
// GETTING STARTED PROGRESS
// ============================================================================

interface DataSourceStatus {
  strands: boolean
  tags: boolean
  activity: boolean
  git: boolean
  learning: boolean
}

interface GettingStartedProps {
  dataStatus: DataSourceStatus
  isDark: boolean
  className?: string
}

export function GettingStartedProgress({ dataStatus, isDark, className = '' }: GettingStartedProps) {
  const sources = [
    { key: 'strands', label: 'Content Created', icon: FileText, ready: dataStatus.strands },
    { key: 'tags', label: 'Tags Added', icon: Tag, ready: dataStatus.tags },
    { key: 'activity', label: 'Activity Logged', icon: Activity, ready: dataStatus.activity },
    { key: 'git', label: 'Git Synced', icon: GitBranch, ready: dataStatus.git },
    { key: 'learning', label: 'Learning Started', icon: GraduationCap, ready: dataStatus.learning },
  ]

  const completedCount = sources.filter(s => s.ready).length
  const progress = (completedCount / sources.length) * 100

  if (completedCount === sources.length) return null // All complete, hide

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl border p-4 mb-6
        ${isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-zinc-200'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Getting Started with Analytics
        </h3>
        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {completedCount}/{sources.length} data sources
        </span>
      </div>
      
      {/* Progress bar */}
      <div className={`h-1.5 rounded-full mb-4 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
        />
      </div>

      {/* Source checklist */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {sources.map(source => (
          <div
            key={source.key}
            className={`
              flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs
              ${source.ready
                ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-50 text-zinc-400'
              }
            `}
          >
            <source.icon className="w-3.5 h-3.5" />
            <span className="truncate">{source.label}</span>
            {source.ready && <CheckCircle2 className="w-3 h-3 ml-auto shrink-0" />}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// MAIN EMPTY STATE COMPONENT
// ============================================================================

export function AnalyticsEmptyState({ type, isDark, onAction }: AnalyticsEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type]
  if (!config) return null

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex flex-col items-center justify-center py-16 px-6 text-center
        rounded-xl border
        ${isDark ? 'bg-zinc-800/30 border-zinc-700/50' : 'bg-zinc-50 border-zinc-200'}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-16 h-16 rounded-2xl flex items-center justify-center mb-6
          ${isDark ? 'bg-zinc-700/50' : 'bg-zinc-200/50'}
        `}
      >
        <Icon className={`w-8 h-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
      </div>

      {/* Title & Description */}
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
        {config.title}
      </h3>
      <p className={`text-sm mb-6 max-w-md ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {config.description}
      </p>

      {/* Tips */}
      <div className={`
        rounded-lg p-4 mb-6 max-w-md w-full text-left
        ${isDark ? 'bg-zinc-800/50' : 'bg-white border border-zinc-200'}
      `}>
        <p className={`text-xs font-medium mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          How this works:
        </p>
        <ul className="space-y-1.5">
          {config.tips.map((tip, i) => (
            <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-cyan-500" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {config.actions.map((action, i) => {
          const ActionIcon = action.icon
          const buttonClasses = action.primary
            ? isDark
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'bg-cyan-500 hover:bg-cyan-600 text-white'
            : isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'

          if (action.href) {
            return (
              <Link
                key={i}
                href={action.href}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-colors ${buttonClasses}
                `}
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                {action.label}
              </Link>
            )
          }

          return (
            <button
              key={i}
              onClick={() => onAction?.(action.label)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-colors ${buttonClasses}
              `}
            >
              {ActionIcon && <ActionIcon className="w-4 h-4" />}
              {action.label}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export default AnalyticsEmptyState

