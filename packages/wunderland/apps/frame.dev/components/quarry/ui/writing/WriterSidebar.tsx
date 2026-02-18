/**
 * Writer Sidebar - Full toolkit sidebar for Write mode
 * @module quarry/ui/WriterSidebar
 *
 * @description
 * Left sidebar for Write mode featuring:
 * - Quick start buttons (blank, prompt, timed)
 * - Focus timer (ReflectionTimer)
 * - Today's stats (words, sessions, streak)
 * - Goals progress (daily/weekly)
 * - Daily writing prompt
 * - Recent projects
 * - Quick access links
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PenLine,
  Sparkles,
  Timer,
  BarChart3,
  Flame,
  Target,
  Lightbulb,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Zap,
  FileText,
  Clock,
  BookOpen,
  Package,
} from 'lucide-react'
import ReflectionTimer from '../reflect/ReflectionTimer'
import DailyPrompt from '../prompts/DailyPrompt'
import FeaturedTemplatesWidget from '../widgets/FeaturedTemplatesWidget'
import ClockAmbienceSidebarWidget from '../widgets/ClockAmbienceSidebarWidget'
import SidebarWidthControl from '../sidebar/SidebarWidthControl'
import type { RemoteTemplate } from '@/lib/templates/types'
import {
  getAllProjects,
  getWordCountStats,
  type WritingProject,
  type WordCountStats,
  PROJECT_TYPE_ICONS,
} from '@/lib/write'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  isDarkTheme,
  isSepiaTheme,
  isTerminalTheme,
  isOceanicTheme,
  getThemeCategory,
} from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface WriterSidebarProps {
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
  /** Current sidebar width */
  sidebarWidth?: number
  /** Callback when sidebar width changes */
  onSidebarWidthChange?: (width: number) => void
}

type QuickStartMode = 'blank' | 'prompt' | 'timed'

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const colors = {
    standard: {
      primary: 'emerald',
      accent: 'purple',
      cta: isDark ? 'from-emerald-600 to-cyan-600' : 'from-emerald-500 to-cyan-500',
      ctaHover: isDark ? 'hover:from-emerald-700 hover:to-cyan-700' : 'hover:from-emerald-600 hover:to-cyan-600',
      card: isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
      section: isDark ? 'border-zinc-800' : 'border-zinc-200',
      label: isDark ? 'text-zinc-500' : 'text-zinc-400',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      muted: isDark ? 'text-zinc-400' : 'text-zinc-500',
    },
    sepia: {
      primary: 'amber',
      accent: 'orange',
      cta: isDark ? 'from-amber-600 to-orange-600' : 'from-amber-500 to-orange-500',
      ctaHover: isDark ? 'hover:from-amber-700 hover:to-orange-700' : 'hover:from-amber-600 hover:to-orange-600',
      card: isDark ? 'bg-stone-800/50 border-stone-700' : 'bg-amber-50/50 border-amber-200',
      section: isDark ? 'border-stone-700' : 'border-amber-200',
      label: isDark ? 'text-stone-500' : 'text-amber-600',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      muted: isDark ? 'text-stone-400' : 'text-stone-500',
    },
    terminal: {
      primary: 'green',
      accent: 'lime',
      cta: isDark ? 'from-green-600 to-lime-600' : 'from-green-500 to-lime-500',
      ctaHover: isDark ? 'hover:from-green-700 hover:to-lime-700' : 'hover:from-green-600 hover:to-lime-600',
      card: isDark ? 'bg-zinc-900/50 border-green-900/50' : 'bg-green-50/50 border-green-200',
      section: isDark ? 'border-green-900/30' : 'border-green-200',
      label: isDark ? 'text-green-600' : 'text-green-700',
      text: isDark ? 'text-green-100' : 'text-green-900',
      muted: isDark ? 'text-green-400' : 'text-green-600',
    },
    oceanic: {
      primary: 'cyan',
      accent: 'teal',
      cta: isDark ? 'from-cyan-600 to-teal-600' : 'from-cyan-500 to-teal-500',
      ctaHover: isDark ? 'hover:from-cyan-700 hover:to-teal-700' : 'hover:from-cyan-600 hover:to-teal-600',
      card: isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-cyan-50/50 border-cyan-200',
      section: isDark ? 'border-slate-700' : 'border-cyan-200',
      label: isDark ? 'text-slate-500' : 'text-cyan-600',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      muted: isDark ? 'text-slate-400' : 'text-slate-500',
    },
  }

  return colors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Collapsible Section - Each widget can expand/collapse
 */
function CollapsibleSection({
  icon: Icon,
  label,
  colors,
  isExpanded,
  onToggle,
  children,
  noBorder = false,
}: {
  icon: React.ElementType
  label: string
  colors: ReturnType<typeof getThemeColors>
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  noBorder?: boolean
}) {
  return (
    <div className={cn('border-b', noBorder ? 'border-transparent' : colors.section)}>
      {/* Header - Always visible, clickable to toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-3 transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/5'
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', `text-${colors.primary}-500`)} />
          <h3 className={cn('text-xs font-medium uppercase tracking-wide', colors.label)}>
            {label}
          </h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={cn('w-4 h-4', colors.muted)} />
        </motion.div>
      </button>

      {/* Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
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

/**
 * Stat Pill
 */
function StatPill({
  icon: Icon,
  label,
  value,
  color,
  colors,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  colors: ReturnType<typeof getThemeColors>
}) {
  return (
    <div className={cn('p-2.5 rounded-xl', colors.card)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className={cn('text-[10px]', colors.label)}>{label}</span>
      </div>
      <span className={cn('text-lg font-bold', colors.text)}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  )
}

/**
 * Progress Bar
 */
function ProgressBar({
  label,
  current,
  goal,
  color,
  colors,
}: {
  label: string
  current: number
  goal: number
  color: string
  colors: ReturnType<typeof getThemeColors>
}) {
  const progress = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-xs', colors.muted)}>{label}</span>
        <span className={cn('text-xs font-medium', colors.text)}>
          {current.toLocaleString()} / {goal.toLocaleString()}
        </span>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden', colors.card.replace('border', 'bg'))}>
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/**
 * Recent Project Item
 */
function RecentProjectItem({
  project,
  onSelect,
  colors,
}: {
  project: WritingProject
  onSelect: () => void
  colors: ReturnType<typeof getThemeColors>
}) {
  const totalWords = project.parts.reduce(
    (sum, part) => sum + part.chapters.reduce((chapterSum, ch) => chapterSum + ch.wordCount, 0),
    0
  )

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-left',
        'hover:bg-opacity-50',
        colors.card.replace('border', 'hover:bg')
      )}
    >
      <span className="text-lg">{PROJECT_TYPE_ICONS[project.type]}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', colors.text)}>{project.title}</p>
        <p className={cn('text-xs', colors.muted)}>{totalWords.toLocaleString()} words</p>
      </div>
      <ChevronRight className={cn('w-4 h-4', colors.muted)} />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

// Section keys for tracking expanded state
type SectionKey = 'clockAmbience' | 'quickStart' | 'timer' | 'stats' | 'goals' | 'prompt' | 'templates' | 'projects' | 'quickAccess'

export default function WriterSidebar({
  theme = 'dark',
  onStartBlank,
  onStartWithPrompt,
  onStartTimed,
  onSelectProject,
  sidebarWidth = 340,
  onSidebarWidthChange,
}: WriterSidebarProps) {
  const router = useRouter()
  const resolvePath = useQuarryPath()
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  const [stats, setStats] = useState<WordCountStats | null>(null)
  const [projects, setProjects] = useState<WritingProject[]>([])

  // Editable goals with localStorage persistence
  const [dailyGoal, setDailyGoal] = useState(() => {
    if (typeof window === 'undefined') return 1000
    const stored = localStorage.getItem('write-daily-goal')
    return stored ? parseInt(stored, 10) : 1000
  })
  const [weeklyGoal, setWeeklyGoal] = useState(() => {
    if (typeof window === 'undefined') return 5000
    const stored = localStorage.getItem('write-weekly-goal')
    return stored ? parseInt(stored, 10) : 5000
  })
  const [editingGoal, setEditingGoal] = useState<'daily' | 'weekly' | null>(null)
  const [tempGoalValue, setTempGoalValue] = useState('')

  // Section expanded states - default some open, some closed
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    clockAmbience: true,
    quickStart: true,
    timer: true,
    stats: true,
    goals: false,
    prompt: false,
    templates: true,
    projects: true,
    quickAccess: false,
  })

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Goal editing handlers
  const handleStartEditGoal = (type: 'daily' | 'weekly') => {
    setEditingGoal(type)
    setTempGoalValue(type === 'daily' ? dailyGoal.toString() : weeklyGoal.toString())
  }

  const handleSaveGoal = () => {
    if (!editingGoal) return
    const value = parseInt(tempGoalValue, 10)
    if (isNaN(value) || value < 1) {
      setEditingGoal(null)
      return
    }

    if (editingGoal === 'daily') {
      setDailyGoal(value)
      localStorage.setItem('write-daily-goal', value.toString())
    } else {
      setWeeklyGoal(value)
      localStorage.setItem('write-weekly-goal', value.toString())
    }
    setEditingGoal(null)
  }

  const handleSetQuickGoal = (type: 'daily' | 'weekly', value: number) => {
    if (type === 'daily') {
      setDailyGoal(value)
      localStorage.setItem('write-daily-goal', value.toString())
    } else {
      setWeeklyGoal(value)
      localStorage.setItem('write-weekly-goal', value.toString())
    }
  }

  // Load data
  useEffect(() => {
    setStats(getWordCountStats())
    setProjects(getAllProjects().filter(p => p.status !== 'archived').slice(0, 5))
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

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Clock & Ambience Section */}
      <CollapsibleSection
        icon={Clock}
        label="Clock & Ambience"
        colors={colors}
        isExpanded={expandedSections.clockAmbience}
        onToggle={() => toggleSection('clockAmbience')}
      >
        <ClockAmbienceSidebarWidget
          isDark={isDark}
          showClock={true}
          showAmbience={true}
          compact={false}
        />
      </CollapsibleSection>

      {/* Quick Start Section */}
      <CollapsibleSection
        icon={Zap}
        label="Quick Start"
        colors={colors}
        isExpanded={expandedSections.quickStart}
        onToggle={() => toggleSection('quickStart')}
      >
        {/* Primary CTA - Just Write */}
        <motion.button
          onClick={onStartBlank}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-3',
            'bg-gradient-to-r text-white font-medium shadow-lg',
            colors.cta,
            colors.ctaHover,
            'transition-all'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Sparkles className="w-5 h-5" />
          Just Write
        </motion.button>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            onClick={onStartWithPrompt}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border transition-colors',
              colors.card
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className={cn('text-sm', colors.text)}>Prompt</span>
          </motion.button>
          <motion.button
            onClick={onStartTimed}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border transition-colors',
              colors.card
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Timer className="w-4 h-4 text-purple-500" />
            <span className={cn('text-sm', colors.text)}>Timed</span>
          </motion.button>
        </div>
      </CollapsibleSection>

      {/* Focus Timer Section */}
      <CollapsibleSection
        icon={Clock}
        label="Focus Timer"
        colors={colors}
        isExpanded={expandedSections.timer}
        onToggle={() => toggleSection('timer')}
      >
        <ReflectionTimer
          defaultMinutes={15}
          maxMinutes={90}
          isDark={isDark}
          compact
          onStart={() => console.log('Timer started')}
          onComplete={() => console.log('Timer complete!')}
        />
      </CollapsibleSection>

      {/* Today's Stats Section */}
      {stats && (
        <CollapsibleSection
          icon={BarChart3}
          label="Today's Stats"
          colors={colors}
          isExpanded={expandedSections.stats}
          onToggle={() => toggleSection('stats')}
        >
          <div className="grid grid-cols-2 gap-2">
            <StatPill
              icon={FileText}
              label="Words"
              value={stats.wordsToday}
              color="text-cyan-500"
              colors={colors}
            />
            <StatPill
              icon={Flame}
              label="Streak"
              value={`${stats.currentStreak}d`}
              color="text-amber-500"
              colors={colors}
            />
          </div>
        </CollapsibleSection>
      )}

      {/* Goals Section */}
      {stats && (
        <CollapsibleSection
          icon={Target}
          label="Goals"
          colors={colors}
          isExpanded={expandedSections.goals}
          onToggle={() => toggleSection('goals')}
        >
          <div className="space-y-4">
            {/* Daily Goal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', colors.muted)}>Daily</span>
                {editingGoal === 'daily' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tempGoalValue}
                      onChange={(e) => setTempGoalValue(e.target.value)}
                      onBlur={handleSaveGoal}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                      className={cn(
                        'w-20 px-2 py-0.5 text-xs text-right rounded border',
                        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300',
                        colors.text
                      )}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditGoal('daily')}
                    className={cn('text-xs font-medium hover:underline', colors.text)}
                    title="Click to edit"
                  >
                    {stats.wordsToday.toLocaleString()} / {dailyGoal.toLocaleString()}
                  </button>
                )}
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-zinc-800' : 'bg-zinc-200')}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round((stats.wordsToday / dailyGoal) * 100))}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {editingGoal !== 'daily' && (
                <div className="flex gap-1 flex-wrap">
                  {[500, 1000, 1500, 2000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSetQuickGoal('daily', preset)}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] rounded transition-colors',
                        dailyGoal === preset
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300'
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Goal */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', colors.muted)}>Weekly</span>
                {editingGoal === 'weekly' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={tempGoalValue}
                      onChange={(e) => setTempGoalValue(e.target.value)}
                      onBlur={handleSaveGoal}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                      className={cn(
                        'w-20 px-2 py-0.5 text-xs text-right rounded border',
                        isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-300',
                        colors.text
                      )}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartEditGoal('weekly')}
                    className={cn('text-xs font-medium hover:underline', colors.text)}
                    title="Click to edit"
                  >
                    {stats.wordsThisWeek.toLocaleString()} / {weeklyGoal.toLocaleString()}
                  </button>
                )}
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-zinc-800' : 'bg-zinc-200')}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round((stats.wordsThisWeek / weeklyGoal) * 100))}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              {editingGoal !== 'weekly' && (
                <div className="flex gap-1 flex-wrap">
                  {[3500, 5000, 7000, 10000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSetQuickGoal('weekly', preset)}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] rounded transition-colors',
                        weeklyGoal === preset
                          ? 'bg-purple-500/20 text-purple-400'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300'
                      )}
                    >
                      {(preset / 1000).toFixed(preset % 1000 === 0 ? 0 : 1)}k
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Daily Prompt Section */}
      <CollapsibleSection
        icon={Lightbulb}
        label="Daily Prompt"
        colors={colors}
        isExpanded={expandedSections.prompt}
        onToggle={() => toggleSection('prompt')}
      >
        <DailyPrompt
          compact
          onStartWriting={onStartWithPrompt}
        />
      </CollapsibleSection>

      {/* Templates Section */}
      <CollapsibleSection
        icon={Package}
        label="Templates"
        colors={colors}
        isExpanded={expandedSections.templates}
        onToggle={() => toggleSection('templates')}
      >
        <FeaturedTemplatesWidget
          isDark={isDark}
          maxTemplates={4}
          compact
          onSelectTemplate={(template: RemoteTemplate) => {
            router.push(resolvePath(`/quarry/new?template=${template.id}`))
          }}
          onOpenGallery={() => {
            router.push(resolvePath('/quarry/templates'))
          }}
        />
      </CollapsibleSection>

      {/* Recent Projects Section */}
      {projects.length > 0 && (
        <CollapsibleSection
          icon={FolderOpen}
          label="Recent Projects"
          colors={colors}
          isExpanded={expandedSections.projects}
          onToggle={() => toggleSection('projects')}
        >
          <div className="space-y-1">
            {projects.map((project) => (
              <RecentProjectItem
                key={project.id}
                project={project}
                onSelect={() => handleProjectSelect(project)}
                colors={colors}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Quick Access Section */}
      <CollapsibleSection
        icon={Zap}
        label="Quick Access"
        colors={colors}
        isExpanded={expandedSections.quickAccess}
        onToggle={() => toggleSection('quickAccess')}
        noBorder
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push(resolvePath('/quarry/write'))}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              colors.card.replace('border', 'hover:bg')
            )}
          >
            <FileText className={cn('w-4 h-4', colors.muted)} />
            <span className={cn('text-[10px]', colors.muted)}>Drafts</span>
          </button>
          <button
            onClick={() => router.push(resolvePath('/quarry/new?tab=prompt'))}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              colors.card.replace('border', 'hover:bg')
            )}
          >
            <Lightbulb className={cn('w-4 h-4', colors.muted)} />
            <span className={cn('text-[10px]', colors.muted)}>Prompts</span>
          </button>
          <button
            onClick={() => router.push(resolvePath('/quarry/settings'))}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              colors.card.replace('border', 'hover:bg')
            )}
          >
            <Target className={cn('w-4 h-4', colors.muted)} />
            <span className={cn('text-[10px]', colors.muted)}>Goals</span>
          </button>
        </div>
      </CollapsibleSection>

      {/* Spacer to push width control to bottom */}
      <div className="flex-1" />

      {/* Sidebar Width Control */}
      {onSidebarWidthChange && (
        <div className="flex-shrink-0 mt-auto">
          <SidebarWidthControl
            width={sidebarWidth}
            onChange={onSidebarWidthChange}
            theme={theme}
          />
        </div>
      )}
    </div>
  )
}
