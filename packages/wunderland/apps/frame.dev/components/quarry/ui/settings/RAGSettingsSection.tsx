/**
 * RAG Settings Section
 * Full RAG configuration UI for the Settings page
 * @module quarry/ui/settings/RAGSettingsSection
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Database,
  Sliders,
  ChevronDown,
  ChevronRight,
  Calendar,
  ListTodo,
  Zap,
  Scale,
  Radar,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  Check,
  Info,
  Sparkles,
  HelpCircle,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface RAGSettingsState {
  // Similarity
  similarityThreshold: number
  maxResults: number
  minRelevanceScore: number

  // Chunking
  chunkSize: number
  chunkOverlap: number

  // Indexing
  autoIndexOnOpen: boolean
  backgroundIndexing: boolean
  indexedContentTypes: string[]

  // Planner Integration
  includePlannerData: boolean
  recentHistoryDays: number
  temporalWeighting: boolean

  // Model
  embeddingModel: 'local' | 'openai' | 'cohere'
  rerankerEnabled: boolean
}

interface RAGSettingsSectionProps {
  settings: RAGSettingsState
  onSettingsChange: (settings: Partial<RAGSettingsState>) => void
  indexStatus?: {
    count: number
    lastIndexed: string | null
    isIndexing: boolean
  }
  onReindex?: () => void
  onClearIndex?: () => void
  className?: string
  theme?: 'light' | 'dark'
}

// ============================================================================
// SLIDER COMPONENT
// ============================================================================

interface SettingSliderProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  theme: 'light' | 'dark'
}

function SettingSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = (v) => String(v),
  theme,
}: SettingSliderProps) {
  const isDark = theme === 'dark'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {label}
          </label>
          {description && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {description}
            </p>
          )}
        </div>
        <span className={`font-mono text-sm ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`
          w-full h-2 rounded-full appearance-none cursor-pointer
          ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
        `}
      />
    </div>
  )
}

// ============================================================================
// TOGGLE COMPONENT
// ============================================================================

interface SettingToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  theme: 'light' | 'dark'
}

function SettingToggle({ label, description, checked, onChange, theme }: SettingToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        flex items-center justify-between w-full p-3 rounded-lg transition-colors
        ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}
      `}
    >
      <div className="text-left">
        <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          {label}
        </div>
        {description && (
          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {description}
          </div>
        )}
      </div>
      <div
        className={`
          relative w-11 h-6 rounded-full transition-colors
          ${checked ? 'bg-cyan-500' : isDark ? 'bg-gray-700' : 'bg-gray-300'}
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  )
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

interface CollapsibleSectionProps {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
  theme: 'light' | 'dark'
}

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  theme,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isDark = theme === 'dark'

  return (
    <div
      className={`
        rounded-xl border overflow-hidden
        ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}
      `}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full p-4 transition-colors
          ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {title}
          </span>
        </div>
        <ChevronDown
          className={`
            w-5 h-5 transition-transform
            ${isDark ? 'text-gray-500' : 'text-gray-400'}
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`
                p-4 pt-0 space-y-4
                ${isDark ? 'border-t border-gray-800' : 'border-t border-gray-200'}
              `}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RAGSettingsSection({
  settings,
  onSettingsChange,
  indexStatus,
  onReindex,
  onClearIndex,
  className = '',
  theme = 'dark',
}: RAGSettingsSectionProps) {
  const isDark = theme === 'dark'

  const CONTENT_TYPES = [
    { id: 'markdown', label: 'Markdown', description: 'MD files' },
    { id: 'code', label: 'Code', description: 'Source files' },
    { id: 'notes', label: 'Notes', description: 'Plain text' },
    { id: 'planner', label: 'Planner', description: 'Tasks & events' },
  ]

  const EMBEDDING_MODELS = [
    { id: 'local', label: 'Local (Transformers.js)', description: 'Privacy-first, no API calls' },
    { id: 'openai', label: 'OpenAI', description: 'text-embedding-3-small' },
    { id: 'cohere', label: 'Cohere', description: 'embed-english-v3.0' },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          <Brain className="w-5 h-5 text-cyan-500" />
          AI & RAG Settings
        </h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Configure retrieval-augmented generation and semantic search
        </p>
      </div>

      {/* Index Status */}
      {indexStatus && (
        <div
          className={`
            p-4 rounded-xl border flex items-center justify-between
            ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}
          `}
        >
          <div className="flex items-center gap-3">
            <Database className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <div>
              <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {indexStatus.count} documents indexed
              </div>
              {indexStatus.lastIndexed && (
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Last indexed: {new Date(indexStatus.lastIndexed).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {indexStatus.isIndexing && (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
            )}
            {onReindex && (
              <button
                onClick={onReindex}
                disabled={indexStatus.isIndexing}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="Reindex all documents"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {onClearIndex && (
              <button
                onClick={onClearIndex}
                disabled={indexStatus.isIndexing}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-100 text-red-500'}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="Clear index"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Similarity & Search */}
      <CollapsibleSection title="Similarity & Search" icon={Sliders} defaultOpen theme={theme}>
        <SettingSlider
          label="Similarity Threshold"
          description="Minimum similarity score for results"
          value={settings.similarityThreshold}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onSettingsChange({ similarityThreshold: value })}
          formatValue={(v) => v.toFixed(2)}
          theme={theme}
        />

        <SettingSlider
          label="Max Results"
          description="Maximum number of results to return"
          value={settings.maxResults}
          min={5}
          max={50}
          step={5}
          onChange={(value) => onSettingsChange({ maxResults: value })}
          theme={theme}
        />

        <SettingSlider
          label="Min Relevance Score"
          description="Filter out low-relevance results"
          value={settings.minRelevanceScore}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => onSettingsChange({ minRelevanceScore: value })}
          formatValue={(v) => v.toFixed(2)}
          theme={theme}
        />

        {/* Quick Presets */}
        <div className="pt-2">
          <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Quick Presets
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                onSettingsChange({ similarityThreshold: 0.85, maxResults: 5, minRelevanceScore: 0.8 })
              }
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
              `}
            >
              <Zap className="w-3 h-3" />
              Precise
            </button>
            <button
              onClick={() =>
                onSettingsChange({ similarityThreshold: 0.7, maxResults: 15, minRelevanceScore: 0.6 })
              }
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
              `}
            >
              <Scale className="w-3 h-3" />
              Balanced
            </button>
            <button
              onClick={() =>
                onSettingsChange({ similarityThreshold: 0.5, maxResults: 30, minRelevanceScore: 0.4 })
              }
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}
              `}
            >
              <Radar className="w-3 h-3" />
              Broad
            </button>
          </div>
        </div>
      </CollapsibleSection>

      {/* Indexing */}
      <CollapsibleSection title="Indexing" icon={Database} theme={theme}>
        <SettingToggle
          label="Auto-index on open"
          description="Index strands when opened"
          checked={settings.autoIndexOnOpen}
          onChange={(checked) => onSettingsChange({ autoIndexOnOpen: checked })}
          theme={theme}
        />

        <SettingToggle
          label="Background indexing"
          description="Index documents in the background"
          checked={settings.backgroundIndexing}
          onChange={(checked) => onSettingsChange({ backgroundIndexing: checked })}
          theme={theme}
        />

        <div className="pt-2">
          <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Content Types to Index
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((type) => {
              const isSelected = settings.indexedContentTypes.includes(type.id)
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    const newTypes = isSelected
                      ? settings.indexedContentTypes.filter((t) => t !== type.id)
                      : [...settings.indexedContentTypes, type.id]
                    onSettingsChange({ indexedContentTypes: newTypes })
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                    ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : isDark
                          ? 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                          : 'bg-gray-100 border-gray-200 text-gray-500 hover:border-gray-300'
                    }
                  `}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {type.label}
                </button>
              )
            })}
          </div>
        </div>

        <SettingSlider
          label="Chunk Size"
          description="Size of text chunks for indexing (tokens)"
          value={settings.chunkSize}
          min={256}
          max={2048}
          step={128}
          onChange={(value) => onSettingsChange({ chunkSize: value })}
          theme={theme}
        />

        <SettingSlider
          label="Chunk Overlap"
          description="Overlap between chunks (tokens)"
          value={settings.chunkOverlap}
          min={0}
          max={512}
          step={64}
          onChange={(value) => onSettingsChange({ chunkOverlap: value })}
          theme={theme}
        />
      </CollapsibleSection>

      {/* Planner Integration */}
      <CollapsibleSection title="Planner Integration" icon={ListTodo} theme={theme}>
        <SettingToggle
          label="Include planner data"
          description="Include tasks and events in RAG context"
          checked={settings.includePlannerData}
          onChange={(checked) => onSettingsChange({ includePlannerData: checked })}
          theme={theme}
        />

        <SettingSlider
          label="Recent History (days)"
          description="Days of recent activity to include"
          value={settings.recentHistoryDays}
          min={1}
          max={90}
          step={1}
          onChange={(value) => onSettingsChange({ recentHistoryDays: value })}
          theme={theme}
        />

        <SettingToggle
          label="Temporal weighting"
          description="Boost recent content in search results"
          checked={settings.temporalWeighting}
          onChange={(checked) => onSettingsChange({ temporalWeighting: checked })}
          theme={theme}
        />
      </CollapsibleSection>

      {/* Model Settings */}
      <CollapsibleSection title="Embedding Model" icon={Sparkles} theme={theme}>
        <div className="space-y-2">
          {EMBEDDING_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => onSettingsChange({ embeddingModel: model.id as any })}
              className={`
                flex items-center justify-between w-full p-3 rounded-lg border transition-colors
                ${
                  settings.embeddingModel === model.id
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : isDark
                      ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="text-left">
                <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                  {model.label}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {model.description}
                </div>
              </div>
              {settings.embeddingModel === model.id && (
                <Check className="w-5 h-5 text-cyan-500" />
              )}
            </button>
          ))}
        </div>

        <SettingToggle
          label="Enable reranker"
          description="Use a reranker model for better results"
          checked={settings.rerankerEnabled}
          onChange={(checked) => onSettingsChange({ rerankerEnabled: checked })}
          theme={theme}
        />
      </CollapsibleSection>

      {/* Info */}
      <div
        className={`
          p-4 rounded-xl border flex items-start gap-3
          ${isDark ? 'bg-blue-900/10 border-blue-800/30' : 'bg-blue-50 border-blue-200'}
        `}
      >
        <Info className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
        <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          Changes to RAG settings take effect immediately for new searches.
          You may need to reindex documents for chunking changes to apply.
        </div>
      </div>
    </div>
  )
}
