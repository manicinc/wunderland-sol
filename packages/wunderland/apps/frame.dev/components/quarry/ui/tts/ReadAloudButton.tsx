/**
 * Read Aloud Button Component
 * @module codex/ui/ReadAloudButton
 * 
 * @remarks
 * Simple button to trigger text-to-speech for content sections.
 */

'use client'

import React from 'react'
import { Volume2 } from 'lucide-react'

interface ReadAloudButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  theme?: string
}

/**
 * Read aloud button for triggering TTS
 */
export default function ReadAloudButton({
  onClick,
  disabled = false,
  className = '',
  theme = 'light',
}: ReadAloudButtonProps) {
  const isTerminal = theme?.includes('terminal')
  const isSepia = theme?.includes('sepia')
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium
        transition-all duration-200
        ${isTerminal
          ? 'bg-black border border-green-500 text-green-400 hover:bg-green-950'
          : isSepia
          ? 'bg-amber-50 border border-amber-700 text-amber-900 hover:bg-amber-100'
          : 'bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title="Read aloud"
      aria-label="Read aloud"
    >
      <Volume2 className="w-3 h-3" />
      <span>Read Aloud</span>
    </button>
  )
}

