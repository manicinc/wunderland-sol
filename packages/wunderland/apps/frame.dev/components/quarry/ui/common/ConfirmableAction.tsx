/**
 * Confirmable Action Component
 * Two-step confirmation button for destructive actions
 *
 * @module codex/ui/ConfirmableAction
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, AlertTriangle } from 'lucide-react'

export type ConfirmableVariant = 'danger' | 'warning' | 'default'

export interface ConfirmableActionProps {
  /** Callback when action is confirmed */
  onConfirm: () => Promise<void>
  /** Icon to show in default state */
  icon?: React.ElementType
  /** Icon to show in confirm state (default: AlertTriangle) */
  confirmIcon?: React.ElementType
  /** Label for default state */
  label?: string
  /** Label for confirm state */
  confirmLabel?: string
  /** Visual variant */
  variant?: ConfirmableVariant
  /** Dark theme */
  isDark?: boolean
  /** Auto-reset timeout in ms (default: 3000) */
  timeout?: number
  /** Disable the button */
  disabled?: boolean
  /** Additional class name */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show as icon-only button */
  iconOnly?: boolean
  /** Title/tooltip text */
  title?: string
}

type ActionState = 'idle' | 'confirming' | 'executing' | 'success' | 'error'

const VARIANT_STYLES: Record<ConfirmableVariant, {
  idle: { light: string; dark: string }
  confirming: { light: string; dark: string }
  executing: { light: string; dark: string }
}> = {
  danger: {
    idle: {
      light: 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
      dark: 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border-red-800',
    },
    confirming: {
      light: 'bg-red-500 text-white border-red-600 animate-pulse',
      dark: 'bg-red-600 text-white border-red-500 animate-pulse',
    },
    executing: {
      light: 'bg-red-100 text-red-500 border-red-300',
      dark: 'bg-red-900/50 text-red-400 border-red-700',
    },
  },
  warning: {
    idle: {
      light: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200',
      dark: 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border-amber-800',
    },
    confirming: {
      light: 'bg-amber-500 text-white border-amber-600 animate-pulse',
      dark: 'bg-amber-600 text-white border-amber-500 animate-pulse',
    },
    executing: {
      light: 'bg-amber-100 text-amber-500 border-amber-300',
      dark: 'bg-amber-900/50 text-amber-400 border-amber-700',
    },
  },
  default: {
    idle: {
      light: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200',
      dark: 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border-zinc-700',
    },
    confirming: {
      light: 'bg-zinc-600 text-white border-zinc-700 animate-pulse',
      dark: 'bg-zinc-500 text-white border-zinc-400 animate-pulse',
    },
    executing: {
      light: 'bg-zinc-200 text-zinc-500 border-zinc-300',
      dark: 'bg-zinc-700 text-zinc-400 border-zinc-600',
    },
  },
}

const SIZE_CLASSES = {
  sm: 'px-2 py-1 text-xs gap-1 rounded-md',
  md: 'px-2.5 py-1.5 text-sm gap-1.5 rounded-lg',
  lg: 'px-3 py-2 text-sm gap-2 rounded-lg',
}

const ICON_SIZE_CLASSES = {
  sm: 'p-1 rounded-md',
  md: 'p-1.5 rounded-lg',
  lg: 'p-2 rounded-lg',
}

const ICON_SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function ConfirmableAction({
  onConfirm,
  icon: Icon,
  confirmIcon: ConfirmIcon = AlertTriangle,
  label,
  confirmLabel = 'Confirm?',
  variant = 'danger',
  isDark = false,
  timeout = 3000,
  disabled = false,
  className = '',
  size = 'md',
  iconOnly = false,
  title,
}: ConfirmableActionProps) {
  const [state, setState] = useState<ActionState>('idle')
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
    }
  }, [])

  // Auto-reset from confirming state
  useEffect(() => {
    if (state === 'confirming') {
      timeoutRef.current = setTimeout(() => {
        setState('idle')
      }, timeout)

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
      }
    }
  }, [state, timeout])

  // Auto-reset from success/error state
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      resetTimeoutRef.current = setTimeout(() => {
        setState('idle')
        setError(null)
      }, 2000)

      return () => {
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [state])

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (disabled || state === 'executing') return

    if (state === 'idle') {
      // First click - enter confirming state
      setState('confirming')
    } else if (state === 'confirming') {
      // Second click - execute action
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      setState('executing')
      setError(null)

      try {
        await onConfirm()
        setState('success')
      } catch (err) {
        setState('error')
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    }
  }, [state, disabled, onConfirm])

  // Handle keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    } else if (e.key === 'Escape' && state === 'confirming') {
      e.preventDefault()
      setState('idle')
    }
  }, [handleClick, state])

  // Get current styles
  const getStyles = () => {
    const variantStyles = VARIANT_STYLES[variant]
    const theme = isDark ? 'dark' : 'light'

    switch (state) {
      case 'confirming':
        return variantStyles.confirming[theme]
      case 'executing':
        return variantStyles.executing[theme]
      case 'success':
        return isDark
          ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700'
          : 'bg-emerald-100 text-emerald-600 border-emerald-300'
      case 'error':
        return isDark
          ? 'bg-red-900/50 text-red-400 border-red-700'
          : 'bg-red-100 text-red-600 border-red-300'
      default:
        return variantStyles.idle[theme]
    }
  }

  // Get current icon
  const getCurrentIcon = () => {
    switch (state) {
      case 'confirming':
        return ConfirmIcon
      case 'executing':
        return Loader2
      case 'success':
        return Check
      default:
        return Icon
    }
  }

  // Get current label
  const getCurrentLabel = () => {
    switch (state) {
      case 'confirming':
        return confirmLabel
      case 'executing':
        return 'Working...'
      case 'success':
        return 'Done!'
      case 'error':
        return error || 'Failed'
      default:
        return label
    }
  }

  const CurrentIcon = getCurrentIcon()
  const currentLabel = getCurrentLabel()
  const iconSizeClass = ICON_SIZES[size]

  return (
    <motion.button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || state === 'executing'}
      className={`
        inline-flex items-center justify-center font-medium
        border transition-all touch-manipulation
        ${iconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size]}
        ${getStyles()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={title || (state === 'confirming' ? 'Click again to confirm' : label)}
      whileHover={!disabled && state !== 'executing' ? { scale: 1.05 } : undefined}
      whileTap={!disabled && state !== 'executing' ? { scale: 0.95 } : undefined}
      aria-label={currentLabel || title}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-inherit"
        >
          {CurrentIcon && (
            <CurrentIcon
              className={`
                ${iconSizeClass}
                ${state === 'executing' ? 'animate-spin' : ''}
              `}
            />
          )}
          {!iconOnly && currentLabel && (
            <span>{currentLabel}</span>
          )}
        </motion.span>
      </AnimatePresence>

      {/* Progress indicator for timeout */}
      {state === 'confirming' && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-white/50 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: timeout / 1000, ease: 'linear' }}
        />
      )}
    </motion.button>
  )
}

export default ConfirmableAction
