'use client'

/**
 * Spiral Path Left Sidebar
 * @module components/quarry/ui/sidebar/SpiralPathLeftSidebar
 *
 * Left sidebar for the Spiral Path learning visualization with:
 * - Level progress
 * - Learning stats
 * - Path controls
 * - Timer
 */

import React from 'react'
import Link from 'next/link'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  Route,
  Target,
  CheckCircle2,
  Clock,
  Trophy,
  ChevronRight,
  Sparkles,
  BookOpen,
  BarChart3,
  Network,
  Play,
  Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'
import { TimerSection } from './sections/TimerSection'

export interface SpiralPathLeftSidebarProps {
  isDark: boolean
  /** Current level/stage in the path */
  currentLevel?: number
  /** Total levels available */
  totalLevels?: number
  /** Completed strands count */
  completedStrands?: number
  /** Total strands in path */
  totalStrands?: number
  /** Is currently in learning mode */
  isLearning?: boolean
  /** Toggle learning mode */
  onToggleLearning?: () => void
  className?: string
}

export default function SpiralPathLeftSidebar({
  isDark,
  currentLevel = 1,
  totalLevels = 5,
  completedStrands = 0,
  totalStrands = 0,
  isLearning = false,
  onToggleLearning,
  className,
}: SpiralPathLeftSidebarProps) {
  const resolvePath = useQuarryPath()
  const progressPercent = totalStrands > 0
    ? Math.round((completedStrands / totalStrands) * 100)
    : 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Level Progress */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
            Level {currentLevel} of {totalLevels}
          </span>
          <Trophy className={cn(
            'w-4 h-4',
            currentLevel >= totalLevels ? 'text-amber-500' : isDark ? 'text-zinc-600' : 'text-zinc-400'
          )} />
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalLevels }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-2 rounded-full transition-colors',
                i < currentLevel
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500'
                  : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Learning Stats */}
      <CollapsibleSidebarSection
        title="Progress"
        icon={Target}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 space-y-3">
          {/* Strands Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                Strands Completed
              </span>
              <span className={cn('text-xs font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                {completedStrands}/{totalStrands}
              </span>
            </div>
            <div className={cn(
              'h-2 rounded-full overflow-hidden',
              isDark ? 'bg-zinc-800' : 'bg-zinc-200'
            )}>
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stats Pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className={cn(
              'p-2 rounded-lg text-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <CheckCircle2 className={cn('w-4 h-4 mx-auto mb-1', 'text-emerald-500')} />
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                Mastered
              </span>
              <div className={cn('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                {completedStrands}
              </div>
            </div>
            <div className={cn(
              'p-2 rounded-lg text-center',
              isDark ? 'bg-zinc-800' : 'bg-zinc-100'
            )}>
              <Clock className={cn('w-4 h-4 mx-auto mb-1', 'text-violet-500')} />
              <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                Remaining
              </span>
              <div className={cn('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
                {totalStrands - completedStrands}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSidebarSection>

      {/* Learning Controls */}
      <div className={cn(
        'p-3 border-b',
        isDark ? 'border-zinc-800' : 'border-zinc-200'
      )}>
        <button
          onClick={onToggleLearning}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isLearning
              ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/30'
              : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
          )}
        >
          {isLearning ? (
            <>
              <Pause className="w-4 h-4" />
              Pause Learning
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Learning
            </>
          )}
        </button>
      </div>

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={false}
        defaultMinutes={25}
        maxMinutes={60}
        title="Study Timer"
        showPomodoroMode={true}
      />

      {/* Related */}
      <CollapsibleSidebarSection
        title="Related"
        icon={Sparkles}
        defaultExpanded={false}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          <Link
            href={resolvePath('/quarry/learn')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span className="flex-1">Learn Mode</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/graph')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <Network className="w-4 h-4" />
            <span className="flex-1">Knowledge Graph</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
          <Link
            href={resolvePath('/quarry/analytics')}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
              isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="flex-1">Analytics</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  )
}

