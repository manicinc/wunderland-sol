/**
 * Writing Timer Display Component
 * @module codex/ui/WritingTimerDisplay
 *
 * Compact timer widget showing active writing time.
 * Displays state (active/paused) and allows interaction.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Timer, Play, Pause, Square, RotateCcw } from 'lucide-react'
import type { TimerState } from '@/lib/tracking/writingTimer'
import { cn } from '@/lib/utils'

export interface WritingTimerDisplayProps {
  /** Active writing time in seconds */
  activeTime: number
  /** Total elapsed time in seconds */
  totalTime: number
  /** Formatted active time (mm:ss) */
  activeTimeFormatted: string
  /** Current timer state */
  state: TimerState
  /** Theme */
  theme?: 'light' | 'dark'
  /** Compact mode (smaller display) */
  compact?: boolean
  /** Show total time */
  showTotal?: boolean
  /** Start handler */
  onStart?: () => void
  /** Pause handler */
  onPause?: () => void
  /** Resume handler */
  onResume?: () => void
  /** Stop handler */
  onStop?: () => void
  /** Reset handler */
  onReset?: () => void
  /** Click handler for opening stats */
  onClick?: () => void
  /** Additional class names */
  className?: string
}

export function WritingTimerDisplay({
  activeTime,
  totalTime,
  activeTimeFormatted,
  state,
  theme = 'dark',
  compact = false,
  showTotal = false,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onClick,
  className,
}: WritingTimerDisplayProps) {
  const isDark = theme.includes('dark')
  const isRunning = state === 'running'
  const isPaused = state === 'paused'
  const isIdle = state === 'idle'
  const isStopped = state === 'stopped'

  const getStateColor = () => {
    if (isRunning) return 'text-green-500'
    if (isPaused) return 'text-amber-500'
    return isDark ? 'text-zinc-400' : 'text-zinc-500'
  }

  const getStateBg = () => {
    if (isRunning)
      return isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
    if (isPaused)
      return isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
    return isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
  }

  const getStateLabel = () => {
    if (isRunning) return 'Active'
    if (isPaused) return 'Paused'
    if (isStopped) return 'Stopped'
    return 'Ready'
  }

  // Compact mode - minimal display
  if (compact) {
    return (
      <motion.button
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
          getStateBg(),
          onClick && 'cursor-pointer hover:opacity-80',
          className
        )}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.02 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        <Timer className={cn('w-4 h-4', getStateColor())} />
        <span
          className={cn(
            'font-mono text-sm font-medium',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}
        >
          {activeTimeFormatted}
        </span>
        {isRunning && (
          <motion.div
            className="w-2 h-2 rounded-full bg-green-500"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {isPaused && <div className="w-2 h-2 rounded-full bg-amber-500" />}
      </motion.button>
    )
  }

  // Full display with controls
  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        getStateBg(),
        className
      )}
    >
      {/* Main display */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between',
          onClick && 'cursor-pointer hover:opacity-80'
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', isDark ? 'bg-zinc-800' : 'bg-white')}>
            <Timer className={cn('w-5 h-5', getStateColor())} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-mono text-xl font-semibold',
                  isDark ? 'text-white' : 'text-zinc-900'
                )}
              >
                {activeTimeFormatted}
              </span>
              {isRunning && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs',
                  isRunning
                    ? 'text-green-500'
                    : isPaused
                      ? 'text-amber-500'
                      : isDark
                        ? 'text-zinc-500'
                        : 'text-zinc-400'
                )}
              >
                {getStateLabel()}
              </span>
              {showTotal && totalTime !== activeTime && (
                <span
                  className={cn(
                    'text-xs',
                    isDark ? 'text-zinc-600' : 'text-zinc-400'
                  )}
                >
                  (Total: {Math.floor(totalTime / 60)}m)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {isIdle && onStart && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onStart()
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-green-400'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-green-600'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Play className="w-4 h-4" />
            </motion.button>
          )}

          {isRunning && onPause && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onPause()
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-amber-400'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-amber-600'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Pause className="w-4 h-4" />
            </motion.button>
          )}

          {isPaused && (
            <>
              {onResume && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    onResume()
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isDark
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-green-400'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-green-600'
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play className="w-4 h-4" />
                </motion.button>
              )}
              {onStop && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStop()
                  }}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isDark
                      ? 'hover:bg-zinc-700 text-zinc-400 hover:text-red-400'
                      : 'hover:bg-zinc-200 text-zinc-500 hover:text-red-600'
                  )}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Square className="w-4 h-4" />
                </motion.button>
              )}
            </>
          )}

          {(isStopped || (activeTime > 0 && isIdle)) && onReset && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onReset()
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

export default WritingTimerDisplay
