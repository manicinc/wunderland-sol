'use client'

/**
 * Ambience Widget
 * @module components/quarry/ui/meditate/widgets/AmbienceWidget
 * 
 * Full ambience controls with sound layering, visualization, and presets.
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Waves,
  CloudRain,
  Trees,
  Coffee,
  Flame,
  Music,
  Radio,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme } from '@/types/theme'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import { SOUNDSCAPE_INFO } from '@/lib/audio/ambienceSounds'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface AmbienceWidgetProps {
  theme: ThemeName
  soundscape: SoundscapeType
  isPlaying: boolean
  analyser: AnalyserNode | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOUNDSCAPE ICONS
═══════════════════════════════════════════════════════════════════════════ */

const SOUNDSCAPE_ICONS: Record<SoundscapeType, React.ElementType> = {
  none: VolumeX,
  rain: CloudRain,
  ocean: Waves,
  forest: Trees,
  cafe: Coffee,
  fireplace: Flame,
  lofi: Music,
  'white-noise': Radio,
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AmbienceWidget({
  theme,
  soundscape,
  isPlaying,
  analyser,
}: AmbienceWidgetProps) {
  const isDark = isDarkTheme(theme)
  const [volumes, setVolumes] = useState<Record<SoundscapeType, number>>({
    none: 0,
    rain: 0.7,
    ocean: 0.6,
    forest: 0.5,
    cafe: 0.4,
    fireplace: 0.6,
    lofi: 0.5,
    'white-noise': 0.3,
  })

  // Audio visualization
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!analyser || !canvasRef.current || !isPlaying) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    let animationId: number

    const draw = () => {
      animationId = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight)
        gradient.addColorStop(0, isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.5)')
        gradient.addColorStop(1, isDark ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 1)')

        ctx.fillStyle = gradient
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)

        x += barWidth
      }
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [analyser, isPlaying, isDark])

  const soundscapes: SoundscapeType[] = ['rain', 'ocean', 'forest', 'cafe', 'fireplace', 'lofi', 'white-noise']

  return (
    <div className="flex flex-col h-full p-4">
      {/* Visualization */}
      <div className={cn(
        'h-20 mb-4 rounded-xl overflow-hidden',
        isDark ? 'bg-white/5' : 'bg-black/5'
      )}>
        {isPlaying ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={300}
            height={80}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className={cn(
              'text-sm',
              isDark ? 'text-white/40' : 'text-black/40'
            )}>
              No sound playing
            </span>
          </div>
        )}
      </div>

      {/* Current soundscape */}
      <div className={cn(
        'flex items-center gap-3 mb-4 p-3 rounded-xl',
        isDark ? 'bg-white/5' : 'bg-black/5'
      )}>
        {soundscape !== 'none' && (
          <>
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'bg-purple-500/20'
            )}>
              {(() => {
                const Icon = SOUNDSCAPE_ICONS[soundscape]
                return <Icon className="w-5 h-5 text-purple-400" />
              })()}
            </div>
            <div className="flex-1">
              <div className={cn(
                'text-sm font-medium capitalize',
                isDark ? 'text-white' : 'text-black'
              )}>
                {soundscape.replace('-', ' ')}
              </div>
              <div className={cn(
                'text-xs',
                isDark ? 'text-white/50' : 'text-black/50'
              )}>
                {SOUNDSCAPE_INFO[soundscape]?.description || 'Ambient sounds'}
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-1',
              isPlaying ? 'text-green-400' : isDark ? 'text-white/40' : 'text-black/40'
            )}>
              {isPlaying ? (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Volume2 className="w-4 h-4" />
                </motion.div>
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </div>
          </>
        )}
        {soundscape === 'none' && (
          <div className={cn(
            'text-sm w-full text-center',
            isDark ? 'text-white/50' : 'text-black/50'
          )}>
            Select a soundscape below
          </div>
        )}
      </div>

      {/* Soundscape grid */}
      <div className="flex-1 overflow-auto">
        <div className={cn(
          'text-xs font-medium mb-2',
          isDark ? 'text-white/50' : 'text-black/50'
        )}>
          Soundscapes
        </div>
        <div className="grid grid-cols-2 gap-2">
          {soundscapes.map((s) => {
            const Icon = SOUNDSCAPE_ICONS[s]
            const isActive = soundscape === s
            const info = SOUNDSCAPE_INFO[s]
            
            return (
              <button
                key={s}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-lg',
                  'transition-all duration-200 text-left',
                  isActive
                    ? 'bg-purple-500/20 ring-1 ring-purple-500/50'
                    : isDark
                      ? 'hover:bg-white/10'
                      : 'hover:bg-black/5'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  isActive
                    ? 'bg-purple-500/30'
                    : isDark
                      ? 'bg-white/10'
                      : 'bg-black/10'
                )}>
                  <span className="text-lg">{info?.emoji || '🎵'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-medium capitalize truncate',
                    isDark ? 'text-white' : 'text-black'
                  )}>
                    {s.replace('-', ' ')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Volume control */}
      <div className={cn(
        'mt-4 pt-4 border-t',
        isDark ? 'border-white/10' : 'border-black/10'
      )}>
        <div className="flex items-center gap-3">
          <Volume2 className={cn(
            'w-4 h-4',
            isDark ? 'text-white/60' : 'text-black/60'
          )} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={soundscape !== 'none' ? volumes[soundscape] : 0}
            onChange={(e) => {
              if (soundscape !== 'none') {
                setVolumes((prev) => ({
                  ...prev,
                  [soundscape]: parseFloat(e.target.value),
                }))
              }
            }}
            className={cn(
              'flex-1 h-1 rounded-full appearance-none cursor-pointer',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-3',
              '[&::-webkit-slider-thumb]:h-3',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-purple-500'
            )}
            style={{
              background: `linear-gradient(to right, rgb(139, 92, 246) ${(soundscape !== 'none' ? volumes[soundscape] : 0) * 100}%, ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} ${(soundscape !== 'none' ? volumes[soundscape] : 0) * 100}%)`,
            }}
          />
          <span className={cn(
            'text-xs w-8 text-right',
            isDark ? 'text-white/40' : 'text-black/40'
          )}>
            {Math.round((soundscape !== 'none' ? volumes[soundscape] : 0) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}





