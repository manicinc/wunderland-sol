/**
 * Performance Mode Toggle
 * @module components/quarry/ui/common/PerformanceModeToggle
 * 
 * @description
 * Toggle component for reduced motion / performance mode.
 * Respects system preferences and allows manual override.
 * 
 * @example
 * ```tsx
 * <PerformanceModeToggle isDark={isDark} />
 * ```
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Zap, ZapOff, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceModeToggleProps {
  isDark?: boolean
  className?: string
  compact?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PerformanceModeToggle({
  isDark = false,
  className,
  compact = false,
}: PerformanceModeToggleProps) {
  const { 
    prefersReducedMotion, 
    manualOverride, 
    isSystemPreference,
    cycleMotionPreference 
  } = useReducedMotion()

  // Determine current state for display
  const stateLabel = isSystemPreference 
    ? 'System' 
    : manualOverride 
    ? 'Reduced' 
    : 'Full'
  
  const stateDescription = isSystemPreference
    ? 'Following system preference'
    : manualOverride
    ? 'Animations minimized'
    : 'All animations enabled'

  const Icon = isSystemPreference 
    ? Monitor 
    : prefersReducedMotion 
    ? ZapOff 
    : Zap

  if (compact) {
    return (
      <button
        onClick={cycleMotionPreference}
        className={cn(
          'p-2 rounded-lg transition-colors touch-manipulation',
          prefersReducedMotion
            ? isDark 
              ? 'text-amber-400 bg-amber-500/10' 
              : 'text-amber-600 bg-amber-50'
            : isDark 
            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' 
            : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
          className
        )}
        title={`Performance mode: ${stateLabel} - Click to cycle`}
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'w-4 h-4',
            prefersReducedMotion
              ? isDark ? 'text-amber-400' : 'text-amber-600'
              : isDark ? 'text-zinc-400' : 'text-zinc-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            Performance Mode
          </span>
        </div>
      </div>

      {/* Three-way toggle */}
      <div className={cn(
        'flex items-center gap-1 p-1 rounded-lg',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
      )}>
        {/* System */}
        <button
          onClick={() => cycleMotionPreference()}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-all',
            isSystemPreference
              ? isDark
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-white text-zinc-900 shadow-sm'
              : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">System</span>
        </button>

        {/* Reduced */}
        <button
          onClick={() => cycleMotionPreference()}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-all',
            manualOverride === true
              ? isDark
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-amber-100 text-amber-700'
              : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          <ZapOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reduced</span>
        </button>

        {/* Full */}
        <button
          onClick={() => cycleMotionPreference()}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm transition-all',
            manualOverride === false
              ? isDark
                ? 'bg-zinc-700 text-zinc-100'
                : 'bg-white text-zinc-900 shadow-sm'
              : isDark
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Full</span>
        </button>
      </div>

      <p className={cn(
        'text-xs',
        isDark ? 'text-zinc-500' : 'text-zinc-400'
      )}>
        {stateDescription}
      </p>
    </div>
  )
}

export default PerformanceModeToggle

