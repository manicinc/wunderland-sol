/**
 * Clock & Ambience Sidebar Widget
 *
 * Compact clock and ambience controls for sidebars.
 * @module components/quarry/ui/widgets/ClockAmbienceSidebarWidget
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  CloudRain,
  Coffee,
  TreePine,
  Waves,
  Flame,
  Music,
  Radio,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useAmbienceSounds,
  SOUNDSCAPE_METADATA,
  type SoundscapeType,
} from '@/lib/audio/ambienceSounds'

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

// Roman numerals for clock
const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

interface ClockAmbienceSidebarWidgetProps {
  /** Theme - light or dark */
  isDark?: boolean
  /** Whether to show the analog clock */
  showClock?: boolean
  /** Whether to show ambience controls */
  showAmbience?: boolean
  /** Compact mode - smaller clock, inline controls */
  compact?: boolean
}

/**
 * Mini Analog Clock for sidebars
 */
function MiniAnalogClock({ isDark, size = 80 }: { isDark: boolean; size?: number }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secondAngle = (seconds / 60) * 360
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360
  const hourAngle = ((hours + minutes / 60) / 12) * 360

  const goldColor = isDark ? '#D4AF37' : '#B8860B'
  const faceColor = isDark ? '#1F1F2E' : '#FAFAF8'

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="mx-auto">
      {/* Clock face */}
      <circle cx="50" cy="50" r="48" fill={faceColor} stroke={goldColor} strokeWidth="2" />

      {/* Hour markers and numerals */}
      {ROMAN_NUMERALS.map((numeral, i) => {
        const angle = (i / 12) * 360
        const r = 38
        const x = 50 + r * Math.sin((angle * Math.PI) / 180)
        const y = 50 - r * Math.cos((angle * Math.PI) / 180)

        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={i === 0 ? "7" : "6"}
            fontFamily="serif"
            fontWeight={i % 3 === 0 ? "bold" : "normal"}
            fill={isDark ? '#A1A1AA' : '#52525B'}
          >
            {numeral}
          </text>
        )
      })}

      {/* Hour hand */}
      <g style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '50px 50px' }}>
        <line x1="50" y1="50" x2="50" y2="28" stroke={goldColor} strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Minute hand */}
      <g style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '50px 50px' }}>
        <line x1="50" y1="50" x2="50" y2="18" stroke={goldColor} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Second hand */}
      <g style={{ transform: `rotate(${secondAngle}deg)`, transformOrigin: '50px 50px' }}>
        <line x1="50" y1="55" x2="50" y2="15" stroke="#EF4444" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Center pin */}
      <circle cx="50" cy="50" r="3" fill={goldColor} />
    </svg>
  )
}

/**
 * Compact Ambience Controls
 */
function CompactAmbienceControls({ isDark }: { isDark: boolean }) {
  const {
    toggle,
    setVolume,
    setSoundscape,
    isPlaying,
    volume,
    soundscape,
  } = useAmbienceSounds()

  const currentSoundscape = SOUNDSCAPE_METADATA.find((s) => s.id === soundscape)
  const Icon = currentSoundscape ? SOUNDSCAPE_ICONS[currentSoundscape.icon] || Music : Music

  return (
    <div className="space-y-2">
      {/* Play button and current soundscape */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className={cn(
            'p-2 rounded-lg transition-all',
            isPlaying
              ? 'bg-violet-500 text-white'
              : isDark
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
          )}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-medium truncate', isDark ? 'text-zinc-200' : 'text-zinc-700')}>
            {currentSoundscape?.name || 'Off'}
          </p>
          <p className={cn('text-[10px] truncate', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {isPlaying ? 'Playing' : 'Tap to play'}
          </p>
        </div>

        {/* Volume */}
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.3)}
          className={cn(
            'p-1.5 rounded transition-colors',
            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'
          )}
        >
          {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick soundscape selector */}
      <div className="flex gap-1">
        {SOUNDSCAPE_METADATA.filter((s) => s.id !== 'none').slice(0, 5).map((sc) => {
          const ScIcon = SOUNDSCAPE_ICONS[sc.icon] || Music
          const isActive = soundscape === sc.id

          return (
            <button
              key={sc.id}
              onClick={() => {
                setSoundscape(sc.id)
                if (!isPlaying) toggle()
              }}
              className={cn(
                'flex-1 p-1.5 rounded-lg transition-all',
                isActive
                  ? 'bg-violet-500/20 ring-1 ring-violet-500/50'
                  : isDark
                    ? 'hover:bg-zinc-800'
                    : 'hover:bg-zinc-100'
              )}
              title={sc.name}
            >
              <ScIcon
                className="w-4 h-4 mx-auto"
                style={{ color: isActive ? sc.color : isDark ? '#71717A' : '#A1A1AA' }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Main Widget Component
 */
export default function ClockAmbienceSidebarWidget({
  isDark = false,
  showClock = true,
  showAmbience = true,
  compact = false,
}: ClockAmbienceSidebarWidgetProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={cn('space-y-3', compact ? 'p-2' : 'p-3')}>
      {showClock && (
        <div className="text-center">
          <MiniAnalogClock isDark={isDark} size={compact ? 64 : 80} />
          <p className={cn(
            'mt-2 text-lg font-semibold tabular-nums tracking-tight',
            isDark ? 'text-zinc-100' : 'text-zinc-800'
          )}>
            {timeStr}
          </p>
          <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {dateStr}
          </p>
        </div>
      )}

      {showAmbience && (
        <div className={showClock ? cn('pt-3 border-t', isDark ? 'border-zinc-800' : 'border-zinc-200') : ''}>
          <CompactAmbienceControls isDark={isDark} />
        </div>
      )}
    </div>
  )
}

export { MiniAnalogClock, CompactAmbienceControls }
