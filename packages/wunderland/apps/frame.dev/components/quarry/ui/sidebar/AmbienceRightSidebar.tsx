'use client'

/**
 * Ambience Right Sidebar
 * @module components/quarry/ui/sidebar/AmbienceRightSidebar
 *
 * Reusable right sidebar component with full ambience controls:
 * - Jukebox presets (soundscape selection)
 * - Volume control
 * - Scene visualization toggle (opens holographic external display)
 * - Mic input with beat detection
 * - Mini waveform visualizer
 *
 * Extracted from ReflectModePage for use across all Quarry pages.
 */

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Music,
  Radio,
  VolumeX,
  Play,
  Mic,
  RefreshCw,
  Image,
} from 'lucide-react'
import { CompactJukebox } from '@/components/quarry/ui/soundscapes/RetroJukebox'
import { getSoundscapeScene, HolographicVisualizer } from '@/components/quarry/ui/soundscapes'
import { MiniVisualizer } from '@/components/quarry/ui/media/WaveformVisualizer'
import MicrophoneInput from '@/components/quarry/ui/media/MicrophoneInput'
import RightSidebarPluginWidgets from '@/components/quarry/ui/widgets/RightSidebarPluginWidgets'
import { useAmbienceSounds, SOUNDSCAPE_INFO, SOUNDSCAPE_METADATA, type SoundscapeType } from '@/lib/audio/ambienceSounds'
import { useMicrophoneAudio } from '@/lib/audio/useMicrophoneAudio'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface AmbienceRightSidebarProps {
  /** Theme name (auto-detected if not provided) */
  theme?: ThemeName
  /** Default collapsed state for the ambience section */
  defaultCollapsed?: boolean
  /** Additional content to render above ambience section */
  topContent?: React.ReactNode
  /** Additional content to render below ambience section */
  bottomContent?: React.ReactNode
  /** Whether to show plugin widgets (shown when plugins mode is not active in left sidebar) */
  showPlugins?: boolean
  /** Additional CSS classes */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOUNDSCAPE ICONS
═══════════════════════════════════════════════════════════════════════════ */

const SOUNDSCAPE_ICONS: Record<SoundscapeType, React.ElementType> = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreePine,
  ocean: Waves,
  fireplace: Flame,
  lofi: Music,
  'white-noise': Radio,
  none: VolumeX,
}

/* ═══════════════════════════════════════════════════════════════════════════
   THEME UTILITIES
═══════════════════════════════════════════════════════════════════════════ */

function getThemeColors(theme: ThemeName) {
  const category = getThemeCategory(theme)
  const isDark = isDarkTheme(theme)

  const colors = {
    standard: {
      bg: isDark ? 'bg-zinc-950' : 'bg-zinc-50',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-white',
      cardBorder: isDark ? 'border-zinc-800' : 'border-zinc-200',
      text: isDark ? 'text-zinc-200' : 'text-zinc-800',
      textMuted: isDark ? 'text-zinc-400' : 'text-zinc-500',
      textSubtle: isDark ? 'text-zinc-500' : 'text-zinc-400',
      heading: isDark ? 'text-zinc-100' : 'text-zinc-900',
      hover: isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100',
      hoverBg: isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100/50',
      inputBg: isDark ? 'bg-zinc-800/50' : 'bg-zinc-100',
      accent: isDark ? 'text-purple-400' : 'text-purple-600',
      accentBg: isDark ? 'bg-purple-500' : 'bg-purple-600',
      accentBgLight: isDark ? 'bg-purple-500/10' : 'bg-purple-100',
      accentRing: isDark ? 'ring-purple-500' : 'ring-purple-500',
      streakBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      streakText: isDark ? 'text-amber-400' : 'text-amber-700',
      successDot: isDark ? 'bg-emerald-400' : 'bg-emerald-500',
    },
    sepia: {
      bg: isDark ? 'bg-stone-950' : 'bg-amber-50/50',
      cardBg: isDark ? 'bg-stone-900/50' : 'bg-amber-50/80',
      cardBorder: isDark ? 'border-stone-800' : 'border-amber-200',
      text: isDark ? 'text-stone-200' : 'text-stone-800',
      textMuted: isDark ? 'text-stone-400' : 'text-stone-600',
      textSubtle: isDark ? 'text-stone-500' : 'text-stone-400',
      heading: isDark ? 'text-amber-50' : 'text-stone-900',
      hover: isDark ? 'hover:bg-stone-800' : 'hover:bg-amber-100',
      hoverBg: isDark ? 'hover:bg-stone-800/50' : 'hover:bg-amber-100/50',
      inputBg: isDark ? 'bg-stone-800/50' : 'bg-amber-100',
      accent: isDark ? 'text-amber-400' : 'text-amber-600',
      accentBg: isDark ? 'bg-amber-500' : 'bg-amber-600',
      accentBgLight: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      accentRing: isDark ? 'ring-amber-500' : 'ring-amber-500',
      streakBg: isDark ? 'bg-amber-500/10' : 'bg-amber-100',
      streakText: isDark ? 'text-amber-400' : 'text-amber-700',
      successDot: isDark ? 'bg-amber-400' : 'bg-amber-500',
    },
    terminal: {
      bg: isDark ? 'bg-black' : 'bg-green-50/30',
      cardBg: isDark ? 'bg-zinc-900/50' : 'bg-green-50/50',
      cardBorder: isDark ? 'border-green-900/50' : 'border-green-200',
      text: isDark ? 'text-green-100' : 'text-green-900',
      textMuted: isDark ? 'text-green-400' : 'text-green-600',
      textSubtle: isDark ? 'text-green-600' : 'text-green-500',
      heading: isDark ? 'text-green-50' : 'text-green-900',
      hover: isDark ? 'hover:bg-green-900/30' : 'hover:bg-green-100',
      hoverBg: isDark ? 'hover:bg-green-900/20' : 'hover:bg-green-100/50',
      inputBg: isDark ? 'bg-zinc-900/50' : 'bg-green-100',
      accent: isDark ? 'text-green-400' : 'text-green-600',
      accentBg: isDark ? 'bg-green-500' : 'bg-green-600',
      accentBgLight: isDark ? 'bg-green-500/10' : 'bg-green-100',
      accentRing: isDark ? 'ring-green-500' : 'ring-green-500',
      streakBg: isDark ? 'bg-green-500/10' : 'bg-green-100',
      streakText: isDark ? 'text-green-400' : 'text-green-700',
      successDot: isDark ? 'bg-green-400' : 'bg-green-500',
    },
    oceanic: {
      bg: isDark ? 'bg-slate-950' : 'bg-cyan-50/30',
      cardBg: isDark ? 'bg-slate-900/50' : 'bg-cyan-50/50',
      cardBorder: isDark ? 'border-slate-800' : 'border-cyan-200',
      text: isDark ? 'text-slate-200' : 'text-slate-800',
      textMuted: isDark ? 'text-slate-400' : 'text-slate-600',
      textSubtle: isDark ? 'text-slate-500' : 'text-slate-400',
      heading: isDark ? 'text-cyan-50' : 'text-slate-900',
      hover: isDark ? 'hover:bg-slate-800' : 'hover:bg-cyan-100',
      hoverBg: isDark ? 'hover:bg-slate-800/50' : 'hover:bg-cyan-100/50',
      inputBg: isDark ? 'bg-slate-800/50' : 'bg-cyan-100',
      accent: isDark ? 'text-cyan-400' : 'text-cyan-600',
      accentBg: isDark ? 'bg-cyan-500' : 'bg-cyan-600',
      accentBgLight: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
      accentRing: isDark ? 'ring-cyan-500' : 'ring-cyan-500',
      streakBg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-100',
      streakText: isDark ? 'text-cyan-400' : 'text-cyan-700',
      successDot: isDark ? 'bg-cyan-400' : 'bg-cyan-500',
    },
  }

  return colors[category]
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AmbienceRightSidebar({
  theme: themeProp,
  defaultCollapsed = false,
  topContent,
  bottomContent,
  showPlugins = true,
  className,
}: AmbienceRightSidebarProps) {
  const { resolvedTheme } = useTheme()
  const theme = (themeProp || resolvedTheme || 'light') as ThemeName
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Ambience state
  const [showAmbience, setShowAmbience] = useState(!defaultCollapsed)
  const [showSceneVisualization, setShowSceneVisualization] = useState(false)
  const [expandedVisualizer, setExpandedVisualizer] = useState(false)
  const [showMicPermissionUI, setShowMicPermissionUI] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Track mount for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Ambience sounds hook
  const {
    isPlaying: isAmbiencePlaying,
    getAnalyser,
    toggle: toggleAmbience,
    setVolume: setAmbienceVolume,
    volume: ambienceVolume,
    soundscape,
    setSoundscape,
  } = useAmbienceSounds()

  // Microphone audio hook
  const {
    status: micStatus,
    isActive: isMicActive,
    noiseFloor: micNoiseFloor,
    beatDetected: micBeatDetected,
    getAnalyser: getMicAnalyser,
    start: startMic,
    stop: stopMic,
    recalibrate: recalibrateMic,
  } = useMicrophoneAudio()

  return (
    <div className={cn('flex flex-col h-full', colors.bg, className)}>
      {/* Top Content Slot */}
      {topContent}

      {/* Ambience Section */}
      <div className={cn('p-3 border-b', colors.cardBorder)}>
        <button
          onClick={() => setShowAmbience(!showAmbience)}
          className={cn('w-full flex items-center justify-between py-1', colors.text)}
          aria-expanded={showAmbience}
          aria-label="Toggle ambience controls"
        >
          <span className="flex items-center gap-2">
            <Headphones className={cn('w-4 h-4', colors.accent)} />
            <span className={cn('text-xs font-medium uppercase tracking-wide', colors.textSubtle)}>Ambience</span>
            {isAmbiencePlaying && (
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', colors.successDot)} />
            )}
          </span>
          {showAmbience ? <ChevronUp className={cn('w-4 h-4', colors.textMuted)} /> : <ChevronDown className={cn('w-4 h-4', colors.textMuted)} />}
        </button>

        <AnimatePresence>
          {showAmbience && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 space-y-3"
            >
              {/* Compact Jukebox + Scene Toggle Row */}
              <div className="flex items-start gap-2">
                {/* Compact Jukebox */}
                <div className="flex-1">
                  <CompactJukebox
                    isPlaying={isAmbiencePlaying}
                    nowPlaying={isAmbiencePlaying ? SOUNDSCAPE_INFO[soundscape]?.name : undefined}
                    analyser={getAnalyser()}
                    volume={ambienceVolume}
                    currentSoundscape={soundscape}
                    onTogglePlay={toggleAmbience}
                    onVolumeChange={setAmbienceVolume}
                    onSelectSoundscape={setSoundscape}
                  />
                </div>

                {/* Scene Visualization Toggle */}
                {soundscape !== 'none' && getSoundscapeScene(soundscape) && (
                  <button
                    onClick={() => setShowSceneVisualization(!showSceneVisualization)}
                    className={cn(
                      'p-2 rounded-lg transition-all flex-shrink-0',
                      showSceneVisualization
                        ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                        : cn(colors.inputBg, colors.textMuted, colors.hover)
                    )}
                    title={showSceneVisualization ? 'Hide scene visualization' : 'Show scene visualization'}
                    aria-label={showSceneVisualization ? 'Hide scene visualization' : 'Show scene visualization'}
                  >
                    <Image className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Scene Visualization is rendered via portal as HolographicVisualizer */}

              {/* Waveform Visualizer - shows for ambience or mic */}
              {(isAmbiencePlaying || isMicActive) && (
                <div className={cn('rounded-lg overflow-hidden', colors.inputBg)}>
                  <MiniVisualizer
                    analyser={isMicActive ? getMicAnalyser() : (getAnalyser() ?? null)}
                    isPlaying={isAmbiencePlaying || isMicActive}
                    isDark={isDark}
                    beatDetected={isMicActive ? micBeatDetected : false}
                    noiseFloor={isMicActive ? micNoiseFloor : 0}
                  />
                </div>
              )}

              {/* Soundscape Selector Grid - 2 columns */}
              <div className="grid grid-cols-2 gap-1.5">
                {SOUNDSCAPE_METADATA.filter(s => s.id !== 'none').map((s) => {
                  const Icon = SOUNDSCAPE_ICONS[s.id]
                  const isSelected = soundscape === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSoundscape(s.id)
                        if (!isAmbiencePlaying) toggleAmbience()
                      }}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg transition-all',
                        isSelected
                          ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                          : cn(colors.textMuted, colors.hover)
                      )}
                      title={s.description}
                      aria-label={`${s.name}: ${s.description}`}
                      aria-pressed={isSelected}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs truncate">{s.name}</span>
                    </button>
                  )
                })}
              </div>

              {/* Play/Stop Button */}
              <button
                onClick={toggleAmbience}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all',
                  isAmbiencePlaying
                    ? cn(colors.accentBgLight, colors.accent)
                    : cn(colors.inputBg, colors.textMuted, colors.hover)
                )}
                aria-label={isAmbiencePlaying ? `Stop playing ${SOUNDSCAPE_INFO[soundscape]?.name}` : 'Play ambience'}
              >
                {isAmbiencePlaying ? (
                  <>
                    <span className={cn('w-2 h-2 rounded-full animate-pulse', colors.successDot)} />
                    <span className="text-sm">Playing {SOUNDSCAPE_INFO[soundscape]?.name}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Play Ambience</span>
                  </>
                )}
              </button>

              {/* Mic Input Toggle */}
              <div className={cn(
                'flex items-center justify-between p-2 rounded-lg transition-all',
                isMicActive
                  ? 'bg-rose-500/10 ring-1 ring-rose-500/30'
                  : colors.inputBg
              )}>
                {isMicActive ? (
                  <>
                    <button
                      onClick={stopMic}
                      className="flex items-center gap-2"
                      aria-label="Stop microphone input"
                    >
                      <div className="relative">
                        <Mic className="w-4 h-4 text-rose-400" />
                        <motion.span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"
                          animate={{ scale: micBeatDetected ? 1.3 : 1 }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                      <span className={isDark ? 'text-rose-400 text-sm' : 'text-rose-600 text-sm'}>
                        Mic Active
                      </span>
                    </button>
                    <button
                      onClick={recalibrateMic}
                      className={cn(
                        'p-1 rounded-lg transition-colors',
                        colors.textMuted, colors.hover
                      )}
                      title="Recalibrate noise floor"
                      aria-label="Recalibrate microphone noise floor"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : micStatus === 'calibrating' ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={cn('w-4 h-4 border-2 border-t-transparent rounded-full', colors.streakText.replace('text-', 'border-'))}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className={cn('text-sm', colors.streakText)}>
                      Calibrating...
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (micStatus === 'idle') {
                        setShowMicPermissionUI(true)
                      } else {
                        startMic()
                      }
                    }}
                    className="flex items-center gap-2 w-full"
                    aria-label="Enable microphone input"
                  >
                    <Mic className={cn('w-4 h-4', colors.textMuted)} />
                    <span className={cn('text-sm', colors.textMuted)}>
                      Enable Mic Input
                    </span>
                  </button>
                )}
              </div>

              {/* Mic Permission UI */}
              <AnimatePresence>
                {showMicPermissionUI && !isMicActive && micStatus !== 'calibrating' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <MicrophoneInput
                      isDark={isDark}
                      onAnalyserReady={() => setShowMicPermissionUI(false)}
                      onStop={() => setShowMicPermissionUI(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Plugin Widgets Section - shown when plugins mode not active in left sidebar */}
      {showPlugins && (
        <RightSidebarPluginWidgets
          theme={theme}
          show={showPlugins}
        />
      )}

      {/* Bottom Content Slot */}
      {bottomContent}

      {/* Holographic Scene Visualizer - rendered via portal, now draggable */}
      {mounted && createPortal(
        <HolographicVisualizer
          isOpen={showSceneVisualization && isAmbiencePlaying && soundscape !== 'none'}
          onClose={() => setShowSceneVisualization(false)}
          soundscape={soundscape}
          isPlaying={isAmbiencePlaying}
          analyser={getAnalyser() ?? null}
          isDark={isDark}
          anchorRight={320}
          expanded={expandedVisualizer}
          onToggleExpanded={() => setExpandedVisualizer(!expandedVisualizer)}
        />,
        document.body
      )}
    </div>
  )
}

// Named export for convenience
export { AmbienceRightSidebar }

/* ═══════════════════════════════════════════════════════════════════════════
   AMBIENCE SECTION (for embedding in other sidebars)
═══════════════════════════════════════════════════════════════════════════ */

export interface AmbienceSectionProps {
  /** Theme name (auto-detected if not provided) */
  theme?: ThemeName
  /** Additional CSS classes */
  className?: string
}

/**
 * Standalone Ambience Section for embedding in other sidebars.
 * Does NOT include the collapsible header - just the controls content.
 */
export function AmbienceSection({ theme: themeProp, className }: AmbienceSectionProps) {
  const { resolvedTheme } = useTheme()
  const theme = (themeProp || resolvedTheme || 'light') as ThemeName
  const isDark = isDarkTheme(theme)
  const colors = getThemeColors(theme)

  // Refs
  const jukeboxRef = useRef<HTMLDivElement>(null)

  // State
  const [showSceneVisualization, setShowSceneVisualization] = useState(false)
  const [expandedVisualizer, setExpandedVisualizer] = useState(false)
  const [showMicPermissionUI, setShowMicPermissionUI] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Track mount for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Ambience sounds hook
  const {
    isPlaying: isAmbiencePlaying,
    getAnalyser,
    toggle: toggleAmbience,
    setVolume: setAmbienceVolume,
    volume: ambienceVolume,
    soundscape,
    setSoundscape,
  } = useAmbienceSounds()

  // Microphone audio hook
  const {
    status: micStatus,
    isActive: isMicActive,
    noiseFloor: micNoiseFloor,
    beatDetected: micBeatDetected,
    getAnalyser: getMicAnalyser,
    start: startMic,
    stop: stopMic,
    recalibrate: recalibrateMic,
  } = useMicrophoneAudio()

  return (
    <div className={cn('space-y-3', className)}>
      {/* Compact Jukebox + Scene Toggle Row */}
      <div className="flex items-start gap-2">
        {/* Compact Jukebox */}
        <div ref={jukeboxRef} className="flex-1">
          <CompactJukebox
            isPlaying={isAmbiencePlaying}
            nowPlaying={isAmbiencePlaying ? SOUNDSCAPE_INFO[soundscape]?.name : undefined}
            analyser={getAnalyser()}
            volume={ambienceVolume}
            currentSoundscape={soundscape}
            onTogglePlay={toggleAmbience}
            onVolumeChange={setAmbienceVolume}
            onSelectSoundscape={setSoundscape}
          />
        </div>

        {/* Scene Visualization Toggle */}
        {soundscape !== 'none' && getSoundscapeScene(soundscape) && (
          <button
            onClick={() => setShowSceneVisualization(!showSceneVisualization)}
            className={cn(
              'p-2 rounded-lg transition-all flex-shrink-0',
              showSceneVisualization
                ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                : cn(colors.inputBg, colors.textMuted, colors.hover)
            )}
            title={showSceneVisualization ? 'Hide scene visualization' : 'Show scene visualization'}
            aria-label={showSceneVisualization ? 'Hide scene visualization' : 'Show scene visualization'}
          >
            <Image className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scene Visualization is rendered via portal as HolographicVisualizer */}

      {/* Waveform Visualizer - shows for ambience or mic */}
      {(isAmbiencePlaying || isMicActive) && (
        <div className={cn('rounded-lg overflow-hidden', colors.inputBg)}>
          <MiniVisualizer
            analyser={isMicActive ? getMicAnalyser() : (getAnalyser() ?? null)}
            isPlaying={isAmbiencePlaying || isMicActive}
            isDark={isDark}
            beatDetected={isMicActive ? micBeatDetected : false}
            noiseFloor={isMicActive ? micNoiseFloor : 0}
          />
        </div>
      )}

      {/* Soundscape Selector Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-1.5">
        {SOUNDSCAPE_METADATA.filter(s => s.id !== 'none').map((s) => {
          const Icon = SOUNDSCAPE_ICONS[s.id]
          const isSelected = soundscape === s.id
          return (
            <button
              key={s.id}
              onClick={() => {
                setSoundscape(s.id)
                if (!isAmbiencePlaying) toggleAmbience()
              }}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg transition-all',
                isSelected
                  ? cn(colors.accentBgLight, colors.accent, 'ring-1', colors.accentRing.replace('ring-', 'ring-') + '/50')
                  : cn(colors.textMuted, colors.hover)
              )}
              title={s.description}
              aria-label={`${s.name}: ${s.description}`}
              aria-pressed={isSelected}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs truncate">{s.name}</span>
            </button>
          )
        })}
      </div>

      {/* Play/Stop Button */}
      <button
        onClick={toggleAmbience}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all',
          isAmbiencePlaying
            ? cn(colors.accentBgLight, colors.accent)
            : cn(colors.inputBg, colors.textMuted, colors.hover)
        )}
        aria-label={isAmbiencePlaying ? `Stop playing ${SOUNDSCAPE_INFO[soundscape]?.name}` : 'Play ambience'}
      >
        {isAmbiencePlaying ? (
          <>
            <span className={cn('w-2 h-2 rounded-full animate-pulse', colors.successDot)} />
            <span className="text-sm">Playing {SOUNDSCAPE_INFO[soundscape]?.name}</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span className="text-sm">Play Ambience</span>
          </>
        )}
      </button>

      {/* Mic Input Toggle */}
      <div className={cn(
        'flex items-center justify-between p-2 rounded-lg transition-all',
        isMicActive
          ? 'bg-rose-500/10 ring-1 ring-rose-500/30'
          : colors.inputBg
      )}>
        {isMicActive ? (
          <>
            <button
              onClick={stopMic}
              className="flex items-center gap-2"
              aria-label="Stop microphone input"
            >
              <div className="relative">
                <Mic className="w-4 h-4 text-rose-400" />
                <motion.span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full"
                  animate={{ scale: micBeatDetected ? 1.3 : 1 }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className={isDark ? 'text-rose-400 text-sm' : 'text-rose-600 text-sm'}>
                Mic Active
              </span>
            </button>
            <button
              onClick={recalibrateMic}
              className={cn(
                'p-1 rounded-lg transition-colors',
                colors.textMuted, colors.hover
              )}
              title="Recalibrate noise floor"
              aria-label="Recalibrate microphone noise floor"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        ) : micStatus === 'calibrating' ? (
          <div className="flex items-center gap-2">
            <motion.div
              className={cn('w-4 h-4 border-2 border-t-transparent rounded-full', colors.streakText.replace('text-', 'border-'))}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className={cn('text-sm', colors.streakText)}>
              Calibrating...
            </span>
          </div>
        ) : (
          <button
            onClick={() => {
              if (micStatus === 'idle') {
                setShowMicPermissionUI(true)
              } else {
                startMic()
              }
            }}
            className="flex items-center gap-2 w-full"
            aria-label="Enable microphone input"
          >
            <Mic className={cn('w-4 h-4', colors.textMuted)} />
            <span className={cn('text-sm', colors.textMuted)}>
              Enable Mic Input
            </span>
          </button>
        )}
      </div>

      {/* Mic Permission UI */}
      <AnimatePresence>
        {showMicPermissionUI && !isMicActive && micStatus !== 'calibrating' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <MicrophoneInput
              isDark={isDark}
              onAnalyserReady={() => setShowMicPermissionUI(false)}
              onStop={() => setShowMicPermissionUI(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holographic Scene Visualizer - rendered via portal, now draggable with connector to jukebox */}
      {mounted && createPortal(
        <HolographicVisualizer
          isOpen={showSceneVisualization && isAmbiencePlaying && soundscape !== 'none'}
          onClose={() => setShowSceneVisualization(false)}
          soundscape={soundscape}
          isPlaying={isAmbiencePlaying}
          analyser={getAnalyser() ?? null}
          isDark={isDark}
          anchorRight={320}
          expanded={expandedVisualizer}
          onToggleExpanded={() => setExpandedVisualizer(!expandedVisualizer)}
          jukeboxRef={jukeboxRef}
        />,
        document.body
      )}
    </div>
  )
}
