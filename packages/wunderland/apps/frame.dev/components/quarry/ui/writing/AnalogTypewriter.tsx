'use client'

/**
 * AnalogTypewriter - Vintage typewriter writing experience
 * @module components/quarry/ui/writing/AnalogTypewriter
 *
 * A distraction-free writing experience with authentic analog feel:
 * - Aged paper texture with cream background
 * - Red margin line
 * - Ink ribbon effect on text
 * - Vintage typewriter sounds with bell and carriage return
 * - Animated carriage position indicator
 * - Paper curl/shadow effects
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTypewriterSounds, type SoundVariant } from '@/lib/audio/typewriterSounds'

// ============================================================================
// TYPES
// ============================================================================

export type PaperStyle = 'aged' | 'onionskin' | 'modern' | 'terminal'
export type InkStyle = 'ribbon' | 'fresh' | 'faded'

export interface AnalogTypewriterProps {
  /** Initial content */
  initialContent?: string
  /** Placeholder text */
  placeholder?: string
  /** Called when content changes */
  onChange?: (content: string) => void
  /** Called on blur/exit */
  onBlur?: () => void
  /** Paper style */
  paperStyle?: PaperStyle
  /** Ink effect style */
  inkStyle?: InkStyle
  /** Whether sounds are enabled */
  soundsEnabled?: boolean
  /** Sound volume (0-1) */
  soundVolume?: number
  /** Enable margin bell near line end */
  marginBellEnabled?: boolean
  /** Margin position (characters from start) */
  marginPosition?: number
  /** Show carriage position indicator */
  showCarriage?: boolean
  /** Focus mode - dim non-current lines */
  focusMode?: boolean
  /** Auto-focus on mount */
  autoFocus?: boolean
  /** Custom class name */
  className?: string
}

// ============================================================================
// PAPER TEXTURE STYLES
// ============================================================================

const PAPER_STYLES: Record<PaperStyle, {
  bg: string
  texture: string
  text: string
  margin: string
  shadow: string
}> = {
  aged: {
    bg: '#F5F0E1', // Warm cream
    texture: `
      radial-gradient(ellipse at 80% 20%, rgba(139,90,43,0.03) 0%, transparent 50%),
      radial-gradient(ellipse at 20% 80%, rgba(139,90,43,0.02) 0%, transparent 50%),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 28px,
        rgba(0,0,0,0.015) 28px,
        rgba(0,0,0,0.015) 29px
      )
    `,
    text: '#1a1a2e',
    margin: 'rgba(220,53,69,0.25)',
    shadow: 'inset 0 0 60px rgba(139,90,43,0.08), inset 0 0 120px rgba(0,0,0,0.03)',
  },
  onionskin: {
    bg: '#FAFAF5', // Slightly translucent off-white
    texture: `
      linear-gradient(90deg, rgba(0,0,0,0.01) 1px, transparent 1px),
      linear-gradient(rgba(0,0,0,0.01) 1px, transparent 1px)
    `,
    text: '#2c2c2c',
    margin: 'rgba(220,53,69,0.2)',
    shadow: 'inset 0 0 40px rgba(0,0,0,0.02)',
  },
  modern: {
    bg: '#FFFFFF',
    texture: 'none',
    text: '#1a1a1a',
    margin: 'rgba(99,102,241,0.2)',
    shadow: 'none',
  },
  terminal: {
    bg: '#0a0a0a',
    texture: `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,255,0,0.02) 2px,
        rgba(0,255,0,0.02) 4px
      )
    `,
    text: '#00ff00',
    margin: 'rgba(0,255,0,0.15)',
    shadow: 'inset 0 0 100px rgba(0,255,0,0.05)',
  },
}

// ============================================================================
// INK EFFECT STYLES
// ============================================================================

const INK_STYLES: Record<InkStyle, string> = {
  ribbon: `
    color: transparent;
    background-clip: text;
    -webkit-background-clip: text;
    background-image: linear-gradient(
      180deg,
      #1a1a2e 0%,
      #16161a 30%,
      #1a1a2e 70%,
      #16161a 100%
    );
    text-shadow:
      0.3px 0.3px 0 rgba(0,0,0,0.2),
      -0.2px 0 0 rgba(50,50,80,0.15);
  `,
  fresh: `
    color: #0a0a0a;
    text-shadow: none;
  `,
  faded: `
    color: #4a4a4a;
    opacity: 0.8;
    filter: blur(0.2px);
  `,
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AnalogTypewriter({
  initialContent = '',
  placeholder = 'Begin typing...',
  onChange,
  onBlur,
  paperStyle = 'aged',
  inkStyle = 'ribbon',
  soundsEnabled = true,
  soundVolume = 0.4,
  marginBellEnabled = true,
  marginPosition = 70,
  showCarriage = true,
  focusMode = false,
  autoFocus = true,
  className,
}: AnalogTypewriterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(initialContent)
  const [cursorColumn, setCursorColumn] = useState(0)
  const [currentLine, setCurrentLine] = useState(0)
  const [bellPlayed, setBellPlayed] = useState(false)

  // Typewriter sounds with vintage variant
  const {
    playForKey,
    setEnabled,
    setVolume,
    enabled: soundsOn,
    initialized: soundsInitialized,
  } = useTypewriterSounds({
    enabled: soundsEnabled,
    volume: soundVolume,
    variant: 'mechanical' as SoundVariant,
  })

  // Get paper style
  const paper = PAPER_STYLES[paperStyle]

  // Spring animation for carriage position
  const carriageX = useSpring(0, { stiffness: 500, damping: 30 })
  const charWidth = 9.6 // Approximate character width for monospace font

  // Update carriage position when cursor moves
  useEffect(() => {
    carriageX.set(cursorColumn * charWidth)
  }, [cursorColumn, carriageX])

  // Update sound settings
  useEffect(() => {
    setEnabled(soundsEnabled)
    setVolume(soundVolume)
  }, [soundsEnabled, soundVolume, setEnabled, setVolume])

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [autoFocus])

  // Sync content when parent changes
  const lastParentContent = useRef(initialContent)
  useEffect(() => {
    if (initialContent !== lastParentContent.current) {
      setContent(initialContent)
      lastParentContent.current = initialContent
    }
  }, [initialContent])

  // Play margin bell sound
  const playMarginBell = useCallback(() => {
    if (!soundsOn || !marginBellEnabled || bellPlayed) return

    // Create bell sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(2000, audioContext.currentTime) // High bell tone
    gainNode.gain.setValueAtTime(soundVolume * 0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)

    setBellPlayed(true)
  }, [soundsOn, marginBellEnabled, bellPlayed, soundVolume])

  // Play carriage return sound
  const playCarriageReturn = useCallback(() => {
    if (!soundsOn) return

    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    // Slide sound (low frequency sweep)
    const slideOsc = audioContext.createOscillator()
    const slideGain = audioContext.createGain()
    slideOsc.connect(slideGain)
    slideGain.connect(audioContext.destination)
    slideOsc.type = 'sawtooth'
    slideOsc.frequency.setValueAtTime(200, audioContext.currentTime)
    slideOsc.frequency.linearRampToValueAtTime(80, audioContext.currentTime + 0.15)
    slideGain.gain.setValueAtTime(soundVolume * 0.15, audioContext.currentTime)
    slideGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2)
    slideOsc.start(audioContext.currentTime)
    slideOsc.stop(audioContext.currentTime + 0.2)

    // Clunk sound at end
    setTimeout(() => {
      const clunkOsc = audioContext.createOscillator()
      const clunkGain = audioContext.createGain()
      clunkOsc.connect(clunkGain)
      clunkGain.connect(audioContext.destination)
      clunkOsc.type = 'triangle'
      clunkOsc.frequency.setValueAtTime(150, audioContext.currentTime)
      clunkGain.gain.setValueAtTime(soundVolume * 0.25, audioContext.currentTime)
      clunkGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
      clunkOsc.start(audioContext.currentTime)
      clunkOsc.stop(audioContext.currentTime + 0.1)
    }, 100)
  }, [soundsOn, soundVolume])

  // Handle content change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      const textarea = e.target

      // Calculate cursor position
      const cursorPos = textarea.selectionStart
      const textBeforeCursor = newContent.substring(0, cursorPos)
      const lines = textBeforeCursor.split('\n')
      const currentLineText = lines[lines.length - 1]
      const newCursorColumn = currentLineText.length
      const newCurrentLine = lines.length - 1

      // Check for line change (carriage return)
      if (newCurrentLine > currentLine) {
        playCarriageReturn()
        setBellPlayed(false) // Reset bell for new line
      }

      // Check for margin bell
      if (newCursorColumn >= marginPosition - 5 && newCursorColumn < marginPosition) {
        playMarginBell()
      }

      setCursorColumn(newCursorColumn)
      setCurrentLine(newCurrentLine)
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange, currentLine, marginPosition, playCarriageReturn, playMarginBell]
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

  // Handle cursor position changes
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = textarea.value.substring(0, cursorPos)
    const lines = textBeforeCursor.split('\n')
    const currentLineText = lines[lines.length - 1]
    setCursorColumn(currentLineText.length)
    setCurrentLine(lines.length - 1)
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full min-h-[400px] overflow-hidden',
        'transition-colors duration-300',
        className
      )}
      style={{
        backgroundColor: paper.bg,
        backgroundImage: paper.texture,
        boxShadow: paper.shadow,
      }}
    >
      {/* Paper edge effects */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(0,0,0,0.03) 0%, transparent 2%),
            linear-gradient(to left, rgba(0,0,0,0.03) 0%, transparent 2%),
            linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, transparent 3%)
          `,
        }}
      />

      {/* Red margin line */}
      <div
        className="absolute top-0 bottom-0 w-px pointer-events-none"
        style={{
          left: `calc(${marginPosition}ch + 2rem)`,
          backgroundColor: paper.margin,
        }}
      />

      {/* Carriage position indicator */}
      {showCarriage && (
        <motion.div
          className="absolute top-4 h-1 rounded-full pointer-events-none z-10"
          style={{
            x: carriageX,
            left: '2rem',
            width: '2px',
            backgroundColor: paperStyle === 'terminal' ? '#00ff00' : '#dc3545',
            boxShadow: paperStyle === 'terminal'
              ? '0 0 8px rgba(0,255,0,0.5)'
              : '0 0 4px rgba(220,53,69,0.3)',
          }}
        />
      )}

      {/* Main textarea */}
      <div className="absolute inset-0 flex items-start justify-center overflow-auto">
        <div className="w-full max-w-4xl px-8 py-12">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelect}
            onClick={handleSelect}
            onBlur={onBlur}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="sentences"
            autoCorrect="off"
            className={cn(
              'analog-typewriter-textarea',
              'w-full min-h-[60vh] resize-none border-none outline-none bg-transparent',
              'font-mono text-lg leading-loose',
              'transition-colors duration-200',
              'touch-manipulation',
              // Focus mode styling
              focusMode && 'focus-mode-active'
            )}
            style={{
              color: paper.text,
              caretColor: paperStyle === 'terminal' ? '#00ff00' : '#dc3545',
              fontSize: 'max(16px, 1.125rem)',
              lineHeight: '1.8',
              letterSpacing: '0.02em',
            }}
          />
        </div>
      </div>

      {/* Ink effect and focus mode styles */}
      <style jsx global>{`
        .analog-typewriter-textarea {
          ${inkStyle === 'ribbon' ? INK_STYLES.ribbon : ''}
          ${inkStyle === 'faded' ? INK_STYLES.faded : ''}
        }

        .analog-typewriter-textarea::selection {
          background-color: ${paperStyle === 'terminal'
            ? 'rgba(0,255,0,0.3)'
            : 'rgba(220,53,69,0.2)'};
        }

        .analog-typewriter-textarea::placeholder {
          color: ${paperStyle === 'terminal'
            ? 'rgba(0,255,0,0.4)'
            : 'rgba(0,0,0,0.3)'};
          font-style: italic;
        }

        /* Focus mode - dim non-current paragraphs */
        .analog-typewriter-textarea.focus-mode-active {
          /* Handled via component state if needed */
        }

        /* Blinking cursor animation */
        @keyframes typewriter-cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Paper aging effect for aged style */
        ${paperStyle === 'aged' ? `
          .analog-typewriter-textarea {
            text-rendering: geometricPrecision;
          }
        ` : ''}
      `}</style>
    </div>
  )
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export function AnalogTypewriterCompact(props: Omit<AnalogTypewriterProps, 'showCarriage'>) {
  return <AnalogTypewriter {...props} showCarriage={false} />
}
