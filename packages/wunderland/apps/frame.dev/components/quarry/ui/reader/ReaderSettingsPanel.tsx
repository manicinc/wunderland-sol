/**
 * Reader Settings Panel - Compact settings for right sidebar
 * @module codex/ui/ReaderSettingsPanel
 *
 * @description
 * Compact version of reader preferences for the metadata panel.
 * Includes theme, font size, and TTS settings.
 */

'use client'

import React from 'react'
import { Sun, Moon, Palette, Sparkles, Type, Volume2 } from 'lucide-react'
import type { UserPreferences } from '@/lib/localStorage'

interface ReaderSettingsPanelProps {
  /** Current preferences */
  preferences: UserPreferences
  /** Update theme */
  onThemeChange: (theme: UserPreferences['theme']) => void
  /** Update font size */
  onFontSizeChange: (size: number) => void
  /** Panel text size */
  panelSize?: 's' | 'm' | 'l'
  /** TTS settings */
  ttsSupported?: boolean
  onTTSRateChange?: (rate: number) => void
  onTTSVolumeChange?: (volume: number) => void
}

const THEME_PRESETS: Array<{
  id: UserPreferences['theme']
  label: string
  icon: React.ReactNode
  bgClass: string
}> = [
  {
    id: 'light',
    label: 'Light',
    icon: <Sun className="w-3.5 h-3.5" />,
    bgClass: 'bg-white border-zinc-200',
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: <Moon className="w-3.5 h-3.5" />,
    bgClass: 'bg-zinc-900 border-zinc-700',
  },
  {
    id: 'sepia-light',
    label: 'Sepia',
    icon: <Palette className="w-3.5 h-3.5" />,
    bgClass: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'sepia-dark',
    label: 'Sepia Dark',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    bgClass: 'bg-amber-900 border-amber-700',
  },
  {
    id: 'terminal-dark',
    label: 'Terminal',
    icon: <span className="font-mono text-xs">{'>'}</span>,
    bgClass: 'bg-black border-green-700',
  },
]

export default function ReaderSettingsPanel({
  preferences,
  onThemeChange,
  onFontSizeChange,
  panelSize = 's',
  ttsSupported = false,
  onTTSRateChange,
  onTTSVolumeChange,
}: ReaderSettingsPanelProps) {
  const textSizeClasses = {
    base: panelSize === 'l' ? 'text-[13px]' : panelSize === 'm' ? 'text-[12px]' : 'text-[11px]',
    sm: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
    xs: panelSize === 'l' ? 'text-[11px]' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
  }

  const ttsSettings = preferences.tts || { rate: 1, volume: 1, pitch: 1 }

  return (
    <div className="space-y-4">
      {/* Theme Selection */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-2.5 py-1.5 bg-gradient-to-r from-violet-50/80 to-pink-50/80 dark:from-violet-950/30 dark:to-pink-950/30 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3 h-3 text-violet-500" />
            <span className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-200`}>
              Theme
            </span>
          </div>
        </div>
        <div className="p-2.5">
          <div className="grid grid-cols-5 gap-1">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onThemeChange(preset.id)}
                className={`
                  p-1.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1
                  ${preferences.theme === preset.id
                    ? 'border-violet-500 ring-2 ring-violet-200 dark:ring-violet-800'
                    : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                  }
                  ${preset.bgClass}
                `}
                title={preset.label}
              >
                <span className={preferences.theme === preset.id ? 'text-violet-600' : 'text-zinc-600 dark:text-zinc-400'}>
                  {preset.icon}
                </span>
              </button>
            ))}
          </div>
          <p className={`${textSizeClasses.xs} text-zinc-400 mt-1.5 text-center`}>
            {preferences.theme.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </p>
        </div>
      </div>

      {/* Font Size */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 dark:from-cyan-950/30 dark:to-blue-950/30 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Type className="w-3 h-3 text-cyan-500" />
              <span className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-200`}>
                Font Size
              </span>
            </div>
            <span className={`${textSizeClasses.sm} font-mono text-zinc-500`}>
              {(preferences.fontSize * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="p-2.5">
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={preferences.fontSize}
            onChange={(e) => onFontSizeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className={`flex justify-between ${textSizeClasses.xs} text-zinc-400 mt-1`}>
            <span>A</span>
            <span className="text-base">A</span>
          </div>
        </div>
      </div>

      {/* TTS Settings */}
      {ttsSupported && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/30 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-emerald-500" />
              <span className={`${textSizeClasses.base} font-semibold text-zinc-700 dark:text-zinc-200`}>
                Read Aloud
              </span>
            </div>
          </div>
          <div className="p-2.5 space-y-3">
            {/* Speech Rate */}
            {onTTSRateChange && (
              <div>
                <div className={`flex justify-between ${textSizeClasses.sm} text-zinc-600 dark:text-zinc-400 mb-1`}>
                  <span>Speed</span>
                  <span className="font-mono">{ttsSettings.rate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsSettings.rate}
                  onChange={(e) => onTTSRateChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}

            {/* Volume */}
            {onTTSVolumeChange && (
              <div>
                <div className={`flex justify-between ${textSizeClasses.sm} text-zinc-600 dark:text-zinc-400 mb-1`}>
                  <span>Volume</span>
                  <span className="font-mono">{Math.round(ttsSettings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ttsSettings.volume}
                  onChange={(e) => onTTSVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Info */}
      <p className={`${textSizeClasses.xs} text-zinc-400 dark:text-zinc-500 text-center`}>
        Settings sync across sessions
      </p>
    </div>
  )
}
