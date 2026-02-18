/**
 * Sprint Writing Modal
 * @module components/quarry/ui/writing/SprintWritingModal
 * 
 * @description
 * Timed writing challenges to boost productivity.
 * Features:
 * - Configurable duration (5, 10, 15, 30 min)
 * - Word count goals
 * - Real-time progress tracking
 * - Celebration on completion
 * 
 * @example
 * ```tsx
 * <SprintWritingModal 
 *   isOpen={showSprint}
 *   onClose={() => setShowSprint(false)}
 *   onStart={handleSprintStart}
 * />
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Timer, Target, Zap, Play, Pause, 
  Trophy, Flame, Star, RotateCcw, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface SprintWritingModalProps {
  isOpen: boolean
  onClose: () => void
  onStart?: (config: SprintConfig) => void
  onComplete?: (results: SprintResults) => void
  initialWordCount?: number
  currentWordCount?: number
  isDark?: boolean
}

export interface SprintConfig {
  durationMinutes: number
  wordGoal: number
}

export interface SprintResults {
  wordsWritten: number
  timeSpentSeconds: number
  goalReached: boolean
  wordsPerMinute: number
}

type SprintPhase = 'setup' | 'running' | 'paused' | 'complete'

// ============================================================================
// PRESET OPTIONS
// ============================================================================

const DURATION_PRESETS = [
  { minutes: 5, label: '5 min', description: 'Quick burst' },
  { minutes: 10, label: '10 min', description: 'Short sprint' },
  { minutes: 15, label: '15 min', description: 'Standard' },
  { minutes: 30, label: '30 min', description: 'Deep focus' },
]

const WORD_GOAL_PRESETS = [
  { words: 100, label: '100', description: 'Warm up' },
  { words: 250, label: '250', description: 'Quick draft' },
  { words: 500, label: '500', description: 'Standard' },
  { words: 1000, label: '1000', description: 'Challenge' },
]

// ============================================================================
// CONFETTI ANIMATION
// ============================================================================

function Confetti({ isDark }: { isDark: boolean }) {
  const colors = isDark 
    ? ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6']
    : ['#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6']
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: -20,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            y: window.innerHeight + 20,
            rotate: Math.random() * 720 - 360,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: Math.random() * 0.5,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
        />
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SprintWritingModal({
  isOpen,
  onClose,
  onStart,
  onComplete,
  initialWordCount = 0,
  currentWordCount = 0,
  isDark = false,
}: SprintWritingModalProps) {
  const [phase, setPhase] = useState<SprintPhase>('setup')
  const [duration, setDuration] = useState(15)
  const [wordGoal, setWordGoal] = useState(500)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [startWordCount, setStartWordCount] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  // Calculate words written during sprint
  const wordsWritten = Math.max(0, currentWordCount - startWordCount)
  const progress = wordGoal > 0 ? Math.min((wordsWritten / wordGoal) * 100, 100) : 0
  const elapsedSeconds = duration * 60 - timeRemaining

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start the sprint
  const handleStart = useCallback(() => {
    setStartWordCount(currentWordCount)
    setTimeRemaining(duration * 60)
    setPhase('running')
    startTimeRef.current = Date.now()
    
    onStart?.({ durationMinutes: duration, wordGoal })
  }, [currentWordCount, duration, wordGoal, onStart])

  // Pause/resume
  const togglePause = useCallback(() => {
    if (phase === 'running') {
      pausedTimeRef.current = timeRemaining
      setPhase('paused')
    } else if (phase === 'paused') {
      setPhase('running')
    }
  }, [phase, timeRemaining])

  // Reset sprint
  const handleReset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setPhase('setup')
    setTimeRemaining(0)
    setShowConfetti(false)
  }, [])

  // Complete the sprint
  const handleComplete = useCallback(() => {
    const results: SprintResults = {
      wordsWritten,
      timeSpentSeconds: elapsedSeconds,
      goalReached: wordsWritten >= wordGoal,
      wordsPerMinute: elapsedSeconds > 0 ? Math.round((wordsWritten / elapsedSeconds) * 60) : 0,
    }
    
    if (results.goalReached) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
    
    setPhase('complete')
    onComplete?.(results)
  }, [wordsWritten, wordGoal, elapsedSeconds, onComplete])

  // Timer effect
  useEffect(() => {
    if (phase !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      return
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [phase, handleComplete])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleReset()
    }
  }, [isOpen, handleReset])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showConfetti && <Confetti isDark={isDark} />}
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase === 'setup' ? onClose : undefined}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md overflow-hidden',
              'rounded-2xl border shadow-2xl',
              isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between p-4 border-b',
              isDark ? 'border-zinc-700' : 'border-zinc-200'
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  phase === 'running' || phase === 'paused'
                    ? 'bg-orange-500/20 text-orange-500'
                    : phase === 'complete'
                    ? 'bg-green-500/20 text-green-500'
                    : isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                )}>
                  {phase === 'complete' ? (
                    <Trophy className="w-5 h-5" />
                  ) : phase === 'running' ? (
                    <Flame className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Zap className={cn('w-5 h-5', isDark ? 'text-zinc-300' : 'text-zinc-600')} />
                  )}
                </div>
                <div>
                  <h2 className={cn(
                    'text-lg font-semibold',
                    isDark ? 'text-zinc-100' : 'text-zinc-900'
                  )}>
                    {phase === 'complete' ? 'Sprint Complete!' : 'Writing Sprint'}
                  </h2>
                  <p className={cn(
                    'text-sm',
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  )}>
                    {phase === 'setup' && 'Challenge yourself to write more'}
                    {phase === 'running' && 'Keep writing!'}
                    {phase === 'paused' && 'Sprint paused'}
                    {phase === 'complete' && (wordsWritten >= wordGoal ? 'Goal reached!' : 'Time\'s up!')}
                  </p>
                </div>
              </div>
              
              {phase === 'setup' && (
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isDark 
                      ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' 
                      : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Setup Phase */}
              {phase === 'setup' && (
                <>
                  {/* Duration selection */}
                  <div className="space-y-3">
                    <label className={cn(
                      'flex items-center gap-2 text-sm font-medium',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      <Timer className="w-4 h-4" />
                      Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_PRESETS.map((preset) => (
                        <button
                          key={preset.minutes}
                          onClick={() => setDuration(preset.minutes)}
                          className={cn(
                            'py-3 px-2 rounded-lg text-center transition-all',
                            'border',
                            duration === preset.minutes
                              ? isDark
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                : 'bg-amber-50 border-amber-300 text-amber-700'
                              : isDark
                              ? 'border-zinc-700 hover:border-zinc-600 text-zinc-300'
                              : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                          )}
                        >
                          <div className="font-semibold">{preset.label}</div>
                          <div className={cn(
                            'text-xs',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}>
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Word goal selection */}
                  <div className="space-y-3">
                    <label className={cn(
                      'flex items-center gap-2 text-sm font-medium',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      <Target className="w-4 h-4" />
                      Word Goal
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {WORD_GOAL_PRESETS.map((preset) => (
                        <button
                          key={preset.words}
                          onClick={() => setWordGoal(preset.words)}
                          className={cn(
                            'py-3 px-2 rounded-lg text-center transition-all',
                            'border',
                            wordGoal === preset.words
                              ? isDark
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                : 'bg-amber-50 border-amber-300 text-amber-700'
                              : isDark
                              ? 'border-zinc-700 hover:border-zinc-600 text-zinc-300'
                              : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                          )}
                        >
                          <div className="font-semibold">{preset.label}</div>
                          <div className={cn(
                            'text-xs',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}>
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start button */}
                  <button
                    onClick={handleStart}
                    className={cn(
                      'w-full py-4 rounded-xl font-semibold text-lg',
                      'flex items-center justify-center gap-2',
                      'transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]',
                      'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                      'shadow-lg hover:shadow-xl'
                    )}
                  >
                    <Play className="w-5 h-5" />
                    Start Sprint
                  </button>
                </>
              )}

              {/* Running/Paused Phase */}
              {(phase === 'running' || phase === 'paused') && (
                <>
                  {/* Timer display */}
                  <div className="text-center">
                    <div className={cn(
                      'text-6xl font-bold tabular-nums',
                      phase === 'paused' && 'animate-pulse',
                      timeRemaining < 60 ? 'text-red-500' : isDark ? 'text-zinc-100' : 'text-zinc-900'
                    )}>
                      {formatTime(timeRemaining)}
                    </div>
                    <p className={cn(
                      'text-sm mt-2',
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    )}>
                      {phase === 'paused' ? 'Paused' : 'Time remaining'}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                        Progress
                      </span>
                      <span className={cn(
                        'font-medium',
                        wordsWritten >= wordGoal ? 'text-green-500' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        {wordsWritten} / {wordGoal} words
                      </span>
                    </div>
                    <div className={cn(
                      'h-3 rounded-full overflow-hidden',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-200'
                    )}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'h-full rounded-full',
                          progress >= 100
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        )}
                      />
                    </div>
                    {wordsWritten >= wordGoal && (
                      <p className="text-center text-green-500 text-sm font-medium flex items-center justify-center gap-1">
                        <Star className="w-4 h-4" />
                        Goal reached! Keep going!
                      </p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3">
                    <button
                      onClick={togglePause}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-medium',
                        'flex items-center justify-center gap-2',
                        'border transition-colors',
                        isDark 
                          ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                          : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      )}
                    >
                      {phase === 'paused' ? (
                        <>
                          <Play className="w-4 h-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleComplete}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-medium',
                        'flex items-center justify-center gap-2',
                        'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                        'transition-transform hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      Finish Early
                    </button>
                  </div>
                </>
              )}

              {/* Complete Phase */}
              {phase === 'complete' && (
                <>
                  {/* Results */}
                  <div className={cn(
                    'text-center py-4 rounded-xl',
                    wordsWritten >= wordGoal
                      ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                      : isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                  )}>
                    {wordsWritten >= wordGoal && (
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-500" />
                    )}
                    <div className={cn(
                      'text-4xl font-bold',
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    )}>
                      {wordsWritten}
                    </div>
                    <p className={cn(
                      'text-sm',
                      isDark ? 'text-zinc-400' : 'text-zinc-500'
                    )}>
                      words written
                    </p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      'p-4 rounded-lg text-center',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}>
                      <div className={cn(
                        'text-2xl font-bold',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        {formatTime(elapsedSeconds)}
                      </div>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        Time spent
                      </p>
                    </div>
                    <div className={cn(
                      'p-4 rounded-lg text-center',
                      isDark ? 'bg-zinc-800' : 'bg-zinc-100'
                    )}>
                      <div className={cn(
                        'text-2xl font-bold',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        {elapsedSeconds > 0 ? Math.round((wordsWritten / elapsedSeconds) * 60) : 0}
                      </div>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      )}>
                        Words/min
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-medium',
                        'flex items-center justify-center gap-2',
                        'border transition-colors',
                        isDark 
                          ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' 
                          : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                      )}
                    >
                      <RotateCcw className="w-4 h-4" />
                      New Sprint
                    </button>
                    <button
                      onClick={onClose}
                      className={cn(
                        'flex-1 py-3 rounded-xl font-medium',
                        'flex items-center justify-center gap-2',
                        'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                        'transition-transform hover:scale-[1.02] active:scale-[0.98]'
                      )}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SprintWritingModal

