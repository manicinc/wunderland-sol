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

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sun, Moon, Palette, Sparkles, Type, LayoutGrid, Sidebar, Trash2, Database, ExternalLink, AlertCircle, Zap, Cpu, Check, XCircle as XCircleIcon, HelpCircle, Volume2, Mic, Cloud, Globe } from 'lucide-react'
import { SyncServerSettings } from './SyncServerSettings'
import { GoogleCalendarSettings } from '../planner/GoogleCalendarSettings'
import type { UserPreferences } from '@/lib/localStorage'
import { clearCodexCache, getCodexCacheStats, type CodexCacheStats } from '@/lib/codexCache'
import { REPO_CONFIG, Z_INDEX } from '../../constants'
import { detectCapabilities } from '@/lib/search/embeddingEngine'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

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
  {
    id: 'terminal-dark',
    label: 'Terminal Green',
    description: 'Retro CRT hacker mode',
    swatch: 'from-black via-green-950 to-black text-green-400',
    icon: <span className="text-green-400 font-mono text-lg">█</span>,
  },
  {
    id: 'terminal-light',
    label: 'Terminal Amber',
    description: 'Vintage monitor glow',
    swatch: 'from-black via-amber-950 to-black text-amber-500',
    icon: <span className="text-amber-500 font-mono text-lg">█</span>,
  },
]

/** TTS Voice info */
interface TTSVoiceInfo {
  name: string
  lang: string
  voiceURI: string
  localService?: boolean
}

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
  /** Enable or disable local reading history tracking */
  onHistoryTrackingChange: (enabled: boolean) => void
  /** Enable or disable scroll position memory */
  onRememberScrollPositionChange?: (enabled: boolean) => void
  /** Enable or disable auto-expand backlinks when found */
  onAutoExpandBacklinksChange?: (enabled: boolean) => void
  /** Reset to defaults */
  onReset: () => void
  /** Clear all data (bookmarks, history, preferences) */
  onClearAll: () => void
  /** TTS Settings */
  ttsVoices?: TTSVoiceInfo[]
  ttsSupported?: boolean
  onTTSVoiceChange?: (voiceURI: string) => void
  onTTSRateChange?: (rate: number) => void
  onTTSVolumeChange?: (volume: number) => void
  onTTSPitchChange?: (pitch: number) => void
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
  onHistoryTrackingChange,
  onRememberScrollPositionChange,
  onAutoExpandBacklinksChange,
  onReset,
  onClearAll,
  ttsVoices = [],
  ttsSupported = false,
  onTTSVoiceChange,
  onTTSRateChange,
  onTTSVolumeChange,
  onTTSPitchChange,
}: PreferencesModalProps) {
  const resolvePath = useQuarryPath()
  const [cacheStats, setCacheStats] = React.useState<CodexCacheStats | null>(null)
  const [cacheLoading, setCacheLoading] = React.useState(false)
  
  // Get TTS settings from preferences with defaults
  const ttsSettings = preferences.tts || { rate: 1, volume: 1, pitch: 1 }

  // Accessibility: click outside and escape to close
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    closeOnClickOutside: true,
    closeOnEscape: true,
    trapFocus: true,
    lockScroll: true,
    modalId: 'preferences-modal',
  })

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
          {/* Backdrop - click to close */}
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            style={{ zIndex: Z_INDEX.PRIORITY_MODAL_BACKDROP }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Modal */}
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: Z_INDEX.PRIORITY_MODAL }}
          >
            <motion.div
              ref={contentRef}
              {...modalProps}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h2 id="preferences-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">Preferences</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close preferences (Escape)"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Theme */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Sun className="w-4 h-4" />
                    Theme & Atmosphere
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => onThemeChange(preset.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          preferences.theme === preset.id
                            ? 'border-frame-green/70 bg-gray-100/70 dark:bg-gray-800'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-start gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${preset.swatch} shadow-inner`}
                            aria-hidden
                          >
                            {preset.icon}
                          </span>
                          <div className="text-left">
                            <span className="text-sm font-semibold capitalize">{preset.label}</span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Type className="w-4 h-4" />
                    Font Size: {(preferences.fontSize * 100).toFixed(0)}%
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

                {/* Voice & Audio Settings */}
                {ttsSupported && (
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Volume2 className="w-4 h-4" />
                      Voice & Audio (Read Aloud)
                    </label>
                    
                    {/* Voice Selection with Gender Filter */}
                    {ttsVoices.length > 0 && onTTSVoiceChange && (
                      <div className="space-y-3">
                        {/* Quick voice presets */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                            Quick Presets
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {/* Female Voice Preset */}
                            <button
                              onClick={() => {
                                const femaleVoice = ttsVoices.find(v => 
                                  v.name.toLowerCase().includes('female') ||
                                  v.name.toLowerCase().includes('samantha') ||
                                  v.name.toLowerCase().includes('karen') ||
                                  v.name.toLowerCase().includes('victoria') ||
                                  v.name.toLowerCase().includes('zira') ||
                                  v.name.toLowerCase().includes('heather') ||
                                  v.name.toLowerCase().includes('susan') ||
                                  v.name.toLowerCase().includes('amy') ||
                                  (v.name.toLowerCase().includes('en') && v.name.includes('(Female)'))
                                )
                                if (femaleVoice) onTTSVoiceChange(femaleVoice.voiceURI)
                              }}
                              className={`
                                px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                ${preferences.tts?.voiceURI && ttsVoices.find(v => v.voiceURI === preferences.tts?.voiceURI)?.name.toLowerCase().match(/(female|samantha|karen|victoria|zira|heather|susan|amy)/)
                                  ? 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300'
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                                }
                              `}
                            >
                              👩 Female
                            </button>
                            
                            {/* Male Voice Preset */}
                            <button
                              onClick={() => {
                                const maleVoice = ttsVoices.find(v => 
                                  v.name.toLowerCase().includes('male') ||
                                  v.name.toLowerCase().includes('david') ||
                                  v.name.toLowerCase().includes('daniel') ||
                                  v.name.toLowerCase().includes('alex') ||
                                  v.name.toLowerCase().includes('fred') ||
                                  v.name.toLowerCase().includes('mark') ||
                                  v.name.toLowerCase().includes('thomas') ||
                                  (v.name.toLowerCase().includes('en') && v.name.includes('(Male)'))
                                )
                                if (maleVoice) onTTSVoiceChange(maleVoice.voiceURI)
                              }}
                              className={`
                                px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                ${preferences.tts?.voiceURI && ttsVoices.find(v => v.voiceURI === preferences.tts?.voiceURI)?.name.toLowerCase().match(/(male|david|daniel|alex|fred|mark|thomas)/)
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }
                              `}
                            >
                              👨 Male
                            </button>
                            
                            {/* Natural/Premium Voice (if available) */}
                            <button
                              onClick={() => {
                                const naturalVoice = ttsVoices.find(v => 
                                  v.name.toLowerCase().includes('natural') ||
                                  v.name.toLowerCase().includes('premium') ||
                                  v.name.toLowerCase().includes('enhanced') ||
                                  v.name.toLowerCase().includes('neural') ||
                                  (v.localService === false) // Cloud voices are often higher quality
                                )
                                if (naturalVoice) onTTSVoiceChange(naturalVoice.voiceURI)
                              }}
                              className={`
                                px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20
                                border-purple-200 dark:border-purple-700
                                text-purple-700 dark:text-purple-300
                                hover:from-purple-100 hover:to-cyan-100 dark:hover:from-purple-900/30 dark:hover:to-cyan-900/30
                              `}
                            >
                              ✨ Natural
                            </button>
                          </div>
                        </div>
                        
                        {/* Full Voice List */}
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            All Available Voices ({ttsVoices.length})
                          </label>
                          <select
                            value={preferences.tts?.voiceURI || ''}
                            onChange={(e) => onTTSVoiceChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">System Default</option>
                            
                            {/* Group by language */}
                            {Array.from(new Set(ttsVoices.map(v => v.lang.split('-')[0]))).sort().map(langCode => {
                              const langVoices = ttsVoices.filter(v => v.lang.startsWith(langCode))
                              const langName = new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode) || langCode
                              return (
                                <optgroup key={langCode} label={`${langName} (${langVoices.length})`}>
                                  {langVoices.map((voice) => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>
                                      {voice.name} {voice.localService ? '' : '☁️'}
                                    </option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                          <p className="text-[9px] text-gray-400 mt-1">
                            ☁️ = Cloud voice (may require internet)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Rate Slider */}
                    {onTTSRateChange && (
                      <div>
                        <label className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Speech Rate</span>
                          <span className="font-mono">{ttsSettings.rate.toFixed(1)}×</span>
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={ttsSettings.rate}
                          onChange={(e) => onTTSRateChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>0.5× (Slow)</span>
                          <span>2× (Fast)</span>
                        </div>
                      </div>
                    )}

                    {/* Volume Slider */}
                    {onTTSVolumeChange && (
                      <div>
                        <label className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Volume</span>
                          <span className="font-mono">{Math.round(ttsSettings.volume * 100)}%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={ttsSettings.volume}
                          onChange={(e) => onTTSVolumeChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Muted</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}

                    {/* Pitch Slider */}
                    {onTTSPitchChange && (
                      <div>
                        <label className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Pitch</span>
                          <span className="font-mono">{ttsSettings.pitch.toFixed(1)}</span>
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={ttsSettings.pitch}
                          onChange={(e) => onTTSPitchChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      Text-to-speech uses your browser's built-in voices. Voice availability depends on your operating system.
                    </p>
                  </div>
                )}

                {/* Voice Transcription (STT) Settings */}
                <VoiceTranscriptionSettings />

                {/* Tree Density */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <LayoutGrid className="w-4 h-4" />
                    Tree Density
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['compact', 'normal', 'comfortable'] as const).map((density) => (
                      <button
                        key={density}
                        onClick={() => onTreeDensityChange(density)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          preferences.treeDensity === density
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-200 dark:bg-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="capitalize text-sm font-medium">{density}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Defaults */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Sidebar className="w-4 h-4" />
                    Default Sidebar View
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {([{ id: 'tree' as const, label: 'Tree' }, { id: 'toc' as const, label: 'Outline' }]).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => onSidebarModeChange(mode.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          preferences.defaultSidebarMode === mode.id
                            ? 'border-gray-900 dark:border-gray-100 bg-gray-200 dark:bg-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-sm font-medium">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Sidebar */}
                <div>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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

                {/* Repository Source */}
                {process.env.NEXT_PUBLIC_ENABLE_REPO_EDIT === 'true' && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      <Database className="w-4 h-4" />
                      Repository Source
                    </label>
                    
                    <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                      {/* Current Repository */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current Codex Repository</p>
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
                          <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={`https://github.com/${REPO_CONFIG.OWNER}/${REPO_CONFIG.NAME}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline truncate block"
                            >
                              {REPO_CONFIG.OWNER}/{REPO_CONFIG.NAME}
                            </a>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              Branch: <span className="font-mono">{REPO_CONFIG.BRANCH}</span>
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>

                      {/* Custom Repository (Disabled - shows instructions) */}
                      <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                              Repository editing is currently disabled
                            </p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                              To enable custom repository selection, set <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded font-mono text-[10px]">NEXT_PUBLIC_ENABLE_REPO_EDIT=true</code> in your environment variables.
                            </p>
                            <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                              <p className="text-[10px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                Want to create your own Codex?
                              </p>
                              <a
                                href="https://github.com/framersai/codex-template"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 hover:underline font-medium"
                              >
                                Use our Codex Template →
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                                Pre-configured OpenStrand schema, GitHub Actions, and search indexing
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Divider */}
                {process.env.NEXT_PUBLIC_ENABLE_REPO_EDIT === 'true' && (
                  <hr className="border-gray-200 dark:border-gray-800" />
                )}

                {/* Self-Hosted Sync (Coming Soon) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <Cloud className="w-4 h-4" />
                    Synchronization
                  </label>
                  <SyncServerSettings />
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Semantic Search & Performance */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Semantic Search & Performance
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Q&A uses AI embeddings for natural language understanding. Choose your backend based on device capabilities.
                    </p>
                  </div>

                  {/* Backend Status Card */}
                  <SemanticBackendStatus />

                  {/* ONNX Runtime Toggle (if available) */}
                  <ORTToggleCard />
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Planner & Tasks */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Planner & Tasks</h3>
                    <p className="text-xs text-gray-500">
                      Configure task tracking, calendar sync, and productivity features.
                    </p>
                  </div>

                  {/* Extract embedded tasks */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Extract Embedded Tasks
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically detect and track checkboxes (- [ ]) in your strands as tasks.
                      </p>
                    </div>
                    <div className="relative w-12 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 cursor-not-allowed">
                      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full translate-x-6" />
                    </div>
                  </div>

                  {/* Google Calendar */}
                  <GoogleCalendarSettings />

                  {/* Planner link */}
                  <a
                    href={resolvePath('/quarry/plan')}
                    className="block w-full py-2 px-4 text-center text-xs font-medium rounded-lg
                      bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-800/50
                      text-rose-700 dark:text-rose-300 transition-colors"
                  >
                    Open Full Planner →
                  </a>
                </div>

                <hr className="border-gray-200 dark:border-gray-800" />

                {/* Data Management */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Management & Privacy</h3>
                    <p className="text-xs text-gray-500">
                      All Codex preferences, bookmarks, history, and cache live only in your browser. Nothing is sent
                      to Frame.dev servers, and GitHub PATs are never stored or cached.
                    </p>
                  </div>

                  {/* Reading History Privacy */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Reading History
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tracks which strands you open, <span className="font-semibold">stored locally only</span>. Turn this off to stop recording history
                        (bookmarks are unaffected).
                      </p>
                    </div>
                    <button
                      onClick={() => onHistoryTrackingChange(!preferences.historyTrackingEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.historyTrackingEnabled
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          preferences.historyTrackingEnabled ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Remember Scroll Position */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Remember Scroll Position
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Pick up where you left off when returning to a strand. Scroll positions are stored locally.
                      </p>
                    </div>
                    <button
                      onClick={() => onRememberScrollPositionChange?.(!preferences.rememberScrollPosition)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.rememberScrollPosition !== false
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          preferences.rememberScrollPosition !== false ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto-Expand Backlinks */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Auto-Expand Backlinks
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically expand the backlinks section when references are found for a strand.
                      </p>
                    </div>
                    <button
                      onClick={() => onAutoExpandBacklinksChange?.(!preferences.autoExpandBacklinks)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        preferences.autoExpandBacklinks !== false
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          preferences.autoExpandBacklinks !== false ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Codex SQL Cache */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between gap-3">
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

                  <div className="flex gap-3">
                    <button
                      onClick={onReset}
                      className="flex-1 py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
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
                      className="flex-1 py-2 px-4 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear All Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
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

/**
 * Semantic Backend Status Card - Shows current Q&A backend
 */
function SemanticBackendStatus() {
  // This will be passed from parent in real implementation
  // For now, show placeholder
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Current Backend
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Status shown in Q&A panel. Open Q&A to initialize the backend and see live capabilities.
      </p>
    </div>
  )
}

/**
 * ONNX Runtime Toggle Card - Enable/disable ORT Web
 */
function ORTToggleCard() {
  const [caps, setCaps] = useState<{
    webgpu: boolean
    simd: boolean
    threads: boolean
    crossOriginIsolated: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    detectCapabilities()
      .then(setCaps)
      .finally(() => setLoading(false))
  }, [])

  const ortEnabled = process.env.NEXT_PUBLIC_ENABLE_ORT === 'true'
  const canEnable = !loading && caps !== null

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              ONNX Runtime Web
            </span>
            {ortEnabled && (
              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 text-[9px] font-bold uppercase tracking-wide rounded">
                Enabled
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {ortEnabled 
              ? 'Using ONNX Runtime for faster inference (GPU/SIMD when available)'
              : 'Using Transformers.js (smaller bundle, reliable)'}
          </p>
        </div>
      </div>

      {/* Capability Checklist */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span>Detecting capabilities...</span>
        </div>
      ) : caps && (
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Your Device
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CapabilityBadge label="WebGPU" enabled={caps.webgpu} tooltip="2-4× faster with GPU" />
            <CapabilityBadge label="SIMD" enabled={caps.simd} tooltip="1.3-1.6× faster on CPU" />
            <CapabilityBadge label="Threads" enabled={caps.threads} tooltip="Multi-core parallelism" />
            <CapabilityBadge label="COI" enabled={caps.crossOriginIsolated} tooltip="Cross-Origin Isolated (required for threads)" />
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className={`
        p-2 rounded text-xs flex items-start gap-2
        ${ortEnabled 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}
      `}>
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <div>
          {ortEnabled ? (
            <p>
              <strong>ORT is enabled.</strong> You'll get the fastest backend your device supports.
              {caps?.webgpu && ' GPU acceleration active!'}
            </p>
          ) : (
            <p>
              <strong>ORT is disabled.</strong> Set <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-[10px]">NEXT_PUBLIC_ENABLE_ORT=true</code> in <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-[10px]">.env.local</code> to enable GPU acceleration (+10 MB bundle size).
            </p>
          )}
        </div>
      </div>

      {/* Learn More */}
      <a
        href="https://github.com/framersai/frame.dev/blob/master/apps/frame.dev/components/quarry/ORT_INTEGRATION.md"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline mt-2"
      >
        <HelpCircle className="w-3 h-3" />
        <span>Performance optimization guide</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  )
}

/**
 * Capability Badge - Shows if a feature is supported
 */
function CapabilityBadge({ label, enabled, tooltip }: { label: string; enabled: boolean; tooltip: string }) {
  return (
    <div
      className={`
        px-2 py-1.5 rounded text-[10px] font-medium flex items-center gap-1.5
        ${enabled 
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-700'}
      `}
      title={tooltip}
    >
      {enabled ? (
        <Check className="w-3 h-3" />
      ) : (
        <XCircleIcon className="w-3 h-3" />
      )}
      <span>{label}</span>
    </div>
  )
}

/**
 * Voice Transcription Settings - STT engine configuration
 */
function VoiceTranscriptionSettings() {
  const [sttEngine, setSTTEngine] = useState<'web-speech' | 'whisper'>('web-speech')
  const [sttLanguage, setSTTLanguage] = useState('en-US')
  const [sttQuality, setSTTQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [saveOriginalAudio, setSaveOriginalAudio] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [whisperAvailable, setWhisperAvailable] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Import dynamically to avoid SSR issues
        const { getMediaCapturePreferences } = await import('@/lib/localStorage')
        const { getSTTEngineInfo } = await import('@/lib/stt')
        
        const prefs = getMediaCapturePreferences()
        setSTTEngine(prefs.voice.sttEngine)
        setSTTLanguage(prefs.voice.language)
        setSTTQuality(prefs.voice.quality)
        setSaveOriginalAudio(prefs.voice.saveOriginalAudio)

        // Check Whisper availability
        const engines = await getSTTEngineInfo()
        const whisper = engines.find(e => e.engine === 'whisper')
        setWhisperAvailable(whisper?.available || false)
      } catch (e) {
        console.warn('[VoiceTranscriptionSettings] Failed to load settings:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Save settings
  const handleChange = async (updates: Partial<{
    sttEngine: 'web-speech' | 'whisper'
    language: string
    quality: 'low' | 'medium' | 'high'
    saveOriginalAudio: boolean
  }>) => {
    try {
      const { updateVoiceRecordingPreferences } = await import('@/lib/localStorage')
      updateVoiceRecordingPreferences(updates)
      
      if (updates.sttEngine !== undefined) setSTTEngine(updates.sttEngine)
      if (updates.language !== undefined) setSTTLanguage(updates.language)
      if (updates.quality !== undefined) setSTTQuality(updates.quality)
      if (updates.saveOriginalAudio !== undefined) setSaveOriginalAudio(updates.saveOriginalAudio)
    } catch (e) {
      console.warn('[VoiceTranscriptionSettings] Failed to save settings:', e)
    }
  }

  const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'pt-BR', label: 'Portuguese (Brazil)' },
    { code: 'zh-CN', label: 'Chinese (Simplified)' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'ko-KR', label: 'Korean' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Mic className="w-4 h-4" />
        Voice Transcription (Speech-to-Text)
      </label>

      {/* STT Engine Selection */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Transcription Engine
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Browser Speech */}
          <button
            onClick={() => handleChange({ sttEngine: 'web-speech' })}
            className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              sttEngine === 'web-speech'
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-500" />
            <div className="text-left">
              <span className="text-sm font-medium block">Browser Speech</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Free, works offline</span>
            </div>
          </button>

          {/* OpenAI Whisper */}
          <button
            onClick={() => whisperAvailable && handleChange({ sttEngine: 'whisper' })}
            disabled={!whisperAvailable}
            className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
              sttEngine === 'whisper'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : whisperAvailable
                  ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 text-violet-500" />
            <div className="text-left">
              <span className="text-sm font-medium block">OpenAI Whisper</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {whisperAvailable ? 'High accuracy' : 'Needs API key'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Language Selection */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Language
        </label>
        <select
          value={sttLanguage}
          onChange={(e) => handleChange({ language: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Audio Quality */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          Recording Quality
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => handleChange({ quality: q })}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                sttQuality === q
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}
            >
              {q.charAt(0).toUpperCase() + q.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400">
          {sttQuality === 'low' && '64kbps - Smaller files, faster uploads'}
          {sttQuality === 'medium' && '128kbps - Balanced quality and size'}
          {sttQuality === 'high' && '256kbps - Best quality, larger files'}
        </p>
      </div>

      {/* Save Original Audio Toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Save Original Audio
          </span>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            Keep audio files alongside transcriptions
          </p>
        </div>
        <button
          onClick={() => handleChange({ saveOriginalAudio: !saveOriginalAudio })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            saveOriginalAudio
              ? 'bg-rose-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              saveOriginalAudio ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Voice memos are transcribed locally with Browser Speech or via OpenAI's Whisper API for higher accuracy.
      </p>
    </div>
  )
}