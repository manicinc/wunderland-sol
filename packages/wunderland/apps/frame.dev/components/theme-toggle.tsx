'use client'

import { useTheme } from 'next-themes'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ThemeName = 'light' | 'dark' | 'sepia-light' | 'sepia-dark' | 'terminal-light' | 'terminal-dark' | 'oceanic-light' | 'oceanic-dark'
const themeSequence: ThemeName[] = ['light', 'dark', 'sepia-light', 'sepia-dark', 'terminal-light', 'terminal-dark', 'oceanic-light', 'oceanic-dark']

// Custom SVG icons for each theme
const ThemeIcons: Record<ThemeName, React.ReactNode> = {
  light: (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2" />
        <path d="M6.34 6.34L4.93 4.93M19.07 19.07l-1.41-1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </g>
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  'sepia-light': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h8M8 11h8M8 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  'sepia-dark': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M12 2C9.5 2 7 4 7 7c0 2 1 4 5 5-4 1-5 3-5 5 0 3 2.5 5 5 5s5-2 5-5c0-2-1-4-5-5 4-1 5-3 5-5 0-3-2.5-5-5-5z" fill="currentColor" opacity="0.3" />
      <path d="M12 6v4M12 14v4M8 10h8M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  'terminal-light': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10l3 2-3 2M11 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'terminal-dark': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10l3 2-3 2M11 14h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="7" r="1" fill="currentColor" />
    </svg>
  ),
  'oceanic-light': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M2 12c2-3 4-4 6-4s4 2 6 2 4-2 6-2 4 1 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 16c2-3 4-4 6-4s4 2 6 2 4-2 6-2 4 1 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx="12" cy="8" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  'oceanic-dark': (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M2 12c2-3 4-4 6-4s4 2 6 2 4-2 6-2 4 1 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 16c2-3 4-4 6-4s4 2 6 2 4-2 6-2 4 1 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M2 20c2-3 4-4 6-4s4 2 6 2 4-2 6-2 4 1 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  ),
}

const themeColors: Record<ThemeName, { bg: string; icon: string; ring: string }> = {
  light: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-400' },
  dark: { bg: 'bg-slate-800', icon: 'text-cyan-300', ring: 'ring-cyan-400' },
  'sepia-light': { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'ring-orange-400' },
  'sepia-dark': { bg: 'bg-amber-950', icon: 'text-amber-400', ring: 'ring-amber-500' },
  'terminal-light': { bg: 'bg-zinc-900', icon: 'text-amber-400', ring: 'ring-amber-500' },
  'terminal-dark': { bg: 'bg-black', icon: 'text-green-400', ring: 'ring-green-500' },
  'oceanic-light': { bg: 'bg-cyan-50', icon: 'text-orange-500', ring: 'ring-orange-400' },
  'oceanic-dark': { bg: 'bg-slate-950', icon: 'text-cyan-300', ring: 'ring-cyan-400' },
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme: ThemeName = useMemo(() => {
    const candidate = theme as ThemeName | undefined
    if (candidate && themeSequence.includes(candidate)) return candidate
    const resolved = resolvedTheme as ThemeName | undefined
    if (resolved && themeSequence.includes(resolved)) return resolved
    return 'light'
  }, [theme, resolvedTheme])

  const handleClick = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleSelectTheme = useCallback((t: ThemeName) => {
    setTheme(t)
    setIsExpanded(false)
  }, [setTheme])

  // Close on outside click
  useEffect(() => {
    if (!isExpanded) return
    const handleClick = () => setIsExpanded(false)
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 100)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('click', handleClick)
    }
  }, [isExpanded])

  if (!mounted) {
    return <div className="w-10 h-10" />
  }

  const colors = themeColors[currentTheme]

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={handleClick}
        className={`
          relative flex items-center justify-center w-10 h-10 rounded-xl
          ${colors.bg} ${colors.icon}
          shadow-[0_2px_8px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]
          hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]
          border border-white/10 dark:border-white/5
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:${colors.ring}
        `}
        aria-label="Change theme"
        aria-expanded={isExpanded}
      >
        <motion.div
          key={currentTheme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {ThemeIcons[currentTheme]}
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute top-full right-0 mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-700 z-50 min-w-[200px]"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-2">
              {themeSequence.map((t) => {
                const c = themeColors[t]
                const isActive = t === currentTheme
                const themeName = t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                return (
                  <motion.button
                    key={t}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectTheme(t)}
                    className={`
                      relative flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-lg
                      ${c.bg} ${c.icon}
                      transition-all duration-150
                      ${isActive ? `ring-2 ${c.ring} ring-offset-1 ring-offset-white dark:ring-offset-slate-900` : 'hover:ring-1 hover:ring-gray-300 dark:hover:ring-slate-600'}
                    `}
                    title={themeName}
                    aria-label={`Switch to ${themeName} theme`}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      {ThemeIcons[t]}
                    </div>
                    <span className="text-xs font-medium leading-tight text-center whitespace-nowrap">
                      {themeName}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTheme"
                        className="absolute inset-0 rounded-lg ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
                        style={{ borderColor: 'currentColor' }}
                      />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
