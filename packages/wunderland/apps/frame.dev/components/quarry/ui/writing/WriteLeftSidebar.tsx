/**
 * Write Left Sidebar
 * 
 * Compact left sidebar for Write/Prompts mode.
 * Uses shared collapsible sections for consistency across pages.
 * @module components/quarry/ui/writing/WriteLeftSidebar
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Zap,
  Sparkles,
  Lightbulb,
  Timer,
  BarChart3,
  Flame,
  FolderOpen,
  ChevronRight,
  PenLine,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  getAllProjects,
  getWordCountStats,
  type WritingProject,
  type WordCountStats,
  PROJECT_TYPE_ICONS,
} from '@/lib/write'
import {
  TimerSection,
  CollapsibleSidebarSection,
} from '@/components/quarry/ui/sidebar/sections'
import DailyPrompt from '@/components/quarry/ui/prompts/DailyPrompt'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface WriteLeftSidebarProps {
  /** Current theme */
  theme?: ThemeName
  /** Callback to start writing with blank editor */
  onStartBlank?: () => void
  /** Callback to start writing with prompt */
  onStartWithPrompt?: () => void
  /** Callback to start timed session */
  onStartTimed?: () => void
  /** Callback when project is selected */
  onSelectProject?: (project: WritingProject) => void
  /** Navigation handler */
  onNavigate?: (path: string) => void
}

// ============================================================================
// THEME UTILITIES
// ============================================================================

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const colors = {
    standard: {
      cta: isDark ? 'from-emerald-600 to-cyan-600' : 'from-emerald-500 to-cyan-500',
      ctaHover: isDark ? 'hover:from-emerald-700 hover:to-cyan-700' : 'hover:from-emerald-600 hover:to-cyan-600',
      card: isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      muted: isDark ? 'text-zinc-400' : 'text-zinc-500',
    },
    sepia: {
      cta: isDark ? 'from-amber-600 to-orange-600' : 'from-amber-500 to-orange-500',
      ctaHover: isDark ? 'hover:from-amber-700 hover:to-orange-700' : 'hover:from-amber-600 hover:to-orange-600',
      card: isDark ? 'bg-stone-800/50 border-stone-700' : 'bg-amber-50/50 border-amber-200',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      muted: isDark ? 'text-stone-400' : 'text-stone-500',
    },
    terminal: {
      cta: isDark ? 'from-green-600 to-lime-600' : 'from-green-500 to-lime-500',
      ctaHover: isDark ? 'hover:from-green-700 hover:to-lime-700' : 'hover:from-green-600 hover:to-lime-600',
      card: isDark ? 'bg-zinc-900/50 border-green-900/50' : 'bg-green-50/50 border-green-200',
      text: isDark ? 'text-green-100' : 'text-green-900',
      muted: isDark ? 'text-green-400' : 'text-green-600',
    },
    oceanic: {
      cta: isDark ? 'from-cyan-600 to-teal-600' : 'from-cyan-500 to-teal-500',
      ctaHover: isDark ? 'hover:from-cyan-700 hover:to-teal-700' : 'hover:from-cyan-600 hover:to-teal-600',
      card: isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-cyan-50/50 border-cyan-200',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      muted: isDark ? 'text-slate-400' : 'text-slate-500',
    },
  }

  return colors[category]
}

// ============================================================================
// STAT PILL
// ============================================================================

function StatPill({
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
      'p-2 rounded-lg border',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-50 border-zinc-200'
    )}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={cn('w-3 h-3', color)} />
        <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {label}
        </span>
      </div>
      <span className={cn('text-sm font-bold', isDark ? 'text-zinc-100' : 'text-zinc-800')}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

// ============================================================================
// PROJECT ITEM
// ============================================================================

function ProjectItem({
  project,
  onSelect,
  isDark,
}: {
  project: WritingProject
  onSelect: () => void
  isDark: boolean
}) {
  const totalWords = project.parts.reduce(
    (sum, part) => sum + part.chapters.reduce((chapterSum, ch) => chapterSum + ch.wordCount, 0),
    0
  )

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-left',
        isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
      )}
    >
      <span className="text-sm">{PROJECT_TYPE_ICONS[project.type]}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
          {project.title}
        </p>
        <p className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {totalWords.toLocaleString()} words
        </p>
      </div>
      <ChevronRight className={cn('w-3 h-3', isDark ? 'text-zinc-600' : 'text-zinc-400')} />
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WriteLeftSidebar({
  theme = 'dark',
  onStartBlank,
  onStartWithPrompt,
  onStartTimed,
  onSelectProject,
  onNavigate,
}: WriteLeftSidebarProps) {
  const router = useRouter()
  const resolvePath = useQuarryPath()
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  const [stats, setStats] = useState<WordCountStats | null>(null)
  const [projects, setProjects] = useState<WritingProject[]>([])

  // Load data
  useEffect(() => {
    setStats(getWordCountStats())
    setProjects(getAllProjects().filter(p => p.status !== 'archived').slice(0, 4))
  }, [])

  const handleProjectSelect = useCallback((project: WritingProject) => {
    if (onSelectProject) {
      onSelectProject(project)
    } else {
      const firstChapter = project.parts[0]?.chapters[0]
      if (firstChapter) {
        router.push(resolvePath(`/quarry?path=${encodeURIComponent(firstChapter.strandPath)}`))
      }
    }
  }, [onSelectProject, router, resolvePath])

  const navigate = onNavigate || ((path: string) => router.push(path))

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Quick Start - Always visible at top */}
      <div className={cn('p-3 border-b', isDark ? 'border-zinc-800' : 'border-zinc-200')}>
        {/* Primary CTA */}
        <motion.button
          onClick={onStartBlank}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg mb-2',
            'bg-gradient-to-r text-white font-medium shadow-md',
            colors.cta, colors.ctaHover,
            'transition-all'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Just Write</span>
        </motion.button>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onStartWithPrompt}
            className={cn(
              'flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-xs transition-colors',
              colors.card
            )}
          >
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span className={colors.text}>Prompt</span>
          </button>
          <button
            onClick={onStartTimed}
            className={cn(
              'flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border text-xs transition-colors',
              colors.card
            )}
          >
            <Timer className="w-3 h-3 text-purple-500" />
            <span className={colors.text}>Timed</span>
          </button>
        </div>
      </div>

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={true}
        defaultMinutes={15}
        maxMinutes={60}
        title="Focus Timer"
        onComplete={() => {
          console.log('Writing timer complete!')
        }}
      />

      {/* Today's Stats */}
      <CollapsibleSidebarSection
        title="Today's Stats"
        icon={BarChart3}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 grid grid-cols-2 gap-2">
          <StatPill
            icon={PenLine}
            label="Words"
            value={stats?.wordsToday || 0}
            color="text-cyan-500"
            isDark={isDark}
          />
          <StatPill
            icon={Flame}
            label="Streak"
            value={`${stats?.currentStreak || 0}d`}
            color="text-orange-500"
            isDark={isDark}
          />
        </div>
      </CollapsibleSidebarSection>

      {/* Daily Prompt */}
      <CollapsibleSidebarSection
        title="Daily Prompt"
        icon={Lightbulb}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-3">
          <DailyPrompt
            theme={isDark ? 'dark' : 'light'}
            compact={true}
            onStartWriting={() => {
              if (onStartWithPrompt) onStartWithPrompt()
            }}
          />
        </div>
      </CollapsibleSidebarSection>

      {/* Recent Projects */}
      <CollapsibleSidebarSection
        title="Recent Projects"
        icon={FolderOpen}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-0.5">
          {projects.length === 0 ? (
            <p className={cn('text-xs text-center py-2', colors.muted)}>
              No projects yet
            </p>
          ) : (
            projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                onSelect={() => handleProjectSelect(project)}
                isDark={isDark}
              />
            ))
          )}
          <button
            onClick={() => navigate('/quarry/projects')}
            className={cn(
              'w-full flex items-center justify-center gap-1 py-1.5 text-xs rounded-md transition-colors mt-1',
              isDark ? 'text-cyan-400 hover:bg-cyan-900/20' : 'text-cyan-600 hover:bg-cyan-50'
            )}
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

export default WriteLeftSidebar

