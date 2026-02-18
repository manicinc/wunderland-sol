/**
 * Ambience Controls
 * @module components/quarry/ui/AmbienceControls
 *
 * Unified control panel for ambient soundscapes and radio.
 * Combines synthesized soundscapes, lo-fi radio, and visualizations.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Music,
  Radio as RadioIcon,
  VolumeX,
  Volume2,
  Settings,
  Sparkles,
  X,
  ChevronRight,
  Power,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Audio system imports
import {
  useAmbienceSounds,
  type SoundscapeType,
  type SpatialPreset,
  SOUNDSCAPE_INFO,
  SPATIAL_PRESET_LABELS,
  SPATIAL_PRESET_DESCRIPTIONS,
} from '@/lib/audio/ambienceSounds'
import {
  useAmbienceSettings,
  getSoundscapeForMood,
  getAmbiencePreset,
  AMBIENCE_PRESETS,
  type AmbiencePresetId,
} from '@/lib/write/ambienceSettings'
import type { MoodState } from '@/lib/codex/mood'
import { Target, Clock, Box } from 'lucide-react'

// UI components
import WaveformVisualizer, { MiniVisualizer } from '../media/WaveformVisualizer'
import RadioPlayer, { CompactRadioPlayer } from './RadioPlayer'
import RetroJukebox, { MiniJukeboxIcon, CompactJukebox } from './RetroJukebox'

// Soundscape scenes
import {
  getSoundscapeScene,
  SoundscapeContainer,
} from '.'

// ============================================================================
// TYPES
// ============================================================================

export type AmbienceMode = 'soundscape' | 'radio' | 'off'

export interface AmbienceControlsProps {
  /** Whether the controls panel is open */
  isOpen?: boolean
  /** Callback to close the panel */
  onClose?: () => void
  /** Current mood for auto-sync */
  currentMood?: MoodState
  /** Dark theme */
  isDark?: boolean
  /** Position on screen */
  position?: 'left' | 'right' | 'center'
  /** Show as floating panel or embedded */
  variant?: 'floating' | 'embedded'
  /** Show compact version */
  compact?: boolean
  /** Additional class names */
  className?: string
}

// ============================================================================
// ICON MAP
// ============================================================================

const SOUNDSCAPE_ICONS: Record<SoundscapeType, React.ElementType> = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreePine,
  ocean: Waves,
  fireplace: Flame,
  lofi: Music,
  'white-noise': RadioIcon,
  none: VolumeX,
}

// ============================================================================
// SOUNDSCAPE BUTTON
// ============================================================================

interface SoundscapeButtonProps {
  type: SoundscapeType
  isActive: boolean
  isPlaying: boolean
  isLoading?: boolean
  onClick: () => void
  isDark?: boolean
}

function SoundscapeButton({
  type,
  isActive,
  isPlaying,
  isLoading = false,
  onClick,
  isDark = true,
}: SoundscapeButtonProps) {
  const info = SOUNDSCAPE_INFO[type]
  const Icon = SOUNDSCAPE_ICONS[type]

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`${info.name}: ${info.description || 'Ambient soundscape'}`}
      aria-label={info.name}
      aria-pressed={isActive}
      className={cn(
        'relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
        'border-2',
        isActive && isPlaying
          ? 'border-purple-500 bg-purple-500/20'
          : isActive
          ? 'border-purple-500/50 bg-purple-500/10'
          : isDark
          ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800'
          : 'border-zinc-300 hover:border-zinc-400 bg-white hover:bg-zinc-50'
      )}
    >
      {/* Loading indicator */}
      {isLoading && isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-purple-500/10 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
      {/* Active indicator */}
      {isActive && isPlaying && !isLoading && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      <Icon
        className={cn(
          'w-6 h-6',
          isActive ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'
        )}
      />
      <span
        className={cn(
          'text-xs font-medium',
          isActive ? 'text-purple-300' : isDark ? 'text-zinc-400' : 'text-zinc-600'
        )}
      >
        {info.name}
      </span>
    </motion.button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AmbienceControls({
  isOpen = true,
  onClose,
  currentMood = 'neutral',
  isDark = true,
  position = 'right',
  variant = 'floating',
  compact = false,
  className,
}: AmbienceControlsProps) {
  const [mode, setMode] = useState<AmbienceMode>('off')
  const [showSettings, setShowSettings] = useState(false)
  const [showJukebox, setShowJukebox] = useState(false)
  const [showScene, setShowScene] = useState(false) // Off by default - user can toggle for holographic view
  const [isLoadingSoundscape, setIsLoadingSoundscape] = useState(false)

  // Ambience hooks
  const {
    play,
    stop,
    toggle,
    setVolume,
    setSoundscape,
    isPlaying,
    getAnalyser,
    soundscape: currentSoundscape,
    setSpatialPreset,
    spatialPreset,
    setUseStockSounds,
    setAccentVolume,
  } = useAmbienceSounds()

  const {
    settings,
    setSetting,
    setSettings,
    applyPreset,
    clearPreset,
  } = useAmbienceSettings()

  // Get analyser for visualization
  const analyser = getAnalyser()

  // Handle soundscape selection with loading state
  const handleSoundscapeSelect = useCallback((type: SoundscapeType) => {
    if (type === 'none') {
      stop()
      setMode('off')
      setSetting('soundscape', type)
    } else {
      // Show brief loading state when switching soundscapes
      setIsLoadingSoundscape(true)
      setSoundscape(type)
      setSetting('soundscape', type)
      setMode('soundscape')
      if (!isPlaying) {
        play()
      }
      // Clear loading state after audio has started
      setTimeout(() => setIsLoadingSoundscape(false), 300)
    }
  }, [stop, setSoundscape, setSetting, isPlaying, play])

  // Handle volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setSetting('volume', newVolume)
  }, [setVolume, setSetting])

  // Handle mood sync toggle
  const handleMoodSyncToggle = useCallback(() => {
    const newValue = !settings.moodSync
    setSetting('moodSync', newValue)

    // If enabling mood sync, immediately apply
    if (newValue && currentMood) {
      const recommendedSoundscape = getSoundscapeForMood(currentMood)
      handleSoundscapeSelect(recommendedSoundscape)
    }
  }, [settings.moodSync, setSetting, currentMood, handleSoundscapeSelect])

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: AmbiencePresetId) => {
    const preset = getAmbiencePreset(presetId)
    if (preset) {
      applyPreset(presetId)
      // Apply the soundscape and start playing
      setSoundscape(preset.settings.soundscape)
      setVolume(preset.settings.volume)
      if (!isPlaying) {
        play()
      }
      setMode('soundscape')
    }
  }, [applyPreset, setSoundscape, setVolume, isPlaying, play])

  // Apply mood-based soundscape when mood changes
  useEffect(() => {
    if (settings.moodSync && currentMood && mode === 'soundscape') {
      const recommendedSoundscape = getSoundscapeForMood(currentMood)
      if (recommendedSoundscape !== currentSoundscape) {
        setSoundscape(recommendedSoundscape)
        setSetting('soundscape', recommendedSoundscape)
      }
    }
  }, [currentMood, settings.moodSync, mode, currentSoundscape, setSoundscape, setSetting])

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (mode === 'off') {
      setMode('soundscape')
      play()
    } else {
      toggle()
    }
  }, [mode, play, toggle])

  // Switch to radio mode
  const handleRadioMode = useCallback(() => {
    stop()
    setMode('radio')
  }, [stop])

  // Switch to soundscape mode
  const handleSoundscapeMode = useCallback(() => {
    setMode('soundscape')
  }, [])

  // Get position styles
  const positionStyles = {
    left: 'left-4',
    right: 'right-4',
    center: 'left-1/2 -translate-x-1/2',
  }

  if (!isOpen) return null

  // Compact inline version
  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        isDark ? 'bg-zinc-800/80' : 'bg-white/80',
        className
      )}>
        {/* Mini jukebox icon */}
        <button
          onClick={() => setShowJukebox(!showJukebox)}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isPlaying
              ? 'text-purple-400'
              : isDark
              ? 'text-zinc-400 hover:text-zinc-200'
              : 'text-zinc-600 hover:text-zinc-800'
          )}
        >
          <MiniJukeboxIcon isPlaying={isPlaying} size={20} />
        </button>

        {/* Play/pause */}
        <button
          onClick={handleTogglePlay}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isPlaying
              ? 'bg-purple-500 text-white'
              : isDark
              ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
          )}
        >
          <Power className="w-4 h-4" />
        </button>

        {/* Current status */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-medium truncate',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            {isPlaying ? SOUNDSCAPE_INFO[currentSoundscape].name : 'Ambience Off'}
          </p>
          {isPlaying && (
            <MiniVisualizer
              analyser={analyser}
              isPlaying={isPlaying}
              isDark={isDark}
              className="mt-1"
            />
          )}
        </div>

        {/* Volume */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.volume}
          onChange={handleVolumeChange}
          className={cn(
            'w-16 h-1 rounded-full appearance-none cursor-pointer',
            isDark ? 'bg-zinc-700' : 'bg-zinc-300',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-3',
            '[&::-webkit-slider-thumb]:h-3',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-purple-500',
            '[&::-webkit-slider-thumb]:cursor-pointer'
          )}
        />
      </div>
    )
  }

  // Full panel version
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          variant === 'floating' && 'fixed bottom-20 z-[100]',
          variant === 'floating' && positionStyles[position],
          'w-[360px] rounded-2xl overflow-hidden shadow-2xl',
          isDark
            ? 'bg-zinc-900/95 border border-zinc-800 backdrop-blur-xl'
            : 'bg-white/95 border border-zinc-200 backdrop-blur-xl',
          className
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <div className="flex items-center gap-2">
            <Headphones className={cn(
              'w-5 h-5',
              isPlaying ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'
            )} />
            <span className={cn(
              'font-semibold',
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            )}>
              Ambience
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Playing
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowScene(!showScene)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showScene
                  ? 'bg-purple-500/20 text-purple-400'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
              title="Toggle Scene View"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowJukebox(!showJukebox)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showJukebox
                  ? 'bg-purple-500/20 text-purple-400'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
              title="Show Jukebox"
            >
              <MiniJukeboxIcon isPlaying={isPlaying} size={18} />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showSettings
                  ? 'bg-purple-500/20 text-purple-400'
                  : isDark
                  ? 'text-zinc-400 hover:bg-zinc-800'
                  : 'text-zinc-600 hover:bg-zinc-100'
              )}
            >
              <Settings className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark
                    ? 'text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className={cn(
          'flex border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <button
            onClick={handleSoundscapeMode}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
              mode === 'soundscape' || mode === 'off'
                ? isDark
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-purple-600 border-b-2 border-purple-500'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Soundscapes
          </button>
          <button
            onClick={handleRadioMode}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
              mode === 'radio'
                ? isDark
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-purple-600 border-b-2 border-purple-500'
                : isDark
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            <RadioIcon className="w-4 h-4" />
            Radio
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Jukebox View */}
          <AnimatePresence mode="wait">
            {showJukebox ? (
              <motion.div
                key="jukebox"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-center"
              >
                <CompactJukebox
                  nowPlaying={
                    mode === 'soundscape'
                      ? SOUNDSCAPE_INFO[currentSoundscape].name
                      : mode === 'radio'
                      ? 'Lo-fi Radio'
                      : 'Select a Track'
                  }
                  isPlaying={isPlaying}
                  analyser={analyser}
                  volume={settings.volume}
                  onTogglePlay={handleTogglePlay}
                  onVolumeChange={(v) => {
                    setVolume(v)
                    setSetting('volume', v)
                  }}
                  showScene={showScene}
                  onToggleScene={() => setShowScene(!showScene)}
                  isDark={isDark}
                />
              </motion.div>
            ) : mode === 'radio' ? (
              <motion.div
                key="radio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <RadioPlayer
                  expanded
                  isDark={isDark}
                  onPlayStateChange={(playing) => {
                    if (playing) {
                      stop() // Stop soundscape when radio plays
                    }
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="soundscapes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Animated Scene Preview - smooth transitions */}
                <AnimatePresence mode="wait">
                  {showScene && currentSoundscape !== 'none' && (
                    <motion.div
                      key={`scene-${currentSoundscape}`}
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{
                        opacity: { duration: 0.2 },
                        height: { duration: 0.3, ease: 'easeOut' },
                        scale: { duration: 0.2 },
                      }}
                      className="mb-4 overflow-hidden"
                    >
                      <SoundscapeContainer
                        soundscapeType={currentSoundscape}
                        isPlaying={isPlaying}
                        isDark={isDark}
                        className="rounded-xl overflow-hidden"
                      >
                        {(() => {
                          const SceneComponent = getSoundscapeScene(currentSoundscape)
                          if (!SceneComponent) return null
                          return (
                            <SceneComponent
                              analyser={analyser}
                              isPlaying={isPlaying}
                              width={328}
                              height={180}
                              isDark={isDark}
                            />
                          )
                        })()}
                      </SoundscapeContainer>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Soundscape Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4" role="group" aria-label="Soundscape selection">
                  {(Object.keys(SOUNDSCAPE_INFO) as SoundscapeType[])
                    .filter(type => type !== 'none')
                    .map((type) => (
                      <SoundscapeButton
                        key={type}
                        type={type}
                        isActive={currentSoundscape === type}
                        isPlaying={isPlaying && currentSoundscape === type}
                        isLoading={isLoadingSoundscape && currentSoundscape === type}
                        onClick={() => handleSoundscapeSelect(type)}
                        isDark={isDark}
                      />
                    ))}
                </div>

                {/* Waveform Visualizer - smooth transition */}
                <AnimatePresence mode="wait">
                  {!showScene && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      transition={{
                        opacity: { duration: 0.2 },
                        height: { duration: 0.3, ease: 'easeOut' },
                        scale: { duration: 0.2 },
                      }}
                      className="mb-4 overflow-hidden"
                    >
                      <WaveformVisualizer
                        analyser={analyser}
                        isPlaying={isPlaying}
                        isDark={isDark}
                        width={328}
                        height={48}
                        barCount={48}
                        className="rounded-lg"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Volume Control */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setVolume(settings.volume === 0 ? 0.5 : 0)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isDark
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    )}
                  >
                    {settings.volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={settings.volume}
                    onChange={handleVolumeChange}
                    className={cn(
                      'flex-1 h-2 rounded-full appearance-none cursor-pointer',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-300',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-4',
                      '[&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-purple-500',
                      '[&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-webkit-slider-thumb]:shadow-lg'
                    )}
                  />

                  <span className={cn(
                    'text-sm font-mono w-12 text-right',
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  )}>
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>

                {/* Play/Stop Button */}
                <button
                  onClick={handleTogglePlay}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    isPlaying
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  )}
                >
                  {isPlaying ? 'Stop Ambience' : 'Start Ambience'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                'border-t overflow-hidden',
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              )}
            >
              <div className="p-4 space-y-4">
                {/* Quick Presets */}
                <div>
                  <p className={cn(
                    'text-xs font-medium uppercase tracking-wide mb-2',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Quick Presets
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {AMBIENCE_PRESETS.map((preset) => {
                      const isActive = settings.activePreset === preset.id
                      const PresetIcon = preset.icon === 'Target' ? Target
                        : preset.icon === 'Coffee' ? Coffee
                        : preset.icon === 'Sparkles' ? Sparkles
                        : Waves
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handlePresetSelect(preset.id)}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-lg text-left transition-all border',
                            isActive
                              ? 'border-purple-500 bg-purple-500/10'
                              : isDark
                              ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800'
                              : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
                          )}
                        >
                          <PresetIcon className={cn(
                            'w-4 h-4 flex-shrink-0',
                            isActive ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-500'
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              'text-sm font-medium truncate',
                              isActive ? 'text-purple-300' : isDark ? 'text-zinc-200' : 'text-zinc-800'
                            )}>
                              {preset.name}
                            </p>
                            <p className={cn(
                              'text-xs truncate',
                              isDark ? 'text-zinc-500' : 'text-zinc-500'
                            )}>
                              {preset.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {settings.activePreset && (
                    <button
                      onClick={clearPreset}
                      className={cn(
                        'mt-2 text-xs',
                        isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                      )}
                    >
                      Clear preset
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className={cn('h-px', isDark ? 'bg-zinc-800' : 'bg-zinc-200')} />

                {/* Timer Fade Settings */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={cn(
                      'w-4 h-4',
                      settings.fadeOnTimerComplete ? 'text-purple-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )} />
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        Timer Fade Out
                      </p>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}>
                        Fade ambience when timer ends
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSetting('fadeOnTimerComplete', !settings.fadeOnTimerComplete)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      settings.fadeOnTimerComplete
                        ? 'bg-purple-500'
                        : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                    )}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: settings.fadeOnTimerComplete ? 24 : 4 }}
                    />
                  </button>
                </div>

                {/* Timer Fade Duration */}
                {settings.fadeOnTimerComplete && (
                  <div className="flex items-center justify-between pl-6">
                    <p className={cn(
                      'text-sm',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      Fade Duration
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.timerFadeDuration}
                        onChange={(e) => setSetting('timerFadeDuration', parseInt(e.target.value))}
                        className={cn(
                          'w-20 h-1 rounded-full appearance-none cursor-pointer',
                          isDark ? 'bg-zinc-700' : 'bg-zinc-300',
                          '[&::-webkit-slider-thumb]:appearance-none',
                          '[&::-webkit-slider-thumb]:w-3',
                          '[&::-webkit-slider-thumb]:h-3',
                          '[&::-webkit-slider-thumb]:rounded-full',
                          '[&::-webkit-slider-thumb]:bg-purple-500'
                        )}
                      />
                      <span className={cn(
                        'text-sm font-mono w-8',
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      )}>
                        {settings.timerFadeDuration}s
                      </span>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className={cn('h-px', isDark ? 'bg-zinc-800' : 'bg-zinc-200')} />

                {/* Mood Sync */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={cn(
                      'w-4 h-4',
                      settings.moodSync ? 'text-purple-400' : isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )} />
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        Mood Sync
                      </p>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}>
                        Auto-select soundscape based on mood
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleMoodSyncToggle}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      settings.moodSync
                        ? 'bg-purple-500'
                        : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                    )}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: settings.moodSync ? 24 : 4 }}
                    />
                  </button>
                </div>

                {/* Auto Fade In */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    )}>
                      Auto Fade In
                    </p>
                    <p className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    )}>
                      Fade in when starting to write
                    </p>
                  </div>
                  <button
                    onClick={() => setSetting('autoFadeIn', !settings.autoFadeIn)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      settings.autoFadeIn
                        ? 'bg-purple-500'
                        : isDark
                        ? 'bg-zinc-700'
                        : 'bg-zinc-300'
                    )}
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      animate={{ left: settings.autoFadeIn ? 24 : 4 }}
                    />
                  </button>
                </div>

                {/* Fade Duration */}
                {settings.autoFadeIn && (
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      'text-sm',
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    )}>
                      Fade Duration
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={settings.fadeInDuration}
                        onChange={(e) => setSetting('fadeInDuration', parseInt(e.target.value))}
                        className={cn(
                          'w-20 h-1 rounded-full appearance-none cursor-pointer',
                          isDark ? 'bg-zinc-700' : 'bg-zinc-300',
                          '[&::-webkit-slider-thumb]:appearance-none',
                          '[&::-webkit-slider-thumb]:w-3',
                          '[&::-webkit-slider-thumb]:h-3',
                          '[&::-webkit-slider-thumb]:rounded-full',
                          '[&::-webkit-slider-thumb]:bg-purple-500'
                        )}
                      />
                      <span className={cn(
                        'text-sm font-mono w-8',
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      )}>
                        {settings.fadeInDuration}s
                      </span>
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className={cn('h-px', isDark ? 'bg-zinc-800' : 'bg-zinc-200')} />

                {/* Spatial Audio Section */}
                <div>
                  <p className={cn(
                    'text-xs font-medium uppercase tracking-wide mb-3',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Spatial Audio
                  </p>

                  {/* Spatial Preset Selector */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Box className={cn(
                        'w-4 h-4',
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      )} />
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          isDark ? 'text-zinc-200' : 'text-zinc-800'
                        )}>
                          Positioning
                        </p>
                        <p className={cn(
                          'text-xs',
                          isDark ? 'text-zinc-500' : 'text-zinc-500'
                        )}>
                          {SPATIAL_PRESET_DESCRIPTIONS[spatialPreset]}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {(['mono', 'stereo', 'immersive'] as const).map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setSpatialPreset(preset)
                            setSetting('spatialPreset', preset)
                          }}
                          className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                            spatialPreset === preset
                              ? 'bg-purple-500 text-white'
                              : isDark
                              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800'
                          )}
                        >
                          {SPATIAL_PRESET_LABELS[preset]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stock Sounds Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      )}>
                        Sound Accents
                      </p>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}>
                        Water drops, bird chirps, etc.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !settings.useStockSounds
                        setUseStockSounds(newValue)
                        setSetting('useStockSounds', newValue)
                      }}
                      className={cn(
                        'relative w-11 h-6 rounded-full transition-colors',
                        settings.useStockSounds
                          ? 'bg-purple-500'
                          : isDark
                          ? 'bg-zinc-700'
                          : 'bg-zinc-300'
                      )}
                    >
                      <motion.div
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                        animate={{ left: settings.useStockSounds ? 24 : 4 }}
                      />
                    </button>
                  </div>

                  {/* Accent Volume */}
                  {settings.useStockSounds && (
                    <div className="flex items-center justify-between pl-0">
                      <p className={cn(
                        'text-sm',
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      )}>
                        Accent Volume
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.accentVolume}
                          onChange={(e) => {
                            const newVolume = parseFloat(e.target.value)
                            setAccentVolume(newVolume)
                            setSetting('accentVolume', newVolume)
                          }}
                          className={cn(
                            'w-20 h-1 rounded-full appearance-none cursor-pointer',
                            isDark ? 'bg-zinc-700' : 'bg-zinc-300',
                            '[&::-webkit-slider-thumb]:appearance-none',
                            '[&::-webkit-slider-thumb]:w-3',
                            '[&::-webkit-slider-thumb]:h-3',
                            '[&::-webkit-slider-thumb]:rounded-full',
                            '[&::-webkit-slider-thumb]:bg-purple-500'
                          )}
                        />
                        <span className={cn(
                          'text-sm font-mono w-10 text-right',
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        )}>
                          {Math.round(settings.accentVolume * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Mood indicator */}
                {settings.moodSync && currentMood && (
                  <div className={cn(
                    'flex items-center justify-between p-2 rounded-lg',
                    isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
                  )}>
                    <span className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      Current mood: <span className="font-medium capitalize">{currentMood}</span>
                    </span>
                    <ChevronRight className="w-3 h-3" />
                    <span className={cn(
                      'text-xs',
                      isDark ? 'text-purple-400' : 'text-purple-600'
                    )}>
                      {SOUNDSCAPE_INFO[getSoundscapeForMood(currentMood)].name}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// MINI CONTROLS - For toolbar/button triggers
// ============================================================================

export interface MiniAmbienceControlsProps {
  isDark?: boolean
  className?: string
}

export function MiniAmbienceControls({
  isDark = true,
  className,
}: MiniAmbienceControlsProps) {
  const { isPlaying, toggle, soundscape: currentSoundscape } = useAmbienceSounds()

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
        isPlaying
          ? 'bg-purple-500/20 text-purple-400'
          : isDark
          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        className
      )}
    >
      <Headphones className="w-4 h-4" />
      <span className="text-sm">
        {isPlaying ? SOUNDSCAPE_INFO[currentSoundscape].name : 'Ambience'}
      </span>
      {isPlaying && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      )}
    </button>
  )
}

// ============================================================================
// AMBIENCE BUTTON - Single toggle button
// ============================================================================

export interface AmbienceButtonProps {
  isOpen: boolean
  onClick: () => void
  isDark?: boolean
  className?: string
  /** Show expanded tooltip for first-time users */
  showHelpTooltip?: boolean
}

export function AmbienceButton({
  isOpen,
  onClick,
  isDark = true,
  className,
  showHelpTooltip = false,
}: AmbienceButtonProps) {
  const { isPlaying, soundscape: currentSoundscape } = useAmbienceSounds()
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          'relative p-2 rounded-lg transition-all',
          isOpen
            ? 'bg-purple-500/20 text-purple-400'
            : isPlaying
            ? 'text-purple-400'
            : isDark
            ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800',
          className
        )}
        aria-label="Ambient soundscapes and focus music"
      >
        <Headphones className="w-5 h-5" />
        {isPlaying && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </button>

      {/* Enhanced Help Tooltip */}
      <AnimatePresence>
        {(showTooltip || showHelpTooltip) && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className={cn(
              'absolute right-0 top-full mt-2 z-50 w-56 p-3 rounded-xl shadow-xl',
              isDark
                ? 'bg-zinc-800 border border-zinc-700'
                : 'bg-white border border-zinc-200'
            )}
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                'p-1.5 rounded-lg',
                isDark ? 'bg-purple-500/20' : 'bg-purple-100'
              )}>
                <Headphones className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className={cn(
                  'font-medium text-sm',
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                )}>
                  Ambience
                </p>
                <p className={cn(
                  'text-xs mt-0.5',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}>
                  {isPlaying
                    ? `Playing: ${SOUNDSCAPE_INFO[currentSoundscape].name}`
                    : 'Rain, café sounds, lo-fi music, and more to enhance focus'
                  }
                </p>
              </div>
            </div>
            {!isPlaying && (
              <div className={cn(
                'mt-2 pt-2 border-t text-xs',
                isDark ? 'border-zinc-700 text-zinc-500' : 'border-zinc-100 text-zinc-400'
              )}>
                Click to open soundscape controls
              </div>
            )}
            {/* Arrow pointer */}
            <div className={cn(
              'absolute -top-1.5 right-4 w-3 h-3 rotate-45',
              isDark ? 'bg-zinc-800 border-l border-t border-zinc-700' : 'bg-white border-l border-t border-zinc-200'
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
