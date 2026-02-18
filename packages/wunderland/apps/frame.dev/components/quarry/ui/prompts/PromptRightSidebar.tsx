/**
 * Prompt Right Sidebar
 *
 * Dedicated right sidebar for the prompts/write page with:
 * - Clock widget
 * - Category/filter controls
 * - Sort options
 * - Full ambience controls (jukebox, presets, mic, visualization)
 * @module components/quarry/ui/prompts/PromptRightSidebar
 */

'use client'

import React from 'react'
import {
  Clock,
  Filter,
  SortAsc,
  FileText,
  Sparkles,
  Star,
  Heart,
  Lightbulb,
  Code,
  Compass,
  Briefcase,
  Headphones,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from '@/components/quarry/ui/sidebar/sections'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import type { PromptCategory } from '@/lib/prompts/types'

// ============================================================================
// TYPES
// ============================================================================

export type SortMode = 'default' | 'most-used' | 'recent' | 'alphabetical' | 'random'

export interface PromptRightSidebarProps {
  /** Current theme */
  theme?: ThemeName
  /** Active category filter */
  activeCategory?: PromptCategory | 'all' | 'favorites'
  /** Category change handler */
  onSelectCategory?: (category: PromptCategory | 'all' | 'favorites') => void
  /** Category counts for badges */
  categoryCounts?: Record<string, number>
  /** Current sort mode */
  sortMode?: SortMode
  /** Sort mode change handler */
  onSortChange?: (mode: SortMode) => void
  /** Only show prompts with templates */
  onlyWithTemplates?: boolean
  /** Toggle template filter */
  onToggleTemplates?: () => void
  /** Number of prompts with templates */
  templateCount?: number
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

// Extended categories for UI display (includes categories beyond base PromptCategory)
const CATEGORIES = [
  { id: 'all', label: 'All Prompts', icon: Sparkles, color: 'text-rose-500' },
  { id: 'favorites', label: 'Favorites', icon: Star, color: 'text-amber-500' },
  { id: 'reflection', label: 'Reflection', icon: Heart, color: 'text-pink-500' },
  { id: 'creative', label: 'Creative', icon: Lightbulb, color: 'text-purple-500' },
  { id: 'technical', label: 'Technical', icon: Code, color: 'text-cyan-500' },
  { id: 'philosophical', label: 'Philosophical', icon: Compass, color: 'text-indigo-500' },
  { id: 'practical', label: 'Practical', icon: Briefcase, color: 'text-slate-500' },
] as const

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'default', label: 'Featured' },
  { id: 'most-used', label: 'Most Used' },
  { id: 'recent', label: 'Recent' },
  { id: 'alphabetical', label: 'A-Z' },
  { id: 'random', label: 'Random' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PromptRightSidebar({
  theme = 'dark',
  activeCategory = 'all',
  onSelectCategory,
  categoryCounts = {},
  sortMode = 'random',
  onSortChange,
  onlyWithTemplates = false,
  onToggleTemplates,
  templateCount = 0,
}: PromptRightSidebarProps) {
  const isDark = isDarkTheme(theme)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Clock Section */}
      <CollapsibleSidebarSection
        title="Clock"
        icon={Clock}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="flex justify-center py-2">
          <ClockWidget theme={theme} size="medium" compact={false} onNavigate={() => {}} />
        </div>
      </CollapsibleSidebarSection>

      {/* Categories */}
      <CollapsibleSidebarSection
        title="Categories"
        icon={Filter}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-0.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            const count = categoryCounts[cat.id] || 0

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory?.(cat.id as PromptCategory | 'all' | 'favorites')}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                  isActive
                    ? isDark
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'bg-zinc-200 text-zinc-800'
                    : isDark
                      ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive && cat.color)} />
                <span className="text-xs font-medium flex-1">{cat.label}</span>
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 rounded-full',
                    isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Filters & Sort */}
      <CollapsibleSidebarSection
        title="Filters"
        icon={SortAsc}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-3">
          {/* Sort Options */}
          <div>
            <p className={cn('text-[10px] uppercase tracking-wide mb-1.5 px-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
              Sort by
            </p>
            <div className="grid grid-cols-2 gap-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onSortChange?.(opt.id)}
                  className={cn(
                    'px-2 py-1 rounded text-xs transition-colors',
                    sortMode === opt.id
                      ? isDark
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'bg-zinc-200 text-zinc-800'
                      : isDark
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template Filter */}
          {templateCount > 0 && (
            <button
              onClick={onToggleTemplates}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                onlyWithTemplates
                  ? isDark
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'bg-emerald-100 text-emerald-700'
                  : isDark
                    ? 'text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">With templates only</span>
              <span className={cn(
                'text-[10px] px-1.5 rounded-full',
                isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}>
                {templateCount}
              </span>
            </button>
          )}
        </div>
      </CollapsibleSidebarSection>

      {/* Full Ambience Section with presets, mic, visualization */}
      <CollapsibleSidebarSection
        title="Ambience"
        icon={Headphones}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2">
          <AmbienceSection theme={theme} />
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer - pushes content above to top when sidebar is tall */}
      <div className="flex-1 min-h-[10px]" />
    </div>
  )
}

export default PromptRightSidebar
