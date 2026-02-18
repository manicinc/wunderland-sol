/**
 * Navigation Root Toggle Component
 * @module codex/ui/NavigationRootToggle
 * 
 * @remarks
 * Toggle between Fabric-only view (weaves/) and full repository view.
 * - **Fabric**: Start at weaves/ folder, show only the knowledge hierarchy
 * - **Root**: Show entire repository including README, LICENSE, configs, etc.
 */

'use client'

import React from 'react'
import { Book, FolderTree } from 'lucide-react'
import type { NavigationRootScope } from '../../types'

interface NavigationRootToggleProps {
  /** Current root scope */
  value: NavigationRootScope
  /** Change handler */
  onChange: (scope: NavigationRootScope) => void
  /** Optional class name */
  className?: string
  /** Compact mode for tighter layouts */
  compact?: boolean
}

/**
 * Toggle between Fabric and Root navigation
 * 
 * @example
 * ```tsx
 * <NavigationRootToggle
 *   value={rootScope}
 *   onChange={setRootScope}
 * />
 * ```
 */
export default function NavigationRootToggle({
  value,
  onChange,
  className = '',
  compact = false,
}: NavigationRootToggleProps) {
  const options: Array<{
    value: NavigationRootScope
    label: string
    shortLabel: string
    icon: React.ComponentType<{ className?: string }>
    description: string
  }> = [
    {
      value: 'fabric',
      label: 'Fabric',
      shortLabel: 'Fab',
      icon: Book,
      description: 'Knowledge hierarchy only (weaves, looms, strands)',
    },
    {
      value: 'weaves',
      label: 'Full Repo',
      shortLabel: 'All',
      icon: FolderTree,
      description: 'Entire repository (includes README, LICENSE, configs)',
    },
  ]

  return (
    <div className={`inline-flex border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 overflow-hidden rounded ${className}`}>
      {options.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              font-medium transition-all duration-200
              border-r border-zinc-200 dark:border-zinc-700 last:border-r-0
              hover:bg-zinc-100 dark:hover:bg-zinc-800
              focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:ring-inset
              ${compact ? 'p-0.5 sm:px-1 sm:py-0.5 text-[8px] sm:text-[9px]' : 'px-1.5 py-0.5 text-[9px]'}
              ${
                isActive
                  ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                  : 'bg-transparent text-zinc-700 dark:text-zinc-300'
              }
            `}
            title={option.description}
            aria-label={`Navigate from ${option.label}: ${option.description}`}
            aria-pressed={isActive}
          >
            {/* Icon only on very small screens when compact, otherwise icon + short label */}
            <div className="flex items-center gap-0.5">
              <Icon className={compact ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5'} />
              <span className={compact ? 'hidden sm:inline whitespace-nowrap' : 'whitespace-nowrap'}>
                {option.shortLabel}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
