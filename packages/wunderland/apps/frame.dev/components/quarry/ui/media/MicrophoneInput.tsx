/**
 * Microphone Input Component
 * @module components/quarry/ui/MicrophoneInput
 *
 * UI for microphone permission, calibration, and visualization.
 * Shows clear privacy messaging and handles all permission states.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  RefreshCw,
  AlertCircle,
  Shield,
  Volume2,
  X,
} from 'lucide-react'
import { useMicrophoneAudio } from '@/lib/audio/useMicrophoneAudio'
import { MicrophoneAudioService } from '@/lib/audio/microphoneAudio'
import { cn } from '@/lib/utils'

interface MicrophoneInputProps {
  /** Called when mic is ready with analyser */
  onAnalyserReady?: (analyser: AnalyserNode | null) => void
  /** Called when mic is stopped */
  onStop?: () => void
  /** Whether dark mode is active */
  isDark?: boolean
  /** Compact mode for inline display */
  compact?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Microphone Input with permission flow and calibration
 */
export default function MicrophoneInput({
  onAnalyserReady,
  onStop,
  isDark = true,
  compact = false,
  className,
}: MicrophoneInputProps) {
  const {
    status,
    isCalibrated,
    isActive,
    isSupported,
    errorMessage,
    calibrationProgress,
    beatDetected,
    requestPermission,
    recalibrate,
    stop,
    getAnalyser,
  } = useMicrophoneAudio({
    autoCalibrate: true,
    onCalibrationComplete: () => {
      onAnalyserReady?.(getAnalyser())
    },
  })

  // Handle start
  const handleStart = async () => {
    const granted = await requestPermission()
    if (granted) {
      onAnalyserReady?.(getAnalyser())
    }
  }

  // Handle stop
  const handleStop = () => {
    stop()
    onAnalyserReady?.(null)
    onStop?.()
  }

  // Not supported
  if (!isSupported) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-3 rounded-lg',
        isDark ? 'bg-zinc-800/50 text-zinc-400' : 'bg-zinc-100 text-zinc-600',
        className
      )}>
        <MicOff className="w-4 h-4" />
        <span className="text-sm">Microphone not supported in this browser</span>
      </div>
    )
  }

  // Compact mode - just a toggle button
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {isActive ? (
          <>
            <button
              onClick={handleStop}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                'min-h-[44px] touch-manipulation active:scale-95',
                isDark
                  ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 hover:bg-rose-100'
              )}
            >
              <div className="relative">
                <Mic className="w-4 h-4" />
                <motion.span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"
                  animate={{ scale: beatDetected ? 1.3 : 1 }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-sm">Listening</span>
            </button>
            <button
              onClick={recalibrate}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
              )}
              title="Recalibrate noise floor"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        ) : status === 'calibrating' ? (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600'
          )}>
            <div className="w-4 h-4">
              <motion.div
                className="w-full h-full border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span className="text-sm">Calibrating...</span>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={status === 'requesting'}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
              'min-h-[44px] touch-manipulation active:scale-95',
              isDark
                ? 'bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                : 'bg-zinc-100 text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
            )}
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm">Enable Mic</span>
          </button>
        )}
      </div>
    )
  }

  // Full mode with explanations
  return (
    <div className={cn('space-y-3', className)}>
      <AnimatePresence mode="wait">
        {/* Idle / Initial state */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {/* Enable button - compact */}
            <button
              onClick={handleStart}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg',
                'transition-all touch-manipulation active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-rose-500/50',
                isDark
                  ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              )}
            >
              <Mic className="w-4 h-4" />
              <span className="text-sm font-medium">Enable Mic Input</span>
            </button>

            {/* Privacy & Info explanation */}
            <div className={cn(
              'flex items-start gap-2 p-2 rounded-lg text-xs',
              isDark ? 'bg-zinc-800/30 text-zinc-500' : 'bg-zinc-50 text-zinc-500'
            )}>
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Privacy: Audio stays on your device</p>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  Calibration measures ambient noise to improve visualization sensitivity.
                  This affects visual reactivity, not playback volume.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Requesting permission */}
        {status === 'requesting' && (
          <motion.div
            key="requesting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'flex flex-col items-center justify-center py-6 gap-3',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            <motion.div
              className="w-8 h-8 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-sm">Requesting microphone access...</span>
          </motion.div>
        )}

        {/* Calibrating - compact */}
        {status === 'calibrating' && (
          <motion.div
            key="calibrating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className={cn(
              'p-2.5 rounded-lg',
              isDark ? 'bg-amber-500/10' : 'bg-amber-50'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-rose-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span className={cn(
                  'text-xs font-medium',
                  isDark ? 'text-amber-400' : 'text-amber-700'
                )}>
                  Calibrating...
                </span>
              </div>

              {/* Progress bar */}
              <div className={cn(
                'h-1 rounded-full overflow-hidden',
                isDark ? 'bg-zinc-700' : 'bg-amber-200'
              )}>
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calibrationProgress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <p className={cn(
                'text-[10px] mt-1.5',
                isDark ? 'text-zinc-500' : 'text-amber-600/70'
              )}>
                Measuring ambient noise for visualization sensitivity
              </p>
            </div>
          </motion.div>
        )}

        {/* Active */}
        {status === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            <div className={cn(
              'p-2.5 rounded-lg relative overflow-hidden',
              isDark ? 'bg-rose-500/10 ring-1 ring-rose-500/20' : 'bg-rose-50 ring-1 ring-rose-200'
            )}>
              {/* Beat pulse overlay */}
              <AnimatePresence>
                {beatDetected && (
                  <motion.div
                    initial={{ opacity: 0.3, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.3 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-rose-500/10 rounded-lg"
                  />
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Mic className={cn(
                      'w-4 h-4',
                      isDark ? 'text-rose-400' : 'text-rose-600'
                    )} />
                    <motion.span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"
                      animate={{
                        scale: beatDetected ? 1.3 : 1,
                        opacity: beatDetected ? 1 : 0.7,
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <div>
                    <span className={cn(
                      'text-xs font-medium',
                      isDark ? 'text-rose-400' : 'text-rose-700'
                    )}>
                      Mic Active
                    </span>
                    {isCalibrated && (
                      <p className={cn(
                        'text-[10px]',
                        isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}>
                        Calibrated for visualization
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={recalibrate}
                    className={cn(
                      'p-1.5 rounded-md transition-colors group relative',
                      isDark
                        ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    )}
                    title="Recalibrate: Adjust sensitivity to ambient noise (not volume)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleStop}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      isDark
                        ? 'text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10'
                        : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                    )}
                    title="Stop microphone input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {/* Info tooltip */}
            <p className={cn(
              'text-[10px] px-1',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )}>
              💡 Calibration adjusts visualization sensitivity, not audio volume
            </p>
          </motion.div>
        )}

        {/* Denied */}
        {status === 'denied' && (
          <motion.div
            key="denied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className={cn(
              'p-4 rounded-xl flex items-start gap-3',
              isDark ? 'bg-red-500/10' : 'bg-red-50'
            )}>
              <AlertCircle className={cn(
                'w-5 h-5 shrink-0',
                isDark ? 'text-red-400' : 'text-red-600'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium mb-1',
                  isDark ? 'text-red-400' : 'text-red-700'
                )}>
                  Microphone Access Denied
                </p>
                <p className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-600'
                )}>
                  {errorMessage || 'Please allow microphone access in your browser settings to use this feature.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleStart}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg',
                'transition-all text-sm',
                isDark
                  ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </motion.div>
        )}

        {/* Error */}
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className={cn(
              'p-4 rounded-xl flex items-start gap-3',
              isDark ? 'bg-amber-500/10' : 'bg-amber-50'
            )}>
              <AlertCircle className={cn(
                'w-5 h-5 shrink-0',
                isDark ? 'text-amber-400' : 'text-amber-600'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium mb-1',
                  isDark ? 'text-amber-400' : 'text-amber-700'
                )}>
                  Something went wrong
                </p>
                <p className={cn(
                  'text-xs',
                  isDark ? 'text-zinc-500' : 'text-zinc-600'
                )}>
                  {errorMessage || 'An error occurred while accessing the microphone.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleStart}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg',
                'transition-all text-sm',
                isDark
                  ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { MicrophoneInput }
