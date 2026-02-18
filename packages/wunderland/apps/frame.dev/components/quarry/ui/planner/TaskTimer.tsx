/**
 * TaskTimer Component
 *
 * Timer controls and display for tracking time spent on tasks.
 * Supports start/stop/pause with persistence and floating overlay mode.
 *
 * @module components/quarry/ui/planner/TaskTimer
 */

'use client'

import { useState, useCallback, memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  Timer,
  X,
  Minimize2,
  Maximize2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTaskTimer, useActiveTimer, setActiveTimerTaskId, formatTimerTime } from '@/lib/planner/hooks/useTaskTimer'
import type { Task } from '@/lib/planner/types'
import { formatDuration } from '@/lib/planner/types'
import { getProjectColor, getProjectName } from '@/lib/planner/projects'

export interface TaskTimerProps {
  task: Task
  onComplete?: (actualDuration: number) => void
  compact?: boolean
  showEstimate?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

function TaskTimerComponent({
  task,
  onComplete,
  compact = false,
  showEstimate = true,
  theme = 'dark',
  className,
}: TaskTimerProps) {
  const {
    state,
    formattedTime,
    elapsedMinutes,
    start,
    pause,
    resume,
    stop,
    reset,
    isRunning,
    isPaused,
    isIdle,
  } = useTaskTimer({
    taskId: task.id,
    onComplete,
  })

  const { setActive } = useActiveTimer()

  const handleStart = useCallback(async () => {
    setActive(task.id)
    await start()
  }, [task.id, start, setActive])

  const handlePause = useCallback(async () => {
    await pause()
  }, [pause])

  const handleResume = useCallback(async () => {
    setActive(task.id)
    await resume()
  }, [task.id, resume, setActive])

  const handleStop = useCallback(async () => {
    const actualMinutes = await stop()
    setActive(null)
    onComplete?.(actualMinutes)
  }, [stop, setActive, onComplete])

  const handleReset = useCallback(async () => {
    await reset()
    setActive(null)
  }, [reset, setActive])

  const projectColor = getProjectColor(task.project) || '#64748b'

  // Compact inline timer for task cards
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2',
          className
        )}
      >
        {isIdle ? (
          <button
            onClick={handleStart}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
              theme === 'dark'
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            )}
          >
            <Play className="w-3 h-3" />
            Start
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'font-mono text-xs tabular-nums',
                isRunning
                  ? 'text-emerald-400'
                  : isPaused
                    ? 'text-amber-400'
                    : theme === 'dark'
                      ? 'text-zinc-400'
                      : 'text-gray-600'
              )}
            >
              {formattedTime}
            </span>
            {isRunning ? (
              <button
                onClick={handlePause}
                className={cn(
                  'p-1 rounded-full transition-colors',
                  theme === 'dark'
                    ? 'hover:bg-zinc-700 text-amber-400'
                    : 'hover:bg-gray-200 text-amber-500'
                )}
              >
                <Pause className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className={cn(
                  'p-1 rounded-full transition-colors',
                  theme === 'dark'
                    ? 'hover:bg-zinc-700 text-emerald-400'
                    : 'hover:bg-gray-200 text-emerald-500'
                )}
              >
                <Play className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleStop}
              className={cn(
                'p-1 rounded-full transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-700 text-red-400'
                  : 'hover:bg-gray-200 text-red-500'
              )}
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Full timer display
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        theme === 'dark'
          ? 'bg-zinc-900/80 border-zinc-800'
          : 'bg-white border-gray-200',
        className
      )}
    >
      {/* Timer display */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative">
          {/* Progress ring */}
          {task.duration && task.duration > 0 && (
            <svg
              className="w-32 h-32 transform -rotate-90"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={theme === 'dark' ? '#27272a' : '#e5e7eb'}
                strokeWidth="6"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={elapsedMinutes > task.duration ? '#ef4444' : projectColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54}
                initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                animate={{
                  strokeDashoffset:
                    2 * Math.PI * 54 * (1 - Math.min((elapsedMinutes || 0) / Math.max(task.duration, 1), 1)),
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>
          )}
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center',
              !task.duration && 'relative w-32 h-32'
            )}
          >
            <span
              className={cn(
                'font-mono text-3xl font-bold tabular-nums',
                isRunning
                  ? 'text-emerald-400'
                  : isPaused
                    ? 'text-amber-400'
                    : theme === 'dark'
                      ? 'text-white'
                      : 'text-gray-900'
              )}
            >
              {formattedTime}
            </span>
            {isRunning && (
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-400 mt-1"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Estimate comparison */}
        {showEstimate && task.duration && (
          <div
            className={cn(
              'mt-3 text-sm',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
            )}
          >
            Estimated: {formatDuration(task.duration)}
            {elapsedMinutes > 0 && (
              <span
                className={cn(
                  'ml-2',
                  elapsedMinutes > task.duration
                    ? 'text-red-400'
                    : elapsedMinutes > task.duration * 0.8
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                )}
              >
                {elapsedMinutes > task.duration ? '+' : ''}
                {Math.round(((elapsedMinutes - task.duration) / task.duration) * 100)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {isIdle ? (
          <button
            onClick={handleStart}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all',
              'bg-emerald-500 text-white hover:bg-emerald-600',
              'shadow-lg shadow-emerald-500/25'
            )}
          >
            <Play className="w-5 h-5" />
            Start Timer
          </button>
        ) : (
          <>
            {isRunning ? (
              <button
                onClick={handlePause}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                )}
                title="Pause"
              >
                <Pause className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={handleResume}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                )}
                title="Resume"
              >
                <Play className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={handleStop}
              className={cn(
                'p-3 rounded-full transition-colors',
                'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              )}
              title="Stop & Save"
            >
              <Square className="w-6 h-6" />
            </button>

            <button
              onClick={handleReset}
              className={cn(
                'p-2 rounded-full transition-colors',
                theme === 'dark'
                  ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Actual duration display (if stopped) */}
      {task.actualDuration && isIdle && elapsedMinutes === 0 && (
        <div
          className={cn(
            'mt-4 pt-4 border-t text-center',
            theme === 'dark' ? 'border-zinc-800' : 'border-gray-200'
          )}
        >
          <span
            className={cn(
              'text-sm',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'
            )}
          >
            Last recorded: {formatDuration(task.actualDuration)}
          </span>
        </div>
      )}
    </div>
  )
}

export const TaskTimer = memo(TaskTimerComponent)
export default TaskTimer

/**
 * Floating timer overlay for desktop
 */
export interface FloatingTimerProps {
  task: Task | null
  onClose: () => void
  onTaskClick?: (task: Task) => void
  onComplete?: (actualDuration: number) => void
  theme?: 'light' | 'dark'
}

export function FloatingTimer({
  task,
  onClose,
  onTaskClick,
  onComplete,
  theme = 'dark',
}: FloatingTimerProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 })

  if (!task) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        drag
        dragMomentum={false}
        onDragEnd={(_, info) => {
          setPosition((prev) => ({
            x: prev.x + info.offset.x,
            y: prev.y + info.offset.y,
          }))
        }}
        style={{
          position: 'fixed',
          bottom: position.y,
          right: position.x,
          zIndex: 9999,
        }}
        className={cn(
          'rounded-2xl border shadow-2xl cursor-move',
          theme === 'dark'
            ? 'bg-zinc-900 border-zinc-700'
            : 'bg-white border-gray-200'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 border-b',
            theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'
          )}
        >
          <div className="flex items-center gap-2">
            <Timer
              className={cn(
                'w-4 h-4',
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium truncate max-w-[150px]',
                theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'
              )}
            >
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className={cn(
                'p-1 rounded transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-800 text-zinc-500'
                  : 'hover:bg-gray-100 text-gray-400'
              )}
            >
              {isMinimized ? (
                <Maximize2 className="w-3 h-3" />
              ) : (
                <Minimize2 className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={onClose}
              className={cn(
                'p-1 rounded transition-colors',
                theme === 'dark'
                  ? 'hover:bg-zinc-800 text-zinc-500 hover:text-red-400'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-red-500'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Timer content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3">
                <TaskTimer
                  task={task}
                  onComplete={onComplete}
                  theme={theme}
                />
              </div>

              {/* Go to task button */}
              {onTaskClick && (
                <button
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1 px-3 py-2 text-xs transition-colors border-t',
                    theme === 'dark'
                      ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                      : 'border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  )}
                >
                  View Task
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized view */}
        {isMinimized && (
          <MiniTimer task={task} onComplete={onComplete} theme={theme} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Minimized timer display
 */
function MiniTimer({
  task,
  onComplete,
  theme = 'dark',
}: {
  task: Task
  onComplete?: (actualDuration: number) => void
  theme?: 'light' | 'dark'
}) {
  const { formattedTime, isRunning, isPaused, pause, resume, stop } = useTaskTimer({
    taskId: task.id,
    onComplete,
  })
  const { setActive } = useActiveTimer()

  const handlePauseResume = async () => {
    if (isRunning) {
      await pause()
    } else {
      setActive(task.id)
      await resume()
    }
  }

  const handleStop = async () => {
    const actualMinutes = await stop()
    setActive(null)
    onComplete?.(actualMinutes)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span
        className={cn(
          'font-mono text-lg font-bold tabular-nums',
          isRunning
            ? 'text-emerald-400'
            : isPaused
              ? 'text-amber-400'
              : theme === 'dark'
                ? 'text-white'
                : 'text-gray-900'
        )}
      >
        {formattedTime}
      </span>
      <button
        onClick={handlePauseResume}
        className={cn(
          'p-1.5 rounded-full transition-colors',
          isRunning
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
        )}
      >
        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <button
        onClick={handleStop}
        className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
      >
        <Square className="w-4 h-4" />
      </button>
    </div>
  )
}
