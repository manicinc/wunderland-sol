/**
 * Preferences/settings modal for Codex viewer
 * @module codex/ui/PreferencesModal
 * 
 * @remarks
 * - Theme selection (light/dark/sepia light/sepia dark)
 * - Font size slider
 * - Tree density options
 * - Default sidebar mode
 * - Clear cache/data buttons
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sun, Moon, Palette, Sparkles, Type, LayoutGrid, Sidebar, Trash2 } from 'lucide-react'
import type { UserPreferences } from '../lib/localStorage'
import { clearCodexCache, getCodexCacheStats, type CodexCacheStats } from '../lib/codexCache'

const THEME_PRESETS: Array<{
  id: UserPreferences['theme']
  label: string
  description: string
  swatch: string
  icon: JSX.Element
}> = [
  {
    id: 'light',
    label: 'Light',
    description: 'Crisp paper',
    swatch: 'from-slate-50 via-white to-slate-100 text-slate-900',
    icon: <Sun className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Midnight glass',
    swatch: 'from-slate-900 via-slate-800 to-slate-900 text-slate-100',
    icon: <Moon className="w-5 h-5 text-cyan-200" />,
  },
  {
    id: 'sepia-light',
    label: 'Sepia Light',
    description: 'Notebook glow',
    swatch: 'from-amber-50 via-orange-50 to-amber-100 text-amber-900',
    icon: <Palette className="w-5 h-5 text-amber-700" />,
  },
  {
    id: 'sepia-dark',
    label: 'Sepia Dark',
    description: 'Candlelight',
    swatch: 'from-amber-900 via-stone-900 to-stone-950 text-amber-100',
    icon: <Sparkles className="w-5 h-5 text-amber-200" />,
  },
]

interface PreferencesModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close modal callback */
  onClose: () => void
  /** Current preferences */
  preferences: UserPreferences
  /** Update theme */
  onThemeChange: (theme: UserPreferences['theme']) => void
  /** Update font size */
  onFontSizeChange: (size: number) => void
  /** Update tree density */
  onTreeDensityChange: (density: UserPreferences['treeDensity']) => void
  /** Update default sidebar mode */
  onSidebarModeChange: (mode: UserPreferences['defaultSidebarMode']) => void
  /** Update sidebar open on mobile */
  onSidebarOpenMobileChange: (open: boolean) => void
  /** Reset to defaults */
  onReset: () => void
  /** Clear all data (bookmarks, history, preferences) */
  onClearAll: () => void
}

/**
 * Modal for managing user preferences
 * 
 * @example
 * ```tsx
 * <PreferencesModal
 *   isOpen={prefsOpen}
 *   onClose={() => setPrefsOpen(false)}
 *   preferences={preferences}
 *   onThemeChange={updateTheme}
 *   onFontSizeChange={updateFontSize}
 *   onTreeDensityChange={updateTreeDensity}
 *   onSidebarModeChange={updateDefaultSidebarMode}
 *   onSidebarOpenMobileChange={updateSidebarOpenMobile}
 *   onReset={reset}
 *   onClearAll={clearAllCodexData}
 * />
 * ```
 */
export default function PreferencesModal({
  isOpen,
  onClose,
  preferences,
  onThemeChange,
  onFontSizeChange,
  onTreeDensityChange,
  onSidebarModeChange,
  onSidebarOpenMobileChange,
  onReset,
  onClearAll,
}: PreferencesModalProps) {
  const [cacheStats, setCacheStats] = React.useState<CodexCacheStats | null>(null)
  const [cacheLoading, setCacheLoading] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setCacheLoading(true)
    getCodexCacheStats()
      .then((stats) => {
        if (!cancelled) {
          setCacheStats(stats)
        }
      })
      .catch((error) => {
        console.warn('[PreferencesModal] Failed to load Codex cache stats', error)
      })
      .finally(() => {
        if (!cancelled) setCacheLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const humanReadableCacheSize =
    cacheStats && cacheStats.totalBytes > 0
      ? cacheStats.totalBytes > 1024 * 1024
        ? `${(cacheStats.totalBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(cacheStats.totalBytes / 1024).toFixed(1)} KB`
      : '0 KB'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Preferences</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close preferences"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
                {/* Theme */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    <Sun className="w-4 h-4" />
                    Theme & Atmosphere
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onThemeChange(preset.id)}
                        className={`p-2 sm:p-4 rounded-lg border-2 transition-all ${
                          preferences.theme === preset.id
                            ? 'border-frame-green/70 bg-gray-100/70 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {/* Mobile: Centered icon + label */}
                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-3">
                          <span
                            className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br ${preset.swatch} shadow-inner flex-shrink-0`}
                            aria-hidden
                          >
                            <span className="scale-75 sm:scale-100">{preset.icon}</span>
                          </span>
                          <div className="text-center sm:text-left">
                            <span className="text-xs sm:text-sm font-semibold capitalize block">{preset.label}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{preset.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    <Type className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Font Size: {(preferences.fontSize * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.5"
                    step="0.05"
                    value={preferences.fontSize}
                    onChange={(e) => onFontSizeChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>80%</span>
                    <span>150%</span>
                  </div>
                </div>

                {/* Tree Density */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Tree Density</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(['compact', 'normal', 'comfortable'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => onTreeDensityChange(density)}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                          preferences.treeDensity === density
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-200 dark:bg-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="capitalize text-xs sm:text-sm font-medium">{density}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Defaults */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    <Sidebar className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">Default Sidebar View</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {([{ id: 'tree' as const, label: 'Tree' }, { id: 'toc' as const, label: 'Outline' }]).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => onSidebarModeChange(mode.id)}
                        className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                          preferences.defaultSidebarMode === mode.id
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-200 dark:bg-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-medium">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Sidebar */}
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Open Sidebar by Default on Mobile
                    </span>
                    <button
                      onClick={() => onSidebarOpenMobileChange(!preferences.sidebarOpenMobile)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.sidebarOpenMobile
                          ? 'bg-cyan-600 dark:bg-cyan-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          preferences.sidebarOpenMobile ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </label>
                </div>

                {/* Divider */}
                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Data Management */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Data Management</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      All Codex preferences, bookmarks, history, and cache live only in your browser. Nothing is sent
                      to Frame.dev servers, and GitHub PATs are never stored or cached.
                    </p>
                  </div>

                  {/* Codex SQL Cache */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Codex SQL Cache (IndexedDB)
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cacheLoading
                          ? 'Calculating...'
                          : `Cached strands: ${cacheStats?.totalItems ?? 0} • Approx. size: ${humanReadableCacheSize}`}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            'Clear the Codex SQL cache? This removes locally cached strands but keeps bookmarks and history.'
                          )
                        ) {
                          return
                        }
                        setCacheLoading(true)
                        try {
                          await clearCodexCache()
                          const stats = await getCodexCacheStats()
                          setCacheStats(stats)
                        } finally {
                          setCacheLoading(false)
                        }
                      }}
                      className="py-1.5 px-3 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      disabled={cacheLoading}
                    >
                      {cacheLoading ? 'Clearing…' : 'Clear Cache'}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button
                      onClick={onReset}
                      className="flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      Reset Preferences
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear all bookmarks, history, and preferences? This cannot be undone.')) {
                          onClearAll()
                          onClose()
                        }
                      }}
                      className="flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Clear All Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                <p className="text-xs text-gray-500 text-center">
                  Changes are saved automatically • GDPR compliant (no tracking)
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

