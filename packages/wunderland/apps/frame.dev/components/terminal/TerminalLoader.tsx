/**
 * Terminal Loader - Retro ASCII loading animations
 * @module terminal/TerminalLoader
 * 
 * @remarks
 * Collection of 80s/90s style loading animations:
 * - ASCII spinners
 * - Progress bars with blocks
 * - Matrix rain effect
 * - Typewriter text
 * - Glitch effects
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import clsx from 'clsx'

interface TerminalLoaderProps {
  /** Loading text */
  text?: string
  /** Animation style */
  style?: 'spinner' | 'progress' | 'matrix' | 'typewriter' | 'glitch' | 'blocks'
  /** Progress value (0-100) for progress style */
  progress?: number
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Show percentage */
  showPercent?: boolean
  /** Additional classes */
  className?: string
}

// ASCII spinners
const spinners = {
  classic: ['|', '/', '-', '\\'],
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  blocks: ['▖', '▘', '▝', '▗'],
  arrows: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
  braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
}

/**
 * Retro terminal loading animations
 */
export default function TerminalLoader({
  text = 'Loading',
  style = 'spinner',
  progress = 0,
  size = 'md',
  showPercent = true,
  className,
}: TerminalLoaderProps) {
  const { theme } = useTheme()
  const isTerminal = theme?.includes('terminal')
  const [frame, setFrame] = useState(0)
  const [dots, setDots] = useState('')

  // Animate spinner frames
  useEffect(() => {
    if (style === 'spinner' || style === 'typewriter') {
      const interval = setInterval(() => {
        setFrame((prev) => (prev + 1) % spinners.classic.length)
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 200)
      return () => clearInterval(interval)
    }
  }, [style])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  if (!isTerminal) {
    // Simple loading for non-terminal themes
    return (
      <div className={clsx('flex items-center gap-2', sizeClasses[size], className)}>
        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        <span>{text}</span>
      </div>
    )
  }

  // Terminal-specific loaders
  switch (style) {
    case 'progress':
      return <ProgressLoader text={text} progress={progress} size={size} showPercent={showPercent} className={className} />
    
    case 'matrix':
      return <MatrixRainLoader text={text} size={size} className={className} />
    
    case 'typewriter':
      return <TypewriterLoader text={text} dots={dots} size={size} className={className} />
    
    case 'glitch':
      return <GlitchLoader text={text} size={size} className={className} />
    
    case 'blocks':
      return <BlocksLoader text={text} size={size} className={className} />
    
    default:
      // Classic spinner
      return (
        <div className={clsx('terminal-text font-mono', sizeClasses[size], className)}>
          <span className="inline-flex items-center gap-2">
            <span className="text-terminal-accent">[{spinners.classic[frame]}]</span>
            <span>{text}{dots}</span>
          </span>
        </div>
      )
  }
}

/**
 * ASCII progress bar
 */
function ProgressLoader({ text = '', progress = 0, size = 'md', showPercent, className }: TerminalLoaderProps) {
  const filled = Math.floor((progress / 100) * 20)
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm', 
    lg: 'text-base',
  }

  return (
    <div className={clsx('terminal-text font-mono space-y-1', sizeClasses[size], className)}>
      <div>{text}</div>
      <div className="flex items-center gap-2">
        <span>[</span>
        <span>
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className={i < filled ? 'text-terminal-accent' : 'opacity-30'}>
              {i < filled ? '█' : '░'}
            </span>
          ))}
        </span>
        <span>]</span>
        {showPercent && (
          <span className="text-terminal-accent">{progress}%</span>
        )}
      </div>
    </div>
  )
}

/**
 * Matrix rain effect
 */
function MatrixRainLoader({ text = '', size = 'md', className }: TerminalLoaderProps) {
  const [chars, setChars] = useState<string[]>([])
  const matrixChars = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01'
  
  useEffect(() => {
    const interval = setInterval(() => {
      setChars(prev => {
        const newChars = [...prev]
        // Add new char
        if (newChars.length < 10) {
          newChars.push(matrixChars[Math.floor(Math.random() * matrixChars.length)])
        }
        // Remove old char
        if (newChars.length > 10) {
          newChars.shift()
        }
        // Randomly change some chars
        for (let i = 0; i < newChars.length; i++) {
          if (Math.random() > 0.7) {
            newChars[i] = matrixChars[Math.floor(Math.random() * matrixChars.length)]
          }
        }
        return newChars
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: 'text-xs h-16',
    md: 'text-sm h-20',
    lg: 'text-base h-24',
  }

  return (
    <div className={clsx('terminal-text font-mono', sizeClasses[size], className)}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-terminal-accent z-10">{text}</span>
        </div>
        <div className="flex gap-1 opacity-20">
          {chars.map((char, i) => (
            <motion.span
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 100, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              className="text-terminal-accent"
            >
              {char}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Typewriter effect
 */
function TypewriterLoader({ text = '', dots, size = 'md', className }: TerminalLoaderProps & { dots: string }) {
  const [displayText, setDisplayText] = useState('')
  
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= text.length) {
        setDisplayText(text.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [text])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={clsx('terminal-text font-mono', sizeClasses[size], className)}>
      <span>
        {'> '}{displayText}
        <span className="terminal-cursor ml-1" />
        {dots}
      </span>
    </div>
  )
}

/**
 * Glitch text effect
 */
function GlitchLoader({ text = '', size = 'md', className }: TerminalLoaderProps) {
  const [glitchText, setGlitchText] = useState(text)
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const chars = text.split('')
        const index = Math.floor(Math.random() * chars.length)
        chars[index] = String.fromCharCode(33 + Math.floor(Math.random() * 94))
        setGlitchText(chars.join(''))
      } else {
        setGlitchText(text)
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [text])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={clsx('terminal-text font-mono relative', sizeClasses[size], className)}>
      <span className="relative">
        <span className="absolute inset-0 text-terminal-error opacity-50" style={{ transform: 'translate(-1px, -1px)' }}>
          {glitchText}
        </span>
        <span className="absolute inset-0 text-terminal-info opacity-50" style={{ transform: 'translate(1px, 1px)' }}>
          {glitchText}
        </span>
        <span className="relative">{glitchText}</span>
      </span>
    </div>
  )
}

/**
 * Animated blocks
 */
function BlocksLoader({ text = '', size = 'md', className }: TerminalLoaderProps) {
  const [blocks, setBlocks] = useState(['░', '░', '░', '░'])
  
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setBlocks(prev => {
        const newBlocks = [...prev]
        newBlocks[i] = '█'
        if (i > 0) newBlocks[i - 1] = '▓'
        if (i > 1) newBlocks[i - 2] = '▒'
        if (i > 2) newBlocks[i - 3] = '░'
        i = (i + 1) % 4
        return newBlocks
      })
    }, 200)
    
    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div className={clsx('terminal-text font-mono', sizeClasses[size], className)}>
      <div className="flex items-center gap-2">
        <span className="text-terminal-accent">{blocks.join('')}</span>
        <span>{text}</span>
      </div>
    </div>
  )
}
