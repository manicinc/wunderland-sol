/**
 * RAG Quick Settings
 * Quick preset selector for RAG settings in the Ask sidebar
 * @module quarry/ui/ask/RAGQuickSettings
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Scale,
  Radar,
  ChevronDown,
  Sliders,
  Calendar,
  CalendarCheck2,
  Clock,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react'
import {
  useRAGContext,
  RAG_PRESETS,
  type RAGPreset,
} from './RAGContext'

// ============================================================================
// PRESET OPTION
// ============================================================================

interface PresetOptionProps {
  preset: RAGPreset
  label: string
  description: string
  icon: React.ElementType
  isActive: boolean
  onSelect: () => void
}

function PresetOption({
  preset,
  label,
  description,
  icon: Icon,
  isActive,
  onSelect,
}: PresetOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all
        ${
          isActive
            ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400'
            : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-zinc-600'
        }
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center
          ${isActive ? 'bg-cyan-500/30' : 'bg-zinc-700'}
        `}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-zinc-500 truncate">{description}</div>
      </div>
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-cyan-500" />
      )}
    </button>
  )
}

// ============================================================================
// SLIDER CONTROL
// ============================================================================

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (v) => String(v),
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-cyan-400 font-mono">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full bg-zinc-700 appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
        "
      />
    </div>
  )
}

// ============================================================================
// TOGGLE CONTROL
// ============================================================================

interface ToggleControlProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleControl({ label, description, checked, onChange }: ToggleControlProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-zinc-800 transition-colors"
    >
      <div>
        <div className="text-sm text-zinc-300">{label}</div>
        {description && (
          <div className="text-xs text-zinc-500">{description}</div>
        )}
      </div>
      {checked ? (
        <ToggleRight className="w-6 h-6 text-cyan-500" />
      ) : (
        <ToggleLeft className="w-6 h-6 text-zinc-500" />
      )}
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface RAGQuickSettingsProps {
  className?: string
}

export default function RAGQuickSettings({ className = '' }: RAGQuickSettingsProps) {
  const { state, setPreset, updateSettings } = useRAGContext()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const presets: {
    id: RAGPreset
    label: string
    description: string
    icon: React.ElementType
  }[] = [
    {
      id: 'precise',
      label: 'Precise',
      description: 'High accuracy, fewer results',
      icon: Zap,
    },
    {
      id: 'balanced',
      label: 'Balanced',
      description: 'Good accuracy and coverage',
      icon: Scale,
    },
    {
      id: 'broad',
      label: 'Broad',
      description: 'More results, wider search',
      icon: Radar,
    },
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Presets */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Quick RAG
        </h4>
        <div className="space-y-2">
          {presets.map((preset) => (
            <PresetOption
              key={preset.id}
              preset={preset.id}
              label={preset.label}
              description={preset.description}
              icon={preset.icon}
              isActive={state.preset === preset.id}
              onSelect={() => setPreset(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* Planner Toggle */}
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <ToggleControl
          label="Include Planner Data"
          description="Search tasks and events"
          checked={state.settings.includePlannerData}
          onChange={(checked) => updateSettings({ includePlannerData: checked })}
        />
      </div>

      {/* Advanced Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full p-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sliders className="w-4 h-4" />
          Advanced Settings
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <SliderControl
              label="Similarity Threshold"
              value={state.settings.similarityThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(value) => updateSettings({ similarityThreshold: value })}
              formatValue={(v) => v.toFixed(2)}
            />

            <SliderControl
              label="Max Results"
              value={state.settings.maxResults}
              min={5}
              max={50}
              step={5}
              onChange={(value) => updateSettings({ maxResults: value })}
            />

            <SliderControl
              label="Recent History (days)"
              value={state.settings.recentHistoryDays}
              min={1}
              max={90}
              step={1}
              onChange={(value) => updateSettings({ recentHistoryDays: value })}
            />

            <div className="space-y-2">
              <ToggleControl
                label="Temporal Weighting"
                description="Boost recent content"
                checked={state.settings.temporalWeighting}
                onChange={(checked) => updateSettings({ temporalWeighting: checked })}
              />
              <ToggleControl
                label="Auto-detect Dates"
                description='Parse "last week", etc.'
                checked={state.settings.autoDetectTemporal}
                onChange={(checked) => updateSettings({ autoDetectTemporal: checked })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Settings Summary */}
      <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Info className="w-3 h-3" />
          Current Settings
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-zinc-400">
            Threshold: <span className="text-zinc-200">{state.settings.similarityThreshold}</span>
          </div>
          <div className="text-zinc-400">
            Max: <span className="text-zinc-200">{state.settings.maxResults}</span>
          </div>
          <div className="text-zinc-400">
            Planner: <span className="text-zinc-200">{state.settings.includePlannerData ? 'On' : 'Off'}</span>
          </div>
          <div className="text-zinc-400">
            History: <span className="text-zinc-200">{state.settings.recentHistoryDays}d</span>
          </div>
        </div>
      </div>
    </div>
  )
}
