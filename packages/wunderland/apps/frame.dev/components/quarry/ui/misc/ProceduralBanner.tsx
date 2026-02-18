'use client'

/**
 * Procedural SVG Banner Component
 * @module codex/ui/ProceduralBanner
 * 
 * A custom, intricate SVG banner with organic procedural patterns
 * that matches all themes and creates visual interest.
 */

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ThemeName } from '@/types/theme'

interface ProceduralBannerProps {
  /** Current theme */
  theme?: ThemeName
  /** Width of the banner */
  width?: number
  /** Height of the banner */
  height?: number
  /** Optional seed for deterministic randomness */
  seed?: number
  /** Animation enabled */
  animated?: boolean
}

// Seeded random number generator for deterministic patterns
function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// Theme color palettes
const THEME_PALETTES: Record<string, { primary: string; secondary: string; accent: string; bg: string }> = {
  'light': { primary: '#10b981', secondary: '#06b6d4', accent: '#8b5cf6', bg: '#f4f4f5' },
  'dark': { primary: '#34d399', secondary: '#22d3ee', accent: '#a78bfa', bg: '#18181b' },
  'sepia-light': { primary: '#d97706', secondary: '#a3622e', accent: '#92400e', bg: '#fef3c7' },
  'sepia-dark': { primary: '#fbbf24', secondary: '#d97706', accent: '#f59e0b', bg: '#292524' },
  'terminal-light': { primary: '#22c55e', secondary: '#16a34a', accent: '#84cc16', bg: '#f0fdf4' },
  'terminal-dark': { primary: '#4ade80', secondary: '#22c55e', accent: '#a3e635', bg: '#052e16' },
  'oceanic-light': { primary: '#0ea5e9', secondary: '#06b6d4', accent: '#0284c7', bg: '#ecfeff' },
  'oceanic-dark': { primary: '#38bdf8', secondary: '#22d3ee', accent: '#0ea5e9', bg: '#0c4a6e' },
}

/**
 * Generate organic wave path
 */
function generateWavePath(
  width: number,
  height: number,
  rand: () => number,
  amplitude: number,
  frequency: number,
  yOffset: number
): string {
  const points: string[] = []
  const steps = 20
  
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width
    const noise = (rand() - 0.5) * amplitude * 0.3
    const y = yOffset + Math.sin((i / steps) * Math.PI * frequency) * amplitude + noise
    
    if (i === 0) {
      points.push(`M ${x} ${y}`)
    } else {
      // Smooth curve using previous point
      const prevX = ((i - 1) / steps) * width
      const cpX = (prevX + x) / 2
      points.push(`Q ${cpX} ${y + rand() * amplitude * 0.2} ${x} ${y}`)
    }
  }
  
  return points.join(' ')
}

/**
 * Generate organic blob shape
 */
function generateBlob(
  cx: number,
  cy: number,
  radius: number,
  rand: () => number,
  points: number = 6
): string {
  const angleStep = (Math.PI * 2) / points
  const pathPoints: string[] = []
  
  for (let i = 0; i <= points; i++) {
    const angle = i * angleStep
    const r = radius * (0.7 + rand() * 0.6)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    
    if (i === 0) {
      pathPoints.push(`M ${x} ${y}`)
    } else {
      const prevAngle = (i - 1) * angleStep
      const cpAngle = prevAngle + angleStep / 2
      const cpR = radius * (0.8 + rand() * 0.4)
      const cpX = cx + Math.cos(cpAngle) * cpR * 1.2
      const cpY = cy + Math.sin(cpAngle) * cpR * 1.2
      pathPoints.push(`Q ${cpX} ${cpY} ${x} ${y}`)
    }
  }
  
  pathPoints.push('Z')
  return pathPoints.join(' ')
}

/**
 * Procedural SVG Banner - organic, theme-aware decorative element
 */
export default function ProceduralBanner({
  theme = 'light',
  width = 200,
  height = 60,
  seed,
  animated = true,
}: ProceduralBannerProps) {
  // Use time-based seed if not provided (changes daily)
  const daySeed = useMemo(() => {
    if (seed !== undefined) return seed
    const today = new Date()
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  }, [seed])
  
  const palette = THEME_PALETTES[theme] || THEME_PALETTES['light']
  
  // Generate patterns with seeded randomness
  const patterns = useMemo(() => {
    const rand = seededRandom(daySeed)
    
    // Generate wave paths
    const waves = [
      generateWavePath(width, height, rand, height * 0.15, 2 + rand(), height * 0.3),
      generateWavePath(width, height, rand, height * 0.12, 3 + rand(), height * 0.5),
      generateWavePath(width, height, rand, height * 0.1, 2.5 + rand(), height * 0.7),
    ]
    
    // Generate blob decorations
    const blobs = [
      { path: generateBlob(width * 0.15, height * 0.4, height * 0.2, rand), opacity: 0.3 },
      { path: generateBlob(width * 0.5, height * 0.3, height * 0.15, rand, 8), opacity: 0.2 },
      { path: generateBlob(width * 0.85, height * 0.5, height * 0.18, rand, 5), opacity: 0.25 },
    ]
    
    // Generate scatter dots
    const dots: Array<{ cx: number; cy: number; r: number }> = []
    for (let i = 0; i < 8; i++) {
      dots.push({
        cx: rand() * width,
        cy: rand() * height,
        r: 1 + rand() * 2,
      })
    }
    
    // Generate connecting lines
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let i = 0; i < 4; i++) {
      const startX = rand() * width * 0.3
      const startY = rand() * height
      lines.push({
        x1: startX,
        y1: startY,
        x2: startX + rand() * width * 0.4 + 20,
        y2: startY + (rand() - 0.5) * height * 0.5,
      })
    }
    
    return { waves, blobs, dots, lines }
  }, [daySeed, width, height])
  
  return (
    <motion.svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxWidth: width, height: 'auto' }}
      initial={animated ? { opacity: 0 } : undefined}
      animate={animated ? { opacity: 1 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <defs>
        {/* Gradient definitions */}
        <linearGradient id={`grad-primary-${daySeed}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.4" />
        </linearGradient>
        
        <linearGradient id={`grad-accent-${daySeed}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.primary} stopOpacity="0.3" />
        </linearGradient>
        
        {/* Glow filter */}
        <filter id={`glow-${daySeed}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* Background blobs */}
      {patterns.blobs.map((blob, i) => (
        <motion.path
          key={`blob-${i}`}
          d={blob.path}
          fill={i % 2 === 0 ? `url(#grad-primary-${daySeed})` : `url(#grad-accent-${daySeed})`}
          opacity={blob.opacity}
          initial={animated ? { scale: 0.8, opacity: 0 } : undefined}
          animate={animated ? { scale: 1, opacity: blob.opacity } : undefined}
          transition={{ delay: i * 0.1, duration: 0.5 }}
        />
      ))}
      
      {/* Connecting lines */}
      {patterns.lines.map((line, i) => (
        <motion.line
          key={`line-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={palette.secondary}
          strokeWidth="0.5"
          strokeOpacity="0.3"
          strokeDasharray="3 3"
          initial={animated ? { pathLength: 0 } : undefined}
          animate={animated ? { pathLength: 1 } : undefined}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
        />
      ))}
      
      {/* Wave paths */}
      {patterns.waves.map((wave, i) => (
        <motion.path
          key={`wave-${i}`}
          d={wave}
          fill="none"
          stroke={i === 0 ? palette.primary : i === 1 ? palette.secondary : palette.accent}
          strokeWidth={2 - i * 0.5}
          strokeOpacity={0.6 - i * 0.1}
          strokeLinecap="round"
          filter={i === 0 ? `url(#glow-${daySeed})` : undefined}
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={animated ? { pathLength: 1, opacity: 0.6 - i * 0.1 } : undefined}
          transition={{ delay: 0.2 + i * 0.15, duration: 1, ease: 'easeOut' }}
        />
      ))}
      
      {/* Scatter dots */}
      {patterns.dots.map((dot, i) => (
        <motion.circle
          key={`dot-${i}`}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r ?? 2}
          fill={i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.secondary : palette.accent}
          opacity={0.5}
          initial={animated ? { scale: 0, opacity: 0 } : undefined}
          animate={animated ? { scale: 1, opacity: 0.5 } : undefined}
          transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
        />
      ))}
      
      {/* Central decorative element */}
      <motion.g
        initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
        animate={animated ? { opacity: 1, scale: 1 } : undefined}
        transition={{ delay: 0.4, duration: 0.5, type: 'spring' }}
      >
        {/* Fabric-inspired woven pattern at center */}
        <g transform={`translate(${width / 2 - 12}, ${height / 2 - 8})`}>
          {/* Horizontal threads */}
          <path
            d="M0 4 Q6 2 12 4 Q18 6 24 4"
            stroke={palette.primary}
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M0 8 Q6 10 12 8 Q18 6 24 8"
            stroke={palette.secondary}
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M0 12 Q6 10 12 12 Q18 14 24 12"
            stroke={palette.accent}
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />
          
          {/* Vertical threads (woven) */}
          <path
            d="M4 0 Q2 4 4 8 Q6 12 4 16"
            stroke={palette.primary}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M12 0 Q14 4 12 8 Q10 12 12 16"
            stroke={palette.secondary}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M20 0 Q18 4 20 8 Q22 12 20 16"
            stroke={palette.accent}
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
        </g>
      </motion.g>
    </motion.svg>
  )
}

