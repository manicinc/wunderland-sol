/**
 * Clock Widget
 *
 * Classic Roman numeral analog clock with elegant styling.
 * Performance-optimized: Uses CSS transforms instead of Framer Motion.
 * @module components/quarry/dashboard/widgets/ClockWidget
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { WidgetProps } from '../types'

// Roman numerals for clock face
const ROMAN_NUMERALS = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']

export function ClockWidget({ theme, size, compact, onNavigate: _ }: WidgetProps) {
  const isDark = theme.includes('dark')
  const [time, setTime] = useState(new Date())
  
  // Use a ref to track if component is mounted to prevent memory leaks
  const isMounted = useRef(true)

  // Update time every second - use requestAnimationFrame for smoother updates
  useEffect(() => {
    isMounted.current = true
    
    const updateTime = () => {
      if (isMounted.current) {
        setTime(new Date())
      }
    }
    
    // Update immediately, then every second
    const interval = setInterval(updateTime, 1000)
    
    return () => {
      isMounted.current = false
      clearInterval(interval)
    }
  }, [])

  // Calculate hand angles
  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secondAngle = (seconds / 60) * 360
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360
  const hourAngle = ((hours + minutes / 60) / 12) * 360

  // Format date
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  const formattedDate = time.toLocaleDateString('en-US', dateOptions)

  // Theme colors
  const goldColor = isDark ? '#D4AF37' : '#B8860B'
  const goldLight = isDark ? '#FFD700' : '#DAA520'
  const faceColor = isDark ? '#1A1A2E' : '#FAFAF8'
  const borderColor = isDark ? '#3A3A5A' : '#D4D4D4'
  const textColor = isDark ? '#E4E4E7' : '#3F3F46'
  const subtleColor = isDark ? '#52525B' : '#A1A1AA'

  // Size adjustments
  const clockSize = compact || size === 'small' ? 120 : size === 'large' ? 180 : 150

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      {/* Analog Clock SVG */}
      <svg
        width={clockSize}
        height={clockSize}
        viewBox="0 0 200 200"
        className="drop-shadow-lg"
      >
        {/* Definitions */}
        <defs>
          {/* Gold gradient for hands */}
          <linearGradient id="clockGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={goldLight} />
            <stop offset="50%" stopColor={goldColor} />
            <stop offset="100%" stopColor={goldLight} />
          </linearGradient>

          {/* Face gradient */}
          <radialGradient id="clockFaceGradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={isDark ? '#2A2A4A' : '#FFFFFF'} />
            <stop offset="100%" stopColor={faceColor} />
          </radialGradient>

          {/* Border gradient */}
          <linearGradient id="clockBorderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={goldLight} />
            <stop offset="25%" stopColor={goldColor} />
            <stop offset="50%" stopColor={goldLight} />
            <stop offset="75%" stopColor={goldColor} />
            <stop offset="100%" stopColor={goldLight} />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="clockShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer decorative ring */}
        <circle
          cx="100"
          cy="100"
          r="98"
          fill="none"
          stroke="url(#clockBorderGradient)"
          strokeWidth="4"
        />

        {/* Clock face */}
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="url(#clockFaceGradient)"
          stroke={borderColor}
          strokeWidth="1"
        />

        {/* Inner decorative ring */}
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke={goldColor}
          strokeWidth="0.5"
          opacity="0.5"
        />

        {/* Minute tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 360
          const isHour = i % 5 === 0
          const length = isHour ? 8 : 4
          const width = isHour ? 2 : 1
          const r1 = 85 - length
          const r2 = 85
          const x1 = 100 + r1 * Math.sin((angle * Math.PI) / 180)
          const y1 = 100 - r1 * Math.cos((angle * Math.PI) / 180)
          const x2 = 100 + r2 * Math.sin((angle * Math.PI) / 180)
          const y2 = 100 - r2 * Math.cos((angle * Math.PI) / 180)

          return (
            <line
              key={`tick-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? goldColor : subtleColor}
              strokeWidth={width}
              strokeLinecap="round"
            />
          )
        })}

        {/* Roman numerals */}
        {ROMAN_NUMERALS.map((numeral, i) => {
          const angle = (i / 12) * 360
          const r = 68
          const x = 100 + r * Math.sin((angle * Math.PI) / 180)
          const y = 100 - r * Math.cos((angle * Math.PI) / 180)

          return (
            <text
              key={`numeral-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={i === 0 ? "12" : "11"}
              fontFamily="'Times New Roman', Georgia, serif"
              fontWeight={i === 0 || i === 3 || i === 6 || i === 9 ? "bold" : "normal"}
              fill={textColor}
            >
              {numeral}
            </text>
          )
        })}

        {/* Hour hand - CSS transform for performance */}
        <g
          style={{ 
            transformOrigin: '100px 100px',
            transform: `rotate(${hourAngle}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <path
            d="M 97 100 L 100 50 L 103 100 Z"
            fill="url(#clockGoldGradient)"
            filter="url(#clockShadow)"
          />
          {/* Decorative end */}
          <circle cx="100" cy="55" r="3" fill={goldColor} />
        </g>

        {/* Minute hand - CSS transform for performance */}
        <g
          style={{ 
            transformOrigin: '100px 100px',
            transform: `rotate(${minuteAngle}deg)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <path
            d="M 98.5 100 L 100 30 L 101.5 100 Z"
            fill="url(#clockGoldGradient)"
            filter="url(#clockShadow)"
          />
          {/* Decorative end */}
          <circle cx="100" cy="35" r="2" fill={goldColor} />
        </g>

        {/* Second hand - CSS transform for performance */}
        <g
          style={{ 
            transformOrigin: '100px 100px',
            transform: `rotate(${secondAngle}deg)`,
            transition: 'transform 0.15s linear'
          }}
        >
          <line
            x1="100"
            y1="115"
            x2="100"
            y2="25"
            stroke={isDark ? '#EF4444' : '#DC2626'}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Counterweight */}
          <circle cx="100" cy="115" r="4" fill={isDark ? '#EF4444' : '#DC2626'} />
        </g>

        {/* Center pin */}
        <circle cx="100" cy="100" r="6" fill="url(#clockGoldGradient)" />
        <circle cx="100" cy="100" r="3" fill={isDark ? '#1A1A2E' : '#FFFFFF'} />
      </svg>

      {/* Digital time and date display - always shown */}
      <div className="text-center space-y-0.5">
        {/* Digital time */}
        <p
          className={`font-mono font-semibold tracking-wider ${
            compact || size === 'small' ? 'text-lg' : 'text-xl'
          } ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}
        >
          {time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </p>
        {/* Date */}
        <p
          className={`font-serif ${
            compact || size === 'small' ? 'text-xs' : 'text-sm'
          } ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
        >
          {formattedDate}
        </p>
      </div>
    </div>
  )
}

export default ClockWidget
