/**
 * Write Mode Component
 * @module quarry/ui/WriteMode
 *
 * @description
 * Main container for Write mode - project-based writing for stories and essays.
 * Features project list, word count tracking, and chapter management.
 * Uses QuarryPageLayout for consistent navigation with other Quarry pages.
 *
 * Redesigned for a warmer, more inviting writer's experience with:
 * - WriterSidebar: Full toolkit with quick start, timer, stats, goals
 * - Theme-aware styling for all 8 themes
 * - Prominent "Start Writing Now" CTA
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  PenLine,
  Plus,
  BookOpen,
  FileText,
  Sparkles,
  Flame,
  Target,
  Trash2,
  Archive,
  MoreHorizontal,
  FolderOpen,
  Coffee,
  Feather,
  Play,
  Send,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import WriterSidebar from './WriterSidebar'
import WriterRightSidebar from './WriterRightSidebar'
import ProjectPublishModal from '../publishing/ProjectPublishModal'
import dynamic from 'next/dynamic'

// Dynamic import DistractionFreeEditor to avoid SSR issues
const DistractionFreeEditor = dynamic(() => import('../editor/DistractionFreeEditor'), { ssr: false })
import {
  getAllProjects,
  createProject,
  deleteProject,
  archiveProject,
  getWordCountStats,
  getProjectTemplates,
  type WritingProject,
  type ProjectTemplate,
  type WordCountStats,
  PROJECT_TYPE_ICONS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/write'
import { getPromptModeService } from '@/lib/prompts/promptModeService'
import type { GalleryPrompt } from '@/lib/prompts/types'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
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

type ViewMode = 'projects' | 'create' | 'project'

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
      bg: isDark ? 'bg-zinc-950' : 'bg-zinc-50',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-white',
      cardBorder: isDark ? 'border-zinc-800' : 'border-zinc-200',
      cardHover: isDark ? 'hover:border-emerald-500/50' : 'hover:border-emerald-400',
      cta: 'from-emerald-500 to-cyan-500',
      ctaHover: 'hover:from-emerald-600 hover:to-cyan-600',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      textSubtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      heading: isDark ? 'text-zinc-100' : 'text-zinc-900',
      welcome: 'text-emerald-500',
      emptyBg: isDark ? 'bg-zinc-900/30' : 'bg-zinc-100/50',
    },
    sepia: {
      primary: 'amber',
      accent: 'orange',
      bg: isDark ? 'bg-stone-950' : 'bg-amber-50/50',
      cardBg: isDark ? 'bg-stone-900/50' : 'bg-amber-50/80',
      cardBorder: isDark ? 'border-stone-800' : 'border-amber-200',
      cardHover: isDark ? 'hover:border-amber-500/50' : 'hover:border-amber-400',
      cta: 'from-amber-500 to-orange-500',
      ctaHover: 'hover:from-amber-600 hover:to-orange-600',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      textMuted: isDark ? 'text-stone-400' : 'text-stone-600',
      textSubtle: isDark ? 'text-stone-500' : 'text-stone-400',
      heading: isDark ? 'text-amber-50' : 'text-stone-900',
      welcome: 'text-amber-600',
      emptyBg: isDark ? 'bg-stone-900/30' : 'bg-amber-100/50',
    },
    terminal: {
      primary: 'green',
      accent: 'lime',
      bg: isDark ? 'bg-black' : 'bg-green-50/30',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-50/50',
      cardBorder: isDark ? 'border-green-900/50' : 'border-green-200',
      cardHover: isDark ? 'hover:border-green-500/50' : 'hover:border-green-400',
      cta: 'from-green-500 to-lime-500',
      ctaHover: 'hover:from-green-600 hover:to-lime-600',
      text: isDark ? 'text-green-100' : 'text-green-900',
      textMuted: isDark ? 'text-green-400' : 'text-green-600',
      textSubtle: isDark ? 'text-green-600' : 'text-green-500',
      heading: isDark ? 'text-green-50' : 'text-green-900',
      welcome: 'text-green-500',
      emptyBg: isDark ? 'bg-green-950/30' : 'bg-green-100/50',
    },
    oceanic: {
      primary: 'cyan',
      accent: 'teal',
      bg: isDark ? 'bg-slate-950' : 'bg-cyan-50/30',
      cardBg: isDark ? 'bg-slate-900/50' : 'bg-cyan-50/50',
      cardBorder: isDark ? 'border-slate-800' : 'border-cyan-200',
      cardHover: isDark ? 'hover:border-cyan-500/50' : 'hover:border-cyan-400',
      cta: 'from-cyan-500 to-teal-500',
      ctaHover: 'hover:from-cyan-600 hover:to-teal-600',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      textSubtle: isDark ? 'text-slate-500' : 'text-slate-400',
      heading: isDark ? 'text-cyan-50' : 'text-slate-900',
      welcome: 'text-cyan-500',
      emptyBg: isDark ? 'bg-slate-900/30' : 'bg-cyan-100/50',
    },
  }

  return colors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Project Card - Theme-aware
 */
function ProjectCard({
  project,
  onOpen,
  onDelete,
  onArchive,
  onPublish,
  colors,
}: {
  project: WritingProject
  onOpen: () => void
  onDelete: () => void
  onArchive: () => void
  onPublish: () => void
  colors: ReturnType<typeof getThemeColors>
}) {
  const [showMenu, setShowMenu] = useState(false)

  const totalWords = project.parts.reduce((sum, part) =>
    sum + part.chapters.reduce((chapterSum, ch) => chapterSum + ch.wordCount, 0)
  , 0)

  const totalChapters = project.parts.reduce((sum, part) => sum + part.chapters.length, 0)

  const progress = project.wordGoal ? Math.min(100, Math.round((totalWords / project.wordGoal) * 100)) : 0

  return (
    <motion.div
      className={cn(
        'rounded-xl p-4 border cursor-pointer relative transition-all',
        colors.cardBg,
        colors.cardBorder,
        colors.cardHover
      )}
      onClick={onOpen}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Menu button */}
      <button
        className={cn(
          'absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-10',
          'hover:bg-black/10 dark:hover:bg-white/10'
        )}
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
      >
        <MoreHorizontal className={cn('w-4 h-4', colors.textSubtle)} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'absolute top-10 right-3 rounded-lg shadow-xl z-20 py-1 min-w-[140px]',
              colors.cardBg,
              'border',
              colors.cardBorder
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                'text-emerald-500',
                'hover:bg-black/5 dark:hover:bg-white/5'
              )}
              onClick={() => {
                setShowMenu(false)
                onPublish()
              }}
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
            <button
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                colors.text,
                'hover:bg-black/5 dark:hover:bg-white/5'
              )}
              onClick={() => {
                setShowMenu(false)
                onArchive()
              }}
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              onClick={() => {
                setShowMenu(false)
                onDelete()
              }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project info */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl">{PROJECT_TYPE_ICONS[project.type]}</span>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-medium truncate pr-8', colors.text)}>{project.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              PROJECT_STATUS_COLORS[project.status]
            )}>
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
            <span className={cn('text-xs', colors.textSubtle)}>
              {totalChapters} chapter{totalChapters !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className={cn('text-sm line-clamp-2 mb-3', colors.textMuted)}>
          {project.description}
        </p>
      )}

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className={colors.textSubtle}>{totalWords.toLocaleString()} words</span>
          {project.wordGoal && (
            <span className={colors.textMuted}>{progress}% of goal</span>
          )}
        </div>
        {project.wordGoal && (
          <div className={cn('h-1.5 rounded-full overflow-hidden', colors.emptyBg)}>
            <motion.div
              className={cn('h-full rounded-full bg-gradient-to-r', colors.cta)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>

      {/* Last worked on */}
      {project.lastWorkedOn && (
        <p className={cn('text-xs mt-3', colors.textSubtle)}>
          Last worked on {new Date(project.lastWorkedOn).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  )
}

/**
 * Template Card - Theme-aware
 */
function TemplateCard({
  template,
  onSelect,
  colors,
}: {
  template: ProjectTemplate
  onSelect: () => void
  colors: ReturnType<typeof getThemeColors>
}) {
  return (
    <motion.button
      className={cn(
        'rounded-xl p-5 border text-left w-full transition-all',
        colors.cardBg,
        colors.cardBorder,
        colors.cardHover
      )}
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{template.icon}</span>
        <div className="flex-1">
          <h3 className={cn('font-semibold', colors.text)}>{template.name}</h3>
          <p className={cn('text-sm mt-1', colors.textMuted)}>{template.description}</p>
          {template.wordGoal && (
            <p className={cn('text-xs mt-2 font-medium', colors.textSubtle)}>
              {template.wordGoal.toLocaleString()} words
            </p>
          )}
        </div>
      </div>
    </motion.button>
  )
}

/**
 * Create Project Form - Theme-aware
 */
function CreateProjectForm({
  template,
  onBack,
  onCreate,
  colors,
}: {
  template: ProjectTemplate | null
  onBack: () => void
  onCreate: (project: WritingProject) => void
  colors: ReturnType<typeof getThemeColors>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [wordGoal, setWordGoal] = useState(template?.wordGoal?.toString() || '')
  const [dailyGoal, setDailyGoal] = useState('')

  const handleCreate = () => {
    if (!title.trim()) return

    const project = createProject(title.trim(), template?.type || 'other', {
      description: description.trim() || undefined,
      wordGoal: wordGoal ? parseInt(wordGoal) : undefined,
      dailyGoal: dailyGoal ? parseInt(dailyGoal) : undefined,
      template: template || undefined,
    })

    onCreate(project)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <button
        onClick={onBack}
        className={cn('flex items-center gap-2 transition-colors', colors.textMuted, 'hover:opacity-80')}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to templates
      </button>

      <div>
        <h2 className={cn('text-2xl font-bold mb-2', colors.heading)}>
          {template ? `Create ${template.name}` : 'Create New Project'}
        </h2>
        <p className={colors.textMuted}>
          {template?.description || 'Set up your new writing project'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={cn('block text-sm font-medium mb-1', colors.text)}>
            Project Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My New Project"
            className={cn(
              'w-full px-4 py-3 rounded-lg border',
              colors.cardBg,
              colors.cardBorder,
              colors.text,
              'placeholder:opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-opacity-50'
            )}
            autoFocus
          />
        </div>

        <div>
          <label className={cn('block text-sm font-medium mb-1', colors.text)}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this project about?"
            rows={3}
            className={cn(
              'w-full px-4 py-3 rounded-lg border resize-none',
              colors.cardBg,
              colors.cardBorder,
              colors.text,
              'placeholder:opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-opacity-50'
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={cn('block text-sm font-medium mb-1', colors.text)}>
              Word Goal
            </label>
            <input
              type="number"
              value={wordGoal}
              onChange={(e) => setWordGoal(e.target.value)}
              placeholder="50000"
              className={cn(
                'w-full px-4 py-3 rounded-lg border',
                colors.cardBg,
                colors.cardBorder,
                colors.text,
                'placeholder:opacity-50',
                'focus:outline-none focus:ring-2 focus:ring-opacity-50'
              )}
            />
          </div>

          <div>
            <label className={cn('block text-sm font-medium mb-1', colors.text)}>
              Daily Goal
            </label>
            <input
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
              placeholder="1000"
              className={cn(
                'w-full px-4 py-3 rounded-lg border',
                colors.cardBg,
                colors.cardBorder,
                colors.text,
                'placeholder:opacity-50',
                'focus:outline-none focus:ring-2 focus:ring-opacity-50'
              )}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className={cn(
            'flex-1 px-4 py-3 rounded-lg border transition-colors',
            colors.cardBorder,
            colors.text,
            'hover:opacity-80'
          )}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!title.trim()}
          className={cn(
            'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
            'bg-gradient-to-r text-white shadow-lg',
            colors.cta,
            colors.ctaHover,
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Create Project
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function WriteMode() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme = (resolvedTheme || 'dark') as ThemeName
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  const [viewMode, setViewMode] = useState<ViewMode>('projects')
  const [projects, setProjects] = useState<WritingProject[]>([])
  const [stats, setStats] = useState<WordCountStats | null>(null)
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [prompts, setPrompts] = useState<GalleryPrompt[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [showFocusMode, setShowFocusMode] = useState(false)
  const [focusDraftId, setFocusDraftId] = useState<string | null>(null)
  const [publishProject, setPublishProject] = useState<WritingProject | null>(null)

  // Sidebar width state - load from localStorage
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    const stored = localStorage.getItem('write-sidebar-width')
    return stored ? parseInt(stored, 10) : 320
  })

  // Save sidebar width to localStorage
  const handleSidebarWidthChange = useCallback((width: number) => {
    setSidebarWidth(width)
    localStorage.setItem('write-sidebar-width', width.toString())
  }, [])

  // Load data
  useEffect(() => {
    setProjects(getAllProjects())
    setStats(getWordCountStats())
    setTemplates(getProjectTemplates())
  }, [])

  // Load prompts
  useEffect(() => {
    async function loadPrompts() {
      try {
        const service = await getPromptModeService()
        const writePrompts = await service.getStoryStarters(3)
        setPrompts(writePrompts)
      } catch (error) {
        console.error('Failed to load prompts:', error)
      }
    }
    loadPrompts()
  }, [])

  // Handle project creation
  const handleCreateProject = useCallback((project: WritingProject) => {
    setProjects(getAllProjects())
    setViewMode('projects')
    // Navigate to the first chapter
    if (project.parts[0]?.chapters[0]) {
      router.push(`/quarry?path=${encodeURIComponent(project.parts[0].chapters[0].strandPath)}`)
    }
  }, [router])

  // Handle project delete
  const handleDeleteProject = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      deleteProject(id)
      setProjects(getAllProjects())
    }
  }, [])

  // Handle project archive
  const handleArchiveProject = useCallback((id: string) => {
    archiveProject(id)
    setProjects(getAllProjects())
  }, [])

  // Filter projects
  const activeProjects = projects.filter(p => p.status !== 'archived')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  // Open focus mode (distraction-free editor)
  const handleStartFocusMode = useCallback(() => {
    setFocusDraftId(null) // Start fresh
    setShowFocusMode(true)
  }, [])

  // Exit focus mode
  const handleExitFocusMode = useCallback((draftId: string | null) => {
    setShowFocusMode(false)
    // Optionally navigate to the draft if saved
    if (draftId) {
      setFocusDraftId(draftId)
      // Reload projects in case a draft was created
      setProjects(getAllProjects())
    }
  }, [])

  // Quick start handlers
  const handleStartBlank = useCallback(() => {
    // Open focus mode instead of creating project
    handleStartFocusMode()
  }, [handleStartFocusMode])

  const handleStartWithPrompt = useCallback(() => {
    setViewMode('create')
  }, [])

  const handleStartTimed = useCallback(() => {
    // Create blank project and navigate (timer will be in sidebar)
    const project = createProject('Timed Session', 'other', {})
    setProjects(getAllProjects())
    if (project.parts[0]?.chapters[0]) {
      router.push(`/quarry?path=${encodeURIComponent(project.parts[0].chapters[0].strandPath)}`)
    }
  }, [router])

  const handleSelectProject = useCallback((project: WritingProject) => {
    const firstChapter = project.parts[0]?.chapters[0]
    if (firstChapter) {
      router.push(`/quarry?path=${encodeURIComponent(firstChapter.strandPath)}`)
    }
  }, [router])

  // Left sidebar - WriterSidebar with all tools
  const leftSidebarContent = (
    <WriterSidebar
      theme={theme}
      onStartBlank={handleStartBlank}
      onStartWithPrompt={handleStartWithPrompt}
      onStartTimed={handleStartTimed}
      onSelectProject={handleSelectProject}
      sidebarWidth={sidebarWidth}
      onSidebarWidthChange={handleSidebarWidthChange}
    />
  )

  // Right sidebar - Stats, timer, goals, clock & ambience
  const rightSidebarContent = (
    <WriterRightSidebar theme={theme} />
  )

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // If focus mode is active, show the distraction-free editor
  if (showFocusMode) {
    return (
      <DistractionFreeEditor
        draftId={focusDraftId || undefined}
        defaultMode="typewriter"
        onExit={handleExitFocusMode}
      />
    )
  }

  return (
    <QuarryPageLayout
      title="Write"
      description="Stories, essays, and creative writing"
      leftPanelContent={leftSidebarContent}
      rightPanelContent={rightSidebarContent}
      showRightPanel={true}
      leftPanelWidth={sidebarWidth}
      onLeftPanelWidthChange={handleSidebarWidthChange}
    >
      <div className={cn('h-full overflow-auto', colors.bg)}>
        <div className="max-w-4xl mx-auto px-4 py-4 sm:p-6 pb-24">
          {viewMode === 'projects' && (
            <div className="space-y-8">
              {/* Warm Welcome Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pt-6 pb-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.1)'}, ${isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(6, 182, 212, 0.1)'})`
                  }}
                >
                  <Feather className={cn('w-8 h-8', colors.welcome)} />
                </motion.div>
                <h1 className={cn(
                  'text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent',
                  isDark
                    ? 'from-emerald-400 via-cyan-400 to-teal-400'
                    : 'from-emerald-600 via-cyan-600 to-teal-600'
                )}>
                  {getGreeting()}, Writer
                </h1>
                <p className={cn('text-lg', colors.textMuted)}>
                  What would you like to write today?
                </p>
              </motion.div>

              {/* Primary CTA - Start Writing Now */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={handleStartBlank}
                className={cn(
                  'w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl',
                  'bg-gradient-to-r text-white font-semibold text-lg shadow-xl',
                  'transition-all',
                  colors.cta,
                  colors.ctaHover
                )}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play className="w-6 h-6" />
                Start Writing Now
              </motion.button>

              {/* Story Starters */}
              {prompts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className={cn('w-5 h-5', colors.welcome)} />
                    <h2 className={cn('text-sm font-semibold uppercase tracking-wide', colors.textSubtle)}>
                      Story Starters
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {prompts.map((prompt, index) => (
                      <motion.button
                        key={prompt.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className={cn(
                          'p-4 rounded-xl text-left border transition-all',
                          colors.cardBg,
                          colors.cardBorder,
                          colors.cardHover
                        )}
                        onClick={() => setViewMode('create')}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <p className={cn('text-sm line-clamp-3', colors.text)}>{prompt.text}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Templates Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className={cn('w-5 h-5', colors.welcome)} />
                  <h2 className={cn('text-sm font-semibold uppercase tracking-wide', colors.textSubtle)}>
                    Start with a Template
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {templates.map((template, index) => (
                    <motion.button
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className={cn(
                        'p-4 rounded-xl text-left border transition-all',
                        colors.cardBg,
                        colors.cardBorder,
                        colors.cardHover
                      )}
                      onClick={() => {
                        setSelectedTemplate(template)
                        setViewMode('create')
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-2xl mb-2 block">{template.icon}</span>
                      <h3 className={cn('font-medium text-sm', colors.text)}>{template.name}</h3>
                      {template.wordGoal && (
                        <p className={cn('text-xs mt-1', colors.textSubtle)}>
                          {template.wordGoal.toLocaleString()} words
                        </p>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Your Projects Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={cn('w-5 h-5', colors.welcome)} />
                    <h2 className={cn('text-sm font-semibold uppercase tracking-wide', colors.textSubtle)}>
                      Your Projects ({activeProjects.length})
                    </h2>
                  </div>
                  {archivedProjects.length > 0 && (
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className={cn('text-sm transition-colors', colors.textMuted, 'hover:opacity-80')}
                    >
                      {showArchived ? 'Hide archived' : `Show archived (${archivedProjects.length})`}
                    </button>
                  )}
                </div>

                {activeProjects.length === 0 ? (
                  <div className={cn(
                    'text-center py-12 rounded-2xl border',
                    colors.emptyBg,
                    colors.cardBorder
                  )}>
                    <Coffee className={cn('w-12 h-12 mx-auto mb-4', colors.textSubtle)} />
                    <h3 className={cn('text-lg font-medium mb-2', colors.text)}>No projects yet</h3>
                    <p className={cn('mb-4', colors.textMuted)}>
                      Create your first writing project to get started
                    </p>
                    <button
                      onClick={() => setViewMode('create')}
                      className={cn(
                        'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl',
                        'bg-gradient-to-r text-white font-medium shadow-lg transition-all',
                        colors.cta,
                        colors.ctaHover
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {activeProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                      >
                        <ProjectCard
                          project={project}
                          onOpen={() => handleSelectProject(project)}
                          onDelete={() => handleDeleteProject(project.id)}
                          onArchive={() => handleArchiveProject(project.id)}
                          onPublish={() => setPublishProject(project)}
                          colors={colors}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Archived projects */}
                <AnimatePresence>
                  {showArchived && archivedProjects.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-6"
                    >
                      <h3 className={cn('text-sm font-medium mb-3', colors.textSubtle)}>Archived</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                        {archivedProjects.map(project => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            onOpen={() => {}}
                            onDelete={() => handleDeleteProject(project.id)}
                            onArchive={() => {}}
                            onPublish={() => setPublishProject(project)}
                            colors={colors}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {viewMode === 'create' && !selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={cn('text-2xl font-bold', colors.heading)}>Choose a Template</h2>
                  <p className={cn('mt-1', colors.textMuted)}>Select a structure for your project</p>
                </div>
                <button
                  onClick={() => setViewMode('projects')}
                  className={cn('transition-colors', colors.textMuted, 'hover:opacity-80')}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TemplateCard
                      template={template}
                      onSelect={() => setSelectedTemplate(template)}
                      colors={colors}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {viewMode === 'create' && selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CreateProjectForm
                template={selectedTemplate}
                onBack={() => setSelectedTemplate(null)}
                onCreate={handleCreateProject}
                colors={colors}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Publish Project Modal */}
      {publishProject && (
        <ProjectPublishModal
          project={publishProject}
          isOpen={!!publishProject}
          onClose={() => setPublishProject(null)}
          onPublished={(path) => {
            setProjects(getAllProjects()) // Refresh to show updated publishing status
          }}
          isDark={isDark}
        />
      )}
    </QuarryPageLayout>
  )
}

export default WriteMode
