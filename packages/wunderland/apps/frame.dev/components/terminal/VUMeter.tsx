/**
 * VU Meter - Analog audio level indicator
 * @module terminal/VUMeter
 * 
 * @remarks
 * Classic VU meter with:
 * - Gradient color bands (green → yellow → red)
 * - Peak hold indicator
 * - Needle animation option
 * - dB markings
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import clsx from 'clsx'

interface VUMeterProps {
  /** Current level (0-100) */
  value: number
  /** Show peak indicator */
  showPeak?: boolean
  /** Peak hold time in ms */
  peakHoldTime?: number
  /** Show dB scale */
  showScale?: boolean
  /** Meter style */
  style?: 'bar' | 'needle' | 'led'
  /** Orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Label */
  label?: string
  /** Channel (for stereo) */
  channel?: 'left' | 'right' | 'mono'
  /** Additional classes */
  className?: string
}

/**
 * Retro VU meter component
 */
export default function VUMeter({
  value,
  showPeak = true,
  peakHoldTime = 1000,
  showScale = true,
  style = 'bar',
  orientation = 'horizontal',
  size = 'md',
  label,
  channel = 'mono',
  className,
}: VUMeterProps) {
  const { theme } = useTheme()
  const isTerminal = theme?.includes('terminal')
  const [peak, setPeak] = useState(value)
  const peakTimerRef = useRef<NodeJS.Timeout>()

  // Update peak value
  useEffect(() => {
    if (value > peak) {
      setPeak(value)
      if (peakTimerRef.current) {
        clearTimeout(peakTimerRef.current)
      }
      peakTimerRef.current = setTimeout(() => {
        setPeak(value)
      }, peakHoldTime)
    }
  }, [value, peak, peakHoldTime])

  const sizeClasses = {
    sm: orientation === 'horizontal' ? 'h-4 w-32' : 'w-4 h-32',
    md: orientation === 'horizontal' ? 'h-6 w-48' : 'w-6 h-48',
    lg: orientation === 'horizontal' ? 'h-8 w-64' : 'w-8 h-64',
  }

  if (!isTerminal) {
    // Simple progress bar for non-terminal themes
    return (
      <div className={clsx('relative', className)}>
        {label && <div className="text-xs font-medium mb-1">{label}</div>}
        <div className={clsx(
          'relative bg-gray-200 dark:bg-gray-700 rounded overflow-hidden',
          sizeClasses[size]
        )}>
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      </div>
    )
  }

  if (style === 'led') {
    return <LEDMeter value={value} size={size} orientation={orientation} label={label} className={className} />
  }

  if (style === 'needle') {
    return <NeedleMeter value={value} size={size} label={label} className={className} />
  }

  // Bar style (default)
  return (
    <div className={clsx('vu-meter-container', className)}>
      {label && (
        <div className="vu-meter-label terminal-text text-xs mb-1">
          {channel !== 'mono' && <span className="mr-1">[{channel.toUpperCase()[0]}]</span>}
          {label}
        </div>
      )}
      
      <div className={clsx('vu-meter', sizeClasses[size])}>
        {/* Main bar */}
        <motion.div
          className="vu-meter-bar"
          animate={{ 
            width: orientation === 'horizontal' ? `${value}%` : '100%',
            height: orientation === 'vertical' ? `${value}%` : '100%',
          }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
        
        {/* Peak indicator */}
        {showPeak && peak > 0 && (
          <motion.div
            className="absolute bg-white mix-blend-screen"
            style={{
              [orientation === 'horizontal' ? 'left' : 'bottom']: `${peak}%`,
              [orientation === 'horizontal' ? 'width' : 'height']: '2px',
              [orientation === 'horizontal' ? 'height' : 'width']: '100%',
              boxShadow: '0 0 10px var(--glow-color-bright)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
        
        {/* Scale markings */}
        {showScale && (
          <div className="vu-meter-marks">
            {[0, -5, -10, -20].map((db) => (
              <div 
                key={db} 
                className="vu-meter-mark"
                style={{
                  [orientation === 'horizontal' ? 'left' : 'bottom']: 
                    `${dbToPercent(db)}%`
                }}
              >
                <span className="text-xs">{db}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ASCII decoration */}
      <div className="mt-1 text-xs opacity-50 font-mono">
        {'['}
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={i < value / 10 ? 'text-terminal-accent' : ''}>
            {i < value / 10 ? '=' : '-'}
          </span>
        ))}
        {']'} {Math.round(value)}%
      </div>
    </div>
  )
}

/**
 * LED-style meter (discrete segments)
 */
function LEDMeter({ 
  value, 
  size, 
  orientation, 
  label,
  className 
}: Omit<VUMeterProps, 'style'>) {
  const segments = size === 'lg' ? 20 : size === 'md' ? 15 : 10
  const activeSegments = Math.ceil((value / 100) * segments)
  
  return (
    <div className={clsx('led-meter-container', className)}>
      {label && (
        <div className="terminal-text text-xs mb-1">{label}</div>
      )}
      
      <div className={clsx(
        'flex gap-0.5',
        orientation === 'vertical' ? 'flex-col-reverse' : 'flex-row'
      )}>
        {Array.from({ length: segments }).map((_, i) => {
          const isActive = i < activeSegments
          const segmentPercent = (i / segments) * 100
          const color = segmentPercent > 80 ? 'red' : segmentPercent > 60 ? 'amber' : 'green'
          
          return (
            <motion.div
              key={i}
              className={clsx(
                'led',
                color,
                isActive && 'on',
                size === 'sm' && 'w-2 h-2',
                size === 'md' && 'w-3 h-3',
                size === 'lg' && 'w-4 h-4'
              )}
              animate={{
                opacity: isActive ? 1 : 0.2,
                scale: isActive ? 1 : 0.8,
              }}
              transition={{ duration: 0.1 }}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Analog needle meter
 */
function NeedleMeter({ 
  value, 
  size, 
  label,
  className 
}: Omit<VUMeterProps, 'style' | 'orientation'>) {
  const radius = size === 'lg' ? 80 : size === 'md' ? 60 : 40
  const angle = -60 + (value / 100) * 120 // -60° to +60°
  
  return (
    <div className={clsx('needle-meter-container text-center', className)}>
      {label && (
        <div className="terminal-text text-xs mb-2">{label}</div>
      )}
      
      <div className="relative inline-block">
        <svg 
          width={radius * 2} 
          height={radius * 1.5}
          className="needle-meter"
        >
          {/* Background arc */}
          <path
            d={`M ${radius * 0.2} ${radius * 1.2} A ${radius * 0.8} ${radius * 0.8} 0 0 1 ${radius * 1.8} ${radius * 1.2}`}
            fill="none"
            stroke="var(--terminal-border)"
            strokeWidth="2"
          />
          
          {/* Color zones */}
          <path
            d={`M ${radius * 0.2} ${radius * 1.2} A ${radius * 0.8} ${radius * 0.8} 0 0 1 ${radius} ${radius * 0.4}`}
            fill="none"
            stroke="#00ff00"
            strokeWidth="4"
            opacity="0.3"
          />
          <path
            d={`M ${radius} ${radius * 0.4} A ${radius * 0.8} ${radius * 0.8} 0 0 1 ${radius * 1.5} ${radius * 0.8}`}
            fill="none"
            stroke="#ffff00"
            strokeWidth="4"
            opacity="0.3"
          />
          <path
            d={`M ${radius * 1.5} ${radius * 0.8} A ${radius * 0.8} ${radius * 0.8} 0 0 1 ${radius * 1.8} ${radius * 1.2}`}
            fill="none"
            stroke="#ff0000"
            strokeWidth="4"
            opacity="0.3"
          />
          
          {/* Scale marks */}
          {[-20, -10, -5, 0, 3].map((db) => {
            const markAngle = -60 + ((dbToPercent(db) / 100) * 120)
            const x1 = radius + (radius * 0.7) * Math.cos(markAngle * Math.PI / 180)
            const y1 = radius * 1.2 - (radius * 0.7) * Math.sin(markAngle * Math.PI / 180)
            const x2 = radius + (radius * 0.8) * Math.cos(markAngle * Math.PI / 180)
            const y2 = radius * 1.2 - (radius * 0.8) * Math.sin(markAngle * Math.PI / 180)
            
            return (
              <g key={db}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--terminal-text)"
                  strokeWidth="1"
                />
                <text
                  x={radius + (radius * 0.6) * Math.cos(markAngle * Math.PI / 180)}
                  y={radius * 1.2 - (radius * 0.6) * Math.sin(markAngle * Math.PI / 180)}
                  fill="var(--terminal-text-dim)"
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {db}
                </text>
              </g>
            )
          })}
          
          {/* Needle */}
          <motion.line
            x1={radius}
            y1={radius * 1.2}
            x2={radius + (radius * 0.8) * Math.cos(angle * Math.PI / 180)}
            y2={radius * 1.2 - (radius * 0.8) * Math.sin(angle * Math.PI / 180)}
            stroke="var(--terminal-accent)"
            strokeWidth="2"
            animate={{
              x2: radius + (radius * 0.8) * Math.cos(angle * Math.PI / 180),
              y2: radius * 1.2 - (radius * 0.8) * Math.sin(angle * Math.PI / 180),
            }}
            transition={{ duration: 0.1, ease: 'linear' }}
            style={{
              filter: 'drop-shadow(0 0 5px var(--glow-color))',
            }}
          />
          
          {/* Center pivot */}
          <circle
            cx={radius}
            cy={radius * 1.2}
            r="4"
            fill="var(--terminal-text)"
          />
        </svg>
        
        {/* Digital readout */}
        <div className="absolute bottom-0 inset-x-0 text-xs terminal-text">
          {value.toFixed(1)} %
        </div>
      </div>
    </div>
  )
}

/**
 * Convert dB to percentage (VU meter scale)
 */
function dbToPercent(db: number): number {
  // VU meter scale: 0 VU = 100%, -20dB = ~10%
  if (db >= 0) return 100
  if (db <= -20) return 10
  return 100 - ((Math.abs(db) / 20) * 90)
}
