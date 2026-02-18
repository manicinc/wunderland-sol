/**
 * Reflect Left Sidebar
 * 
 * Left sidebar for Reflect/Journal mode.
 * Uses shared collapsible sections for consistency.
 * @module components/quarry/ui/reflect/ReflectLeftSidebar
 */

'use client'

import React from 'react'
import {
  Lightbulb,
  Flame,
  FileText,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ClockSection,
  TimerSection,
  CollapsibleSidebarSection,
} from '@/components/quarry/ui/sidebar/sections'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface ReflectLeftSidebarProps {
  /** Current theme */
  theme: ThemeName
  /** Current streak */
  currentStreak?: number
  /** Total entries count */
  totalEntries?: number
  /** Callback when prompt is selected */
  onPromptSelect?: (prompt: string) => void
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
      accent: isDark ? 'text-purple-400' : 'text-purple-600',
      cardBg: isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
      textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      textSubtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      heading: isDark ? 'text-zinc-100' : 'text-zinc-800',
      streakText: isDark ? 'text-orange-400' : 'text-orange-500',
      hover: isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
    },
    sepia: {
      accent: isDark ? 'text-amber-400' : 'text-amber-600',
      cardBg: isDark ? 'bg-stone-800/50' : 'bg-amber-50',
      textMuted: isDark ? 'text-stone-400' : 'text-stone-500',
      textSubtle: isDark ? 'text-stone-500' : 'text-stone-400',
      heading: isDark ? 'text-stone-100' : 'text-stone-800',
      streakText: isDark ? 'text-amber-400' : 'text-amber-600',
      hover: isDark ? 'hover:bg-stone-800' : 'hover:bg-amber-100',
    },
    terminal: {
      accent: isDark ? 'text-green-400' : 'text-green-600',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-50',
      textMuted: isDark ? 'text-green-400' : 'text-green-600',
      textSubtle: isDark ? 'text-green-500' : 'text-green-500',
      heading: isDark ? 'text-green-100' : 'text-green-900',
      streakText: isDark ? 'text-lime-400' : 'text-lime-600',
      hover: isDark ? 'hover:bg-green-900/20' : 'hover:bg-green-100',
    },
    oceanic: {
      accent: isDark ? 'text-cyan-400' : 'text-cyan-600',
      cardBg: isDark ? 'bg-slate-800/50' : 'bg-cyan-50',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
      textSubtle: isDark ? 'text-slate-500' : 'text-slate-400',
      heading: isDark ? 'text-slate-100' : 'text-slate-800',
      streakText: isDark ? 'text-teal-400' : 'text-teal-600',
      hover: isDark ? 'hover:bg-slate-800' : 'hover:bg-cyan-100',
    },
  }

  return colors[category]
}

// ============================================================================
// JOURNAL PROMPTS
// ============================================================================

const JOURNAL_PROMPTS = [
  "What am I grateful for today?",
  "What's on my mind right now?",
  "What did I learn today?",
  "What would make today great?",
  "What's one thing I want to remember?",
]

// ============================================================================
// REFLECTION TIPS
// ============================================================================

const REFLECTION_TIPS = [
  "Start with feelings",
  "Be specific, not general",
  "No judgement, just observe",
  "Write freely, edit later",
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReflectLeftSidebar({
  theme,
  currentStreak = 0,
  totalEntries = 0,
  onPromptSelect,
  onNavigate,
}: ReflectLeftSidebarProps) {
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  const handlePromptClick = (prompt: string) => {
    if (onPromptSelect) {
      onPromptSelect(prompt)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Clock Section */}
      <ClockSection
        theme={theme}
        isDark={isDark}
        defaultExpanded={true}
        onNavigate={onNavigate}
      />

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={true}
        defaultMinutes={5}
        maxMinutes={30}
        title="Focus Timer"
        onComplete={() => {
          console.log('Reflection timer complete!')
        }}
      />

      {/* Journal Prompts */}
      <CollapsibleSidebarSection
        title="Prompts"
        icon={Lightbulb}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 space-y-1">
          {JOURNAL_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handlePromptClick(prompt)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors',
                colors.textMuted,
                colors.hover
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </CollapsibleSidebarSection>

      {/* Progress Stats */}
      <CollapsibleSidebarSection
        title="Progress"
        icon={BarChart3}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 grid grid-cols-2 gap-2">
          <div className={cn('p-2 rounded-lg', colors.cardBg)}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Flame className={cn('w-3 h-3', colors.streakText)} />
              <span className={cn('text-[10px]', colors.textSubtle)}>Streak</span>
            </div>
            <p className={cn('text-lg font-bold', colors.heading)}>{currentStreak}</p>
          </div>
          <div className={cn('p-2 rounded-lg', colors.cardBg)}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <FileText className={cn('w-3 h-3', colors.accent)} />
              <span className={cn('text-[10px]', colors.textSubtle)}>Total</span>
            </div>
            <p className={cn('text-lg font-bold', colors.heading)}>{totalEntries}</p>
          </div>
        </div>
      </CollapsibleSidebarSection>

      {/* Tips Section */}
      <CollapsibleSidebarSection
        title="Tips"
        icon={Sparkles}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-3">
          <ul className="space-y-1.5 text-[11px]">
            {REFLECTION_TIPS.map((tip, i) => (
              <li key={i} className={cn('flex items-start gap-1.5', colors.textMuted)}>
                <span className={cn('mt-0.5 text-[8px]', colors.accent)}>●</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

export default ReflectLeftSidebar

