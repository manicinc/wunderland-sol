/**
 * TypewriterMode - Pure Freeform Typewriter Editor
 * @module components/quarry/ui/TypewriterMode
 *
 * A distraction-free writing experience with:
 * - Monospace font, minimal UI
 * - Optional typewriter sound effects
 * - Cursor-centered scrolling
 * - Auto-save support
 */

'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTypewriterSounds, type SoundVariant } from '@/lib/audio/typewriterSounds'

// ============================================================================
// TYPES
// ============================================================================

export interface TypewriterModeProps {
  /** Initial content */
  initialContent?: string
  /** Placeholder text */
  placeholder?: string
  /** Called when content changes */
  onChange?: (content: string) => void
  /** Called on blur/exit */
  onBlur?: () => void
  /** Whether sounds are enabled by default */
  soundsEnabled?: boolean
  /** Sound variant */
  soundVariant?: SoundVariant
  /** Sound volume (0-1) */
  soundVolume?: number
  /** Whether to center-align text */
  centerText?: boolean
  /** Theme */
  isDark?: boolean
  /** Custom font family */
  fontFamily?: 'mono' | 'serif' | 'sans'
  /** Font size */
  fontSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Auto-focus on mount */
  autoFocus?: boolean
  /** Focus mode - dims non-current lines */
  focusMode?: boolean
  /** Class name */
  className?: string
}

// ============================================================================
// FONT CONFIGURATIONS
// ============================================================================

const FONT_FAMILIES = {
  mono: 'font-mono',
  serif: 'font-serif',
  sans: 'font-sans',
}

// Responsive font sizes: smaller on mobile, larger on desktop
const FONT_SIZES = {
  sm: 'text-sm sm:text-base leading-relaxed',
  md: 'text-base sm:text-lg leading-relaxed',
  lg: 'text-lg sm:text-xl leading-relaxed sm:leading-loose',
  xl: 'text-xl sm:text-2xl leading-relaxed sm:leading-loose',
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TypewriterMode({
  initialContent = '',
  placeholder = 'Start writing...',
  onChange,
  onBlur,
  soundsEnabled = true,
  soundVariant = 'mechanical',
  soundVolume = 0.3,
  centerText = false,
  isDark = true,
  fontFamily = 'mono',
  fontSize = 'lg',
  autoFocus = true,
  focusMode: initialFocusMode = false,
  className = '',
}: TypewriterModeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialContent)

  // Track last parent content to detect external changes (e.g., mode switch)
  const lastParentContent = useRef(initialContent)

  // Sync content when parent changes (fixes mode switching bug)
  useEffect(() => {
    if (initialContent !== lastParentContent.current) {
      setContent(initialContent)
      lastParentContent.current = initialContent
    }
  }, [initialContent])

  // Typewriter sounds
  const {
    playForKey,
    setEnabled,
    setVolume,
    setVariant,
    enabled: soundsOn,
    initialized: soundsInitialized,
  } = useTypewriterSounds({
    enabled: soundsEnabled,
    volume: soundVolume,
    variant: soundVariant,
  })

  // Update sound settings when props change
  useEffect(() => {
    setEnabled(soundsEnabled)
    setVolume(soundVolume)
    setVariant(soundVariant)
  }, [soundsEnabled, soundVolume, soundVariant, setEnabled, setVolume, setVariant])

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [autoFocus])

  // Handle content change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange]
  )

  // Handle keydown for sound effects
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (soundsOn && soundsInitialized) {
        playForKey(e.nativeEvent)
      }
    },
    [soundsOn, soundsInitialized, playForKey]
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[300px] sm:min-h-[400px] overflow-hidden',
        isDark ? 'bg-zinc-950' : 'bg-zinc-50',
        className
      )}
    >
      {/* Main textarea - clean writing surface */}
      <div className="absolute inset-0 flex items-start justify-center overflow-auto">
        <div
          className={cn(
            'w-full max-w-3xl',
            // Responsive padding: smaller on mobile, larger on desktop
            'px-4 py-8 sm:px-8 sm:py-16',
            centerText ? 'text-center' : 'text-left'
          )}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="sentences"
            autoCorrect="off"
            className={cn(
              'typewriter-textarea',
              // Responsive min-height: smaller on mobile
              'w-full min-h-[50vh] sm:min-h-[60vh] resize-none border-none outline-none bg-transparent',
              FONT_FAMILIES[fontFamily],
              FONT_SIZES[fontSize],
              isDark ? 'text-zinc-200 placeholder:text-zinc-700' : 'text-zinc-800 placeholder:text-zinc-400',
              'transition-colors duration-200',
              // Touch-friendly on mobile
              'touch-manipulation'
            )}
            style={{
              caretColor: isDark ? '#f59e0b' : '#d97706', // Amber caret
              // Prevent zoom on iOS when focusing input
              fontSize: 'max(16px, 1em)',
            }}
          />
        </div>
      </div>

      {/* Selection highlight style */}
      <style jsx global>{`
        .typewriter-textarea::selection {
          background-color: ${isDark ? 'rgba(245,158,11,0.3)' : 'rgba(217,119,6,0.3)'};
        }

        @keyframes typewriter-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export function TypewriterModeCompact(props: Omit<TypewriterModeProps, 'fontSize'>) {
  return <TypewriterMode {...props} fontSize="md" />
}
