/**
 * Keyboard Navigation Indicator
 * @module codex/ui/KeyboardNavigationIndicator
 * 
 * @remarks
 * Shows when keyboard navigation is active
 * Displays current mode and available shortcuts
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, Check, X } from 'lucide-react'

interface KeyboardNavigationIndicatorProps {
  isActive: boolean
  mode?: 'sidebar' | 'content' | 'metadata' | 'modal'
  theme?: string
}

export default function KeyboardNavigationIndicator({
  isActive,
  mode = 'content',
  theme = 'light',
}: KeyboardNavigationIndicatorProps) {
  const [show, setShow] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')

  // Show indicator on first load, then hide after interaction
  useEffect(() => {
    const hasSeenIndicator = localStorage.getItem('keyboard-nav-seen')
    if (!hasSeenIndicator && !hasInteracted) {
      setShow(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShow(false)
        localStorage.setItem('keyboard-nav-seen', 'true')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [hasInteracted])

  // Show when keyboard is used
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'j', 'k', 'h', 'l'].includes(e.key.toLowerCase())) {
        setShow(true)
        setHasInteracted(true)
        // Hide after 2 seconds of inactivity
        setTimeout(() => setShow(false), 2000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const modeLabels = {
    sidebar: 'Navigating Files',
    content: 'Reading Content',
    metadata: 'Viewing Metadata',
    modal: 'Modal Active',
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-[300]
            px-4 py-3 rounded-full shadow-2xl
            flex items-center gap-3
            ${isDark ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-300'}
            ${isTerminal ? 'bg-black border-cyan-500' : ''}
          `}
        >
          {/* Icon */}
          <div className={`
            p-2 rounded-lg
            ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}
            ${isTerminal ? 'bg-black border border-cyan-500' : ''}
          `}>
            <Keyboard className={`
              w-4 h-4
              ${isTerminal ? 'text-cyan-500' : 'text-cyan-600 dark:text-cyan-400'}
            `} />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full animate-pulse
              ${isActive 
                ? 'bg-green-500' 
                : 'bg-gray-400'
              }
            `} />
            <span className={`
              text-sm font-medium
              ${isTerminal ? 'text-cyan-500' : ''}
            `}>
              {isActive ? (
                <>
                  {isActive ? <Check className="w-3 h-3 inline mr-1 text-green-500" /> : <X className="w-3 h-3 inline mr-1 text-gray-400" />}
                  {modeLabels[mode]}
                </>
              ) : (
                'Keyboard Nav Disabled'
              )}
            </span>
          </div>

          {/* Quick tips */}
          {isActive && (
            <div className={`
              pl-3 ml-3 border-l text-xs
              ${isDark ? 'border-gray-700' : 'border-gray-300'}
              ${isTerminal ? 'border-cyan-500 text-amber-500' : 'text-gray-600'}
            `}>
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              navigate •{' '}
              <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono text-[10px]">
                k
              </kbd>{' '}
              shortcuts
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

