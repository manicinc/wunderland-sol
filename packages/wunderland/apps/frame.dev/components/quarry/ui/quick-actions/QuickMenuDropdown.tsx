/**
 * Quick Menu Dropdown - Shared navigation dropdown for Codex pages
 * @module codex/ui/QuickMenuDropdown
 *
 * Provides consistent navigation across all Codex subpages:
 * - Dashboard, Planner, Search links
 * - Bookmarks, Highlights
 * - Help, Preferences
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  LayoutDashboard,
  CalendarDays,
  Search,
  Highlighter,
  Bookmark,
  LifeBuoy,
  Sparkles,
  PlusCircle,
  Moon,
  Sun,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useInstanceConfig } from '@/lib/config'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

interface QuickMenuDropdownProps {
  /** Optional callback when bookmarks is clicked */
  onOpenBookmarks?: (tab?: 'bookmarks' | 'highlights' | 'history') => void
  /** Optional callback when help is clicked */
  onOpenHelp?: () => void
  /** Optional callback when preferences is clicked */
  onOpenPreferences?: () => void
  /** Whether to show bookmarks/highlights buttons (requires callbacks) */
  showBookmarks?: boolean
  /** Custom trigger button class */
  triggerClassName?: string
}

export default function QuickMenuDropdown({
  onOpenBookmarks,
  onOpenHelp,
  onOpenPreferences,
  showBookmarks = true,
  triggerClassName = '',
}: QuickMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { codexName } = useInstanceConfig()
  const resolvePath = useQuarryPath()
  const isDark = theme === 'dark'

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-1.5 rounded-lg transition-colors
          hover:bg-zinc-200 dark:hover:bg-zinc-800
          ${isOpen ? 'bg-zinc-200 dark:bg-zinc-800' : ''}
          ${triggerClassName}
        `}
        aria-label="Quick menu"
        title="Quick menu"
      >
        <MoreVertical className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`
                absolute right-0 top-full mt-1 w-48 py-1 z-[9999]
                rounded-lg shadow-xl border overflow-hidden
                ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              {/* Create New */}
              <Link
                href={resolvePath('/quarry/new')}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2 font-medium"
              >
                <PlusCircle className="w-3 h-3" />
                <span>Create New Strand</span>
                <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">n</kbd>
              </Link>

              <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />

              {/* Dashboard */}
              <Link
                href={resolvePath('/quarry/dashboard')}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center gap-2"
              >
                <LayoutDashboard className="w-3 h-3 text-violet-500" />
                <span>Dashboard</span>
              </Link>

              {/* Planner */}
              <Link
                href={resolvePath('/quarry/plan')}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
              >
                <CalendarDays className="w-3 h-3 text-rose-500" />
                <span>Planner</span>
              </Link>

              {/* Search */}
              <Link
                href={resolvePath('/quarry/search')}
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
              >
                <Search className="w-3 h-3 text-blue-500" />
                <span>Search</span>
                <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">/</kbd>
              </Link>

              <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />

              {/* Highlights */}
              {showBookmarks && onOpenBookmarks && (
                <button
                  onClick={() => {
                    onOpenBookmarks('highlights')
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
                >
                  <Highlighter className="w-3 h-3 text-yellow-500" />
                  <span>Highlights</span>
                  <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">h</kbd>
                </button>
              )}

              {/* Bookmarks */}
              {showBookmarks && onOpenBookmarks && (
                <button
                  onClick={() => {
                    onOpenBookmarks()
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                >
                  <Bookmark className="w-3 h-3 text-amber-500" />
                  <span>Bookmarks</span>
                  <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">b</kbd>
                </button>
              )}

              {/* Help */}
              {onOpenHelp && (
                <button
                  onClick={() => {
                    onOpenHelp()
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                >
                  <LifeBuoy className="w-3 h-3" />
                  <span>Help & Tutorials</span>
                  <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">?</kbd>
                </button>
              )}

              {/* Preferences */}
              {onOpenPreferences && (
                <button
                  onClick={() => {
                    onOpenPreferences()
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Preferences</span>
                  <kbd className="ml-auto text-[9px] px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-zinc-400">,</kbd>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  setTheme(isDark ? 'light' : 'dark')
                  setIsOpen(false)
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
              >
                {isDark ? (
                  <Sun className="w-3 h-3 text-amber-500" />
                ) : (
                  <Moon className="w-3 h-3 text-zinc-500" />
                )}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />

              {/* About */}
              <Link
                href="/quarry/landing"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
              >
                <Image
                  src="/quarry-icon-mono-light.svg"
                  alt="Quarry"
                  width={12}
                  height={12}
                  className="flex-shrink-0 block dark:hidden opacity-60"
                />
                <Image
                  src="/quarry-icon-mono-dark.svg"
                  alt="Quarry"
                  width={12}
                  height={12}
                  className="flex-shrink-0 hidden dark:block opacity-60"
                />
                <span>About Quarry {codexName}</span>
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
