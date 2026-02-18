/**
 * Link Settings Component
 * @module codex/ui/settings/LinkSettings
 *
 * Granular settings for bidirectional links, backlinks, and transclusion.
 * Includes toggles, sliders, and select options for all link-related preferences.
 */

'use client'

import React from 'react'
import {
  Link2,
  Eye,
  Layers,
  RefreshCw,
  Clock,
  LayoutGrid,
  Zap,
  AlertCircle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export type BacklinkIndicatorStyle = 'dot' | 'count' | 'none'

export interface LinkPreferences {
  /** Auto-update backlinks when content changes */
  autoUpdateBacklinks: boolean
  /** Show hover preview for links */
  showHoverPreview: boolean
  /** Hover preview delay in milliseconds (100-1000) */
  hoverPreviewDelay: number
  /** Backlink indicator style in editor */
  backlinkIndicatorStyle: BacklinkIndicatorStyle
  /** Maximum transclusion depth (1-5) */
  maxTransclusionDepth: number
  /** Enable experimental mirror sync */
  enableMirrorSync: boolean
  /** Show unlinked mentions suggestions */
  showUnlinkedMentions: boolean
}

export const DEFAULT_LINK_PREFERENCES: LinkPreferences = {
  autoUpdateBacklinks: true,
  showHoverPreview: true,
  hoverPreviewDelay: 300,
  backlinkIndicatorStyle: 'count',
  maxTransclusionDepth: 3,
  enableMirrorSync: false,
  showUnlinkedMentions: false,
}

export interface LinkSettingsProps {
  /** Current link preferences */
  preferences: Partial<LinkPreferences>
  /** Called when a preference changes */
  onChange: (key: keyof LinkPreferences, value: any) => void
  /** Theme for styling */
  theme?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description: string
  children: React.ReactNode
  isDark: boolean
  experimental?: boolean
}

function SettingRow({ icon, label, description, children, isDark, experimental }: SettingRowProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg transition-colors',
      isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
    )}>
      <div className={cn(
        'p-1.5 rounded-lg flex-shrink-0',
        isDark ? 'bg-zinc-800' : 'bg-zinc-100'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium',
            isDark ? 'text-white' : 'text-zinc-900'
          )}>
            {label}
          </span>
          {experimental && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
            )}>
              Experimental
            </span>
          )}
        </div>
        <p className={cn(
          'text-xs mt-0.5',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          {description}
        </p>
      </div>
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  isDark: boolean
}

function Toggle({ checked, onChange, disabled, isDark }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        checked
          ? 'bg-cyan-500 focus:ring-cyan-500'
          : isDark
            ? 'bg-zinc-700 focus:ring-zinc-500'
            : 'bg-zinc-300 focus:ring-zinc-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
          checked && 'translate-x-5'
        )}
      />
    </button>
  )
}

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  unit?: string
  isDark: boolean
}

function Slider({ value, min, max, step = 1, onChange, unit, isDark }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-24 h-1.5 rounded-full appearance-none cursor-pointer',
          isDark ? 'bg-zinc-700' : 'bg-zinc-200',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer'
        )}
        style={{
          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${percentage}%, ${isDark ? '#3f3f46' : '#e4e4e7'} ${percentage}%, ${isDark ? '#3f3f46' : '#e4e4e7'} 100%)`,
        }}
        aria-label={`Value: ${value}${unit || ''}`}
      />
      <span className={cn(
        'text-xs font-mono w-12 text-right',
        isDark ? 'text-zinc-400' : 'text-zinc-600'
      )}>
        {value}{unit}
      </span>
    </div>
  )
}

interface SelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  isDark: boolean
}

function Select({ value, options, onChange, isDark }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'text-xs px-2 py-1.5 rounded-lg border transition-colors cursor-pointer',
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-white focus:border-cyan-500'
          : 'bg-white border-zinc-200 text-zinc-900 focus:border-cyan-400',
        'focus:outline-none focus:ring-1 focus:ring-cyan-500/20'
      )}
      aria-label="Select option"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function LinkSettings({
  preferences,
  onChange,
  theme = 'light',
}: LinkSettingsProps) {
  const isDark = theme?.includes('dark')

  // Merge with defaults
  const prefs = { ...DEFAULT_LINK_PREFERENCES, ...preferences }

  return (
    <div className="space-y-1" role="group" aria-label="Link settings">
      {/* Section Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 mb-2',
        isDark ? 'text-zinc-400' : 'text-zinc-500'
      )}>
        <Link2 className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Bidirectional Links
        </span>
      </div>

      {/* Auto-update backlinks */}
      <SettingRow
        icon={<RefreshCw className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />}
        label="Auto-update backlinks"
        description="Automatically rebuild backlinks when content changes"
        isDark={isDark}
      >
        <Toggle
          checked={prefs.autoUpdateBacklinks}
          onChange={(v) => onChange('autoUpdateBacklinks', v)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Show hover preview */}
      <SettingRow
        icon={<Eye className={cn('w-4 h-4', isDark ? 'text-blue-400' : 'text-blue-600')} />}
        label="Hover preview"
        description="Show preview popup when hovering over [[...]] links"
        isDark={isDark}
      >
        <Toggle
          checked={prefs.showHoverPreview}
          onChange={(v) => onChange('showHoverPreview', v)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Hover preview delay */}
      {prefs.showHoverPreview && (
        <SettingRow
          icon={<Clock className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />}
          label="Preview delay"
          description="Delay before showing hover preview"
          isDark={isDark}
        >
          <Slider
            value={prefs.hoverPreviewDelay}
            min={100}
            max={1000}
            step={50}
            onChange={(v) => onChange('hoverPreviewDelay', v)}
            unit="ms"
            isDark={isDark}
          />
        </SettingRow>
      )}

      {/* Backlink indicator style */}
      <SettingRow
        icon={<LayoutGrid className={cn('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-600')} />}
        label="Backlink indicator"
        description="How to show blocks that have backlinks"
        isDark={isDark}
      >
        <Select
          value={prefs.backlinkIndicatorStyle}
          options={[
            { value: 'count', label: 'Count badge' },
            { value: 'dot', label: 'Dot indicator' },
            { value: 'none', label: 'Hidden' },
          ]}
          onChange={(v) => onChange('backlinkIndicatorStyle', v as BacklinkIndicatorStyle)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Max transclusion depth */}
      <SettingRow
        icon={<Layers className={cn('w-4 h-4', isDark ? 'text-amber-400' : 'text-amber-600')} />}
        label="Transclusion depth"
        description="Maximum depth for nested embeds and mirrors"
        isDark={isDark}
      >
        <Slider
          value={prefs.maxTransclusionDepth}
          min={1}
          max={5}
          step={1}
          onChange={(v) => onChange('maxTransclusionDepth', v)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Show unlinked mentions */}
      <SettingRow
        icon={<AlertCircle className={cn('w-4 h-4', isDark ? 'text-emerald-400' : 'text-emerald-600')} />}
        label="Unlinked mentions"
        description="Suggest potential links from text that matches strand titles"
        isDark={isDark}
      >
        <Toggle
          checked={prefs.showUnlinkedMentions}
          onChange={(v) => onChange('showUnlinkedMentions', v)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Enable mirror sync - experimental */}
      <SettingRow
        icon={<Zap className={cn('w-4 h-4', isDark ? 'text-purple-400' : 'text-purple-600')} />}
        label="Mirror sync"
        description="Live two-way sync for =[[...]] mirror blocks"
        isDark={isDark}
        experimental
      >
        <Toggle
          checked={prefs.enableMirrorSync}
          onChange={(v) => onChange('enableMirrorSync', v)}
          isDark={isDark}
        />
      </SettingRow>

      {/* Info footer */}
      <div className={cn(
        'flex items-start gap-2 px-3 py-2 mt-3 rounded-lg',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      )}>
        <Info className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isDark ? 'text-zinc-500' : 'text-zinc-400')} />
        <p className={cn(
          'text-[11px] leading-relaxed',
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        )}>
          Use <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">[[strand#block]]</code> to 
          link, <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">![[...]]</code> to 
          embed, <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">^[[...]]</code> to 
          cite, and <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono">=[[...]]</code> to 
          mirror.
        </p>
      </div>
    </div>
  )
}

export { LinkSettings }

