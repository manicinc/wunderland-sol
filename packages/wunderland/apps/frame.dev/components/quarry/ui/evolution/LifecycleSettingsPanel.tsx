/**
 * Lifecycle Settings Panel
 * 
 * Configuration panel for lifecycle decay thresholds and behavior.
 * Allows users to customize when strands transition between stages.
 * 
 * @module components/quarry/ui/evolution/LifecycleSettingsPanel
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Clock,
  Activity,
  Sparkles,
  Save,
  RotateCcw,
  Info,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LifecycleSettings } from '@/lib/analytics/lifecycleTypes'
import { DEFAULT_LIFECYCLE_SETTINGS } from '@/lib/analytics/lifecycleTypes'

// ============================================================================
// TYPES
// ============================================================================

interface LifecycleSettingsPanelProps {
  settings: LifecycleSettings
  onSave: (settings: LifecycleSettings) => void
  isDark: boolean
  compact?: boolean
}

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

function SettingSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  isDark,
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
  isDark: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={cn(
          'text-sm font-medium',
          isDark ? 'text-zinc-200' : 'text-zinc-700'
        )}>
          {label}
        </label>
        <span className={cn(
          'text-sm font-mono px-2 py-0.5 rounded',
          isDark ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
        )}>
          {value}{unit}
        </span>
      </div>
      {description && (
        <p className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
          {description}
        </p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'w-full h-2 rounded-lg appearance-none cursor-pointer',
          isDark ? 'bg-zinc-700' : 'bg-zinc-200',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-emerald-500',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110'
        )}
      />
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

function SettingToggle({
  label,
  description,
  checked,
  onChange,
  isDark,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  isDark: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label className={cn(
          'text-sm font-medium',
          isDark ? 'text-zinc-200' : 'text-zinc-700'
        )}>
          {label}
        </label>
        {description && (
          <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          checked
            ? 'bg-emerald-500'
            : isDark ? 'bg-zinc-700' : 'bg-zinc-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LifecycleSettingsPanel({
  settings: initialSettings,
  onSave,
  isDark,
  compact = false,
}: LifecycleSettingsPanelProps) {
  const [settings, setSettings] = useState<LifecycleSettings>(initialSettings)
  const [hasChanges, setHasChanges] = useState(false)

  const updateSetting = <K extends keyof LifecycleSettings>(
    key: K,
    value: LifecycleSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(settings)
    setHasChanges(false)
  }

  const handleReset = () => {
    setSettings(DEFAULT_LIFECYCLE_SETTINGS)
    setHasChanges(true)
  }

  return (
    <div className={cn(
      'rounded-xl border',
      isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200',
      compact ? 'p-4' : 'p-6'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={cn(
          'font-semibold flex items-center gap-2',
          compact ? 'text-sm' : 'text-base',
          isDark ? 'text-zinc-200' : 'text-zinc-800'
        )}>
          <Settings className="w-4 h-4 text-zinc-500" />
          Lifecycle Settings
        </h3>
        {hasChanges && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            'bg-amber-500/10 text-amber-500'
          )}>
            Unsaved changes
          </span>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-6">
        {/* Threshold Settings */}
        <div className="space-y-4">
          <h4 className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Decay Thresholds
          </h4>

          <SettingSlider
            label="Fresh Duration"
            description="Days a strand stays 'Fresh' after access"
            value={settings.freshThresholdDays}
            min={1}
            max={30}
            step={1}
            unit=" days"
            onChange={(v) => updateSetting('freshThresholdDays', v)}
            isDark={isDark}
          />

          <SettingSlider
            label="Fade Duration"
            description="Days until an 'Active' strand becomes 'Faded'"
            value={settings.fadeThresholdDays}
            min={7}
            max={90}
            step={1}
            unit=" days"
            onChange={(v) => updateSetting('fadeThresholdDays', v)}
            isDark={isDark}
          />

          <SettingSlider
            label="Engagement Weight"
            description="How much activity (views, edits, links) slows decay"
            value={settings.engagementWeight}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => updateSetting('engagementWeight', v)}
            isDark={isDark}
          />
        </div>

        {/* Behavior Settings */}
        <div className="space-y-4">
          <h4 className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )}>
            Behavior
          </h4>

          <SettingToggle
            label="Auto-Resurface"
            description="Suggest faded strands during rituals"
            checked={settings.autoResurface}
            onChange={(v) => updateSetting('autoResurface', v)}
            isDark={isDark}
          />

          <SettingToggle
            label="Ritual Reminders"
            description="Show morning/evening ritual prompts"
            checked={settings.ritualReminders}
            onChange={(v) => updateSetting('ritualReminders', v)}
            isDark={isDark}
          />

          <SettingSlider
            label="Resurface Limit"
            description="Maximum suggestions shown"
            value={settings.resurfaceLimit}
            min={1}
            max={20}
            step={1}
            onChange={(v) => updateSetting('resurfaceLimit', v)}
            isDark={isDark}
          />
        </div>

        {/* Preview */}
        <div className={cn(
          'p-4 rounded-lg',
          isDark ? 'bg-zinc-700/50' : 'bg-zinc-50'
        )}>
          <h4 className={cn(
            'text-xs font-semibold mb-3 flex items-center gap-2',
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          )}>
            <Info className="w-3.5 h-3.5" />
            Preview
          </h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                Fresh: 0-{settings.freshThresholdDays} days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                Active: {settings.freshThresholdDays + 1}-{settings.fadeThresholdDays} days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className={isDark ? 'text-zinc-300' : 'text-zinc-600'}>
                Faded: {settings.fadeThresholdDays}+ days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={handleReset}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            isDark
              ? 'hover:bg-zinc-700 text-zinc-400'
              : 'hover:bg-zinc-100 text-zinc-500'
          )}
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            hasChanges
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
              : isDark
                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
          )}
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}

export default LifecycleSettingsPanel

