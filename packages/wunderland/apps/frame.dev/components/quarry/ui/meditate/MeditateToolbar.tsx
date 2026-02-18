'use client'

/**
 * Meditate Toolbar
 * @module components/quarry/ui/meditate/MeditateToolbar
 * 
 * Bottom toolbar for the Focus page.
 * Always centered with hide/expand toggle.
 * Controls for sounds, timer, fullscreen, widgets, etc.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Maximize2,
  Minimize2,
  Headphones,
  Timer,
  Image as ImageIcon,
  LayoutGrid,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Monitor,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeName } from '@/types/theme'
import { isDarkTheme, getThemeCategory } from '@/types/theme'
import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import { SOUNDSCAPE_INFO } from '@/lib/audio/ambienceSounds'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type ToolbarPosition = 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface MeditateToolbarProps {
  theme: ThemeName
  isDeepFocus: boolean
  onToggleDeepFocus: () => void
  soundscape: SoundscapeType
  onSoundscapeChange: (soundscape: SoundscapeType) => void
  isPlaying: boolean
  onTogglePlay: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  /** Callback to open/focus the Pomodoro timer widget */
  onOpenTimer?: () => void
  /** Callback to open the background/theme picker */
  onOpenBackgrounds?: () => void
  /** Callback to open the widget picker/manager */
  onOpenWidgets?: () => void
  /** Callback to toggle PiP mode */
  onTogglePiP?: () => void
  /** Whether toolbar is hidden */
  isHidden?: boolean
  /** Callback to toggle hidden state */
  onToggleHidden?: (hidden: boolean) => void
  /** Position for snap-to-edges */
  position?: ToolbarPosition
  onPositionChange?: (position: ToolbarPosition) => void
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function MeditateToolbar({
  theme,
  isDeepFocus,
  onToggleDeepFocus,
  soundscape,
  onSoundscapeChange,
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  onOpenTimer,
  onOpenBackgrounds,
  onOpenWidgets,
  onTogglePiP,
  isHidden = false,
  onToggleHidden,
  position = 'bottom-center',
  onPositionChange,
  className,
}: MeditateToolbarProps) {
  const isDark = isDarkTheme(theme)
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const soundscapes: SoundscapeType[] = ['rain', 'ocean', 'forest', 'cafe', 'fireplace', 'lofi', 'white-noise']

  // Handle drag end - snap to nearest position based on screen location
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    setIsDragging(false)

    // Get viewport width and calculate snap zones (thirds of screen)
    const vw = window.innerWidth
    const cursorX = info.point.x

    // Determine snap position based on where cursor is on screen
    let newPosition: ToolbarPosition
    if (cursorX < vw * 0.33) {
      newPosition = 'bottom-left'
    } else if (cursorX > vw * 0.67) {
      newPosition = 'bottom-right'
    } else {
      newPosition = 'bottom-center'
    }

    if (newPosition !== position) {
      onPositionChange?.(newPosition)
    }
  }

  // Get position classes based on current position
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'left-4'
      case 'bottom-right':
        return 'right-4'
      default:
        return 'left-1/2 -translate-x-1/2'
    }
  }

  // Close popups on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSoundPicker) setShowSoundPicker(false)
        if (showVolume) setShowVolume(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSoundPicker, showVolume])

  // Close popups on click outside
  useEffect(() => {
    if (!showSoundPicker && !showVolume) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is inside the toolbar
      if (target.closest('[data-toolbar="true"]')) return
      setShowSoundPicker(false)
      setShowVolume(false)
    }

    // Delay to avoid closing immediately on the button click
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showSoundPicker, showVolume])

  // Expand button when hidden - floating minimal icon always on top
  if (isHidden) {
    return (
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => onToggleHidden?.(false)}
        className={cn(
          'fixed bottom-3 left-1/2 -translate-x-1/2 z-[200]',
          'w-8 h-8 rounded-full flex items-center justify-center',
          'backdrop-blur-xl border transition-all duration-200',
          'hover:scale-110 active:scale-95',
          isDark
            ? 'bg-zinc-900/80 border-white/10 text-white/60 hover:text-white hover:border-purple-500/50'
            : 'bg-white/90 border-black/10 text-slate-500 hover:text-slate-800 hover:border-purple-400/50',
          className
        )}
        style={{
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.2)'
            : '0 4px 20px rgba(0,0,0,0.15)',
        }}
        title="Show toolbar"
      >
        <ChevronUp className="w-4 h-4" />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
      className={cn(
        'fixed bottom-5 z-[200]',
        getPositionClasses(),
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className
      )}
      data-toolbar="true"
    >
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-2 rounded-xl',
          'backdrop-blur-3xl shadow-2xl',
          isDark
            ? 'bg-zinc-900/45 border border-white/10'
            : 'bg-white/45 border border-black/8'
        )}
        style={{
          boxShadow: isDark
            ? '0 0 30px rgba(139,92,246,0.08), 0 6px 24px rgba(0,0,0,0.3)'
            : '0 6px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Hide Button - left side */}
        <button
          onClick={() => onToggleHidden?.(true)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            'hover:scale-110 active:scale-95',
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-700 hover:bg-black/5'
          )}
          title="Hide toolbar"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className={cn(
          'w-px h-6',
          isDark ? 'bg-white/10' : 'bg-black/10'
        )} />

        {/* Sounds Button */}
        <div className="relative">
          <ToolbarButton
            icon={Headphones}
            label="Sounds"
            isActive={showSoundPicker}
            onClick={() => setShowSoundPicker(!showSoundPicker)}
            isDark={isDark}
          />

          {/* Sound Picker Popover */}
          <AnimatePresence>
            {showSoundPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-3',
                  'p-3 rounded-xl backdrop-blur-xl shadow-xl',
                  'min-w-[200px]',
                  isDark
                    ? 'bg-zinc-900/95 border border-white/10'
                    : 'bg-white/95 border border-black/10'
                )}
              >
                <div className="grid grid-cols-3 gap-2">
                  {soundscapes.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onSoundscapeChange(s)
                        setShowSoundPicker(false)
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg',
                        'transition-all duration-200',
                        soundscape === s
                          ? isDark
                            ? 'bg-white/20 text-white'
                            : 'bg-black/10 text-black'
                          : isDark
                            ? 'hover:bg-white/10 text-white/70'
                            : 'hover:bg-black/5 text-black/70'
                      )}
                    >
                      <span className="text-lg">{SOUNDSCAPE_INFO[s].emoji}</span>
                      <span className="text-[10px] font-medium capitalize">
                        {s.replace('-', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Play/Pause */}
        <ToolbarButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
          isDark={isDark}
        />

        {/* Volume */}
        <div className="relative">
          <ToolbarButton
            icon={volume > 0 ? Volume2 : VolumeX}
            label="Volume"
            isActive={showVolume}
            onClick={() => setShowVolume(!showVolume)}
            isDark={isDark}
          />

          <AnimatePresence>
            {showVolume && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-3',
                  'p-3 rounded-xl backdrop-blur-xl shadow-xl',
                  isDark
                    ? 'bg-zinc-900/95 border border-white/10'
                    : 'bg-white/95 border border-black/10'
                )}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-1 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-current"
                  style={{
                    background: `linear-gradient(to right, currentColor ${volume * 100}%, ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} ${volume * 100}%)`,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className={cn(
          'w-px h-6',
          isDark ? 'bg-white/20' : 'bg-black/20'
        )} />

        {/* Timer */}
        <ToolbarButton
          icon={Timer}
          label="Timer"
          onClick={onOpenTimer || (() => { })}
          isDark={isDark}
        />

        {/* Backgrounds */}
        <ToolbarButton
          icon={ImageIcon}
          label="Theme"
          onClick={onOpenBackgrounds || (() => { })}
          isDark={isDark}
        />

        {/* Widgets */}
        <ToolbarButton
          icon={LayoutGrid}
          label="Widgets"
          onClick={onOpenWidgets || (() => { })}
          isDark={isDark}
        />

        {/* Divider */}
        <div className={cn(
          'w-px h-6',
          isDark ? 'bg-white/20' : 'bg-black/20'
        )} />

        {/* Full Screen / Deep Focus */}
        <ToolbarButton
          icon={isDeepFocus ? Minimize2 : Maximize2}
          label={isDeepFocus ? 'Exit' : 'Focus'}
          onClick={onToggleDeepFocus}
          isDark={isDark}
          highlight
        />

        {/* PiP Mode */}
        <ToolbarButton
          icon={Monitor}
          label="PiP"
          onClick={onTogglePiP || (() => { })}
          isDark={isDark}
        />
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLBAR BUTTON
═══════════════════════════════════════════════════════════════════════════ */

interface ToolbarButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  isDark: boolean
  isActive?: boolean
  highlight?: boolean
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  isDark,
  isActive,
  highlight,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
        'transition-all duration-200',
        isActive
          ? isDark
            ? 'bg-white/20'
            : 'bg-black/10'
          : highlight
            ? isDark
              ? 'bg-purple-500/20 hover:bg-purple-500/30'
              : 'bg-purple-500/10 hover:bg-purple-500/20'
            : isDark
              ? 'hover:bg-white/10'
              : 'hover:bg-black/5'
      )}
    >
      <Icon className={cn(
        'w-5 h-5',
        highlight
          ? 'text-purple-400'
          : isDark
            ? 'text-white/80'
            : 'text-black/80'
      )} />
      <span className={cn(
        'text-[10px] font-medium',
        isDark ? 'text-white/60' : 'text-black/60'
      )}>
        {label}
      </span>
    </button>
  )
}
