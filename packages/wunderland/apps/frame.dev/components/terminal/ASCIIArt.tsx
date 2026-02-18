/**
 * ASCII Art Component - Retro terminal decorations
 * @module terminal/ASCIIArt
 * 
 * @remarks
 * Collection of ASCII art patterns and decorations:
 * - Headers and banners
 * - Box frames
 * - Separators
 * - Logo art
 * - Animated patterns
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import clsx from 'clsx'

interface ASCIIArtProps {
  /** Art type */
  type: 'logo' | 'header' | 'frame' | 'separator' | 'pattern' | 'banner'
  /** Text content (for headers/banners) */
  text?: string
  /** Animation */
  animated?: boolean
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Color style */
  variant?: 'default' | 'accent' | 'dim' | 'rainbow'
  /** Additional classes */
  className?: string
  /** Children (for frames) */
  children?: React.ReactNode
}

// ASCII patterns
const patterns = {
  frameCodex: `
╔═══════════════════════════════════════════════════════════════════════╗
║  ▄████▄   ▒█████  ▓█████▄ ▓█████ ▒██   ██▒                         ║
║ ▒██▀ ▀█  ▒██▒  ██▒▒██▀ ██▌▓█   ▀ ▒▒ █ █ ▒░                         ║
║ ▒▓█    ▄ ▒██░  ██▒░██   █▌▒███   ░░  █   ░                         ║
║ ▒▓▓▄ ▄██▒▒██   ██░░▓█▄   ▌▒▓█  ▄  ░ █ █ ▒                          ║
║ ▒ ▓███▀ ░░ ████▓▒░░▒████▓ ░▒████▒▒██▒ ▒██▒                         ║
║ ░ ░▒ ▒  ░░ ▒░▒░▒░  ▒▒▓  ▒ ░░ ▒░ ░▒▒ ░ ░▓ ░                         ║
║   ░  ▒     ░ ▒ ▒░  ░ ▒  ▒  ░ ░  ░░░   ░▒ ░                         ║
╚═══════════════════════════════════════════════════════════════════════╝`,
  
  logoFrame: `
    ╔══════════════════════════════════════════╗
    ║   _____ ___    _   __  __ _____         ║
    ║  |  ___|  _ \\ / \\ |  \\/  | ____|        ║
    ║  | |_  | |_) / _ \\| |\\/| |  _|          ║
    ║  |  _| |  _ / ___ \\ |  | | |___         ║
    ║  |_|   |_| /_/   \\_\\_|  |_|_____|       ║
    ║                                          ║
    ╚══════════════════════════════════════════╝`,
  
  simpleFrame: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  
  doubleFrame: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  
  singleFrame: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  
  heavyFrame: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
  },
  
  separators: {
    single: '────────────────────────────────────────',
    double: '════════════════════════════════════════',
    dotted: '········································',
    dashed: '----------------------------------------',
    wave: '～～～～～～～～～～～～～～～～～～～～',
    zigzag: '∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨∧∨',
  },
}

/**
 * ASCII art decorations for terminal theme
 */
export default function ASCIIArt({
  type,
  text = 'FRAME CODEX',
  animated = false,
  size = 'md',
  variant = 'default',
  className,
  children,
}: ASCIIArtProps) {
  const { theme } = useTheme()
  const isTerminal = theme?.includes('terminal')
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (animated) {
      const interval = setInterval(() => {
        setFrame(prev => (prev + 1) % 4)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [animated])

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const variantClasses = {
    default: 'text-terminal-text',
    accent: 'text-terminal-accent',
    dim: 'text-terminal-text-dim opacity-50',
    rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent',
  }

  if (!isTerminal) return null

  switch (type) {
    case 'logo':
      return <LogoArt size={size} variant={variant} animated={animated} className={className} />
    
    case 'header':
      return <HeaderArt text={text} size={size} variant={variant} className={className} />
    
    case 'frame':
      return <FrameArt size={size} variant={variant} className={className}>{children}</FrameArt>
    
    case 'separator':
      return <SeparatorArt size={size} variant={variant} animated={animated} frame={frame} className={className} />
    
    case 'banner':
      return <BannerArt text={text} size={size} variant={variant} className={className} />
    
    case 'pattern':
      return <PatternArt size={size} variant={variant} animated={animated} className={className} />
    
    default:
      return null
  }
}

/**
 * Quarry Codex logo in ASCII
 */
function LogoArt({ size, variant, animated, className }: Omit<ASCIIArtProps, 'type'>) {
  return (
    <motion.pre
      className={clsx(
        'font-mono whitespace-pre overflow-hidden',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        variant === 'default' && 'text-terminal-text',
        variant === 'accent' && 'text-terminal-accent',
        variant === 'dim' && 'text-terminal-text-dim opacity-50',
        className
      )}
      initial={animated ? { opacity: 0 } : undefined}
      animate={animated ? { opacity: [0, 1, 1, 0.7] } : undefined}
      transition={animated ? { duration: 2, repeat: Infinity } : undefined}
    >
{`╔═══════════════════════════════════════════════╗
║   _____ ___    _   __  __ _____              ║
║  |  ___|  _ \\ / \\ |  \\/  | ____|             ║
║  | |_  | |_) / _ \\| |\\/| |  _|               ║
║  |  _| |  _ / ___ \\ |  | | |___              ║
║  |_|   |_| /_/   \\_\\_|  |_|_____|            ║
║                                               ║
║    C O D E X   K N O W L E D G E   B A S E    ║
╚═══════════════════════════════════════════════╝`}
    </motion.pre>
  )
}

/**
 * ASCII header/title
 */
function HeaderArt({ text = '', size, variant, className }: Omit<ASCIIArtProps, 'type'>) {
  const chars = patterns.doubleFrame
  const padding = 4
  const width = text.length + padding * 2
  
  const top = chars.topLeft + chars.horizontal.repeat(width) + chars.topRight
  const middle = `${chars.vertical}${' '.repeat(padding)}${text}${' '.repeat(padding)}${chars.vertical}`
  const bottom = chars.bottomLeft + chars.horizontal.repeat(width) + chars.bottomRight
  
  return (
    <pre className={clsx(
      'font-mono whitespace-pre inline-block',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base',
      variant === 'default' && 'text-terminal-text',
      variant === 'accent' && 'text-terminal-accent',
      variant === 'dim' && 'text-terminal-text-dim opacity-50',
      className
    )}>
{`${top}
${middle}
${bottom}`}
    </pre>
  )
}

/**
 * ASCII frame around content
 */
function FrameArt({ children, size, variant, className }: Omit<ASCIIArtProps, 'type' | 'text'>) {
  return (
    <div className={clsx(
      'ascii-frame relative p-4',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base',
      variant === 'default' && 'text-terminal-text',
      variant === 'accent' && 'text-terminal-accent',
      variant === 'dim' && 'text-terminal-text-dim opacity-50',
      className
    )}>
      {children}
    </div>
  )
}

/**
 * ASCII separator lines
 */
function SeparatorArt({ size, variant, animated, frame = 0, className }: Omit<ASCIIArtProps, 'type'> & { frame?: number }) {
  const separatorTypes = Object.keys(patterns.separators) as Array<keyof typeof patterns.separators>
  const currentSeparator = animated 
    ? patterns.separators[separatorTypes[frame % separatorTypes.length]]
    : patterns.separators.double
  
  return (
    <div className={clsx(
      'font-mono whitespace-pre overflow-hidden',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base',
      variant === 'default' && 'text-terminal-text',
      variant === 'accent' && 'text-terminal-accent',
      variant === 'dim' && 'text-terminal-text-dim opacity-50',
      className
    )}>
      {currentSeparator}
    </div>
  )
}

/**
 * ASCII banner with large text
 */
function BannerArt({ text = 'FRAME', size, variant, className }: Omit<ASCIIArtProps, 'type'>) {
  // Simple ASCII banner font (can be expanded)
  const asciiLetters: Record<string, string[]> = {
    'F': [
      '███████╗',
      '██╔════╝',
      '█████╗  ',
      '██╔══╝  ',
      '██║     ',
      '╚═╝     '
    ],
    'R': [
      '██████╗ ',
      '██╔══██╗',
      '██████╔╝',
      '██╔══██╗',
      '██║  ██║',
      '╚═╝  ╚═╝'
    ],
    'A': [
      ' █████╗ ',
      '██╔══██╗',
      '███████║',
      '██╔══██║',
      '██║  ██║',
      '╚═╝  ╚═╝'
    ],
    'M': [
      '███╗   ███╗',
      '████╗ ████║',
      '██╔████╔██║',
      '██║╚██╔╝██║',
      '██║ ╚═╝ ██║',
      '╚═╝     ╚═╝'
    ],
    'E': [
      '███████╗',
      '██╔════╝',
      '█████╗  ',
      '██╔══╝  ',
      '███████╗',
      '╚══════╝'
    ],
  }
  
  const letters = text.toUpperCase().split('')
  const lines = Array.from({ length: 6 }, (_, i) => 
    letters.map(letter => asciiLetters[letter]?.[i] || '        ').join(' ')
  )
  
  return (
    <pre className={clsx(
      'font-mono whitespace-pre',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base',
      variant === 'default' && 'text-terminal-text',
      variant === 'accent' && 'text-terminal-accent terminal-text',
      variant === 'dim' && 'text-terminal-text-dim opacity-50',
      variant === 'rainbow' && 'bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 bg-clip-text text-transparent',
      className
    )}>
{lines.join('\n')}
    </pre>
  )
}

/**
 * Animated ASCII patterns
 */
function PatternArt({ size, variant, animated, className }: Omit<ASCIIArtProps, 'type'>) {
  const [pattern, setPattern] = useState('')
  
  useEffect(() => {
    if (animated) {
      const chars = ['░', '▒', '▓', '█']
      const interval = setInterval(() => {
        const rows = 5
        const cols = 40
        let newPattern = ''
        
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            newPattern += chars[Math.floor(Math.random() * chars.length)]
          }
          if (i < rows - 1) newPattern += '\n'
        }
        
        setPattern(newPattern)
      }, 200)
      
      return () => clearInterval(interval)
    } else {
      setPattern(`░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░
▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒
█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓
▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█`)
    }
  }, [animated])
  
  return (
    <pre className={clsx(
      'font-mono whitespace-pre',
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base',
      variant === 'default' && 'text-terminal-text',
      variant === 'accent' && 'text-terminal-accent',
      variant === 'dim' && 'text-terminal-text-dim opacity-20',
      className
    )}>
{pattern}
    </pre>
  )
}

/**
 * ASCII box drawing utilities
 */
export function drawBox(content: string[], style: 'single' | 'double' | 'heavy' = 'double'): string {
  const chars = patterns[`${style}Frame`]
  const maxWidth = Math.max(...content.map(line => line.length))
  
  const lines: string[] = []
  
  // Top border
  lines.push(chars.topLeft + chars.horizontal.repeat(maxWidth + 2) + chars.topRight)
  
  // Content with side borders
  content.forEach(line => {
    const padding = maxWidth - line.length
    lines.push(`${chars.vertical} ${line}${' '.repeat(padding)} ${chars.vertical}`)
  })
  
  // Bottom border
  lines.push(chars.bottomLeft + chars.horizontal.repeat(maxWidth + 2) + chars.bottomRight)
  
  return lines.join('\n')
}
