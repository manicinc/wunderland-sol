/**
 * Text-to-Speech Audio Controls Component
 * @module codex/ui/TTSControls
 * 
 * @remarks
 * Beautiful radial/circular audio controls for TTS playback.
 * Inspired by retro-futuristic HUD interfaces.
 */

'use client'

import React, { useState } from 'react'
import { Volume2, VolumeX, Play, Pause, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TTSState, TTSSettings, TTSVoice } from '../../hooks/useTextToSpeech'

interface TTSControlsProps {
  state: TTSState
  settings: TTSSettings
  availableVoices: TTSVoice[]
  isSupported: boolean
  /** Whether there's content available to read (e.g., file loaded, answer available) */
  hasContent?: boolean
  onPlay: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onVolumeChange: (volume: number) => void
  onRateChange: (rate: number) => void
  onPitchChange: (pitch: number) => void
  onVoiceChange: (voice: TTSVoice) => void
  theme?: string
}

/**
 * Radial TTS audio controls with retro-futuristic styling
 */
export default function TTSControls({
  state,
  settings,
  availableVoices,
  isSupported,
  hasContent = false,
  onPlay,
  onPause,
  onResume,
  onStop,
  onVolumeChange,
  onRateChange,
  onPitchChange,
  onVoiceChange,
  theme = 'light',
}: TTSControlsProps) {
  const [muted, setMuted] = useState(false)
  
  const isTerminal = theme?.includes('terminal')
  const isSepia = theme?.includes('sepia')
  const isDark = theme?.includes('dark')
  
  if (!isSupported) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Text-to-speech not supported in this browser
      </div>
    )
  }
  
  const handleVolumeToggle = () => {
    if (muted) {
      onVolumeChange(1)
      setMuted(false)
    } else {
      onVolumeChange(0)
      setMuted(true)
    }
  }
  
  const handlePlayPause = () => {
    if (state.speaking) {
      if (state.paused) {
        onResume()
      } else {
        onPause()
      }
    } else {
      onPlay()
    }
  }
  
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {/* Main Play/Pause Button with Progress Ring */}
      <div className="relative">
        {/* Progress Ring */}
        {state.speaking && (
          <svg className="absolute inset-0 w-6 h-6 sm:w-8 sm:h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r={14}
              fill="none"
              stroke={isTerminal ? '#166534' : isSepia ? '#78350f' : 'currentColor'}
              strokeWidth="2"
              opacity="0.2"
            />
            <motion.circle
              cx="16"
              cy="16"
              r={14}
              fill="none"
              stroke={isTerminal ? '#22c55e' : isSepia ? '#f59e0b' : '#06b6d4'}
              strokeWidth="2"
              strokeDasharray={2 * Math.PI * 14}
              strokeDashoffset={(2 * Math.PI * 14) - (state.progress / 100) * (2 * Math.PI * 14)}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 14) - (state.progress / 100) * (2 * Math.PI * 14) }}
              transition={{ duration: 0.3 }}
            />
          </svg>
        )}
        
        <button
          onClick={handlePlayPause}
          disabled={!hasContent && !state.speaking}
          className={`
            relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded
            transition-all duration-200
            ${isTerminal
              ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
              : isSepia
              ? 'bg-amber-50 border border-amber-700 text-amber-900 hover:bg-amber-100'
              : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title={state.speaking ? (state.paused ? 'Resume' : 'Pause') : 'Play'}
          aria-label={state.speaking ? (state.paused ? 'Resume' : 'Pause') : 'Play'}
        >
          {state.speaking && !state.paused ? (
            <Pause className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
          ) : (
            <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ml-0.5" />
          )}
        </button>
      </div>
      
      {/* Stop Button */}
      {state.speaking && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={onStop}
          className={`
            w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded
            transition-all duration-200
            ${isTerminal
              ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
              : isSepia
              ? 'bg-amber-50 border border-amber-700 text-amber-900 hover:bg-amber-100'
              : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }
          `}
          title="Stop"
          aria-label="Stop reading"
        >
          <Square className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" fill="currentColor" />
        </motion.button>
      )}

      {/* Volume Button */}
      <button
        onClick={handleVolumeToggle}
        className={`
          w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded
          transition-all duration-200
          ${isTerminal
            ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
            : isSepia
            ? 'bg-amber-50 border border-amber-700 text-amber-900 hover:bg-amber-100'
            : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted || settings.volume === 0 ? (
          <VolumeX className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
        ) : (
          <Volume2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
        )}
      </button>
      
    </div>
  )
}

