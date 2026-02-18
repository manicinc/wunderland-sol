/**
 * Mobile bottom navigation bar
 * @module codex/ui/MobileBottomNav
 * 
 * @remarks
 * - Only visible on mobile (< 768px)
 * - Fixed at bottom with safe-area-inset support
 * - 5 main actions: Home, Search, Ask, Bookmarks, Settings
 * - Sleek minimal design - all items flush and consistent
 * - Ask uses vibrant color but no gradient background
 */

'use client'

import React from 'react'
import { Home, Search, Settings, Sparkles, PanelRight, Play, Pause, Square, Volume2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX } from '../../constants'

interface MobileBottomNavProps {
  /** Current active tab */
  activeTab?: 'home' | 'search' | 'ask' | 'info' | 'settings'
  /** Navigate to home */
  onHome: () => void
  /** Open search */
  onSearch: () => void
  /** Open Ask interface */
  onAsk: () => void
  /** Open info/metadata panel */
  onInfo: () => void
  /** Open settings */
  onSettings: () => void
  /** Theme for Ask icon */
  theme?: 'light' | 'dark'
  /** TTS state */
  ttsState?: {
    speaking: boolean
    paused: boolean
    progress: number
  }
  /** Whether TTS has content to read */
  ttsHasContent?: boolean
  /** TTS play handler */
  onTTSPlay?: () => void
  /** TTS pause handler */
  onTTSPause?: () => void
  /** TTS resume handler */
  onTTSResume?: () => void
  /** TTS stop handler */
  onTTSStop?: () => void
}

/**
 * Bottom navigation bar for mobile devices
 * Sleek, minimal design - all items flush and consistent
 */
export default function MobileBottomNav({
  activeTab,
  onHome,
  onSearch,
  onAsk,
  onInfo,
  onSettings,
  ttsState,
  ttsHasContent,
  onTTSPlay,
  onTTSPause,
  onTTSResume,
  onTTSStop,
}: MobileBottomNavProps) {
  // Show TTS controls when there's content or when playing
  const showTTSControls = ttsHasContent || ttsState?.speaking

  // Handle TTS play/pause toggle
  const handleTTSToggle = () => {
    if (ttsState?.speaking) {
      if (ttsState.paused) {
        onTTSResume?.()
      } else {
        onTTSPause?.()
      }
    } else {
      onTTSPlay?.()
    }
  }

  const items = [
    { id: 'home' as const, icon: Home, label: 'Home', onClick: onHome, color: 'cyan' },
    { id: 'search' as const, icon: Search, label: 'Search', onClick: onSearch, color: 'cyan' },
    { id: 'ask' as const, icon: Sparkles, label: 'Ask', onClick: onAsk, color: 'violet' },
    { id: 'info' as const, icon: PanelRight, label: 'Info', onClick: onInfo, color: 'cyan' },
    { id: 'settings' as const, icon: Settings, label: 'More', onClick: onSettings, color: 'cyan' },
  ]

  const colorClasses = {
    cyan: {
      active: 'text-cyan-500 dark:text-cyan-400',
      inactive: 'text-zinc-400 dark:text-zinc-500',
      dot: 'bg-cyan-500 dark:bg-cyan-400',
    },
    violet: {
      active: 'text-violet-500 dark:text-violet-400',
      inactive: 'text-violet-400/60 dark:text-violet-400/50',
      dot: 'bg-violet-500 dark:bg-violet-400',
    },
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200/80 dark:border-zinc-800/80"
      style={{
        zIndex: Z_INDEX.MOBILE_BOTTOM_NAV,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* TTS Floating Controls */}
      <AnimatePresence>
        {showTTSControls && onTTSPlay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-zinc-900/90 dark:bg-zinc-800/90 backdrop-blur-lg rounded-full px-3 py-2 shadow-lg border border-zinc-700"
          >
            {/* Progress indicator when playing */}
            {ttsState?.speaking && (
              <div className="relative w-20 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-cyan-500 rounded-full"
                  animate={{ width: `${ttsState.progress}%` }}
                />
              </div>
            )}

            {/* Play/Pause button */}
            <motion.button
              onClick={handleTTSToggle}
              className="p-2 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
              whileTap={{ scale: 0.9 }}
              disabled={!ttsHasContent && !ttsState?.speaking}
            >
              {ttsState?.speaking && !ttsState.paused ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </motion.button>

            {/* Stop button - only when playing */}
            {ttsState?.speaking && (
              <motion.button
                onClick={onTTSStop}
                className="p-2 rounded-full bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <Square className="w-3 h-3" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-around px-1 h-14">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const colors = colorClasses[item.color as keyof typeof colorClasses]

          return (
            <motion.button
              key={item.id}
              onClick={item.onClick}
              className="relative flex-1 flex flex-col items-center justify-center py-2 touch-manipulation"
              whileTap={{ scale: 0.9 }}
            >
              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className={`absolute top-1 w-1 h-1 rounded-full ${colors.dot}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <Icon
                className={`w-[22px] h-[22px] transition-colors stroke-[1.5] ${
                  isActive ? colors.active : colors.inactive
                }`}
              />

              {/* Label */}
              <span
                className={`mt-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

