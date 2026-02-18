'use client'

/**
 * UnifiedTypewriter - Modern futuristic typewriter device
 * @module components/quarry/ui/writing/UnifiedTypewriter
 *
 * A sleek, modern writing interface designed as a premium physical device:
 * - SVG device frame with glowing borders
 * - Editable document title
 * - Theme-adaptive colors
 * - Clean, minimalist aesthetic
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useTypewriterSounds } from '@/lib/audio/typewriterSounds'
import type { ThemeName } from '@/types/theme'
import { isTerminalTheme, THEME_METADATA } from '@/types/theme'

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedTypewriterProps {
  /** Initial content */
  initialContent?: string
  /** Document title */
  title?: string
  /** Called when title changes */
  onTitleChange?: (title: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Called when content changes */
  onChange?: (content: string) => void
  /** Called on blur/exit */
  onBlur?: () => void
  /** Whether sounds are enabled */
  soundsEnabled?: boolean
  /** Sound volume (0-1) */
  soundVolume?: number
  /** Auto-focus on mount */
  autoFocus?: boolean
  /** Custom class name */
  className?: string
}

// ============================================================================
// THEME-BASED STYLING
// ============================================================================

function getThemeColors(theme: ThemeName) {
  const meta = THEME_METADATA[theme]
  const isDark = meta?.isDark ?? false
  const accent = meta?.accentColor ?? '#06B6D4'

  return {
    isDark,
    accent,
    // Frame colors
    frameBg: isDark ? '#0a0a0a' : '#fafafa',
    frameStroke: isDark ? '#27272a' : '#e4e4e7',
    frameGlow: `${accent}20`,
    // Screen colors
    screenBg: isDark ? '#09090b' : '#ffffff',
    screenBorder: isDark ? '#18181b' : '#f4f4f5',
    // Text colors
    textColor: isDark ? '#fafafa' : '#09090b',
    placeholderColor: isDark ? '#52525b' : '#a1a1aa',
    // Accent line
    accentLine: accent,
  }
}

// ============================================================================
// DEVICE FRAME SVG
// ============================================================================

function DeviceFrame({
  children,
  colors,
  title,
  onTitleChange,
}: {
  children: React.ReactNode
  colors: ReturnType<typeof getThemeColors>
  title: string
  onTitleChange?: (title: string) => void
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditedTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleClick = () => {
    setIsEditingTitle(true)
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    if (editedTitle.trim() !== title) {
      onTitleChange?.(editedTitle.trim() || 'Untitled')
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      titleInputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setEditedTitle(title)
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Minimal top bar with title */}
      <div
        className="flex-shrink-0 relative h-10 flex items-center justify-center border-b"
        style={{
          background: colors.frameBg,
          borderColor: colors.frameStroke,
        }}
      >
        {/* Document title */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className={cn(
              'bg-transparent text-center text-sm font-medium outline-none border-b px-4 py-1',
              colors.isDark ? 'text-white/80 border-white/20' : 'text-zinc-700 border-zinc-300'
            )}
            style={{ minWidth: '200px' }}
          />
        ) : (
          <button
            onClick={handleTitleClick}
            className={cn(
              'text-sm font-medium px-4 py-1 rounded-md transition-colors',
              colors.isDark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                : 'text-zinc-500 hover:text-zinc-700 hover:bg-black/5'
            )}
          >
            {title || 'Untitled'}
          </button>
        )}
      </div>

      {/* Main screen area - clean and minimal */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: colors.screenBg }}
      >
        {/* Content */}
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function UnifiedTypewriter({
  initialContent = '',
  title = 'Untitled',
  onTitleChange,
  placeholder = 'Begin typing...',
  onChange,
  onBlur,
  soundsEnabled = true,
  soundVolume = 0.4,
  autoFocus = true,
  className,
}: UnifiedTypewriterProps) {
  const { resolvedTheme } = useTheme()
  const theme = (resolvedTheme || 'dark') as ThemeName
  const colors = getThemeColors(theme)
  const isTerminal = isTerminalTheme(theme)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(initialContent)

  // Typewriter sounds
  const {
    playForKey,
    enabled: soundsOn,
    initialized: soundsInitialized,
  } = useTypewriterSounds({
    enabled: soundsEnabled,
    volume: soundVolume,
    variant: 'soft',
  })

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [autoFocus])

  // Sync content
  const lastParentContent = useRef(initialContent)
  useEffect(() => {
    if (initialContent !== lastParentContent.current) {
      setContent(initialContent)
      lastParentContent.current = initialContent
    }
  }, [initialContent])

  // Handle content change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange]
  )

  // Handle keydown for sounds
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (soundsOn && soundsInitialized) {
        playForKey(e.nativeEvent)
      }
    },
    [soundsOn, soundsInitialized, playForKey]
  )

  return (
    <div className={cn('w-full h-full', className)}>
      <DeviceFrame
        colors={colors}
        title={title}
        onTitleChange={onTitleChange}
      >
        {/* Main textarea */}
        <div className="h-full overflow-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
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
                'w-full min-h-[60vh] resize-none border-none outline-none bg-transparent',
                'text-lg leading-relaxed',
                isTerminal && 'font-mono'
              )}
              style={{
                color: colors.textColor,
                caretColor: colors.accentLine,
                fontSize: 'max(16px, 1.125rem)',
                lineHeight: '1.75',
                letterSpacing: isTerminal ? '0.05em' : '0.01em',
              }}
            />
          </div>
        </div>
      </DeviceFrame>
    </div>
  )
}
