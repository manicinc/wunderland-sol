'use client'

/**
 * Clock Widget
 * @module components/quarry/ui/meditate/widgets/ClockWidget
 * 
 * Beautiful analog/digital clock widget.
 */

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface ClockWidgetProps {
  theme: ThemeName
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function ClockWidget({ theme }: ClockWidgetProps) {
  const isDark = isDarkTheme(theme)
  const [time, setTime] = useState(new Date())
  const [showAnalog, setShowAnalog] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  // Calculate hand angles
  const hourAngle = (hours % 12) * 30 + minutes * 0.5
  const minuteAngle = minutes * 6 + seconds * 0.1
  const secondAngle = seconds * 6

  if (showAnalog) {
    return (
      <div
        className="flex items-center justify-center h-full p-4 cursor-pointer"
        onClick={() => setShowAnalog(false)}
      >
        <div className="relative w-36 h-36">
          {/* Holographic glow behind clock */}
          <div 
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: isDark 
                ? 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            }}
          />
          
          {/* Clock face */}
          <svg viewBox="0 0 100 100" className="w-full h-full relative z-10">
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="clock-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isDark ? 'rgba(139,92,246,0.4)' : 'rgba(99,102,241,0.3)'} />
                <stop offset="50%" stopColor={isDark ? 'rgba(236,72,153,0.3)' : 'rgba(168,85,247,0.2)'} />
                <stop offset="100%" stopColor={isDark ? 'rgba(139,92,246,0.4)' : 'rgba(99,102,241,0.3)'} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Outer glow ring */}
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="url(#clock-ring-gradient)"
              strokeWidth="2"
            />
            
            {/* Inner ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="1"
            />

            {/* Hour markers */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180)
              const x1 = 50 + 38 * Math.cos(angle)
              const y1 = 50 + 38 * Math.sin(angle)
              const x2 = 50 + 44 * Math.cos(angle)
              const y2 = 50 + 44 * Math.sin(angle)
              const isMainHour = i % 3 === 0
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMainHour 
                    ? (isDark ? 'rgba(167,139,250,0.8)' : 'rgba(99,102,241,0.6)')
                    : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')}
                  strokeWidth={isMainHour ? 2.5 : 1}
                  strokeLinecap="round"
                />
              )
            })}

            {/* Hour hand with glow */}
            <line
              x1="50"
              y1="50"
              x2={50 + 22 * Math.sin((hourAngle * Math.PI) / 180)}
              y2={50 - 22 * Math.cos((hourAngle * Math.PI) / 180)}
              stroke={isDark ? '#a78bfa' : '#6366f1'}
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Minute hand with glow */}
            <line
              x1="50"
              y1="50"
              x2={50 + 32 * Math.sin((minuteAngle * Math.PI) / 180)}
              y2={50 - 32 * Math.cos((minuteAngle * Math.PI) / 180)}
              stroke={isDark ? '#c4b5fd' : '#818cf8'}
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Second hand with glow */}
            <line
              x1="50"
              y1="50"
              x2={50 + 36 * Math.sin((secondAngle * Math.PI) / 180)}
              y2={50 - 36 * Math.cos((secondAngle * Math.PI) / 180)}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Center dot */}
            <circle
              cx="50"
              cy="50"
              r="4"
              fill={isDark ? '#a78bfa' : '#6366f1'}
              filter="url(#glow)"
            />
            <circle
              cx="50"
              cy="50"
              r="2"
              fill={isDark ? 'white' : '#4f46e5'}
            />
          </svg>

          {/* Date */}
          <div
            className={cn(
              'absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium',
              isDark ? 'text-white/60' : 'text-slate-600'
            )}
          >
            {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    )
  }

  // Digital mode with holographic styling
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-4 cursor-pointer relative"
      onClick={() => setShowAnalog(true)}
    >
      {/* Background glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(99,102,241,0.1) 0%, transparent 70%)',
        }}
      />
      
      <div
        className={cn(
          'text-5xl font-mono font-bold tabular-nums relative z-10',
          isDark ? 'text-white' : 'text-slate-800'
        )}
        style={{
          textShadow: isDark 
            ? '0 0 30px rgba(167,139,250,0.5), 0 0 60px rgba(139,92,246,0.3)'
            : '0 2px 10px rgba(99,102,241,0.2)',
        }}
      >
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div
        className={cn(
          'text-xl font-mono tabular-nums mt-1 relative z-10',
          isDark ? 'text-purple-400/60' : 'text-indigo-500/60'
        )}
      >
        <span className="text-rose-400">:</span>
        {seconds.toString().padStart(2, '0')}
      </div>
      <div
        className={cn(
          'text-sm mt-3 font-medium relative z-10',
          isDark ? 'text-white/50' : 'text-slate-500'
        )}
      >
        {time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  )
}


