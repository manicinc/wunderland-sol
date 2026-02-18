/**
 * Codex Page Layout - Shared layout wrapper for Codex subpages
 * @module codex/QuarryPageLayout
 *
 * @description
 * Provides consistent layout matching the main /codex page structure
 * for all Codex subpages (spiral-path, search, new, explore, etc.)
 *
 * @features
 * - Left sidebar with branding and custom content (matches QuarryViewer)
 * - Floating mobile footer navigation with icon buttons
 * - Theme support (light/dark/sepia/terminal/oceanic)
 * - Smooth animations throughout
 */

'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Network,
  Moon,
  Sun,
  Plus,
  MoreHorizontal,
  GraduationCap,
  Sparkles,
  ExternalLink,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Globe,
  Layers,
  PlusCircle,
  PenLine,
  BookHeart,
  LifeBuoy,
  Flower2,
  History,
  FolderOpen,
  Hash,
  Activity,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import QuarryBrand from './ui/quarry-core/QuarryBrand'
import QuarryToolbar from './QuarryToolbar'
import SidebarCollapseToggle from './ui/sidebar/SidebarCollapseToggle'
import { useTheme } from 'next-themes'
import { useInstanceConfig } from '@/lib/config'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'
import { getPreferences, updatePreferences } from '@/lib/localStorage'
import { isElectronMac, isElectron } from '@/lib/electron'
import type { ThemeName } from '@/types/theme'

interface QuarryPageLayoutProps {
  /** Page content */
  children: React.ReactNode
  /** Page title for header */
  title?: string
  /** Page description for header */
  description?: string
  /** Whether to show the right metadata panel area (default: false for subpages) */
  showRightPanel?: boolean
  /** Custom right panel content */
  rightPanelContent?: React.ReactNode
  /** Custom left panel content (sidebar/tree view) */
  leftPanelContent?: React.ReactNode
  /** Current theme (auto-detected if not provided) */
  theme?: ThemeName
  /** Whether sidebar should be collapsed by default */
  defaultSidebarCollapsed?: boolean
  /** Whether right panel should be collapsed by default */
  defaultRightPanelCollapsed?: boolean
  /** Force sidebar to small fixed width (255px) with no resize option - for Write/Reflect pages */
  forceSidebarSmall?: boolean
  /** Right panel width in pixels (default: 320) */
  rightPanelWidth?: number
  /** Left panel width in pixels (controlled) - overrides default/saved width */
  leftPanelWidth?: number
  /** Callback when left panel width changes */
  onLeftPanelWidthChange?: (width: number) => void
  /** Hide the top navigation toolbar (controlled) */
  hideNavbar?: boolean
  /** Callback when navbar visibility changes */
  onToggleNavbar?: (hidden: boolean) => void
  /** Additional className for customization */
  className?: string
}

// Note: Quick navigation items removed - now provided by QuarryToolbar menus
// This keeps the sidebar consistent with QuarrySidebar which uses a dropdown menu

// Nav items for mobile bottom nav
const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/quarry/app', icon: Home },
  { id: 'search', label: 'Search', href: '/quarry/search', icon: Search },
  { id: 'graph', label: 'Insights', href: '/quarry/graph', icon: Network },
  { id: 'learn', label: 'Learn', href: '/quarry/learn', icon: GraduationCap },
  { id: 'new', label: 'Create', href: '/quarry/new', icon: Plus },
]


/**
 * Shared layout for Codex subpages
 */
export default function QuarryPageLayout({
  children,
  title,
  description,
  showRightPanel = false,
  rightPanelContent,
  leftPanelContent,
  theme: propTheme,
  defaultSidebarCollapsed = false,
  defaultRightPanelCollapsed = false,
  forceSidebarSmall = false,
  rightPanelWidth = 340,
  leftPanelWidth: controlledLeftWidth,
  onLeftPanelWidthChange,
  hideNavbar = false,
  onToggleNavbar,
  className,
}: QuarryPageLayoutProps) {
  const router = useRouter()
  const { theme: systemTheme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isElectronApp, setIsElectronApp] = useState(false)
  const [electronMacPadding, setElectronMacPadding] = useState(false)
  const effectiveTheme = (propTheme || resolvedTheme || 'light') as ThemeName
  const isDark = effectiveTheme.includes('dark')

  // Wait for client-side mount to avoid hydration mismatch with theme
  // Also detect Electron for window drag region and macOS for traffic light padding
  useEffect(() => {
    setMounted(true)
    setIsElectronApp(isElectron())
    setElectronMacPadding(isElectronMac())
  }, [])

  // Get dynamic instance naming
  const { codexName } = useInstanceConfig()

  // Domain-aware path resolution
  const resolvePath = useQuarryPath()

  const pathname = usePathname()

  // Toolbar state
  const [metaOpen, setMetaOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(defaultRightPanelCollapsed)

  // Load saved sidebar state from preferences (skip when forceSidebarSmall is true)
  useEffect(() => {
    if (forceSidebarSmall) return // Don't load preferences for small fixed sidebar
    const prefs = getPreferences()
    if (prefs.sidebarCollapsed !== undefined) {
      setSidebarCollapsed(prefs.sidebarCollapsed)
    }
    if (prefs.rightPanelCollapsed !== undefined) {
      setRightPanelCollapsed(prefs.rightPanelCollapsed)
    }
  }, [forceSidebarSmall])

  // Toggle sidebar collapsed state
  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    updatePreferences({ sidebarCollapsed: newState })
  }

  // Toggle right panel collapsed state
  const handleToggleRightPanel = () => {
    const newState = !rightPanelCollapsed
    setRightPanelCollapsed(newState)
    updatePreferences({ rightPanelCollapsed: newState })
  }
  
  // Determine active nav item
  const activeNavItem = NAV_ITEMS.find(item => {
    if (item.href === '/quarry/app') return pathname === '/quarry/app' || pathname === '/quarry/app/'
    return pathname?.startsWith(item.href)
  })
  
  // Toggle through themes
  const toggleTheme = () => {
    const themes = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark', 'oceanic-light', 'oceanic-dark']
    const currentIndex = themes.indexOf(effectiveTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMoreOpen(false)
  }, [pathname])

  // Handle escape key to close mobile drawer and menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!rightPanelCollapsed) {
          setRightPanelCollapsed(true)
          updatePreferences({ rightPanelCollapsed: true })
        }
        if (mobileMoreOpen) {
          setMobileMoreOpen(false)
        }
        if (quickMenuOpen) {
          setQuickMenuOpen(false)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [rightPanelCollapsed, mobileMoreOpen, quickMenuOpen])

  return (
    <div className={`
      min-h-screen h-screen flex flex-col md:flex-row overflow-hidden
      ${isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}
      ${className || ''}
    `}>
      {/* Main Content Area - matches QuarryViewer structure */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-14 md:pb-0">
        {/* Left Sidebar - Always shown on desktop, collapsible (or fixed small for Write/Reflect) */}
        {(() => {
          // Calculate effective sidebar width
          const effectiveLeftWidth = forceSidebarSmall ? 255 : (controlledLeftWidth ?? 320)
          return (
            <motion.aside
              initial={false}
              animate={{
                width: sidebarCollapsed ? 0 : effectiveLeftWidth,
                opacity: sidebarCollapsed ? 0 : 1,
              }}
              transition={{
                width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, ease: 'easeInOut' },
              }}
              className={`
                hidden md:flex flex-col flex-shrink-0
                border-r ${isDark ? 'border-zinc-700/60 bg-zinc-900' : 'border-zinc-200/80 bg-zinc-50'}
              `}
              style={{ overflow: sidebarCollapsed ? 'hidden' : 'visible' }}
            >
              <motion.div
                initial={false}
                animate={{ opacity: sidebarCollapsed ? 0 : 1 }}
                transition={{ duration: 0.15, delay: sidebarCollapsed ? 0 : 0.1 }}
                style={{ width: effectiveLeftWidth }}
                className="flex flex-col h-full"
              >
            {/* Sidebar Header with Branding - h-12 matches center nav */}
            {/* In Electron, the header acts as a window drag region */}
            <div
              className={`
                flex-shrink-0 px-3 border-b
                ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-100'}
                ${electronMacPadding ? 'pt-8 h-auto pb-2' : 'h-12'}
              `}
              style={isElectronApp ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
            >
              <div className="flex items-center justify-between gap-1 h-full w-full" style={isElectronApp ? { WebkitAppRegion: 'no-drag' } as React.CSSProperties : undefined}>
                {/* Quarry Codex - Brand logo */}
                <div className="flex-shrink-0 min-w-0">
                  <QuarryBrand
                    size="sm"
                    showIcon={true}
                    compact={false}
                    theme={effectiveTheme}
                    interactive={true}
                  />
                </div>

                {/* Right Controls - Search, Theme Toggle & Quick Menu */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {/* Search Button */}
                  <Link
                    href={resolvePath('/quarry/search')}
                    className="flex items-center justify-center w-6 h-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    aria-label="Search"
                    title="Search (⌘K)"
                  >
                    <Search className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                  </Link>

                  {/* Theme Toggle */}
                  {mounted && (
                    <button
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className="flex items-center justify-center w-6 h-6 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                      aria-label="Toggle theme"
                      title="Toggle dark/light mode"
                    >
                      {resolvedTheme === 'dark' ? (
                        <Sun className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Moon className="w-3 h-3 text-zinc-600" />
                      )}
                    </button>
                  )}

                  {/* Quick Menu Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                      className={`flex items-center justify-center w-6 h-6 rounded-md border transition-colors ${
                        quickMenuOpen 
                          ? 'bg-zinc-200 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600' 
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                      aria-label="Quick menu"
                      title="Quick actions"
                    >
                      <Layers className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    {quickMenuOpen && (
                      <>
                        {/* Click outside to close */}
                        <div
                          className="fixed inset-0 z-[9998] cursor-default"
                          onClick={() => setQuickMenuOpen(false)}
                          onMouseDown={() => setQuickMenuOpen(false)}
                          aria-hidden="true"
                        />
                        <div className="absolute left-0 top-full mt-1 w-52 py-1.5 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-[9999] max-h-[80vh] overflow-y-auto">
                          {/* Create New */}
                          <Link
                            href={resolvePath('/quarry/new')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2 font-medium"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Create New Strand</span>
                          </Link>
                          <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                          {/* Dashboard */}
                          <Link
                            href={resolvePath('/quarry/dashboard')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 flex items-center gap-2"
                          >
                            <LayoutDashboard className="w-3 h-3 text-violet-500" />
                            <span>Dashboard</span>
                          </Link>
                          {/* Planner */}
                          <Link
                            href={resolvePath('/quarry/plan')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                          >
                            <CalendarDays className="w-3 h-3 text-rose-500" />
                            <span>Planner</span>
                          </Link>
                          {/* Write */}
                          <Link
                            href={resolvePath('/quarry/write')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2"
                          >
                            <PenLine className="w-3 h-3 text-cyan-500" />
                            <span>Write</span>
                          </Link>
                          {/* Reflect */}
                          <Link
                            href={resolvePath('/quarry/reflect')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                          >
                            <BookHeart className="w-3 h-3 text-purple-500" />
                            <span>Reflect</span>
                          </Link>
                          {/* Focus */}
                          <Link
                            href={resolvePath('/quarry/focus')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 flex items-center gap-2"
                          >
                            <Flower2 className="w-3 h-3 text-fuchsia-500" />
                            <span>Focus</span>
                          </Link>
                          {/* Research */}
                          <Link
                            href={resolvePath('/quarry/research')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                          >
                            <Globe className="w-3 h-3 text-teal-500" />
                            <span>Research</span>
                          </Link>
                          {/* Search */}
                          <Link
                            href={resolvePath('/quarry/search')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                          >
                            <Search className="w-3 h-3 text-blue-500" />
                            <span>Search</span>
                          </Link>
                          {/* Analytics */}
                          <Link
                            href={resolvePath('/quarry/analytics')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                          >
                            <BarChart3 className="w-3 h-3 text-emerald-500" />
                            <span>Analytics</span>
                          </Link>
                          {/* Evolution */}
                          <Link
                            href={resolvePath('/quarry/evolution')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-2"
                          >
                            <History className="w-3 h-3 text-teal-500" />
                            <span>Evolution</span>
                          </Link>
                          
                          {/* Features Section */}
                          <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                          <div className="px-3 py-1 text-[10px] uppercase text-zinc-400 dark:text-zinc-500 font-medium tracking-wider">
                            Features
                          </div>
                          
                          {/* Learn */}
                          <Link
                            href={resolvePath('/quarry/learn')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
                          >
                            <GraduationCap className="w-3 h-3 text-indigo-500" />
                            <span>Learn</span>
                          </Link>
                          {/* Graph */}
                          <Link
                            href={resolvePath('/quarry/graph')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                          >
                            <Network className="w-3 h-3 text-purple-500" />
                            <span>Graph</span>
                          </Link>
                          {/* Collections */}
                          <Link
                            href={resolvePath('/quarry/collections')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                          >
                            <FolderOpen className="w-3 h-3 text-amber-500" />
                            <span>Collections</span>
                          </Link>
                          {/* Tags (includes Supertags) */}
                          <Link
                            href={resolvePath('/quarry/tags')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 flex items-center gap-2"
                          >
                            <Hash className="w-3 h-3 text-cyan-500" />
                            <span>Tags</span>
                          </Link>
                          {/* Templates */}
                          <Link
                            href={resolvePath('/quarry/templates')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-2"
                          >
                            <Layers className="w-3 h-3 text-gray-500" />
                            <span>Templates</span>
                          </Link>
                          {/* Activity */}
                          <Link
                            href={resolvePath('/quarry/activity')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2"
                          >
                            <Activity className="w-3 h-3 text-orange-500" />
                            <span>Activity</span>
                          </Link>
                          
                          <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                          {/* Help */}
                          <Link
                            href={resolvePath('/quarry/faq')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                          >
                            <LifeBuoy className="w-3 h-3" />
                            <span>Help & Tutorials</span>
                          </Link>
                          {/* Preferences */}
                          <Link
                            href={resolvePath('/quarry/settings')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Preferences</span>
                          </Link>
                          {/* About */}
                          <Link
                            href={resolvePath('/quarry/landing')}
                            onClick={() => setQuickMenuOpen(false)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>About Quarry</span>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Custom Left Panel Content (file tree, etc.) */}
            {leftPanelContent && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {leftPanelContent}
              </div>
            )}
          </motion.div>
        </motion.aside>
          )
        })()}

        {/* Sidebar Collapse Toggle - hidden when forceSidebarSmall is true */}
        {!forceSidebarSmall && (
          <SidebarCollapseToggle
            isOpen={!sidebarCollapsed}
            onToggle={handleToggleSidebar}
            side="left"
            theme={effectiveTheme}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col ${electronMacPadding ? 'pt-8' : ''}`}>
          {/* Toolbar - matches QuarryViewer center toolbar (collapsible) */}
          <AnimatePresence mode="wait">
            {!hideNavbar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 48, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={`
                  flex-shrink-0 h-12 px-2 border-b overflow-hidden flex items-center
                  ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-white'}
                `}
              >
                <div className="flex items-center justify-between w-full">
                  <QuarryToolbar
                    currentPath={pathname || ''}
                    metaOpen={metaOpen}
                    onToggleMeta={() => setMetaOpen(!metaOpen)}
                    onOpenPreferences={() => router.push(resolvePath('/quarry/settings'))}
                    onOpenGraph={() => router.push(resolvePath('/quarry/graph'))}
                    onOpenHelp={() => {
                      // Open help modal or navigate to help page
                      window.open('https://frame.dev/quarry/faq', '_blank')
                    }}
                    theme={effectiveTheme}
                  />
                  {/* Hide Nav Button */}
                  {onToggleNavbar && (
                    <button
                      onClick={() => onToggleNavbar(true)}
                      className={`
                        ml-2 p-1.5 rounded-md transition-colors flex-shrink-0
                        ${isDark 
                          ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' 
                          : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700'
                        }
                      `}
                      title="Hide navigation bar (⌘⇧H)"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Expand Button when navbar is hidden - visible but non-distracting */}
          <AnimatePresence>
            {hideNavbar && onToggleNavbar && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 0.7, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                whileHover={{ opacity: 1, scale: 1.1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                onClick={() => onToggleNavbar(false)}
                className={`
                  fixed top-3 left-4 z-[201]
                  w-8 h-8 flex items-center justify-center
                  rounded-full backdrop-blur-xl border
                  transition-all duration-200 active:scale-95
                  hover:scale-110
                  ${isDark
                    ? 'bg-zinc-900/70 border-white/20 text-white/80 hover:text-white hover:border-purple-500/50'
                    : 'bg-white/70 border-black/10 text-slate-600 hover:text-slate-900 hover:border-purple-400/50'
                  }
                `}
                style={{
                  boxShadow: isDark
                    ? '0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.15)'
                    : '0 4px 20px rgba(0,0,0,0.15)',
                }}
                title="Show navigation bar (⌘⇧H)"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Page header with title and description - compact */}
          {(title || description) && (
            <div className={`
              flex-shrink-0 px-4 md:px-6 pt-2 pb-1.5 border-b
              ${isDark ? 'border-zinc-800' : 'border-zinc-200'}
            `}>
              <div className="flex items-center gap-2 max-w-4xl">
                {title && (
                  <h1 className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {title}
                  </h1>
                )}
                {title && description && (
                  <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>·</span>
                )}
                {description && (
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{description}</p>
                )}
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
        
        {/* Right Panel (if enabled) - Collapsible */}
        {showRightPanel && rightPanelContent && (
          <>
            {/* Right Panel Collapse Toggle - visible on all screen sizes */}
            <SidebarCollapseToggle
              isOpen={!rightPanelCollapsed}
              onToggle={handleToggleRightPanel}
              side="right"
              theme={effectiveTheme}
              className="!flex"
            />

            {/* Desktop: Inline sidebar (lg and up) */}
            <motion.aside
              initial={false}
              animate={{
                width: rightPanelCollapsed ? 0 : rightPanelWidth,
                opacity: rightPanelCollapsed ? 0 : 1,
              }}
              transition={{
                width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, ease: 'easeInOut' },
              }}
              className={`
                hidden lg:flex flex-col flex-shrink-0 overflow-hidden
                border-l ${isDark ? 'border-zinc-700/60 bg-zinc-900' : 'border-zinc-200/80 bg-zinc-50'}
              `}
            >
              <motion.div
                initial={false}
                animate={{ opacity: rightPanelCollapsed ? 0 : 1 }}
                transition={{ duration: 0.15, delay: rightPanelCollapsed ? 0 : 0.1 }}
                style={{ width: rightPanelWidth }}
                className="flex flex-col h-full"
              >
                {rightPanelContent}
              </motion.div>
            </motion.aside>

            {/* Mobile/Tablet: Sliding drawer overlay (below lg) */}
            <AnimatePresence>
              {!rightPanelCollapsed && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm`}
                    onClick={handleToggleRightPanel}
                  />
                  {/* Drawer */}
                  <motion.aside
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0, right: 0.5 }}
                    onDragEnd={(_, info) => {
                      // Close drawer if dragged more than 100px right or with velocity
                      if (info.offset.x > 100 || info.velocity.x > 500) {
                        handleToggleRightPanel()
                      }
                    }}
                    className={`
                      lg:hidden fixed right-0 top-16 bottom-0 z-50
                      flex flex-col overflow-hidden touch-pan-y
                      border-l ${isDark ? 'border-zinc-700/60 bg-zinc-900' : 'border-zinc-200/80 bg-zinc-50'}
                    `}
                    style={{ width: Math.min(rightPanelWidth, 320) }}
                  >
                    {/* Drawer header with swipe indicator */}
                    <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b safe-area-inset-top ${isDark ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-200 bg-zinc-100'}`}>
                      {/* Swipe indicator */}
                      <div className="flex items-center gap-3">
                        <div className={`w-1 h-8 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
                        <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>Details</span>
                      </div>
                      {/* Close button - 44x44 touch target */}
                      <button
                        onClick={handleToggleRightPanel}
                        className={`
                          min-w-[44px] min-h-[44px] -mr-2
                          flex items-center justify-center
                          rounded-lg transition-colors active:scale-95
                          ${isDark ? 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 active:bg-zinc-200 text-zinc-500'}
                        `}
                        aria-label="Close sidebar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto overscroll-contain safe-area-inset-bottom">
                      {rightPanelContent}
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Mobile Floating Footer Navigation */}
      <div className={`
        md:hidden fixed bottom-0 left-0 right-0 z-50
        ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
        border-t
      `}>
        <nav className="flex items-center justify-around px-1 h-16 pb-safe">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeNavItem?.id === item.id
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl
                  transition-all duration-150 active:scale-95
                  touch-manipulation
                  ${isActive
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'text-zinc-500 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* More Menu Button */}
          <div className="relative">
            <button
              onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
              className={`
                flex flex-col items-center justify-center gap-0.5
                min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl
                transition-all duration-150 active:scale-95
                touch-manipulation
                ${mobileMoreOpen
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-zinc-500 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-zinc-800'
                }
              `}
            >
              <MoreHorizontal className={`w-5 h-5 transition-transform ${mobileMoreOpen ? 'rotate-90' : ''}`} />
              <span className="text-[9px] font-medium">More</span>
            </button>
            
            {/* Mobile More Dropdown */}
            <AnimatePresence>
              {mobileMoreOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setMobileMoreOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className={`
                      absolute bottom-full right-0 mb-2 w-48
                      rounded-xl shadow-xl border overflow-hidden z-50
                      ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
                    `}
                  >
                    <div className="py-1 max-h-[70vh] overflow-y-auto">
                      {/* Quick Navigation Section */}
                      <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Navigate
                      </div>
                      <Link
                        href={resolvePath('/quarry/dashboard')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/dashboard') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-violet-500" />
                        Dashboard
                      </Link>
                      <Link
                        href={resolvePath('/quarry/plan')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/plan') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <CalendarDays className="w-4 h-4 text-rose-500" />
                        Planner
                      </Link>
                      <Link
                        href={resolvePath('/quarry/write')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/write') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <PenLine className="w-4 h-4 text-cyan-500" />
                        Write
                      </Link>
                      <Link
                        href={resolvePath('/quarry/reflect')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/reflect') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <BookHeart className="w-4 h-4 text-purple-500" />
                        Reflect
                      </Link>
                      <Link
                        href={resolvePath('/quarry/meditate')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/meditate') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Flower2 className="w-4 h-4 text-fuchsia-500" />
                        Meditate
                      </Link>
                      <Link
                        href={resolvePath('/quarry/research')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/research') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Globe className="w-4 h-4 text-teal-500" />
                        Research
                      </Link>
                      <Link
                        href={resolvePath('/quarry/search')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/search') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Search className="w-4 h-4 text-blue-500" />
                        Search
                      </Link>
                      <Link
                        href={resolvePath('/quarry/analytics')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/analytics') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        Analytics
                      </Link>
                      <Link
                        href={resolvePath('/quarry/evolution')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/evolution') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <History className="w-4 h-4 text-teal-500" />
                        Evolution
                      </Link>

                      <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />

                      {/* Features Section */}
                      <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Features
                      </div>
                      <Link
                        href={resolvePath('/quarry/learn')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/learn') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                        Learn
                      </Link>
                      <Link
                        href={resolvePath('/quarry/graph')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/graph') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Network className="w-4 h-4 text-purple-500" />
                        Graph
                      </Link>
                      <Link
                        href={resolvePath('/quarry/collections')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/collections') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <FolderOpen className="w-4 h-4 text-amber-500" />
                        Collections
                      </Link>
                      <Link
                        href={resolvePath('/quarry/tags')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/tags') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Hash className="w-4 h-4 text-cyan-500" />
                        Tags
                      </Link>
                      <Link
                        href={resolvePath('/quarry/templates')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/templates') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Layers className="w-4 h-4 text-gray-500" />
                        Templates
                      </Link>
                      <Link
                        href={resolvePath('/quarry/activity')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'} ${pathname?.startsWith('/quarry/activity') ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                      >
                        <Activity className="w-4 h-4 text-orange-500" />
                        Activity
                      </Link>

                      <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />
                      
                      <Link
                        href={resolvePath('/quarry/landing')}
                        onClick={() => setMobileMoreOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 text-sm
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        About {codexName}
                      </Link>
                      
                      <button
                        onClick={() => {
                          toggleTheme()
                          setMobileMoreOpen(false)
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                        {isDark ? 'Light Theme' : 'Dark Theme'}
                      </button>
                      
                      <Link
                        href="https://frame.dev"
                        target="_blank"
                        onClick={() => setMobileMoreOpen(false)}
                        className={`
                          flex items-center gap-3 px-4 py-2.5 text-sm
                          transition-colors
                          ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                        `}
                      >
                        <ExternalLink className="w-4 h-4 text-cyan-500" />
                        Frame.dev
                      </Link>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </div>
  )
}
