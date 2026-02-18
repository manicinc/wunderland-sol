'use client'

/**
 * Evolution Left Sidebar
 * @module components/quarry/ui/sidebar/EvolutionLeftSidebar
 *
 * Compact left sidebar for the Evolution page with:
 * - Quick stats overview
 * - Time period filters
 * - Navigation shortcuts
 * - Focus timer
 */

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import {
  History,
  TrendingUp,
  Calendar,
  Layers,
  GitCommit,
  Tag,
  BarChart3,
  Network,
  Search,
  ChevronRight,
  Clock,
  Flame,
  Award,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimerSection } from './sections/TimerSection'
import { CollapsibleSidebarSection } from './sections/CollapsibleSidebarSection'

export interface EvolutionLeftSidebarProps {
  isDark: boolean
  stats?: {
    totalStrands: number
    totalCommits: number
    totalTags: number
    growthRate: number
    milestonesCount: number
  }
  className?: string
}

export default function EvolutionLeftSidebar({
  isDark,
  stats,
  className,
}: EvolutionLeftSidebarProps) {
  const resolvePath = useQuarryPath()

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Quick Stats */}
      <CollapsibleSidebarSection
        title="Overview"
        icon={TrendingUp}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-3 space-y-2">
          <StatRow
            icon={Layers}
            label="Strands"
            value={stats?.totalStrands ?? 0}
            color="emerald"
            isDark={isDark}
          />
          <StatRow
            icon={GitCommit}
            label="Commits"
            value={stats?.totalCommits ?? 0}
            color="cyan"
            isDark={isDark}
          />
          <StatRow
            icon={Tag}
            label="Tags"
            value={stats?.totalTags ?? 0}
            color="violet"
            isDark={isDark}
          />
          <StatRow
            icon={Award}
            label="Milestones"
            value={stats?.milestonesCount ?? 0}
            color="amber"
            isDark={isDark}
          />
          {stats?.growthRate !== undefined && (
            <div className={cn(
              'flex items-center justify-between p-2 rounded-lg',
              isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
            )}>
              <div className="flex items-center gap-2">
                <TrendingUp className={cn(
                  'w-4 h-4',
                  stats.growthRate >= 0 ? 'text-emerald-500' : 'text-red-500'
                )} />
                <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  Growth
                </span>
              </div>
              <span className={cn(
                'text-sm font-bold',
                stats.growthRate >= 0
                  ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                  : isDark ? 'text-red-400' : 'text-red-600'
              )}>
                {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CollapsibleSidebarSection>

      {/* Focus Timer */}
      <TimerSection
        isDark={isDark}
        defaultExpanded={false}
        defaultMinutes={25}
        maxMinutes={60}
        title="Focus Timer"
        showPomodoroMode={true}
      />

      {/* Quick Navigation */}
      <CollapsibleSidebarSection
        title="Related"
        icon={Network}
        defaultExpanded={true}
        isDark={isDark}
      >
        <div className="p-2 space-y-1">
          <NavLink
            href={resolvePath('/quarry/analytics')}
            icon={BarChart3}
            label="Full Analytics"
            isDark={isDark}
          />
          <NavLink
            href={resolvePath('/quarry/graph')}
            icon={Network}
            label="Knowledge Graph"
            isDark={isDark}
          />
          <NavLink
            href={resolvePath('/quarry/search')}
            icon={Search}
            label="Search Strands"
            isDark={isDark}
          />
          <NavLink
            href={resolvePath('/quarry/plan')}
            icon={Target}
            label="Task Planner"
            isDark={isDark}
          />
        </div>
      </CollapsibleSidebarSection>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer hint */}
      <div className={cn(
        'p-3 text-[10px] text-center border-t',
        isDark ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-400'
      )}>
        Track your knowledge growth
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

function StatRow({
  icon: Icon,
  label,
  value,
  color,
  isDark,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'emerald' | 'cyan' | 'violet' | 'amber'
  isDark: boolean
}) {
  const colorClasses = {
    emerald: isDark ? 'text-emerald-400' : 'text-emerald-600',
    cyan: isDark ? 'text-cyan-400' : 'text-cyan-600',
    violet: isDark ? 'text-violet-400' : 'text-violet-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-lg',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', colorClasses[color])} />
        <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
          {label}
        </span>
      </div>
      <span className={cn('text-sm font-bold', isDark ? 'text-zinc-200' : 'text-zinc-800')}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}

function NavLink({
  href,
  icon: Icon,
  label,
  isDark,
}: {
  href: string
  icon: React.ElementType
  label: string
  isDark: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
        isDark
          ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-800'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-3 h-3 opacity-50" />
    </Link>
  )
}

