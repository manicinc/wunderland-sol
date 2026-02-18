/**
 * Terminal Button - 80s/90s style analog button component
 * @module terminal/TerminalButton
 * 
 * @remarks
 * Recreates the feel of physical CRT monitor buttons with:
 * - 3D beveled edges
 * - Physical press animation
 * - LED indicator lights
 * - Phosphor glow effects
 * - Optional click sound
 */

'use client'

import React, { useCallback, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useTheme } from 'next-themes'
import clsx from 'clsx'

interface TerminalButtonProps {
  /** Button content */
  children: React.ReactNode
  /** Click handler */
  onClick?: () => void
  /** Button variant */
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Disabled state */
  disabled?: boolean
  /** LED indicator */
  led?: boolean
  /** LED color */
  ledColor?: 'red' | 'green' | 'amber' | 'blue'
  /** LED state */
  ledOn?: boolean
  /** Sound effect on click */
  soundEnabled?: boolean
  /** Loading state */
  loading?: boolean
  /** Full width */
  fullWidth?: boolean
  /** Additional classes */
  className?: string
  /** Icon before text */
  icon?: React.ReactNode
  /** ASCII decoration */
  ascii?: boolean
}

/**
 * Retro-styled terminal button with analog aesthetics
 */
export default function TerminalButton({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  led = false,
  ledColor = 'green',
  ledOn = false,
  soundEnabled = true,
  loading = false,
  fullWidth = false,
  className,
  icon,
  ascii = false,
}: TerminalButtonProps) {
  const { theme } = useTheme()
  const [isPressed, setIsPressed] = useState(false)
  const controls = useAnimation()
  const isTerminal = theme?.includes('terminal')

  // Play click sound
  const playClickSound = useCallback(() => {
    if (!soundEnabled || !isTerminal) return
    
    // Create a click sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = 'square'
    gainNode.gain.value = 0.1
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.05) // 50ms beep
  }, [soundEnabled, isTerminal])

  const handleClick = () => {
    if (disabled || loading) return
    
    playClickSound()
    setIsPressed(true)
    
    // Animate button press
    controls.start({
      y: 3,
      transition: { duration: 0.1 }
    }).then(() => {
      controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 500, damping: 20 }
      })
    })
    
    setTimeout(() => setIsPressed(false), 100)
    onClick?.()
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }

  const variantClasses = {
    default: isTerminal 
      ? 'terminal-button'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    primary: isTerminal
      ? 'terminal-button primary'
      : 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: isTerminal
      ? 'terminal-button border-red-600 text-red-500'
      : 'bg-red-600 hover:bg-red-700 text-white',
    success: isTerminal
      ? 'terminal-button border-green-600 text-green-500'
      : 'bg-green-600 hover:bg-green-700 text-white',
    warning: isTerminal
      ? 'terminal-button border-amber-600 text-amber-500'
      : 'bg-amber-600 hover:bg-amber-700 text-white',
  }

  if (!isTerminal) {
    // Fallback to regular button for non-terminal themes
    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={clsx(
          'rounded-lg font-semibold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && 'w-full',
          className
        )}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    )
  }

  return (
    <motion.button
      animate={controls}
      onClick={handleClick}
      disabled={disabled || loading}
      className={clsx(
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        'relative inline-flex items-center justify-center',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isPressed && 'active',
        className
      )}
    >
      {/* LED Indicator */}
      {led && (
        <span 
          className={clsx(
            'absolute -top-1 -right-1',
            'led',
            ledColor,
            (ledOn || loading) && 'on'
          )}
          aria-hidden="true"
        />
      )}

      {/* ASCII decoration left */}
      {ascii && (
        <span className="mr-2 opacity-50" aria-hidden="true">
          {'['}
        </span>
      )}

      {/* Icon */}
      {icon && (
        <span className="mr-2 inline-flex">
          {icon}
        </span>
      )}

      {/* Loading spinner */}
      {loading ? (
        <span className="inline-flex items-center">
          <span className="mr-2" aria-hidden="true">
            {'['}
          </span>
          <span className="inline-block animate-spin">◐</span>
          <span className="ml-2" aria-hidden="true">
            {']'}
          </span>
        </span>
      ) : (
        children
      )}

      {/* ASCII decoration right */}
      {ascii && (
        <span className="ml-2 opacity-50" aria-hidden="true">
          {']'}
        </span>
      )}

      {/* Press indicator */}
      {isPressed && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            boxShadow: '0 0 20px var(--glow-color-bright)',
            border: '2px solid var(--terminal-accent)',
          }}
        />
      )}
    </motion.button>
  )
}

/**
 * Terminal button group for related actions
 */
export function TerminalButtonGroup({ 
  children,
  className,
}: { 
  children: React.ReactNode
  className?: string
}) {
  const { theme } = useTheme()
  const isTerminal = theme?.includes('terminal')

  if (!isTerminal) {
    return (
      <div className={clsx('inline-flex gap-2', className)}>
        {children}
      </div>
    )
  }

  return (
    <div className={clsx('inline-flex items-center', className)}>
      <span className="mr-2 opacity-50">{'>>'}</span>
      <div className="inline-flex gap-1">
        {React.Children.map(children, (child, index) => (
          <>
            {index > 0 && <span className="opacity-30">|</span>}
            {child}
          </>
        ))}
      </div>
      <span className="ml-2 opacity-50">{'<<'}</span>
    </div>
  )
}
