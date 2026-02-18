/**
 * Codex Navigation Header
 * @module codex/ui/QuarryNavigation2
 * 
 * @description
 * Modern top navigation bar with:
 * - Frame + Codex logo branding
 * - Search trigger
 * - Quick actions (new strand, bookmarks)
 * - Theme toggle
 * - User menu (future)
 * 
 * Design: "Floating Island" style on scroll, glass-morphism
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { 
  Search, 
  Plus, 
  Star, 
  Settings, 
  Sun, 
  Moon, 
  Menu,
  Command,
  ChevronDown,
  BookOpen,
  GitBranch,
  Sparkles
} from 'lucide-react'

interface QuarryNavigation2Props {
  /** Current page title (optional) */
  pageTitle?: string
  /** Show breadcrumb path */
  breadcrumbPath?: string[]
  /** Callback when search is triggered */
  onSearchTrigger?: () => void
  /** Callback when sidebar toggle is triggered */
  onSidebarToggle?: () => void
  /** Whether sidebar is open (for toggle state) */
  sidebarOpen?: boolean
  /** Callback when new strand is triggered */
  onNewStrand?: () => void
  /** Callback when bookmarks are triggered */
  onBookmarks?: () => void
  /** Callback when settings are triggered */
  onSettings?: () => void
  /** Hide on scroll down, show on scroll up */
  autoHide?: boolean
  /** Variant style */
  variant?: 'default' | 'floating' | 'minimal'
}

export default function QuarryNavigation2({
  pageTitle,
  breadcrumbPath,
  onSearchTrigger,
  onSidebarToggle,
  sidebarOpen,
  onNewStrand,
  onBookmarks,
  onSettings,
  autoHide = true,
  variant = 'default'
}: QuarryNavigation2Props) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // Hydration fix for theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-hide on scroll
  useEffect(() => {
    if (!autoHide) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsScrolled(currentScrollY > 20)
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, autoHide])

  const isDark = theme?.includes('dark')

  // Theme cycle: light -> dark -> sepia-light -> terminal-dark -> light
  const cycleTheme = () => {
    const themes = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark']
    const currentIndex = themes.indexOf(theme || 'light')
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const baseClasses = `
    fixed top-0 left-0 right-0 z-50
    transition-all duration-300 ease-out
  `

  const variantClasses = {
    default: `
      bg-paper-50/95 dark:bg-ink-950/95 backdrop-blur-xl
      border-b border-ink-200/50 dark:border-ink-800/50
      ${isScrolled ? 'shadow-theme-md' : ''}
    `,
    floating: `
      mx-4 mt-4 rounded-2xl
      bg-paper-50/90 dark:bg-ink-900/90 backdrop-blur-xl
      border border-ink-200/30 dark:border-ink-700/30
      shadow-theme-lg
    `,
    minimal: `
      bg-transparent
      ${isScrolled ? 'bg-paper-50/80 dark:bg-ink-950/80 backdrop-blur-lg shadow-sm' : ''}
    `
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`${baseClasses} ${variantClasses[variant]}`}
        >
          <div className="h-14 px-4 flex items-center justify-between gap-4">
            {/* Left Section: Menu + Logo */}
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle (Mobile) */}
              {onSidebarToggle && (
                <button
                  onClick={onSidebarToggle}
                  className="p-2 -ml-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 transition-colors lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Logo */}
              <Link 
                href="/quarry" 
                className="flex items-center gap-2.5 group"
              >
                {/* Icon Mark */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-frame-500 to-cyan-500 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
                  <BookOpen className="w-4 h-4 text-white relative z-10" />
                </div>
                
                {/* Word Mark */}
                <div className="hidden sm:flex items-baseline gap-1">
                  <span className="text-sm font-medium text-ink-500 dark:text-ink-400 tracking-wide">
                    Frame
                  </span>
                  <span className="text-base font-bold font-serif tracking-tight text-ink-900 dark:text-paper-50">
                    Codex
                  </span>
                </div>
              </Link>

              {/* Breadcrumb / Page Title */}
              {(pageTitle || breadcrumbPath) && (
                <div className="hidden md:flex items-center gap-1.5 text-sm">
                  <span className="text-ink-300 dark:text-ink-600">/</span>
                  {breadcrumbPath?.map((segment, i) => (
                    <React.Fragment key={i}>
                      <span className="text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 cursor-pointer transition-colors truncate max-w-[100px]">
                        {segment}
                      </span>
                      {i < breadcrumbPath.length - 1 && (
                        <span className="text-ink-300 dark:text-ink-600">/</span>
                      )}
                    </React.Fragment>
                  ))}
                  {pageTitle && !breadcrumbPath && (
                    <span className="text-ink-700 dark:text-ink-200 font-medium truncate max-w-[200px]">
                      {pageTitle}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Center Section: Search (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <button
                onClick={onSearchTrigger}
                className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-ink-100/80 dark:bg-ink-800/80 border border-ink-200/50 dark:border-ink-700/50 text-ink-400 dark:text-ink-500 hover:border-frame-300 dark:hover:border-frame-600 hover:text-ink-600 dark:hover:text-ink-300 transition-all group"
              >
                <Search className="w-4 h-4" />
                <span className="text-sm">Search strands...</span>
                <div className="ml-auto flex items-center gap-1 text-[10px] font-mono">
                  <kbd className="px-1.5 py-0.5 rounded bg-ink-200/80 dark:bg-ink-700/80 text-ink-500 dark:text-ink-400">
                    <Command className="w-3 h-3 inline" />
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-ink-200/80 dark:bg-ink-700/80 text-ink-500 dark:text-ink-400">
                    K
                  </kbd>
                </div>
              </button>
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1">
              {/* Search (Mobile) */}
              <button
                onClick={onSearchTrigger}
                className="md:hidden p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* New Strand */}
              {onNewStrand && (
                <button
                  onClick={onNewStrand}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-frame-600 hover:bg-frame-500 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden lg:inline">New</span>
                </button>
              )}

              {/* Bookmarks */}
              {onBookmarks && (
                <button
                  onClick={onBookmarks}
                  className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                  aria-label="Bookmarks"
                >
                  <Star className="w-5 h-5" />
                </button>
              )}

              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={cycleTheme}
                  className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 transition-colors"
                  aria-label="Toggle theme"
                  title={`Current: ${theme}`}
                >
                  {isDark ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Settings */}
              {onSettings && (
                <button
                  onClick={onSettings}
                  className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500 dark:text-ink-400 transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  )
}




