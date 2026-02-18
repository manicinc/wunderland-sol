/**
 * Ambience Section
 * 
 * Lightweight ambient sound player section for sidebars.
 * Performance-optimized with CSS animations instead of Framer Motion.
 * @module components/quarry/ui/sidebar/sections/AmbienceSection
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Radio,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection'
import { useAmbienceSounds, SOUNDSCAPE_METADATA, type SoundscapeType } from '@/lib/audio/ambienceSounds'

// ============================================================================
// SOUNDSCAPE ICONS
// ============================================================================

const SOUNDSCAPE_ICONS: Record<string, LucideIcon> = {
  rain: CloudRain,
  cafe: Coffee,
  forest: TreePine,
  ocean: Waves,
  fireplace: Flame,
  lofi: Music,
  'white-noise': Radio,
}

// ============================================================================
// TYPES
// ============================================================================

export interface AmbienceSectionProps {
  /** Whether in dark mode */
  isDark: boolean
  /** Whether expanded by default */
  defaultExpanded?: boolean
  /** Whether to show compact variant (fewer soundscapes visible) */
  compact?: boolean
}

// ============================================================================
// LIGHTWEIGHT PLAYER (No heavy animations)
// ============================================================================

interface LightweightPlayerProps {
  isDark: boolean
  isPlaying: boolean
  volume: number
  soundscape: SoundscapeType
  onToggle: () => void
  onVolumeChange: (v: number) => void
  onSoundscapeChange: (s: SoundscapeType) => void
  compact?: boolean
}

function LightweightPlayer({
  isDark,
  isPlaying,
  volume,
  soundscape,
  onToggle,
  onVolumeChange,
  onSoundscapeChange,
  compact = false,
}: LightweightPlayerProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(volume)

  const currentMeta = useMemo(() => 
    SOUNDSCAPE_METADATA.find(s => s.id === soundscape),
    [soundscape]
  )

  const handleMuteToggle = useCallback(() => {
    if (isMuted) {
      onVolumeChange(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      onVolumeChange(0)
      setIsMuted(true)
    }
  }, [isMuted, volume, prevVolume, onVolumeChange])

  const handleSoundscapeSelect = useCallback((id: SoundscapeType) => {
    onSoundscapeChange(id)
    if (!isPlaying && id !== 'none') {
      onToggle()
    }
  }, [isPlaying, onSoundscapeChange, onToggle])

  const CurrentIcon = soundscape !== 'none' 
    ? SOUNDSCAPE_ICONS[soundscape] || Music 
    : Music

  const soundscapes = compact 
    ? SOUNDSCAPE_METADATA.filter(s => s.id !== 'none').slice(0, 4)
    : SOUNDSCAPE_METADATA.filter(s => s.id !== 'none')

  return (
    <div className="p-3 space-y-3">
      {/* Current Playing + Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={onToggle}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            'transition-all duration-150',
            isPlaying
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
              : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        {/* Current Soundscape Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CurrentIcon 
              className="w-3.5 h-3.5 flex-shrink-0" 
              style={{ color: isPlaying && currentMeta ? currentMeta.color : undefined }}
            />
            <span className={cn(
              'text-sm font-medium truncate',
              isDark ? 'text-zinc-200' : 'text-zinc-700'
            )}>
              {currentMeta?.name || 'Off'}
            </span>
          </div>
          <p className={cn(
            'text-xs truncate',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            {currentMeta?.description || 'Select a soundscape'}
          </p>
        </div>

        {/* Simple CSS-based EQ indicator when playing */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-violet-500 animate-pulse"
                style={{ 
                  height: `${40 + (i % 2) * 30 + 15}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleMuteToggle}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          )}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const newVolume = parseFloat(e.target.value)
            onVolumeChange(newVolume)
            if (newVolume > 0) setIsMuted(false)
          }}
          className={cn(
            'flex-1 h-1.5 rounded-full appearance-none cursor-pointer',
            isDark ? 'bg-zinc-700' : 'bg-zinc-200',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-3',
            '[&::-webkit-slider-thumb]:h-3',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-violet-500',
            '[&::-webkit-slider-thumb]:cursor-pointer'
          )}
          style={{
            background: `linear-gradient(to right, ${
              isDark ? '#8B5CF6' : '#7C3AED'
            } 0%, ${isDark ? '#8B5CF6' : '#7C3AED'} ${
              (isMuted ? 0 : volume) * 100
            }%, ${isDark ? '#3F3F46' : '#E4E4E7'} ${
              (isMuted ? 0 : volume) * 100
            }%, ${isDark ? '#3F3F46' : '#E4E4E7'} 100%)`,
          }}
        />
        <span className={cn(
          'text-xs w-8 text-right tabular-nums',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}>
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Soundscape Grid */}
      <div className={cn(
        'grid gap-1.5 p-2 rounded-lg',
        compact ? 'grid-cols-4' : 'grid-cols-4',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
      )}>
        {soundscapes.map((sc) => {
          const ScIcon = SOUNDSCAPE_ICONS[sc.id] || Music
          const isActive = soundscape === sc.id

          return (
            <button
              key={sc.id}
              onClick={() => handleSoundscapeSelect(sc.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg',
                'transition-all duration-100',
                isActive
                  ? 'bg-violet-500/20 ring-1 ring-violet-500/50'
                  : isDark
                    ? 'hover:bg-zinc-700'
                    : 'hover:bg-zinc-200'
              )}
              title={sc.description}
            >
              <ScIcon
                className="w-4 h-4"
                style={{ color: isActive ? sc.color : undefined }}
              />
              <span className={cn(
                'text-[10px] font-medium',
                isActive
                  ? isDark ? 'text-violet-300' : 'text-violet-600'
                  : isDark ? 'text-zinc-400' : 'text-zinc-600'
              )}>
                {sc.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AmbienceSection({
  isDark,
  defaultExpanded = true,
  compact = false,
}: AmbienceSectionProps) {
  const {
    isPlaying,
    volume,
    soundscape,
    toggle,
    setVolume,
    setSoundscape,
  } = useAmbienceSounds()

  // Playing indicator badge
  const playingBadge = isPlaying ? (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
      isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      Playing
    </span>
  ) : null

  return (
    <CollapsibleSidebarSection
      title="Ambience"
      icon={Music}
      defaultExpanded={defaultExpanded}
      isDark={isDark}
      badge={playingBadge}
    >
      <LightweightPlayer
        isDark={isDark}
        isPlaying={isPlaying}
        volume={volume}
        soundscape={soundscape}
        onToggle={toggle}
        onVolumeChange={setVolume}
        onSoundscapeChange={setSoundscape}
        compact={compact}
      />
    </CollapsibleSidebarSection>
  )
}

export default AmbienceSection

