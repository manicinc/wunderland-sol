/**
 * Prompt Explorer Mode Component
 * @module components/quarry/ui/PromptExplorerMode
 *
 * Visual prompt exploration with 2-column layout:
 * - Main content: Paginated bento grid with search
 * - Right sidebar: Filters, categories, stats (via QuarryPageLayout)
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Sparkles,
  PenLine,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Bookmark,
  Menu,
} from 'lucide-react'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import BentoPromptGrid from './BentoPromptGrid'
import WriteLeftSidebar from '../writing/WriteLeftSidebar'
import PromptRightSidebar, { type SortMode } from './PromptRightSidebar'
import dynamic from 'next/dynamic'
import { getPromptManager, PromptManager } from '@/lib/prompts/promptManager'
import type { GalleryPrompt, PromptCategory } from '@/lib/prompts/types'
import { CATEGORY_DISPLAY } from '@/lib/prompts/types'
import { hasTemplate } from '@/lib/prompts/templates'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

const PromptStartModal = dynamic(() => import('./PromptStartModal'), { ssr: false })
const DistractionFreeEditor = dynamic(() => import('../editor/DistractionFreeEditor'), { ssr: false })

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */

const PROMPTS_PER_PAGE = 24
const CATEGORIES: (PromptCategory | 'all' | 'favorites')[] = [
  'all', 'favorites', 'reflection', 'creative', 'technical', 'philosophical',
  'practical', 'exploration', 'personal', 'learning'
]

// Writing templates with starter content
const WRITING_TEMPLATES = [
  {
    id: 'morning-pages',
    name: 'Morning Pages',
    desc: '3 pages stream of consciousness',
    content: `# Morning Pages - ${new Date().toLocaleDateString()}\n\nWrite freely for 3 pages. Don't stop, don't edit, just let your thoughts flow...\n\n`,
  },
  {
    id: 'story-outline',
    name: 'Story Outline',
    desc: 'Beginning, middle, end',
    content: `# Story Outline\n\n## The Hook\nWhat grabs the reader's attention?\n\n## The Setup\nIntroduce your characters and world...\n\n## Rising Action\nWhat challenges do they face?\n\n## The Climax\nThe moment of greatest tension...\n\n## Resolution\nHow does it all wrap up?\n\n---\n\n`,
  },
  {
    id: 'character-sheet',
    name: 'Character Sheet',
    desc: 'Develop your characters',
    content: `# Character Profile\n\n## Basic Information\n- **Name:**\n- **Age:**\n- **Occupation:**\n\n## Appearance\n\n## Personality\n- **Strengths:**\n- **Flaws:**\n- **Fears:**\n- **Desires:**\n\n## Background\n\n## Voice\nHow do they speak? What phrases do they use?\n\n---\n\n`,
  },
  {
    id: 'free-write',
    name: 'Free Write',
    desc: 'Just start writing',
    content: `# Free Write - ${new Date().toLocaleDateString()}\n\n`,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type CategoryFilter = PromptCategory | 'all' | 'favorites'
// SortMode imported from PromptRightSidebar

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const base = {
    standard: {
      bg: isDark ? 'bg-zinc-950' : 'bg-zinc-50',
      sidebarBg: isDark ? 'bg-zinc-900/40' : 'bg-white/60',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-white/80',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      textMuted: isDark ? 'text-zinc-500' : 'text-zinc-400',
      heading: isDark ? 'text-zinc-100' : 'text-zinc-900',
      inputBg: isDark ? 'bg-zinc-800/50' : 'bg-white/80',
      inputBorder: isDark ? 'border-zinc-700/50' : 'border-zinc-200/50',
      accent: 'text-cyan-500',
      accentBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
      hover: isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50',
    },
    sepia: {
      bg: isDark ? 'bg-stone-950' : 'bg-amber-50/30',
      sidebarBg: isDark ? 'bg-stone-900/40' : 'bg-amber-50/50',
      cardBg: isDark ? 'bg-stone-900/50' : 'bg-amber-50/60',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      textMuted: isDark ? 'text-stone-500' : 'text-stone-500',
      heading: isDark ? 'text-amber-50' : 'text-stone-900',
      inputBg: isDark ? 'bg-stone-800/50' : 'bg-white/80',
      inputBorder: isDark ? 'border-stone-700/50' : 'border-amber-200/50',
      accent: 'text-amber-500',
      accentBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      hover: isDark ? 'hover:bg-stone-800/50' : 'hover:bg-amber-100/50',
    },
    terminal: {
      bg: isDark ? 'bg-black' : 'bg-green-50/20',
      sidebarBg: isDark ? 'bg-zinc-900/30' : 'bg-green-50/40',
      cardBg: isDark ? 'bg-zinc-900/40' : 'bg-green-50/50',
      text: isDark ? 'text-green-100' : 'text-green-900',
      textMuted: isDark ? 'text-green-500' : 'text-green-600',
      heading: isDark ? 'text-green-50' : 'text-green-900',
      inputBg: isDark ? 'bg-zinc-900/50' : 'bg-white/80',
      inputBorder: isDark ? 'border-green-900/50' : 'border-green-200/50',
      accent: isDark ? 'text-green-400' : 'text-green-600',
      accentBg: isDark ? 'bg-green-500/10' : 'bg-green-50',
      hover: isDark ? 'hover:bg-green-900/30' : 'hover:bg-green-100/50',
    },
    oceanic: {
      bg: isDark ? 'bg-slate-950' : 'bg-cyan-50/20',
      sidebarBg: isDark ? 'bg-slate-900/40' : 'bg-cyan-50/40',
      cardBg: isDark ? 'bg-slate-900/50' : 'bg-cyan-50/50',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      textMuted: isDark ? 'text-slate-500' : 'text-slate-500',
      heading: isDark ? 'text-cyan-50' : 'text-slate-900',
      inputBg: isDark ? 'bg-slate-800/50' : 'bg-white/80',
      inputBorder: isDark ? 'border-slate-700/50' : 'border-cyan-200/50',
      accent: 'text-cyan-400',
      accentBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
      hover: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-cyan-100/50',
    },
  }

  return base[category] || base.standard
}

/**
 * Get theme-aware gradient classes for buttons and active states
 */
function getThemeGradient(theme: ThemeName): { gradient: string; gradientBg: string; hover: string } {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const gradients = {
    standard: {
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
      gradientBg: isDark ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-gradient-to-r from-purple-100 to-pink-100',
      hover: 'hover:from-purple-600 hover:to-pink-600',
    },
    sepia: {
      gradient: 'bg-gradient-to-r from-amber-500 to-orange-500',
      gradientBg: isDark ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20' : 'bg-gradient-to-r from-amber-100 to-orange-100',
      hover: 'hover:from-amber-600 hover:to-orange-600',
    },
    terminal: {
      gradient: 'bg-gradient-to-r from-green-500 to-lime-500',
      gradientBg: isDark ? 'bg-gradient-to-r from-green-500/20 to-lime-500/20' : 'bg-gradient-to-r from-green-100 to-lime-100',
      hover: 'hover:from-green-600 hover:to-lime-600',
    },
    oceanic: {
      gradient: 'bg-gradient-to-r from-cyan-500 to-teal-500',
      gradientBg: isDark ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20' : 'bg-gradient-to-r from-cyan-100 to-teal-100',
      hover: 'hover:from-cyan-600 hover:to-teal-600',
    },
  }

  return gradients[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEFT SIDEBAR - Uses WriterSidebar for consistency
═══════════════════════════════════════════════════════════════════════════ */

// The left sidebar is now handled by WriterSidebar component which provides:
// - Quick Start buttons (Just Write, Prompt, Timed)
// - Focus Timer (radial timer)
// - Today's Stats (words, streak)
// - Goals progress (daily/weekly)
// - Daily Prompt
// - Templates
// - Recent Projects
// - Quick Access links

/* ═══════════════════════════════════════════════════════════════════════════
   SELECTED PROMPT BAR
═══════════════════════════════════════════════════════════════════════════ */

function SelectedPromptBar({
  prompt,
  colors,
  isDark,
  gradient,
  onClear,
  onUse,
}: {
  prompt: GalleryPrompt
  colors: ReturnType<typeof getThemeColors>
  isDark: boolean
  gradient: ReturnType<typeof getThemeGradient>
  onClear: () => void
  onUse: (prompt: GalleryPrompt) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'rounded-xl backdrop-blur-sm border border-white/10 mb-4 overflow-hidden',
        colors.cardBg
      )}
    >
      {/* Collapsed header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2',
        isExpanded ? 'border-b border-white/5' : ''
      )}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <Bookmark className={cn('w-4 h-4', colors.accent)} />
          <span className={cn('text-xs font-medium', colors.text)}>Selected Prompt</span>
          {!isExpanded && (
            <span className={cn('text-xs truncate max-w-xs ml-2', colors.textMuted)}>
              {prompt.text.slice(0, 50)}...
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className={cn('w-3.5 h-3.5 ml-1', colors.textMuted)} />
          ) : (
            <ChevronDown className={cn('w-3.5 h-3.5 ml-1', colors.textMuted)} />
          )}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUse(prompt)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium text-white',
              gradient.gradient,
              gradient.hover,
              'transition-all'
            )}
          >
            Start Writing
          </button>
          <button
            onClick={onClear}
            className={cn(
              'p-1 rounded-lg', colors.hover
            )}
          >
            <X className={cn('w-4 h-4', colors.textMuted)} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 flex gap-4">
              {prompt.imageUrl && (
                <img
                  src={prompt.imageUrl}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-relaxed', colors.text)}>
                  {prompt.text}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full',
                    colors.accentBg, colors.accent
                  )}>
                    {prompt.category}
                  </span>
                  {prompt.mood?.[0] && (
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full',
                      isDark ? 'bg-white/5' : 'bg-black/5',
                      colors.textMuted
                    )}>
                      {prompt.mood[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGINATION COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  colors,
  gradient,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  colors: ReturnType<typeof getThemeColors>
  gradient: ReturnType<typeof getThemeGradient>
}) {
  // useMemo must be called before any early returns (React hooks rule)
  const pages = useMemo(() => {
    if (totalPages <= 1) return []

    const items: (number | 'ellipsis')[] = []

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i)
    } else {
      items.push(1)
      if (currentPage > 3) items.push('ellipsis')

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) items.push(i)

      if (currentPage < totalPages - 2) items.push('ellipsis')
      items.push(totalPages)
    }

    return items
  }, [currentPage, totalPages])

  if (totalPages <= 1) return null

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
        className={cn(
          'p-2.5 sm:p-2 rounded-lg transition-all disabled:opacity-30',
          'touch-manipulation active:scale-90',
          'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
          colors.hover, colors.text
        )}
      >
        <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
      </button>

      {pages.map((page, i) => (
        page === 'ellipsis' ? (
          <span key={`e${i}`} className={cn('px-2 hidden sm:inline', colors.textMuted)} aria-hidden="true">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
            className={cn(
              'min-w-[44px] h-11 sm:min-w-[32px] sm:h-8 rounded-lg text-sm sm:text-xs font-medium',
              'touch-manipulation active:scale-95 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
              page === currentPage
                ? cn(gradient.gradient, 'text-white')
                : cn(colors.hover, colors.text)
            )}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
        className={cn(
          'p-2.5 sm:p-2 rounded-lg transition-all disabled:opacity-30',
          'touch-manipulation active:scale-90',
          'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
          colors.hover, colors.text
        )}
      >
        <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
      </button>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE DRAWER COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

function MobileDrawer({
  isOpen,
  onClose,
  colors,
  isDark,
  gradient,
  activeCategory,
  onSelectCategory,
  categoryCounts,
  sortMode,
  onSortChange,
  onStartBlank,
  onStartWithTemplate,
}: {
  isOpen: boolean
  onClose: () => void
  colors: ReturnType<typeof getThemeColors>
  isDark: boolean
  gradient: ReturnType<typeof getThemeGradient>
  activeCategory: CategoryFilter
  onSelectCategory: (cat: CategoryFilter) => void
  categoryCounts: Partial<Record<CategoryFilter, number>>
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
  onStartBlank: () => void
  onStartWithTemplate: (content: string) => void
}) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        aria-hidden="true"
      />
      {/* Drawer with swipe-to-close */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="x"
        dragConstraints={{ left: -320, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100 || info.velocity.x < -500) {
            onClose()
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Filter options"
        className={cn(
          'fixed left-0 top-0 bottom-0 w-80 z-50 lg:hidden overflow-y-auto',
          'touch-pan-y',
          colors.bg
        )}
      >
        {/* Swipe handle indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-zinc-400/30" aria-hidden="true" />

        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className={cn('text-lg font-semibold', colors.heading)}>Filters</h2>
            <button
              onClick={onClose}
              aria-label="Close filters menu"
              className={cn(
                'p-2.5 rounded-lg touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center',
                'focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
                colors.hover
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Start */}
          <button
            onClick={() => {
              onStartBlank()
              onClose()
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl',
              gradient.gradientBg,
              'border border-current/20',
              'touch-manipulation active:scale-[0.98] transition-all'
            )}
          >
            <div className={cn('p-2 rounded-lg', colors.accentBg)}>
              <PenLine className={cn('w-5 h-5', colors.accent)} />
            </div>
            <div className="text-left">
              <div className={cn('text-sm font-medium', colors.heading)}>Just Write</div>
              <div className={cn('text-xs', colors.textMuted)}>Blank canvas</div>
            </div>
          </button>

          {/* Categories */}
          <div className={cn('rounded-xl p-4', colors.cardBg)}>
            <h3 className={cn('text-xs font-semibold uppercase tracking-wider mb-3', colors.textMuted)}>
              Categories
            </h3>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => {
                const display = cat === 'all'
                  ? { emoji: '📚', label: 'All Prompts' }
                  : cat === 'favorites'
                  ? { emoji: '❤️', label: 'Favorites' }
                  : CATEGORY_DISPLAY[cat] || { emoji: '📝', label: cat }
                const count = categoryCounts[cat] || 0
                const isActive = activeCategory === cat

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      onSelectCategory(cat)
                      onClose()
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg',
                      'text-sm touch-manipulation active:scale-[0.98] transition-all',
                      isActive
                        ? cn(colors.accentBg, colors.accent)
                        : cn(colors.text, colors.hover)
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{display.emoji}</span>
                      <span>{display.label}</span>
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isActive ? 'bg-white/20' : isDark ? 'bg-white/5' : 'bg-black/5'
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort Options */}
          <div className={cn('rounded-xl p-4', colors.cardBg)}>
            <h3 className={cn('text-xs font-semibold uppercase tracking-wider mb-3', colors.textMuted)}>
              Sort By
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'default' as SortMode, icon: Sparkles, label: 'Featured' },
                { mode: 'most-used' as SortMode, icon: TrendingUp, label: 'Most Used' },
                { mode: 'recent' as SortMode, icon: Clock, label: 'Recent' },
                { mode: 'alphabetical' as SortMode, icon: FileText, label: 'A-Z' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    onSortChange(mode)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm',
                    'touch-manipulation active:scale-95 transition-all',
                    sortMode === mode
                      ? cn(colors.accentBg, colors.accent)
                      : cn(colors.text, colors.hover)
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className={cn('rounded-xl p-4', colors.cardBg)}>
            <h3 className={cn('text-xs font-semibold uppercase tracking-wider mb-3', colors.textMuted)}>
              Templates
            </h3>
            <div className="space-y-1">
              {WRITING_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onStartWithTemplate(template.content)
                    onClose()
                  }}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-lg',
                    'touch-manipulation active:scale-[0.98] transition-all',
                    colors.hover
                  )}
                >
                  <div className={cn('text-sm font-medium', colors.text)}>{template.name}</div>
                  <div className={cn('text-xs', colors.textMuted)}>{template.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function PromptExplorerMode() {
  const { resolvedTheme } = useTheme()
  const theme = (resolvedTheme || 'light') as ThemeName
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)
  const themeGradient = getThemeGradient(theme)

  // State
  const [prompts, setPrompts] = useState<GalleryPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<GalleryPrompt | null>(null)
  const [promptToStart, setPromptToStart] = useState<GalleryPrompt | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const [writingPrompt, setWritingPrompt] = useState<GalleryPrompt | null>(null)
  const [manager, setManager] = useState<PromptManager | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [templateContent, setTemplateContent] = useState<string | null>(null)
  const [onlyWithTemplates, setOnlyWithTemplates] = useState(false)

  // Initialize
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const pm = await getPromptManager()
        if (!mounted) return

        setManager(pm)
        const store = pm.getStore()
        const allPrompts = await store.getAllPrompts()
        if (!mounted) return

        setPrompts(allPrompts)
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    init()
    return () => { mounted = false }
  }, [])

  // Count prompts with templates
  const templateCount = useMemo(() => {
    return prompts.filter(p => hasTemplate(p.id)).length
  }, [prompts])

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    let result = prompts

    if (activeCategory === 'favorites') {
      result = result.filter(p => p.isFavorite)
    } else if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory)
    }

    // Filter by template availability
    if (onlyWithTemplates) {
      result = result.filter(p => hasTemplate(p.id))
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.text.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.mood?.some(m => m.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    switch (sortMode) {
      case 'most-used':
        result = [...result].sort((a, b) => b.useCount - a.useCount)
        break
      case 'recent':
        result = [...result].sort((a, b) => {
          if (!a.lastUsedAt && !b.lastUsedAt) return 0
          if (!a.lastUsedAt) return 1
          if (!b.lastUsedAt) return -1
          return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
        })
        break
      case 'alphabetical':
        result = [...result].sort((a, b) => a.text.localeCompare(b.text))
        break
      case 'random':
        // Fisher-Yates shuffle for true random order
        result = [...result]
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[result[i], result[j]] = [result[j], result[i]]
        }
        break
      case 'default':
      default:
        // Featured: favorites first, then by image and use count
        result = [...result].sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
          const aScore = (a.imageUrl ? 5 : 0) + Math.min(a.useCount, 5)
          const bScore = (b.imageUrl ? 5 : 0) + Math.min(b.useCount, 5)
          return bScore - aScore
        })
        break
    }

    return result
  }, [prompts, activeCategory, searchQuery, sortMode, onlyWithTemplates])

  // Pagination
  const totalPages = Math.ceil(filteredPrompts.length / PROMPTS_PER_PAGE)
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * PROMPTS_PER_PAGE
    return filteredPrompts.slice(start, start + PROMPTS_PER_PAGE)
  }, [filteredPrompts, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, searchQuery, onlyWithTemplates])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CategoryFilter, number>> = {
      all: prompts.length,
      favorites: prompts.filter(p => p.isFavorite).length,
    }
    prompts.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1
    })
    return counts
  }, [prompts])

  // Handlers
  const handleSelectPrompt = useCallback((prompt: GalleryPrompt) => {
    // Clicking a card now directly opens the modal (better UX)
    setPromptToStart(prompt)
  }, [])

  const handleUsePrompt = useCallback((prompt: GalleryPrompt) => {
    setPromptToStart(prompt)
  }, [])

  const handleToggleFavorite = useCallback(async (prompt: GalleryPrompt) => {
    if (!manager) return
    try {
      const store = manager.getStore()
      const isFavorite = await store.toggleFavorite(prompt.id)
      setPrompts(prev => prev.map(p =>
        p.id === prompt.id ? { ...p, isFavorite } : p
      ))
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }, [manager])

  const handleStartWriting = useCallback((prompt: GalleryPrompt) => {
    setWritingPrompt(prompt)
    setIsWriting(true)
    setPromptToStart(null)
    setSelectedPrompt(null)
    if (manager) {
      manager.getStore().recordUsage(prompt.id).catch(console.error)
    }
  }, [manager])

  const handleCloseWriting = useCallback(() => {
    setIsWriting(false)
    setWritingPrompt(null)
    setTemplateContent(null)
  }, [])

  const handleStartWithTemplate = useCallback((content: string) => {
    setTemplateContent(content)
    setIsWriting(true)
  }, [])

  // Render writing mode
  if (isWriting) {
    const content = templateContent
      || (writingPrompt ? `# ${writingPrompt.text}\n\n` : '')
    return (
      <DistractionFreeEditor
        initialContent={content}
        onExit={handleCloseWriting}
      />
    )
  }

  // Right panel content - dedicated PromptRightSidebar component
  const rightPanelContent = (
    <PromptRightSidebar
      theme={theme}
      activeCategory={activeCategory}
      onSelectCategory={setActiveCategory}
      categoryCounts={categoryCounts}
      sortMode={sortMode}
      onSortChange={setSortMode}
      onlyWithTemplates={onlyWithTemplates}
      onToggleTemplates={() => setOnlyWithTemplates(!onlyWithTemplates)}
      templateCount={templateCount}
    />
  )

  // Left panel content - use WriteLeftSidebar for compact design
  const leftPanelContent = (
    <WriteLeftSidebar
      theme={theme}
      onStartBlank={() => setIsWriting(true)}
      onStartWithPrompt={() => {
        // Get a random prompt and start writing
        if (prompts.length > 0) {
          const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]
          handleStartWriting(randomPrompt)
        }
      }}
      onStartTimed={() => {
        // Start a timed writing session
        setIsWriting(true)
      }}
    />
  )

  return (
    <QuarryPageLayout
      showRightPanel={true}
      rightPanelContent={rightPanelContent}
      leftPanelContent={leftPanelContent}
      rightPanelWidth={240}
      forceSidebarSmall={true}
    >
      <div className={cn('min-h-screen', colors.bg)}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Main Content */}
          <main className="w-full">
              {/* Header */}
              <header className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <button
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className={cn(
                        'lg:hidden p-2.5 rounded-lg touch-manipulation active:scale-95',
                        colors.hover, colors.text
                      )}
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div>
                      <h1 className={cn('text-xl font-semibold flex items-center gap-2', colors.heading)}>
                        <LayoutGrid className="w-5 h-5" />
                        Prompts
                      </h1>
                      <p className={cn('text-xs mt-0.5', colors.textMuted)}>
                        {filteredPrompts.length} of {prompts.length} prompts
                        {currentPage > 1 && ` • Page ${currentPage}`}
                      </p>
                    </div>
                  </div>

                  {/* Desktop Search */}
                  <div className="relative hidden sm:block">
                    <Search className={cn(
                      'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                      colors.textMuted
                    )} />
                    <input
                      type="text"
                      placeholder="Search prompts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        'pl-9 pr-8 py-2 rounded-lg text-sm w-48 md:w-64',
                        'border focus:outline-none focus:ring-1',
                        colors.inputBg,
                        colors.inputBorder,
                        colors.text,
                        isDark ? 'focus:ring-zinc-600' : 'focus:ring-zinc-300'
                      )}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full',
                          colors.hover
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile Search */}
                <div className="relative sm:hidden">
                  <Search className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
                    colors.textMuted
                  )} />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full pl-9 pr-8 py-3 rounded-lg text-base',
                      'border focus:outline-none focus:ring-1',
                      colors.inputBg,
                      colors.inputBorder,
                      colors.text,
                      isDark ? 'focus:ring-zinc-600' : 'focus:ring-zinc-300'
                    )}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={cn(
                        'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full',
                        colors.hover
                      )}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Mobile Category Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:hidden scrollbar-none">
                  {(['all', 'favorites', 'creative', 'reflection', 'personal'] as const).map((cat) => {
                    const display = cat === 'all'
                      ? { emoji: '📚', label: 'All' }
                      : cat === 'favorites'
                      ? { emoji: '❤️', label: 'Favorites' }
                      : CATEGORY_DISPLAY[cat] || { emoji: '📝', label: cat }
                    const isActive = activeCategory === cat

                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap',
                          'touch-manipulation active:scale-95 transition-all shrink-0',
                          isActive
                            ? cn(themeGradient.gradient, 'text-white')
                            : cn(colors.cardBg, colors.text, 'border', colors.inputBorder)
                        )}
                      >
                        <span>{display.emoji}</span>
                        <span>{display.label}</span>
                      </button>
                    )
                  })}
                </div>
              </header>

              {/* Selected Prompt Bar */}
              <AnimatePresence>
                {selectedPrompt && (
                  <SelectedPromptBar
                    prompt={selectedPrompt}
                    colors={colors}
                    isDark={isDark}
                    gradient={themeGradient}
                    onClear={() => setSelectedPrompt(null)}
                    onUse={handleUsePrompt}
                  />
                )}
              </AnimatePresence>

              {/* Grid */}
              <BentoPromptGrid
                prompts={paginatedPrompts}
                theme={theme}
                isLoading={isLoading}
                onSelectPrompt={handleSelectPrompt}
                onUsePrompt={handleUsePrompt}
                onToggleFavorite={handleToggleFavorite}
                autoFeatureCount={2}
              />

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                colors={colors}
                gradient={themeGradient}
              />
            </main>
        </div>
      </div>

      {/* Prompt Start Modal */}
      <AnimatePresence>
        {promptToStart && (
          <PromptStartModal
            prompt={promptToStart}
            onClose={() => setPromptToStart(null)}
            onStartBlank={handleStartWriting}
            onStartWithTemplate={(prompt, content) => {
              setWritingPrompt({ ...prompt, text: content || prompt.text })
              setIsWriting(true)
              setPromptToStart(null)
            }}
            onToggleFavorite={() => handleToggleFavorite(promptToStart)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <MobileDrawer
            isOpen={showMobileMenu}
            onClose={() => setShowMobileMenu(false)}
            colors={colors}
            isDark={isDark}
            gradient={themeGradient}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            categoryCounts={categoryCounts}
            sortMode={sortMode}
            onSortChange={setSortMode}
            onStartBlank={() => setIsWriting(true)}
            onStartWithTemplate={handleStartWithTemplate}
          />
        )}
      </AnimatePresence>
    </QuarryPageLayout>
  )
}
