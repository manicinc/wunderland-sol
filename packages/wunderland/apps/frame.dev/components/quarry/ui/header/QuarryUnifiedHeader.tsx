/**
 * Unified Header Bar for Quarry Codex Viewer
 * Spans all three sections (sidebar, content, metadata) with consistent styling
 * Provides draggable region for Electron window management
 * @module codex/ui/header/QuarryUnifiedHeader
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, PanelRight, Search, Settings, HelpCircle, BookMarked, Sun, Moon, Layers, Compass, PlusCircle, LayoutDashboard, BarChart3, History, Network, Puzzle, CalendarDays, PenLine, BookHeart, Globe, FolderOpen, Hash, Highlighter, LifeBuoy, Sparkles, ChevronUp, Map } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import QuarryBrand from '../quarry-core/QuarryBrand'
import { isElectron, isElectronMac } from '@/lib/electron'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import FocusIcon from '@/components/quarry/ui/icons/FocusIcon'

interface QuarryUnifiedHeaderProps {
  /** Theme for styling */
  theme?: string
  /** Whether sidebar is open */
  sidebarOpen: boolean
  /** Toggle sidebar */
  onToggleSidebar: () => void
  /** Whether sidebar is collapsed (desktop) */
  sidebarCollapsed?: boolean
  /** Toggle sidebar collapse (desktop) */
  onToggleSidebarCollapse?: () => void
  /** Whether metadata panel is open */
  metaOpen: boolean
  /** Toggle metadata panel */
  onToggleMeta: () => void
  /** Open search (focus input) */
  onOpenSearch?: () => void
  /** Toggle search section expanded/collapsed */
  onToggleSearchSection?: () => void
  /** Whether search section is expanded */
  searchExpanded?: boolean
  /** Open settings */
  onOpenSettings?: () => void
  /** Open help */
  onOpenHelp?: () => void
  /** Open bookmarks with optional tab */
  onOpenBookmarks?: (tab?: 'bookmarks' | 'highlights' | 'history') => void
  /** Reset to home */
  onResetToHome?: () => void
  /** Hide the entire navigation bar */
  onHideNav?: () => void
  /** Children to render in center section (toolbar content) */
  children?: React.ReactNode
  /** Render extra content on the right side */
  rightContent?: React.ReactNode
}

/**
 * Unified header bar with consistent styling across all sections
 * Features:
 * - Electron window drag handle spanning full width
 * - Consistent border and background colors
 * - Sidebar toggle on left
 * - Brand logo
 * - Center content slot for toolbar
 * - Metadata panel toggle on right
 */
export default function QuarryUnifiedHeader({
  theme = 'dark',
  sidebarOpen,
  onToggleSidebar,
  sidebarCollapsed,
  onToggleSidebarCollapse,
  metaOpen,
  onToggleMeta,
  onOpenSearch,
  onToggleSearchSection,
  searchExpanded,
  onOpenSettings,
  onOpenHelp,
  onOpenBookmarks,
  onResetToHome,
  onHideNav,
  children,
  rightContent,
}: QuarryUnifiedHeaderProps) {
  const isDark = theme?.includes('dark')
  const isElectronApp = isElectron()
  const isElectronMacApp = isElectronMac()

  // Theme toggle
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Wait for client-side mount to avoid hydration mismatch with theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Quick menu state
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)

  // Domain-aware path resolution
  const resolvePath = useQuarryPath()

  // Consistent header height: 40px base + 32px for Electron Mac traffic lights
  const headerHeight = isElectronMacApp ? 'h-[72px] pt-8' : 'h-10'

  return (
    <header
      className={`
        flex items-center w-full shrink-0
        ${headerHeight}
        px-1 sm:px-2 gap-1 sm:gap-2
        border-b
        z-[60]
        ${isDark
          ? 'bg-zinc-900 border-zinc-700'
          : 'bg-zinc-50 border-zinc-200'
        }
      `}
      style={isElectronApp ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
    >
      {/* Left Section: Sidebar toggle + Brand + Theme + Quick Menu */}
      <div
        className="flex items-center gap-1 sm:gap-1.5 shrink-0"
        style={isElectronApp ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      >
        {/* Mobile: Menu/Close toggle */}
        <button
          onClick={onToggleSidebar}
          className={`
            md:hidden flex items-center justify-center w-8 h-8 rounded-lg
            transition-colors touch-manipulation
            ${isDark
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
            }
          `}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Brand logo - clickable to reset - always flush left */}
        <div className="flex-shrink-0">
          <QuarryBrand
            size="sm"
            showIcon={true}
            compact={false}
            theme={theme}
            interactive={true}
            onClick={onResetToHome}
          />
        </div>

        {/* Compact icon group - Search, Theme, Layers - with spacing from logo */}
        <div className="flex items-center gap-0 ml-2">
          {/* Search button */}
          {onToggleSearchSection && (
            <button
              onClick={onToggleSearchSection}
              className={`
                flex items-center justify-center w-7 h-7 rounded-md
                transition-colors touch-manipulation
                ${searchExpanded
                  ? isDark
                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-600/50'
                    : 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                  : isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                }
              `}
              aria-label={searchExpanded ? 'Close search' : 'Open search'}
              title={searchExpanded ? 'Close search & filters (/)' : 'Open search & filters (/)'}
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className={`
                flex items-center justify-center w-7 h-7 rounded-md
                transition-colors touch-manipulation
                ${isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                }
              `}
              aria-label="Toggle theme"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        )}

          {/* Quick Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setQuickMenuOpen(!quickMenuOpen)}
              className={`
                flex items-center justify-center w-7 h-7 rounded-md
                transition-colors touch-manipulation
                ${quickMenuOpen
                  ? isDark
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-200 text-zinc-700'
                  : isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                }
              `}
              aria-label="Quick menu"
              title="Quick actions"
            >
              <Layers className="w-4 h-4" />
            </button>
          <AnimatePresence>
            {quickMenuOpen && (
              <>
                {/* Click outside to close */}
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setQuickMenuOpen(false)}
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className={`
                    absolute left-0 top-full mt-2 w-52 py-1.5 rounded-xl shadow-xl border z-[9999] max-h-[70vh] overflow-y-auto
                    ${isDark
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-white border-zinc-200'
                    }
                  `}
                >
                  {/* Create New */}
                  <Link
                    href={resolvePath('/quarry/new')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 font-medium ${isDark ? 'text-cyan-400 hover:bg-cyan-900/20' : 'text-cyan-600 hover:bg-cyan-50'
                      }`}
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Create New Strand</span>
                    <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                      }`}>n</kbd>
                  </Link>

                  <div className={`border-t my-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />

                  {/* Dashboard */}
                  <Link
                    href={resolvePath('/quarry/dashboard')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-violet-900/20' : 'text-zinc-700 hover:bg-violet-50'
                      }`}
                  >
                    <LayoutDashboard className="w-3 h-3 text-violet-500" />
                    <span>Dashboard</span>
                  </Link>

                  {/* Planner */}
                  <Link
                    href={resolvePath('/quarry/plan')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-rose-900/20' : 'text-zinc-700 hover:bg-rose-50'
                      }`}
                  >
                    <CalendarDays className="w-3 h-3 text-rose-500" />
                    <span>Planner</span>
                  </Link>

                  {/* Write */}
                  <Link
                    href={resolvePath('/quarry/write')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-cyan-900/20' : 'text-zinc-700 hover:bg-cyan-50'
                      }`}
                  >
                    <PenLine className="w-3 h-3 text-cyan-500" />
                    <span>Write</span>
                  </Link>

                  {/* Reflect */}
                  <Link
                    href={resolvePath('/quarry/reflect')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-purple-900/20' : 'text-zinc-700 hover:bg-purple-50'
                      }`}
                  >
                    <BookHeart className="w-3 h-3 text-purple-500" />
                    <span>Reflect</span>
                  </Link>

                  {/* Research */}
                  <Link
                    href={resolvePath('/quarry/research')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-teal-900/20' : 'text-zinc-700 hover:bg-teal-50'
                      }`}
                  >
                    <Globe className="w-3 h-3 text-teal-500" />
                    <span>Research</span>
                  </Link>

                  {/* Discover */}
                  <Link
                    href={resolvePath('/quarry/search')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-blue-900/20' : 'text-zinc-700 hover:bg-blue-50'
                      }`}
                  >
                    <Compass className="w-3 h-3 text-blue-500" />
                    <span>Discover</span>
                    <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                      }`}>/</kbd>
                  </Link>

                  {/* Analytics */}
                  <Link
                    href={resolvePath('/quarry/analytics')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-emerald-900/20' : 'text-zinc-700 hover:bg-emerald-50'
                      }`}
                  >
                    <BarChart3 className="w-3 h-3 text-emerald-500" />
                    <span>Analytics</span>
                  </Link>

                  {/* Evolution */}
                  <Link
                    href={resolvePath('/quarry/evolution')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-teal-900/20' : 'text-zinc-700 hover:bg-teal-50'
                      }`}
                  >
                    <History className="w-3 h-3 text-teal-500" />
                    <span>Evolution</span>
                  </Link>

                  {/* === Features Section === */}
                  <div className={`border-t my-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />
                  <div className={`px-3 py-1 text-[10px] uppercase font-medium tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'
                    }`}>
                    Features
                  </div>

                  {/* Focus Mode - highlighted entry */}
                  <Link
                    href={resolvePath('/quarry/focus')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 font-medium ${isDark
                      ? 'text-emerald-400 hover:bg-emerald-900/30 bg-emerald-950/20'
                      : 'text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50'
                      }`}
                  >
                    <FocusIcon size={14} animated={false} />
                    <span>Focus Mode</span>
                    <span className={`ml-auto text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                      }`}>new</span>
                  </Link>

                  {/* Learn */}
                  <Link
                    href={resolvePath('/quarry/learn')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-indigo-900/20' : 'text-zinc-700 hover:bg-indigo-50'
                      }`}
                  >
                    <svg className="w-3 h-3 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                    <span>Learn</span>
                  </Link>

                  {/* Graph */}
                  <Link
                    href={resolvePath('/quarry/graph')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-violet-900/20' : 'text-zinc-700 hover:bg-violet-50'
                      }`}
                  >
                    <Network className="w-3 h-3 text-violet-500" />
                    <span>Graph</span>
                  </Link>

                  {/* Collections */}
                  <Link
                    href={resolvePath('/quarry/collections')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-amber-900/20' : 'text-zinc-700 hover:bg-amber-50'
                      }`}
                  >
                    <FolderOpen className="w-3 h-3 text-amber-500" />
                    <span>Collections</span>
                  </Link>

                  {/* Tags (includes Supertags) */}
                  <Link
                    href={resolvePath('/quarry/tags')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-cyan-900/20' : 'text-zinc-700 hover:bg-cyan-50'
                      }`}
                  >
                    <Hash className="w-3 h-3 text-cyan-500" />
                    <span>Tags</span>
                  </Link>

                  {/* Templates */}
                  <Link
                    href={resolvePath('/quarry/templates')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-gray-800/50' : 'text-zinc-700 hover:bg-gray-50'
                      }`}
                  >
                    <svg className="w-3 h-3 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    <span>Templates</span>
                  </Link>

                  {/* Activity */}
                  <Link
                    href={resolvePath('/quarry/activity')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-orange-900/20' : 'text-zinc-700 hover:bg-orange-50'
                      }`}
                  >
                    <svg className="w-3 h-3 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span>Activity</span>
                  </Link>

                  {/* Atlas */}
                  <Link
                    href={resolvePath('/quarry/atlas')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-orange-900/20' : 'text-zinc-700 hover:bg-orange-50'
                      }`}
                  >
                    <Map className="w-3 h-3 text-orange-500" />
                    <span>Atlas</span>
                  </Link>

                  {/* Plugins */}
                  <Link
                    href={resolvePath('/quarry/plugins')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-pink-900/20' : 'text-zinc-700 hover:bg-pink-50'
                      }`}
                  >
                    <Puzzle className="w-3 h-3 text-pink-500" />
                    <span>Plugins</span>
                  </Link>

                  {/* === Bookmarks Section === */}
                  <div className={`border-t my-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />

                  {/* Highlights */}
                  {onOpenBookmarks && (
                    <button
                      onClick={() => {
                        onOpenBookmarks('highlights')
                        setQuickMenuOpen(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-yellow-900/20' : 'text-zinc-700 hover:bg-yellow-50'
                        }`}
                    >
                      <Highlighter className="w-3 h-3 text-yellow-500" />
                      <span>Highlights</span>
                      <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                        }`}>h</kbd>
                    </button>
                  )}

                  {/* Bookmarks */}
                  {onOpenBookmarks && (
                    <button
                      onClick={() => {
                        onOpenBookmarks('bookmarks')
                        setQuickMenuOpen(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-amber-900/20' : 'text-zinc-700 hover:bg-amber-50'
                        }`}
                    >
                      <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Bookmarks</span>
                      <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                        }`}>b</kbd>
                    </button>
                  )}

                  {/* Help */}
                  {onOpenHelp && (
                    <button
                      onClick={() => {
                        onOpenHelp()
                        setQuickMenuOpen(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <LifeBuoy className="w-3 h-3" />
                      <span>Help & Tutorials</span>
                      <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                        }`}>?</kbd>
                    </button>
                  )}

                  {/* Preferences */}
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        onOpenSettings()
                        setQuickMenuOpen(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Preferences</span>
                      <kbd className={`ml-auto text-[10px] px-1 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-400'
                        }`}>,</kbd>
                    </button>
                  )}

                  {/* About */}
                  <div className={`border-t my-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />
                  <Link
                    href={resolvePath('/quarry/about')}
                    onClick={() => setQuickMenuOpen(false)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 font-medium ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span>About Quarry</span>
                  </Link>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Center Section: Toolbar content only (nav dropdowns removed - use QuarryToolbar) */}
      <div
        className="flex-1 flex items-center justify-center min-w-0 px-1 sm:px-2"
        style={isElectronApp ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      >
        {/* Toolbar content passed as children */}
        {children && (
          <div className="flex items-center max-w-full scrollbar-none">
            {children}
          </div>
        )}
      </div>

      {/* Right Section: Essential actions + Meta toggle */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={isElectronApp ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}
      >
        {/* Bookmarks button - hidden on mobile, accessible via quick menu */}
        {onOpenBookmarks && (
          <button
            onClick={() => onOpenBookmarks()}
            className={`
              hidden sm:flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md
              transition-colors touch-manipulation
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              }
            `}
            aria-label="Bookmarks"
            title="Bookmarks (⌘B)"
          >
            <BookMarked className="w-4 h-4" />
          </button>
        )}

        {/* Help button - hidden on mobile, accessible via quick menu */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className={`
              hidden md:flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md
              transition-colors touch-manipulation
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              }
            `}
            aria-label="Help"
            title="Help (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* Settings button - hidden on mobile, accessible via quick menu */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className={`
              hidden md:flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md
              transition-colors touch-manipulation
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
              }
            `}
            aria-label="Settings"
            title="Settings (⌘,)"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Extra right content slot */}
        {rightContent}

        {/* Hide Nav Button */}
        {onHideNav && (
          <motion.button
            onClick={onHideNav}
            className={`
              flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md
              transition-colors touch-manipulation
              ${isDark
                ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Hide navigation bar"
            title="Hide navigation bar (⌘⇧H)"
          >
            <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
        )}

        {/* Metadata panel toggle - always visible */}
        <motion.button
          onClick={onToggleMeta}
          className={`
            flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-md
            transition-colors touch-manipulation
            ${metaOpen
              ? isDark
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-600/50'
                : 'bg-emerald-100 text-emerald-600 border border-emerald-300'
              : isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label={metaOpen ? 'Close panel' : 'Open panel'}
          title={metaOpen ? 'Close metadata panel (M)' : 'Open metadata panel (M)'}
        >
          <PanelRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>
      </div>
    </header>
  )
}
