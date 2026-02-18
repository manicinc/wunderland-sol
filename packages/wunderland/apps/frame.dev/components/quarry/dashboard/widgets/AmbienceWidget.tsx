/**
 * Ambience Widget
 *
 * Mini player for ambient soundscapes with expandable visualizer.
 * @module components/quarry/dashboard/widgets/AmbienceWidget
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  Maximize2,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Music,
  Radio,
  type LucideIcon,
} from 'lucide-react'
import {
  useAmbienceSounds,
  SOUNDSCAPE_METADATA,
  type SoundscapeType,
} from '@/lib/audio/ambienceSounds'
import type { WidgetProps } from '../types'

// Soundscape icons mapping
const SOUNDSCAPE_ICONS: Record<string, LucideIcon> = {
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Music,
  Radio,
  VolumeX,
}

// Mini equalizer bars component
function MiniEqualizer({ isPlaying, analyser }: { isPlaying: boolean; analyser: AnalyserNode | null }) {
  const [bars, setBars] = useState<number[]>([0.2, 0.4, 0.3, 0.5, 0.3])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      setBars([0.2, 0.2, 0.2, 0.2, 0.2])
      return
    }

    if (analyser) {
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const animate = () => {
        analyser.getByteFrequencyData(dataArray)
        const newBars = [0, 1, 2, 3, 4].map((i) => {
          const index = Math.floor((i / 5) * dataArray.length * 0.5)
          return Math.max(0.15, dataArray[index] / 255)
        })
        setBars(newBars)
        animationRef.current = requestAnimationFrame(animate)
      }

      animate()
    } else {
      // Fallback animation
      const interval = setInterval(() => {
        setBars((prev) =>
          prev.map(() => 0.2 + Math.random() * 0.6)
        )
      }, 150)
      return () => clearInterval(interval)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, analyser])

  return (
    <div className="flex items-end gap-0.5 h-4">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-current"
          animate={{ height: `${height * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      ))}
    </div>
  )
}

export function AmbienceWidget({ theme, size, compact }: WidgetProps) {
  const isDark = theme.includes('dark')
  const [showSelector, setShowSelector] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(0.3)

  const {
    play,
    stop,
    toggle,
    setVolume,
    setSoundscape,
    isPlaying,
    volume,
    soundscape,
    initialized,
    getAnalyser,
  } = useAmbienceSounds()

  // Get current soundscape info
  const currentSoundscape = SOUNDSCAPE_METADATA.find((s) => s.id === soundscape)
  const Icon = currentSoundscape ? SOUNDSCAPE_ICONS[currentSoundscape.icon] || Music : Music

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume)
      setIsMuted(false)
    } else {
      setPrevVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  // Handle soundscape change
  const handleSoundscapeChange = (newSoundscape: SoundscapeType) => {
    setSoundscape(newSoundscape)
    setShowSelector(false)
    if (!isPlaying && newSoundscape !== 'none') {
      play()
    }
  }

  // Colors based on current soundscape
  const accentColor = currentSoundscape?.color || '#6B7280'

  return (
    <div className="flex flex-col h-full gap-3 p-1">
      {/* Main player area */}
      <div className="flex items-center gap-3">
        {/* Play/Pause button with icon */}
        <button
          onClick={toggle}
          className={`
            relative flex items-center justify-center w-12 h-12 rounded-xl
            transition-all duration-200
            ${isPlaying
              ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30'
              : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
            }
          `}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
          {/* Playing indicator ring */}
          {isPlaying && (
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-violet-400"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </button>

        {/* Soundscape info */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className={`
              flex items-center gap-2 w-full text-left group
              ${isDark ? 'text-zinc-200' : 'text-zinc-700'}
            `}
          >
            <Icon
              className="w-4 h-4 flex-shrink-0"
              style={{ color: isPlaying ? accentColor : undefined }}
            />
            <span className="font-medium text-sm truncate">
              {currentSoundscape?.name || 'Off'}
            </span>
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                showSelector ? 'rotate-180' : ''
              } ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
            />
          </button>
          <p className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {currentSoundscape?.description || 'Select a soundscape'}
          </p>
        </div>

        {/* Mini equalizer (visible when playing) */}
        {isPlaying && !compact && (
          <div className={`${isDark ? 'text-violet-400' : 'text-violet-500'}`}>
            <MiniEqualizer isPlaying={isPlaying} analyser={getAnalyser()} />
          </div>
        )}
      </div>

      {/* Volume control */}
      {!compact && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
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
              setVolume(newVolume)
              if (newVolume > 0) setIsMuted(false)
            }}
            className={`
              flex-1 h-1.5 rounded-full appearance-none cursor-pointer
              ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
            `}
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
          <span className={`text-xs w-8 text-right ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      )}

      {/* Soundscape selector dropdown */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`
                grid grid-cols-4 gap-1.5 p-2 rounded-lg
                ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}
              `}
            >
              {SOUNDSCAPE_METADATA.filter((s) => s.id !== 'none').map((sc) => {
                const ScIcon = SOUNDSCAPE_ICONS[sc.icon] || Music
                const isActive = soundscape === sc.id

                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSoundscapeChange(sc.id)}
                    className={`
                      flex flex-col items-center gap-1 p-2 rounded-lg
                      transition-all duration-150
                      ${isActive
                        ? 'bg-violet-500/20 ring-1 ring-violet-500/50'
                        : isDark
                          ? 'hover:bg-zinc-700'
                          : 'hover:bg-zinc-200'
                      }
                    `}
                    title={sc.description}
                  >
                    <ScIcon
                      className="w-5 h-5"
                      style={{ color: isActive ? sc.color : undefined }}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        isActive
                          ? isDark
                            ? 'text-violet-300'
                            : 'text-violet-600'
                          : isDark
                            ? 'text-zinc-400'
                            : 'text-zinc-600'
                      }`}
                    >
                      {sc.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick soundscape icons (compact mode) */}
      {compact && !showSelector && (
        <div className="flex items-center justify-center gap-1">
          {SOUNDSCAPE_METADATA.filter((s) => s.id !== 'none')
            .slice(0, 5)
            .map((sc) => {
              const ScIcon = SOUNDSCAPE_ICONS[sc.icon] || Music
              const isActive = soundscape === sc.id

              return (
                <button
                  key={sc.id}
                  onClick={() => handleSoundscapeChange(sc.id)}
                  className={`
                    p-1.5 rounded-lg transition-all
                    ${isActive
                      ? 'bg-violet-500/20'
                      : isDark
                        ? 'hover:bg-zinc-800'
                        : 'hover:bg-zinc-100'
                    }
                  `}
                  title={sc.name}
                >
                  <ScIcon
                    className="w-4 h-4"
                    style={{ color: isActive ? sc.color : isDark ? '#71717A' : '#A1A1AA' }}
                  />
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default AmbienceWidget
