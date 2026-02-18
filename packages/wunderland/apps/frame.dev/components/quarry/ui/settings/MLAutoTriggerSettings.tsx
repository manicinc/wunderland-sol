/**
 * ML Auto-Trigger Settings Panel
 * @module codex/ui/settings/MLAutoTriggerSettings
 *
 * @description
 * Settings panel for configuring automatic ML processing triggers:
 * - Block tagging on save
 * - Semantic embedding updates
 * - Tag bubbling from blocks to document
 * - Smart staleness detection
 *
 * @remarks
 * These features are opt-in and disabled by default to respect user
 * preferences for computational resources.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  Brain,
  RefreshCw,
  Tags,
  Zap,
  Settings,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  type MLAutoTriggerSettings as MLSettings,
  DEFAULT_ML_AUTO_TRIGGER_SETTINGS,
  type AutoTagPreset,
} from '@/lib/settings/mlAutoTriggerSettings'
import {
  getMLAutoTriggerSettings,
  updateMLAutoTriggerSettings,
} from '@/lib/localStorage'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface MLAutoTriggerSettingsProps {
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when settings change */
  onChange?: (settings: MLSettings) => void
  /** Additional class names */
  className?: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface ToggleSettingProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  theme: 'light' | 'dark'
}

function ToggleSetting({ label, description, checked, onChange, disabled, theme }: ToggleSettingProps) {
  const isDark = theme === 'dark'

  return (
    <label className={cn(
      'flex items-start justify-between gap-3 py-2',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    )}>
      <div>
        <span className={cn(
          'text-sm font-medium',
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        )}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={cn(
          'w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-500' : (isDark ? 'bg-zinc-700' : 'bg-zinc-200')
        )}>
          <div className={cn(
            'w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform',
            checked ? 'ml-5' : 'ml-1'
          )} />
        </div>
      </div>
    </label>
  )
}

interface NumberSettingProps {
  label: string
  description?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  disabled?: boolean
  theme: 'light' | 'dark'
}

function NumberSetting({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  disabled,
  theme,
}: NumberSettingProps) {
  const isDark = theme === 'dark'

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-2',
      disabled && 'opacity-50'
    )}>
      <div>
        <span className={cn(
          'text-sm font-medium',
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        )}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Math.min(max, Math.max(min, parseFloat(e.target.value) || min)))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            'w-20 px-2 py-1 rounded text-sm text-right outline-none',
            isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800',
            disabled && 'cursor-not-allowed'
          )}
        />
        {unit && (
          <span className="text-xs text-zinc-500">{unit}</span>
        )}
      </div>
    </div>
  )
}

interface SelectSettingProps {
  label: string
  description?: string
  value: string
  options: { value: string; label: string; description?: string }[]
  onChange: (value: string) => void
  disabled?: boolean
  theme: 'light' | 'dark'
}

function SelectSetting({
  label,
  description,
  value,
  options,
  onChange,
  disabled,
  theme,
}: SelectSettingProps) {
  const isDark = theme === 'dark'

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 py-2',
      disabled && 'opacity-50'
    )}>
      <div>
        <span className={cn(
          'text-sm font-medium',
          isDark ? 'text-zinc-300' : 'text-zinc-700'
        )}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'px-2 py-1 rounded text-sm outline-none',
          isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800',
          disabled && 'cursor-not-allowed'
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function MLAutoTriggerSettings({
  theme = 'dark',
  onChange,
  className,
}: MLAutoTriggerSettingsProps) {
  const isDark = theme === 'dark'

  // Settings state
  const [settings, setSettings] = useState<MLSettings>(DEFAULT_ML_AUTO_TRIGGER_SETTINGS)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main']))

  // Load saved settings
  useEffect(() => {
    const saved = getMLAutoTriggerSettings()
    setSettings(saved)
  }, [])

  // Save settings on change
  const handleChange = useCallback((updates: Partial<MLSettings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    updateMLAutoTriggerSettings(updates)
    onChange?.(newSettings)
  }, [settings, onChange])

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  // Preset options
  const presetOptions: { value: AutoTagPreset; label: string; description: string }[] = [
    { value: 'nlp-only', label: 'NLP Only', description: 'Fast, offline tagging' },
    { value: 'default', label: 'Default', description: 'Balanced approach' },
    { value: 'conservative', label: 'Conservative', description: 'High confidence only' },
    { value: 'aggressive', label: 'Aggressive', description: 'Tag liberally' },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with master toggle */}
      <div className={cn(
        'p-4 rounded-xl border',
        isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200'
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            settings.enabled
              ? 'bg-blue-500/20'
              : (isDark ? 'bg-zinc-700' : 'bg-zinc-100')
          )}>
            <Brain className={cn(
              'w-5 h-5',
              settings.enabled ? 'text-blue-500' : 'text-zinc-500'
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                'text-sm font-semibold',
                isDark ? 'text-zinc-200' : 'text-zinc-800'
              )}>
                ML Auto-Processing
              </h3>
              <ToggleSetting
                label=""
                checked={settings.enabled}
                onChange={v => handleChange({ enabled: v })}
                theme={theme}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Automatically process strands with NLP for block tagging, embeddings, and tag bubbling.
              {!settings.enabled && ' Currently disabled.'}
            </p>
          </div>
        </div>

        {/* Warning when enabled */}
        {settings.enabled && (
          <div className={cn(
            'mt-3 p-2 rounded-lg flex items-start gap-2',
            isDark ? 'bg-amber-500/10' : 'bg-amber-50'
          )}>
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ML processing will run automatically on save. This may use additional
              computational resources. Processing only occurs when content changes.
            </p>
          </div>
        )}
      </div>

      {/* Trigger Settings */}
      <div className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200',
        !settings.enabled && 'opacity-60'
      )}>
        <button
          onClick={() => toggleSection('triggers')}
          disabled={!settings.enabled}
          className={cn(
            'w-full flex items-center gap-3 p-4 text-left',
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50',
            !settings.enabled && 'cursor-not-allowed'
          )}
        >
          <div className={cn(
            'p-2 rounded-lg',
            isDark ? 'bg-zinc-700' : 'bg-zinc-100'
          )}>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'text-sm font-semibold',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              Trigger Settings
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              When to run ML processing
            </p>
          </div>
          {expandedSections.has('triggers') ? (
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('triggers') && settings.enabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'p-4 pt-0 border-t space-y-1',
                isDark ? 'border-zinc-700/50' : 'border-zinc-200'
              )}>
                <ToggleSetting
                  label="Trigger on save"
                  description="Process when content is saved"
                  checked={settings.triggerOnSave}
                  onChange={v => handleChange({ triggerOnSave: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <ToggleSetting
                  label="Trigger on publish"
                  description="Process when publishing to GitHub"
                  checked={settings.triggerOnPublish}
                  onChange={v => handleChange({ triggerOnPublish: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <ToggleSetting
                  label="Require content change"
                  description="Skip if content hash is unchanged"
                  checked={settings.requireContentChange}
                  onChange={v => handleChange({ requireContentChange: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <NumberSetting
                  label="Debounce delay"
                  description="Prevent rapid-fire processing"
                  value={settings.debounceMs}
                  onChange={v => handleChange({ debounceMs: v })}
                  min={500}
                  max={10000}
                  step={500}
                  unit="ms"
                  disabled={!settings.enabled}
                  theme={theme}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Processing Features */}
      <div className={cn(
        'rounded-xl border overflow-hidden',
        isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200',
        !settings.enabled && 'opacity-60'
      )}>
        <button
          onClick={() => toggleSection('features')}
          disabled={!settings.enabled}
          className={cn(
            'w-full flex items-center gap-3 p-4 text-left',
            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50',
            !settings.enabled && 'cursor-not-allowed'
          )}
        >
          <div className={cn(
            'p-2 rounded-lg',
            isDark ? 'bg-zinc-700' : 'bg-zinc-100'
          )}>
            <Sparkles className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'text-sm font-semibold',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              Processing Features
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              What ML features to enable
            </p>
          </div>
          {expandedSections.has('features') ? (
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has('features') && settings.enabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                'p-4 pt-0 border-t space-y-1',
                isDark ? 'border-zinc-700/50' : 'border-zinc-200'
              )}>
                <ToggleSetting
                  label="Auto-tag blocks"
                  description="Run NLP block tagging and worthiness scoring"
                  checked={settings.autoTagBlocks}
                  onChange={v => handleChange({ autoTagBlocks: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <ToggleSetting
                  label="Update embeddings"
                  description="Generate semantic search embeddings"
                  checked={settings.autoUpdateEmbeddings}
                  onChange={v => handleChange({ autoUpdateEmbeddings: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <ToggleSetting
                  label="Run tag bubbling"
                  description="Aggregate block tags to document level"
                  checked={settings.autoRunTagBubbling}
                  onChange={v => handleChange({ autoRunTagBubbling: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />
                <ToggleSetting
                  label="Generate summaries"
                  description="Use LLM for extractive summaries (slower)"
                  checked={settings.autoGenerateSummary}
                  onChange={v => handleChange({ autoGenerateSummary: v })}
                  disabled={!settings.enabled}
                  theme={theme}
                />

                {/* Preset selector */}
                <div className={cn(
                  'mt-4 p-3 rounded-lg',
                  isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
                )}>
                  <SelectSetting
                    label="Tagging preset"
                    description="How aggressively to tag blocks"
                    value={settings.autoTagPreset}
                    options={presetOptions}
                    onChange={v => handleChange({ autoTagPreset: v as AutoTagPreset })}
                    disabled={!settings.enabled}
                    theme={theme}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info footer */}
      <div className={cn(
        'p-3 rounded-lg flex items-start gap-2',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'
      )}>
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-500">
          ML processing uses content hashing to detect changes. Only modified strands
          are reprocessed. Block tags are stored in the strand_blocks table and can
          be viewed in the Tags sidebar panel.
        </p>
      </div>
    </div>
  )
}

export default MLAutoTriggerSettings
