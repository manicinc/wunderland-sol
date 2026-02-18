/**
 * Mobile bottom navigation bar
 * @module codex/ui/MobileBottomNav
 * 
 * @remarks
 * - Only visible on mobile (< 768px)
 * - Fixed at bottom with safe-area-inset support
 * - 4 main actions: Home, Search, Bookmarks, Settings
 * - Active state indicators
 * - 44px+ touch targets (WCAG AAA)
 */

'use client'

import React from 'react'
import { Home, Search, Star, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

interface MobileBottomNavProps {
  /** Current active tab */
  activeTab?: 'home' | 'search' | 'bookmarks' | 'settings'
  /** Navigate to home */
  onHome: () => void
  /** Open search */
  onSearch: () => void
  /** Open bookmarks */
  onBookmarks: () => void
  /** Open settings */
  onSettings: () => void
}

/**
 * Bottom navigation bar for mobile devices
 * 
 * @example
 * ```tsx
 * <MobileBottomNav
 *   activeTab="home"
 *   onHome={() => router.push('/codex')}
 *   onSearch={() => setSearchFocused(true)}
 *   onBookmarks={() => setBookmarksOpen(true)}
 *   onSettings={() => setPreferencesOpen(true)}
 * />
 * ```
 */
export default function MobileBottomNav({
  activeTab,
  onHome,
  onSearch,
  onBookmarks,
  onSettings,
}: MobileBottomNavProps) {
  const items = [
    { id: 'home' as const, icon: Home, label: 'Home', onClick: onHome },
    { id: 'search' as const, icon: Search, label: 'Search', onClick: onSearch },
    { id: 'bookmarks' as const, icon: Star, label: 'Bookmarks', onClick: onBookmarks },
    { id: 'settings' as const, icon: Settings, label: 'Settings', onClick: onSettings },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-bottom">
      <div className="grid grid-cols-4 gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors touch-manipulation min-h-[56px]"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-lg"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Icon */}
              <Icon
                className={`w-6 h-6 relative z-10 transition-colors ${
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              />

              {/* Label */}
              <span
                className={`text-xs font-medium relative z-10 transition-colors ${
                  isActive
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Safe area spacing for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}

