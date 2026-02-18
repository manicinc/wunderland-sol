/**
 * Write Right Sidebar
 *
 * Right sidebar for Write/Prompts mode with full ambience, clock, jukebox,
 * and category filters.
 * @module components/quarry/ui/writing/WriteRightSidebar
 */

'use client'

import React from 'react'
import {
  Filter,
  Star,
  Heart,
  Lightbulb,
  Code,
  Compass,
  BookOpen,
  Brain,
  Briefcase,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Clock,
  Music,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from '@/components/quarry/ui/sidebar/sections'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import { AmbienceSection } from '@/components/quarry/ui/sidebar/AmbienceRightSidebar'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface WriteRightSidebarProps {
  /** Current theme */
  theme?: ThemeName
  /** Selected category */
  selectedCategory?: string
  /** Callback when category is selected */
  onCategorySelect?: (category: string) => void
  /** Total words written today */
  todayWords?: number
  /** Current writing streak */
  streak?: number
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORIES = [
  { id: 'all', label: 'All Prompts', icon: Sparkles, color: 'text-rose-500' },
  { id: 'favorites', label: 'Favorites', icon: Star, color: 'text-amber-500' },
  { id: 'reflection', label: 'Reflection', icon: Heart, color: 'text-pink-500' },
  { id: 'creative', label: 'Creative', icon: Lightbulb, color: 'text-yellow-500' },
  { id: 'technical', label: 'Technical', icon: Code, color: 'text-blue-500' },
  { id: 'philosophical', label: 'Philosophical', icon: Brain, color: 'text-purple-500' },
  { id: 'practical', label: 'Practical', icon: Briefcase, color: 'text-emerald-500' },
  { id: 'exploration', label: 'Exploration', icon: Compass, color: 'text-cyan-500' },
  { id: 'personal', label: 'Personal', icon: BookOpen, color: 'text-orange-500' },
  { id: 'learning', label: 'Learning', icon: GraduationCap, color: 'text-indigo-500' },
]

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
  subValue,
  isDark,
}: {
  label: string
  value: string | number
  subValue?: string
  isDark: boolean
}) {
  return (
    <div className={cn(
      'p-2.5 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <p className={cn('text-[10px] uppercase tracking-wide', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        {label}
      </p>
      <p className={cn('text-lg font-bold tabular-nums', isDark ? 'text-zinc-100' : 'text-zinc-800')}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {subValue && (
          <span className={cn('text-xs font-normal ml-1', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {subValue}
          </span>
        )}
      </p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WriteRightSidebar({
  theme = 'dark',
  selectedCategory = 'all',
  onCategorySelect,
  todayWords = 0,
  streak = 0,
}: WriteRightSidebarProps) {
  const isDark = isDarkTheme(theme)

  // Audio hook - only need isPlaying for the badge indicator
  const { isPlaying } = useAmbienceSounds()

  const handleCategoryClick = (category: string) => {
    if (onCategorySelect) {
      onCategorySelect(category)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Clock Section - Always at top */}
      <CollapsibleSidebarSection
        title="Clock"
        icon={Clock}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="flex justify-center py-3">
          <ClockWidget theme={theme} size="medium" compact={false} onNavigate={() => {}} />
        </div>
      </CollapsibleSidebarSection>

      {/* Category Filters */}
      <CollapsibleSidebarSection
        title="Categories"
        icon={Filter}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-0.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = selectedCategory === cat.id
            
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
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
                {isActive && (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )
          })}
        </div>
      </CollapsibleSidebarSection>

      {/* Session Stats */}
      <CollapsibleSidebarSection
        title="Session"
        icon={Sparkles}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-3 grid grid-cols-2 gap-2">
          <StatCard
            label="Today"
            value={todayWords}
            subValue="words"
            isDark={isDark}
          />
          <StatCard
            label="Streak"
            value={streak}
            subValue="days"
            isDark={isDark}
          />
        </div>
      </CollapsibleSidebarSection>

      {/* Ambience Section - Full controls with jukebox, presets, mic input */}
      <CollapsibleSidebarSection
        title="Ambience"
        icon={Music}
        defaultExpanded={true}
        isDark={isDark}
        badge={isPlaying ? (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        ) : undefined}
      >
        <div className="p-2">
          <AmbienceSection theme={theme} />
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer - fills remaining space */}
      <div className="flex-1 min-h-[10px]" />
    </div>
  )
}

export default WriteRightSidebar

