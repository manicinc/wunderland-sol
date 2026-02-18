/**
 * QuarryTopNav - Shared top navigation bar for all Codex pages
 * @module codex/ui/QuarryTopNav
 * 
 * @description
 * Compact, consistent navigation header used across:
 * - QuarryViewer (main viewer)
 * - QuarryPageLayout (subpages)
 */

'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import QuarryBrand from './QuarryBrand'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Search,
  Network,
  Route,
  Plus,
  Moon,
  Sun,
  BookOpen,
  BookHeart,
  ChevronDown,
  GraduationCap,
  Sparkles,
  ExternalLink,
  CalendarDays,
  MoreVertical,
  LayoutDashboard,
  PlusCircle,
  Highlighter,
  Bookmark,
  LifeBuoy,
  Globe,
  PenLine,
  Eye,
  TrendingUp,
  BarChart3,
  Target,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useInstanceConfig } from '@/lib/config'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
  description?: string
}

// Main nav items shown in desktop center navigation
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/quarry/app', icon: Home, description: 'Dashboard' },
  { id: 'search', label: 'Search', href: '/quarry/search', icon: Search, description: 'Find knowledge' },
  { id: 'graph', label: 'Insights', href: '/quarry/graph', icon: Network, description: 'Knowledge graph' },
  { id: 'learn', label: 'Learn', href: '/quarry/learn', icon: GraduationCap, description: 'Flashcards & quizzes' },
  { id: 'new', label: 'Create', href: '/quarry/new', icon: Plus, description: 'New strand' },
  { id: 'write', label: 'Write', href: '/quarry/write', icon: PenLine, description: 'Focused writing mode' },
  { id: 'reflect', label: 'Reflect', href: '/quarry/reflect', icon: BookHeart, description: 'Daily journaling' },
  { id: 'planner', label: 'Planner', href: '/quarry/plan', icon: CalendarDays, description: 'Tasks & calendar' },
  { id: 'evolution', label: 'Evolution', href: '/quarry/evolution', icon: TrendingUp, description: 'Knowledge evolution' },
  { id: 'analytics', label: 'Analytics', href: '/quarry/analytics', icon: BarChart3, description: 'Usage statistics' },
]

// All view items including those in the dropdown (for mobile)
const ALL_VIEW_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', href: '/quarry/app', icon: Home, description: 'Dashboard' },
  { id: 'search', label: 'Search', href: '/quarry/search', icon: Search, description: 'Find knowledge' },
  { id: 'research', label: 'Research', href: '/quarry/research', icon: Globe, description: 'Web research & citations' },
  { id: 'write', label: 'Write', href: '/quarry/write', icon: PenLine, description: 'Focused writing mode' },
  { id: 'reflect', label: 'Reflect', href: '/quarry/reflect', icon: BookHeart, description: 'Daily journaling' },
  { id: 'planner', label: 'Planner', href: '/quarry/plan', icon: CalendarDays, description: 'Tasks & calendar' },
  { id: 'graph', label: 'Insights', href: '/quarry/graph', icon: Network, description: 'Knowledge graph' },
  { id: 'learn', label: 'Learn', href: '/quarry/learn', icon: GraduationCap, description: 'Flashcards & quizzes' },
  { id: 'new', label: 'Create', href: '/quarry/new', icon: Plus, description: 'New strand' },
  { id: 'evolution', label: 'Evolution', href: '/quarry/evolution', icon: TrendingUp, description: 'Knowledge evolution' },
  { id: 'analytics', label: 'Analytics', href: '/quarry/analytics', icon: BarChart3, description: 'Usage statistics' },
]

// Views dropdown items (for desktop "Views" menu)
const VIEW_DROPDOWN_ITEMS: NavItem[] = [
  { id: 'research', label: 'Research', href: '/quarry/research', icon: Globe, description: 'Web research & citations' },
  { id: 'write', label: 'Write', href: '/quarry/write', icon: PenLine, description: 'Focused writing mode' },
  { id: 'focus', label: 'Focus', href: '/quarry/focus', icon: Target, description: 'Deep focus mode' },
  { id: 'browse', label: 'Browse', href: '/quarry/browse', icon: Eye, description: 'Explore by category' },
]

const LEARN_ITEMS = [
  { id: 'spiral', label: 'Spiral Path', href: '/quarry/spiral-path', icon: Route, description: 'Adaptive learning' },
  { id: 'browse', label: 'Browse', href: '/quarry/browse', icon: BookOpen, description: 'Explore by category' },
]

// Animated caret component
function AnimatedCaret({ isOpen, className = '' }: { isOpen: boolean; className?: string }) {
  return (
    <motion.svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      animate={{ rotate: isOpen ? 180 : 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  )
}

// Hover dropdown with click-outside-to-close
function NavDropdown({
  trigger,
  children,
  isDark,
  align = 'left',
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  isDark: boolean
  align?: 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {trigger}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click outside to close - transparent, no backdrop blur */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 99998 }}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            {/* Dropdown menu - solid background, high z-index */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              style={{ zIndex: 99999 }}
              className={`
                absolute top-full mt-1 min-w-[180px]
                ${align === 'right' ? 'right-0' : 'left-0'}
                rounded-xl shadow-2xl border overflow-hidden
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-white border-zinc-200'
                }
              `}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface QuarryTopNavProps {
  /** Show compact version (no labels on nav items) */
  compact?: boolean
  /** Current theme override */
  theme?: string
  /** Show mobile page selector dropdown */
  showMobileSelector?: boolean
}

export default function QuarryTopNav({
  compact = false,
  theme: themeProp,
  showMobileSelector = true,
}: QuarryTopNavProps) {
  const { theme: systemTheme, setTheme } = useTheme()
  const effectiveTheme = themeProp || systemTheme || 'light'
  const isDark = effectiveTheme.includes('dark')

  // Get dynamic instance naming
  const { codexName } = useInstanceConfig()

  // Domain-aware path resolution
  const resolvePath = useQuarryPath()

  const pathname = usePathname()
  const router = useRouter()
  
  // Determine active nav item (check all views for mobile)
  const activeNavItem = ALL_VIEW_ITEMS.find(item => {
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
  
  return (
    <header
      className={`
        sticky top-0 z-40
        h-12 sm:h-11 px-3 sm:px-4 flex items-center justify-between gap-3 sm:gap-2
        border-b
        ${isDark ? 'border-zinc-800 bg-zinc-950/95 backdrop-blur-sm' : 'border-zinc-200 bg-white/95 backdrop-blur-sm'}
      `}
      style={{
        // Make header draggable for Electron window movement (no-op in browser)
        WebkitAppRegion: 'drag' as unknown as string,
      } as React.CSSProperties}
    >
      {/* Left: Logo + Quick Actions */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' as unknown as string } as React.CSSProperties}>
        <QuarryBrand
          size="sm"
          showIcon={true}
          compact={false}
          theme={effectiveTheme}
          interactive={true}
        />

        {/* Quick Actions - Theme, Search, Menu */}
        <div className="flex items-center gap-0.5 ml-2">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
            `}
            aria-label="Toggle theme"
            title={`Theme: ${effectiveTheme}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </motion.button>

          {/* Search Button */}
          <Link
            href={resolvePath('/quarry/search')}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
            `}
            title="Search"
          >
            <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </Link>

          {/* Quick Menu Dropdown */}
          <NavDropdown
            isDark={isDark}
            align="left"
            trigger={
              <button className={`
                p-1.5 rounded-lg transition-colors
                ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
              `}
              aria-label="Quick menu"
              title="Quick navigation"
              >
                <MoreVertical className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            }
          >
            <div className="py-1 min-w-[180px]">
              {/* Create New */}
              <Link
                href={resolvePath('/quarry/new')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs font-medium
                  transition-colors
                  ${isDark ? 'hover:bg-cyan-900/30 text-cyan-400' : 'hover:bg-cyan-50 text-cyan-600'}
                `}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create New Strand
              </Link>
              <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />

              {/* Dashboard */}
              <Link
                href={resolvePath('/quarry/dashboard')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-violet-900/30 text-zinc-300' : 'hover:bg-violet-50 text-zinc-700'}
                `}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-violet-500" />
                Dashboard
              </Link>

              {/* Planner */}
              <Link
                href={resolvePath('/quarry/plan')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-rose-900/30 text-zinc-300' : 'hover:bg-rose-50 text-zinc-700'}
                `}
              >
                <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
                Planner
              </Link>

              {/* Write */}
              <Link
                href={resolvePath('/quarry/write')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-cyan-900/30 text-zinc-300' : 'hover:bg-cyan-50 text-zinc-700'}
                `}
              >
                <PenLine className="w-3.5 h-3.5 text-cyan-500" />
                Write
              </Link>

              {/* Reflect */}
              <Link
                href={resolvePath('/quarry/reflect')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-purple-900/30 text-zinc-300' : 'hover:bg-purple-50 text-zinc-700'}
                `}
              >
                <BookHeart className="w-3.5 h-3.5 text-purple-500" />
                Reflect
              </Link>

              <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />

              {/* Evolution */}
              <Link
                href={resolvePath('/quarry/evolution')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-emerald-900/30 text-zinc-300' : 'hover:bg-emerald-50 text-zinc-700'}
                `}
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Evolution
              </Link>

              {/* Analytics */}
              <Link
                href={resolvePath('/quarry/analytics')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-indigo-900/30 text-zinc-300' : 'hover:bg-indigo-50 text-zinc-700'}
                `}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                Analytics
              </Link>

              {/* Insights */}
              <Link
                href={resolvePath('/quarry/graph')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-orange-900/30 text-zinc-300' : 'hover:bg-orange-50 text-zinc-700'}
                `}
              >
                <Network className="w-3.5 h-3.5 text-orange-500" />
                Insights
              </Link>

              <div className={`border-t my-1 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`} />

              {/* Highlights */}
              <Link
                href={resolvePath('/quarry?highlights=true')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-yellow-900/30 text-zinc-300' : 'hover:bg-yellow-50 text-zinc-700'}
                `}
              >
                <Highlighter className="w-3.5 h-3.5 text-yellow-500" />
                Highlights
              </Link>

              {/* Bookmarks */}
              <Link
                href={resolvePath('/quarry?bookmarks=true')}
                className={`
                  flex items-center gap-2.5 px-3 py-2 text-xs
                  transition-colors
                  ${isDark ? 'hover:bg-amber-900/30 text-zinc-300' : 'hover:bg-amber-50 text-zinc-700'}
                `}
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                Bookmarks
              </Link>
            </div>
          </NavDropdown>
        </div>

        {/* Mobile Page Selector - Grouped dropdown */}
        {showMobileSelector && (
          <div className="md:hidden relative ml-2">
            <select
              value={activeNavItem?.href || '/quarry/app'}
              onChange={(e) => router.push(resolvePath(e.target.value))}
              className={`
                appearance-none pl-2 pr-6 py-1 rounded-lg text-xs font-medium
                border cursor-pointer
                ${isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-800'
                }
              `}
            >
              <optgroup label="Main">
                <option value="/quarry/app">Home</option>
                <option value="/quarry/search">Search</option>
              </optgroup>
              <optgroup label="Create">
                <option value="/quarry/new">Create</option>
                <option value="/quarry/write">Write</option>
                <option value="/quarry/reflect">Reflect</option>
              </optgroup>
              <optgroup label="Research">
                <option value="/quarry/research">Research</option>
                <option value="/quarry/graph">Insights</option>
              </optgroup>
              <optgroup label="Learn">
                <option value="/quarry/learn">Learn</option>
                <option value="/quarry/spiral-path">Spiral Path</option>
                <option value="/quarry/browse">Browse</option>
              </optgroup>
              <optgroup label="Plan">
                <option value="/quarry/plan">Planner</option>
              </optgroup>
              <optgroup label="Track">
                <option value="/quarry/evolution">Evolution</option>
                <option value="/quarry/analytics">Analytics</option>
              </optgroup>
            </select>
            <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
          </div>
        )}
      </div>

      {/* Center: Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center" style={{ WebkitAppRegion: 'no-drag' as unknown as string } as React.CSSProperties}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeNavItem?.id === item.id
          return (
            <Link
              key={item.id}
              href={resolvePath(item.href)}
              className={`
                group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }
              `}
              title={item.description}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : ''
              }`} />
              {!compact && <span>{item.label}</span>}
            </Link>
          )
        })}
        
        {/* Learn Dropdown */}
        <NavDropdown
          isDark={isDark}
          trigger={
            <button className={`
              group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-150
              ${pathname?.startsWith('/quarry/spiral') || pathname?.startsWith('/quarry/browse')
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }
            `}>
              <Route className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              {!compact && <span>Learn</span>}
              <AnimatedCaret isOpen={false} className="w-2.5 h-2.5 opacity-50" />
            </button>
          }
        >
          <div className="py-1">
            {LEARN_ITEMS.map(item => {
              const Icon = item.icon
              const isSubActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 text-xs
                    transition-colors
                    ${isSubActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-emerald-500' : ''}`} />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </NavDropdown>

        {/* Views Dropdown - Research, Write, Browse */}
        <NavDropdown
          isDark={isDark}
          trigger={
            <button className={`
              group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-150
              ${pathname?.startsWith('/quarry/research') || pathname?.startsWith('/quarry/write')
                ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }
            `}>
              <Eye className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              {!compact && <span>Views</span>}
              <AnimatedCaret isOpen={false} className="w-2.5 h-2.5 opacity-50" />
            </button>
          }
        >
          <div className="py-1">
            {VIEW_DROPDOWN_ITEMS.map(item => {
              const Icon = item.icon
              const isSubActive = pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 text-xs
                    transition-colors
                    ${isSubActive
                      ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300'
                      : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSubActive ? 'text-cyan-500' : ''}`} />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </NavDropdown>
      </nav>
      
      {/* Right: About/Help */}
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' as unknown as string } as React.CSSProperties}>
        {/* About Link */}
        <NavDropdown
          isDark={isDark}
          align="right"
          trigger={
            <button className={`
              hidden sm:flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs
              transition-colors
              ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}
            `}>
              <BookOpen className="w-3.5 h-3.5" />
              <AnimatedCaret isOpen={false} className="opacity-60" />
            </button>
          }
        >
          <div className="py-1">
            <Link
              href={resolvePath('/quarry/landing')}
              className={`
                flex items-center gap-2.5 px-3 py-2 text-xs
                transition-colors
                ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
              `}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              About {codexName}
            </Link>
            <Link
              href="https://frame.dev"
              target="_blank"
              className={`
                flex items-center gap-2.5 px-3 py-2 text-xs
                transition-colors
                ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
              `}
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-500" />
              Frame.dev Home
            </Link>
          </div>
        </NavDropdown>
      </div>
    </header>
  )
}

