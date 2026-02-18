'use client'

/**
 * Focus Left Sidebar
 * @module components/quarry/ui/meditate/FocusLeftSidebar
 * 
 * Left sidebar for the Focus/Meditate page featuring:
 * - Animated grandfather clock at top
 * - Session stats (today's focus time, streak)
 * - Full jukebox ambience controls with visualizations at bottom
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Headphones,
  Timer,
  Sparkles,
  TrendingUp,
  Coffee,
  CloudRain,
  Trees,
  Waves,
  Flame as FireIcon,
  Music,
  Radio,
  PenLine,
  Volume2,
  VolumeX,
  Settings,
  Power,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import { SOUNDSCAPE_INFO, useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import WaveformVisualizer, { MiniVisualizer } from '../media/WaveformVisualizer'
import { CompactJukebox, MiniJukeboxIcon } from '../soundscapes/RetroJukebox'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface FocusLeftSidebarProps {
  theme: ThemeName
  soundscape: SoundscapeType
  onSoundscapeChange: (soundscape: SoundscapeType) => void
  isPlaying: boolean
  onTogglePlay: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  onOpenTimer?: () => void
  onQuickCapture?: () => void
  className?: string
}

interface PomodoroSession {
  id: string
  mode: string
  duration: number
  completedAt: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOUNDSCAPE ICONS
═══════════════════════════════════════════════════════════════════════════ */

const SOUNDSCAPE_ICONS: Record<SoundscapeType, React.ElementType> = {
  rain: CloudRain,
  ocean: Waves,
  forest: Trees,
  cafe: Coffee,
  fireplace: FireIcon,
  lofi: Music,
  'white-noise': Radio,
  none: Headphones,
}

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════════════════════════════════ */

function loadSessions(): PomodoroSession[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = localStorage.getItem('pomodoro-sessions')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED GRANDFATHER CLOCK
═══════════════════════════════════════════════════════════════════════════ */

const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

function GrandfatherClock({ isDark, size = 140 }: { isDark: boolean; size?: number }) {
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

  // Elegant color scheme
  const goldColor = isDark ? '#D4AF37' : '#B8860B'
  const bronzeColor = isDark ? '#CD7F32' : '#8B4513'
  const faceColor = isDark ? '#1a1a2e' : '#FDFBF7'
  const borderColor = isDark ? '#8B7355' : '#6B4423'

  return (
    <div className="relative">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-xl opacity-30"
        style={{
          background: `radial-gradient(circle, ${goldColor}40 0%, transparent 70%)`,
        }}
      />
      
      <svg width={size} height={size} viewBox="0 0 140 140" className="relative">
        <defs>
          {/* Gradient for clock face */}
          <radialGradient id="clockFaceGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={isDark ? '#2a2a4e' : '#FFFEF8'} />
            <stop offset="100%" stopColor={faceColor} />
          </radialGradient>
          
          {/* Gold gradient for hands */}
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={goldColor} />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor={goldColor} />
          </linearGradient>
          
          {/* Shadow filter */}
          <filter id="clockShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer decorative ring */}
        <circle 
          cx="70" cy="70" r="68" 
          fill="none" 
          stroke={borderColor} 
          strokeWidth="4"
          filter="url(#clockShadow)"
        />
        
        {/* Ornate outer edge */}
        <circle 
          cx="70" cy="70" r="65" 
          fill="none" 
          stroke={goldColor} 
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Clock face */}
        <circle 
          cx="70" cy="70" r="60" 
          fill="url(#clockFaceGradient)" 
          stroke={goldColor} 
          strokeWidth="2"
        />

        {/* Inner decorative ring */}
        <circle 
          cx="70" cy="70" r="52" 
          fill="none" 
          stroke={isDark ? '#3a3a5e' : '#E8E4D9'} 
          strokeWidth="1"
        />

        {/* Hour markers and Roman numerals */}
        {ROMAN_NUMERALS.map((numeral, i) => {
          const angle = (i / 12) * 360
          const outerR = 46
          const innerR = 42
          const textR = 38
          
          // Marker positions
          const x1 = 70 + outerR * Math.sin((angle * Math.PI) / 180)
          const y1 = 70 - outerR * Math.cos((angle * Math.PI) / 180)
          const x2 = 70 + innerR * Math.sin((angle * Math.PI) / 180)
          const y2 = 70 - innerR * Math.cos((angle * Math.PI) / 180)
          
          // Numeral position
          const textX = 70 + textR * Math.sin((angle * Math.PI) / 180)
          const textY = 70 - textR * Math.cos((angle * Math.PI) / 180)

          return (
            <g key={i}>
              {/* Hour marker line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i % 3 === 0 ? goldColor : isDark ? '#5a5a7e' : '#B0A090'}
                strokeWidth={i % 3 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
              
              {/* Roman numeral */}
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={i === 0 ? "9" : "7"}
                fontFamily="'Playfair Display', serif"
                fontWeight={i % 3 === 0 ? "700" : "400"}
                fill={i % 3 === 0 ? goldColor : isDark ? '#8a8aae' : '#6B5B4F'}
              >
                {numeral}
              </text>
            </g>
          )
        })}

        {/* Minute markers */}
        {Array.from({ length: 60 }).map((_, i) => {
          if (i % 5 === 0) return null // Skip hour positions
          const angle = (i / 60) * 360
          const outerR = 46
          const innerR = 44
          const x1 = 70 + outerR * Math.sin((angle * Math.PI) / 180)
          const y1 = 70 - outerR * Math.cos((angle * Math.PI) / 180)
          const x2 = 70 + innerR * Math.sin((angle * Math.PI) / 180)
          const y2 = 70 - innerR * Math.cos((angle * Math.PI) / 180)

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isDark ? '#4a4a6e' : '#C0B0A0'}
              strokeWidth={0.5}
            />
          )
        })}

        {/* Hour hand */}
        <g style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '70px 70px' }}>
          <line 
            x1="70" y1="70" x2="70" y2="38" 
            stroke="url(#goldGradient)" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          {/* Decorative end */}
          <polygon 
            points="70,38 67,45 73,45" 
            fill={goldColor}
          />
        </g>

        {/* Minute hand */}
        <g style={{ transform: `rotate(${minuteAngle}deg)`, transformOrigin: '70px 70px' }}>
          <line 
            x1="70" y1="70" x2="70" y2="24" 
            stroke="url(#goldGradient)" 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          {/* Decorative end */}
          <circle cx="70" cy="26" r="2" fill={goldColor} />
        </g>

        {/* Second hand */}
        <g style={{ transform: `rotate(${secondAngle}deg)`, transformOrigin: '70px 70px' }}>
          <line 
            x1="70" y1="78" x2="70" y2="20" 
            stroke="#DC2626" 
            strokeWidth="1" 
            strokeLinecap="round"
          />
          <circle cx="70" cy="20" r="2" fill="#DC2626" />
        </g>

        {/* Center ornament */}
        <circle cx="70" cy="70" r="6" fill={goldColor} />
        <circle cx="70" cy="70" r="4" fill={bronzeColor} />
        <circle cx="70" cy="70" r="2" fill={goldColor} />
      </svg>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function FocusLeftSidebar({
  theme,
  soundscape,
  onSoundscapeChange,
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  onOpenTimer,
  onQuickCapture,
  className,
}: FocusLeftSidebarProps) {
  const isDark = isDarkTheme(theme)
  const [showAllSoundscapes, setShowAllSoundscapes] = useState(false)
  const [showJukebox, setShowJukebox] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const sessions = useMemo(() => loadSessions(), [])

  // Get analyser for visualizations
  const { getAnalyser } = useAmbienceSounds()
  const analyser = getAnalyser()

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const workSessions = sessions.filter((s) => s.mode === 'work')

    const todaySessions = workSessions.filter(
      (s) => new Date(s.completedAt) >= today
    )
    const todayTime = todaySessions.reduce((sum, s) => sum + s.duration, 0)

    // Calculate streak
    let streak = 0
    const checkDate = new Date(today)
    while (true) {
      const dayStart = new Date(checkDate)
      const dayEnd = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      const hasSession = workSessions.some((s) => {
        const date = new Date(s.completedAt)
        return date >= dayStart && date < dayEnd
      })
      if (!hasSession && checkDate < today) break
      if (hasSession) streak++
      checkDate.setDate(checkDate.getDate() - 1)
      if (streak > 365) break
    }

    // Get recent sessions (last 5)
    const recentSessions = [...workSessions]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5)

    return {
      todayTime,
      todaySessions: todaySessions.length,
      streak,
      recentSessions,
    }
  }, [sessions])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatClockDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const soundscapes: SoundscapeType[] = ['rain', 'ocean', 'forest', 'cafe', 'fireplace', 'lofi', 'white-noise']
  const displayedSoundscapes = showAllSoundscapes ? soundscapes : soundscapes.slice(0, 4)

  return (
    <div className={cn(
      'flex flex-col h-full overflow-hidden',
      isDark ? 'bg-zinc-900/50' : 'bg-zinc-50/50',
      className
    )}>
      {/* Grandfather Clock Header */}
      <div className={cn(
        'flex-shrink-0 px-4 py-5 border-b',
        isDark ? 'border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-900/50' : 'border-zinc-200 bg-gradient-to-b from-white/90 to-zinc-50/50'
      )}>
        <div className="flex flex-col items-center">
          <GrandfatherClock isDark={isDark} size={140} />
          <div className={cn(
            'mt-3 text-xs uppercase tracking-widest font-medium',
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          )}>
            {formatClockDate(currentTime)}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-5">
        {/* Stats Summary */}
        <div className={cn(
          'p-4 rounded-xl',
          isDark 
            ? 'bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20' 
            : 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/50'
        )}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className={cn(
              'w-4 h-4',
              isDark ? 'text-violet-400' : 'text-violet-600'
            )} />
            <span className={cn(
              'text-sm font-semibold',
              isDark ? 'text-white' : 'text-zinc-900'
            )}>
              Today's Focus
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Focus Time */}
            <div className={cn(
              'p-3 rounded-lg',
              isDark ? 'bg-white/5' : 'bg-white/80'
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className={cn(
                  'w-3.5 h-3.5',
                  isDark ? 'text-cyan-400' : 'text-cyan-600'
                )} />
                <span className={cn(
                  'text-[10px] uppercase tracking-wide',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  Time
                </span>
              </div>
              <div className={cn(
                'text-lg font-bold',
                isDark ? 'text-white' : 'text-zinc-900'
              )}>
                {formatTime(stats.todayTime)}
              </div>
              <div className={cn(
                'text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}>
                {stats.todaySessions} sessions
              </div>
            </div>

            {/* Streak */}
            <div className={cn(
              'p-3 rounded-lg',
              isDark 
                ? 'bg-gradient-to-br from-orange-500/20 to-rose-500/10' 
                : 'bg-gradient-to-br from-orange-50 to-rose-50'
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className={cn(
                  'text-[10px] uppercase tracking-wide',
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                )}>
                  Streak
                </span>
              </div>
              <div className="text-lg font-bold text-orange-500">
                {stats.streak}
              </div>
              <div className={cn(
                'text-[10px]',
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              )}>
                days
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button
            onClick={onOpenTimer}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
              isDark
                ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/20 hover:from-rose-500/30 hover:to-orange-500/30 text-white border border-rose-500/20'
                : 'bg-gradient-to-r from-rose-50 to-orange-50 hover:from-rose-100 hover:to-orange-100 text-zinc-900 border border-rose-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-rose-500/30' : 'bg-rose-100'
              )}>
                <Timer className={cn(
                  'w-4 h-4',
                  isDark ? 'text-rose-400' : 'text-rose-600'
                )} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Start Focus</div>
                <div className={cn(
                  'text-[10px]',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}>
                  25min Pomodoro
                </div>
              </div>
            </div>
            <ChevronRight className={cn(
              'w-4 h-4',
              isDark ? 'text-rose-400/60' : 'text-rose-400'
            )} />
          </button>

          <button
            onClick={onQuickCapture}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
              isDark
                ? 'bg-zinc-800/50 hover:bg-zinc-700/50 text-white border border-zinc-700/50'
                : 'bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                isDark ? 'bg-amber-500/20' : 'bg-amber-100'
              )}>
                <PenLine className={cn(
                  'w-4 h-4',
                  isDark ? 'text-amber-400' : 'text-amber-600'
                )} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">Quick Capture</div>
                <div className={cn(
                  'text-[10px]',
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                )}>
                  Jot down a thought
                </div>
              </div>
            </div>
            <ChevronRight className={cn(
              'w-4 h-4',
              isDark ? 'text-zinc-600' : 'text-zinc-400'
            )} />
          </button>
        </div>
      </div>

      {/* Full Ambience Controls Footer */}
      <div className={cn(
        'flex-shrink-0 border-t',
        isDark ? 'border-zinc-800 bg-zinc-900/95' : 'border-zinc-200 bg-white/95'
      )}>
        {/* Header Row */}
        <div className={cn(
          'flex items-center justify-between px-4 py-2 border-b',
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        )}>
          <div className="flex items-center gap-2">
            <Headphones className={cn(
              'w-4 h-4',
              isPlaying ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'
            )} />
            <span className={cn(
              'text-sm font-semibold',
              isDark ? 'text-white' : 'text-zinc-900'
            )}>
              Ambience
            </span>
            {isPlaying && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Playing
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
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
              <MiniJukeboxIcon isPlaying={isPlaying} size={16} />
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
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Jukebox View */}
          <AnimatePresence mode="wait">
            {showJukebox ? (
              <motion.div
                key="jukebox"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-center overflow-hidden"
              >
                <CompactJukebox
                  nowPlaying={isPlaying ? SOUNDSCAPE_INFO[soundscape].name : 'Select a Track'}
                  isPlaying={isPlaying}
                  analyser={analyser}
                  volume={volume}
                  onTogglePlay={onTogglePlay}
                  onVolumeChange={onVolumeChange}
                  isDark={isDark}
                />
              </motion.div>
            ) : (
              <motion.div
                key="controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Waveform Visualizer */}
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-3"
                  >
                    <WaveformVisualizer
                      analyser={analyser}
                      isPlaying={isPlaying}
                      isDark={isDark}
                      width={200}
                      height={40}
                      barCount={32}
                      className="rounded-lg mx-auto"
                    />
                  </motion.div>
                )}

                {/* Soundscape Grid */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {displayedSoundscapes.map((s) => {
                    const Icon = SOUNDSCAPE_ICONS[s]
                    const info = SOUNDSCAPE_INFO[s]
                    const isActive = soundscape === s

                    return (
                      <button
                        key={s}
                        onClick={() => onSoundscapeChange(s)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                          isActive
                            ? isDark
                              ? 'bg-purple-500/20 border border-purple-500/30'
                              : 'bg-purple-100 border border-purple-200'
                            : isDark
                              ? 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                              : 'bg-white border border-zinc-200 hover:border-zinc-300'
                        )}
                      >
                        <Icon className={cn(
                          'w-4 h-4',
                          isActive ? 'text-purple-400' : isDark ? 'text-zinc-400' : 'text-zinc-600'
                        )} />
                        <span className={cn(
                          'text-[9px] font-medium capitalize truncate w-full text-center',
                          isActive ? 'text-purple-300' : isDark ? 'text-zinc-500' : 'text-zinc-500'
                        )}>
                          {s === 'white-noise' ? 'noise' : s}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {soundscapes.length > 4 && (
                  <button
                    onClick={() => setShowAllSoundscapes(!showAllSoundscapes)}
                    className={cn(
                      'w-full py-1 text-[10px] font-medium transition-colors',
                      isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700'
                    )}
                  >
                    {showAllSoundscapes ? 'Show less' : `Show all ${soundscapes.length}`}
                  </button>
                )}

                {/* Volume Control */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onVolumeChange(volume === 0 ? 0.5 : 0)}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      isDark
                        ? 'text-zinc-400 hover:bg-zinc-800'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    )}
                  >
                    {volume === 0 ? (
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
                    value={volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className={cn(
                      'flex-1 h-1.5 rounded-full appearance-none cursor-pointer',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-300',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-3',
                      '[&::-webkit-slider-thumb]:h-3',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-purple-500',
                      '[&::-webkit-slider-thumb]:cursor-pointer'
                    )}
                  />

                  <span className={cn(
                    'text-[10px] font-mono w-8 text-right',
                    isDark ? 'text-zinc-500' : 'text-zinc-500'
                  )}>
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* Play/Pause Button */}
                <button
                  onClick={onTogglePlay}
                  className={cn(
                    'w-full py-2.5 mt-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                    isPlaying
                      ? isDark
                        ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  )}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Ambience
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  'border-t pt-3 overflow-hidden',
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                )}
              >
                <p className={cn(
                  'text-[10px] uppercase tracking-wide mb-2',
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                )}>
                  Quick Settings
                </p>
                
                <div className="space-y-2">
                  {/* Auto-play on focus */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      Auto-play on focus
                    </span>
                    <button className={cn(
                      'w-8 h-4 rounded-full transition-colors relative',
                      isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                    )}>
                      <div className={cn(
                        'absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform'
                      )} />
                    </button>
                  </div>

                  {/* Timer fade */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs',
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    )}>
                      Fade on timer end
                    </span>
                    <button className={cn(
                      'w-8 h-4 rounded-full transition-colors relative bg-purple-500'
                    )}>
                      <div className={cn(
                        'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform translate-x-4'
                      )} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
