/**
 * Taxonomy Settings Panel
 * @module codex/ui/TaxonomySettingsPanel
 *
 * @description
 * UI component for configuring taxonomy hierarchy enforcement.
 * Shows current taxonomy stats and allows configuration of limits.
 *
 * Features:
 * - View taxonomy statistics (subjects, topics, tags counts)
 * - Configure per-document and global limits
 * - Configure NLP similarity detection (Soundex, n-grams, acronyms)
 * - Trigger batch reclassification job
 * - Preview changes before applying
 *
 * @see docs/TAXONOMY_GUIDE.md for user documentation
 * @see lib/taxonomy for implementation details
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderTree,
  Settings,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  Layers,
  BookOpen,
  Hash,
  Loader2,
  Eye,
  Undo2,
  ArrowDown,
  Info,
  HelpCircle,
  ExternalLink,
  Sparkles,
  Volume2,
  FileText,
  Braces,
} from 'lucide-react'
import {
  type TaxonomyHierarchyConfig,
  type TaxonomyStats,
  DEFAULT_TAXONOMY_CONFIG,
  STRICT_TAXONOMY_CONFIG,
  RELAXED_TAXONOMY_CONFIG,
  mergeTaxonomyConfig,
} from '@/lib/taxonomy/hierarchyConfig'
import { type TaxonomyChange } from '@/lib/taxonomy/hierarchyConfig'

interface TaxonomySettingsPanelProps {
  /** Compact mode for dropdown/popover */
  compact?: boolean
  /** Current taxonomy stats */
  stats?: TaxonomyStats
  /** Called when config changes */
  onConfigChange?: (config: TaxonomyHierarchyConfig) => void
  /** Called to trigger reclassification */
  onReclassify?: (dryRun: boolean) => void
  /** Loading state */
  isLoading?: boolean
  /** Reclassification results preview */
  previewChanges?: TaxonomyChange[]
}

/**
 * Tooltip component for displaying help text on hover
 */
function Tooltip({ children, content, wide = false }: {
  children: React.ReactNode
  content: string
  wide?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={`absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs
              bg-ink-900 dark:bg-ink-100 text-paper-50 dark:text-ink-900 shadow-lg whitespace-normal
              ${wide ? 'w-64' : 'w-48'}`}
          >
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-ink-900 dark:border-t-ink-100" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Help text explanations for each setting
 */
const HELP_TEXT = {
  subjects: 'Subjects are BROAD categories (e.g., "programming", "design"). Use sparingly - only 2-3 per document. They organize your entire codex at the highest level.',
  topics: 'Topics are MID-LEVEL categories (e.g., "react", "machine-learning"). More specific than subjects but broader than tags. Use 5-7 per document.',
  tags: 'Tags are SPECIFIC terms (e.g., "hooks", "gradient-descent"). Most varied level - use 10-15 per document for detailed concepts.',
  levenshtein: 'Maximum character edits allowed for terms to be considered similar. Lower = stricter (e.g., 2 catches "typscript" → "typescript").',
  substring: 'Minimum length for substring matching. Prevents short false positives (e.g., 4 means "react" won\'t match "re").',
  phonetic: 'Match terms that sound alike using Soundex/Metaphone algorithms. Catches variations like "colour" ↔ "color".',
  ngram: 'Use character n-gram Jaccard similarity for fuzzy matching. Catches partial matches like "machine-learning" ↔ "ml-learning".',
  acronym: 'Expand common acronyms to full forms. Matches "AI" ↔ "artificial-intelligence", "NLP" ↔ "natural-language-processing".',
  plural: 'Normalize singular/plural forms. Matches "frameworks" ↔ "framework", "libraries" ↔ "library".',
  compound: 'Split compound words. Matches "MachineLearning" ↔ "machine-learning", "GraphQL" ↔ "graph-ql".',
  similarityThreshold: 'Minimum similarity score (0-1) for terms to be considered duplicates. Higher = stricter matching.',
  enforceOnSave: 'Check taxonomy hierarchy when saving a strand. Warns about overlapping terms or exceeded limits.',
  enforceOnImport: 'Check taxonomy hierarchy when importing strands. Automatically deduplicate or warn about issues.',
} as const

const PRESET_CONFIGS: Record<string, {
  label: string
  description: string
  detail: string
  config: TaxonomyHierarchyConfig
}> = {
  default: {
    label: 'Default',
    description: 'Balanced settings for most codexes',
    detail: '2 subjects, 5 topics, 15 tags per doc. All NLP features enabled.',
    config: DEFAULT_TAXONOMY_CONFIG,
  },
  strict: {
    label: 'Strict',
    description: 'Minimal subjects, tight control',
    detail: '1 subject, 3 topics, 10 tags per doc. Higher similarity threshold.',
    config: STRICT_TAXONOMY_CONFIG,
  },
  relaxed: {
    label: 'Relaxed',
    description: 'More flexible categorization',
    detail: '3 subjects, 7 topics, 20 tags per doc. Looser similarity matching.',
    config: RELAXED_TAXONOMY_CONFIG,
  },
}

export default function TaxonomySettingsPanel({
  compact = false,
  stats,
  onConfigChange,
  onReclassify,
  isLoading = false,
  previewChanges,
}: TaxonomySettingsPanelProps) {
  const [config, setConfig] = useState<TaxonomyHierarchyConfig>(DEFAULT_TAXONOMY_CONFIG)
  const [activePreset, setActivePreset] = useState<string>('default')
  const [showDetails, setShowDetails] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Update config and notify parent
  const updateConfig = useCallback((updates: Partial<TaxonomyHierarchyConfig>) => {
    const newConfig = mergeTaxonomyConfig({ ...config, ...updates })
    setConfig(newConfig)
    setActivePreset('custom')
    onConfigChange?.(newConfig)
  }, [config, onConfigChange])

  // Apply preset
  const applyPreset = useCallback((presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey]
    if (preset) {
      setConfig(preset.config)
      setActivePreset(presetKey)
      onConfigChange?.(preset.config)
    }
  }, [onConfigChange])

  // Calculate health indicators
  const getHealthStatus = () => {
    if (!stats) return { status: 'unknown', message: 'Loading stats...' }

    const issues: string[] = []

    if (stats.totalSubjects > config.maxTotalSubjects) {
      issues.push(`${stats.totalSubjects - config.maxTotalSubjects} subjects over limit`)
    }
    if (stats.totalTopics > config.maxTotalTopics) {
      issues.push(`${stats.totalTopics - config.maxTotalTopics} topics over limit`)
    }
    if (stats.overlappingTerms.length > 0) {
      issues.push(`${stats.overlappingTerms.length} overlapping terms`)
    }
    if (stats.docsOverSubjectLimit > 0) {
      issues.push(`${stats.docsOverSubjectLimit} docs exceed subject limit`)
    }
    if (stats.docsOverTopicLimit > 0) {
      issues.push(`${stats.docsOverTopicLimit} docs exceed topic limit`)
    }

    if (issues.length === 0) {
      return { status: 'healthy', message: 'Taxonomy is well organized' }
    } else if (issues.length <= 2) {
      return { status: 'warning', message: issues.join(', ') }
    } else {
      return { status: 'error', message: `${issues.length} issues found` }
    }
  }

  const health = getHealthStatus()

  // Compact dropdown mode
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 transition-colors text-sm"
        >
          <FolderTree className={`w-4 h-4 ${
            health.status === 'healthy' ? 'text-emerald-500' :
            health.status === 'warning' ? 'text-amber-500' : 'text-red-500'
          }`} />
          <span className="text-ink-700 dark:text-ink-300">Taxonomy</span>
          <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 shadow-xl z-50"
            >
              {/* Quick Stats */}
              {stats && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <StatBadge icon={Layers} label="Subjects" count={stats.totalSubjects} limit={config.maxTotalSubjects} />
                  <StatBadge icon={BookOpen} label="Topics" count={stats.totalTopics} limit={config.maxTotalTopics} />
                  <StatBadge icon={Hash} label="Tags" count={stats.totalTags} />
                </div>
              )}

              {/* Preset Selector */}
              <div className="space-y-1 mb-3">
                {Object.entries(PRESET_CONFIGS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      activePreset === key
                        ? 'bg-frame-100 dark:bg-frame-900/30 text-frame-700 dark:text-frame-300'
                        : 'hover:bg-ink-100 dark:hover:bg-ink-800'
                    }`}
                  >
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium">{preset.label}</div>
                      <div className="text-xs text-ink-400">{preset.description}</div>
                    </div>
                    {activePreset === key && <Check className="w-4 h-4 text-frame-500" />}
                  </button>
                ))}
              </div>

              <hr className="border-ink-200 dark:border-ink-700 my-2" />

              {/* Quick Actions */}
              <button
                onClick={() => onReclassify?.(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-frame-500 hover:bg-frame-600 text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                <span>Preview Reclassification</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full panel mode
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-frame-100 dark:bg-frame-900/30">
            <FolderTree className="w-5 h-5 text-frame-600 dark:text-frame-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-paper-50">
              Taxonomy Settings
            </h3>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Configure hierarchy enforcement
            </p>
          </div>
        </div>
      </div>

      {/* Health Status */}
      <div className={`p-4 rounded-xl border ${
        health.status === 'healthy' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
        health.status === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
        health.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
        'bg-ink-100/50 dark:bg-ink-800/50 border-ink-200 dark:border-ink-700'
      }`}>
        <div className="flex items-center gap-3">
          {health.status === 'healthy' ? (
            <Check className="w-5 h-5 text-emerald-500" />
          ) : health.status === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          <div>
            <div className="font-medium text-ink-900 dark:text-paper-50">
              {health.status === 'healthy' ? 'Healthy' :
               health.status === 'warning' ? 'Needs Attention' : 'Issues Found'}
            </div>
            <div className="text-sm text-ink-500 dark:text-ink-400">
              {health.message}
            </div>
          </div>
        </div>
      </div>

      {/* Current Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Layers}
            label="Subjects"
            count={stats.totalSubjects}
            limit={config.maxTotalSubjects}
            avgPerDoc={stats.avgSubjectsPerDoc}
          />
          <StatCard
            icon={BookOpen}
            label="Topics"
            count={stats.totalTopics}
            limit={config.maxTotalTopics}
            avgPerDoc={stats.avgTopicsPerDoc}
          />
          <StatCard
            icon={Hash}
            label="Tags"
            count={stats.totalTags}
            avgPerDoc={stats.avgTagsPerDoc}
          />
        </div>
      )}

      {/* Overlapping Terms Warning */}
      {stats && stats.overlappingTerms.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {stats.overlappingTerms.length} overlapping terms found
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {stats.overlappingTerms.slice(0, 5).join(', ')}
                {stats.overlappingTerms.length > 5 && ` +${stats.overlappingTerms.length - 5} more`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preset Selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Configuration Preset
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESET_CONFIGS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-xl border transition-all text-center ${
                activePreset === key
                  ? 'bg-frame-50 dark:bg-frame-900/20 border-frame-300 dark:border-frame-700'
                  : 'bg-paper-50 dark:bg-ink-900 border-ink-200 dark:border-ink-700 hover:border-frame-300 dark:hover:border-frame-600'
              }`}
            >
              <div className="text-sm font-medium text-ink-900 dark:text-paper-50">
                {preset.label}
              </div>
              <div className="text-xs text-ink-400 mt-1">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
        {activePreset === 'custom' && (
          <div className="text-xs text-ink-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Using custom configuration
          </div>
        )}
      </div>

      {/* Per-Document Limits */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Per-Document Limits
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <LimitInput
            label="Subjects"
            value={config.maxSubjectsPerDoc}
            onChange={(v) => updateConfig({ maxSubjectsPerDoc: v })}
            min={1}
            max={10}
          />
          <LimitInput
            label="Topics"
            value={config.maxTopicsPerDoc}
            onChange={(v) => updateConfig({ maxTopicsPerDoc: v })}
            min={1}
            max={20}
          />
          <LimitInput
            label="Tags"
            value={config.maxTagsPerDoc}
            onChange={(v) => updateConfig({ maxTagsPerDoc: v })}
            min={1}
            max={50}
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
        >
          {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Advanced Settings
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                {/* Global Limits */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-2">
                    Global Limits (Across Codex)
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <LimitInput
                      label="Max Subjects"
                      value={config.maxTotalSubjects}
                      onChange={(v) => updateConfig({ maxTotalSubjects: v })}
                      min={5}
                      max={100}
                    />
                    <LimitInput
                      label="Max Topics"
                      value={config.maxTotalTopics}
                      onChange={(v) => updateConfig({ maxTotalTopics: v })}
                      min={20}
                      max={500}
                    />
                  </div>
                </div>

                {/* Similarity Thresholds */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400">
                      Similarity Detection
                    </h5>
                    <Tooltip content="These settings control how the system detects similar or duplicate terms across taxonomy levels." wide>
                      <HelpCircle className="w-3 h-3 text-ink-400 hover:text-frame-500" />
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <LimitInputWithTooltip
                      label="Levenshtein Distance"
                      tooltip={HELP_TEXT.levenshtein}
                      value={config.levenshteinThreshold}
                      onChange={(v) => updateConfig({ levenshteinThreshold: v })}
                      min={0}
                      max={5}
                    />
                    <LimitInputWithTooltip
                      label="Min Substring Length"
                      tooltip={HELP_TEXT.substring}
                      value={config.substringMinLength}
                      onChange={(v) => updateConfig({ substringMinLength: v })}
                      min={2}
                      max={10}
                    />
                  </div>
                  <LimitInputWithTooltip
                    label="Similarity Threshold"
                    tooltip={HELP_TEXT.similarityThreshold}
                    value={config.similarityScoreThreshold ?? 0.7}
                    onChange={(v) => updateConfig({ similarityScoreThreshold: v })}
                    min={0.1}
                    max={1.0}
                    step={0.05}
                  />
                </div>

                {/* NLP Similarity Features */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-frame-500" />
                    <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400">
                      NLP Deduplication Features
                    </h5>
                    <Tooltip content="Advanced NLP techniques for smarter duplicate detection. Enable all for best results." wide>
                      <HelpCircle className="w-3 h-3 text-ink-400 hover:text-frame-500" />
                    </Tooltip>
                  </div>
                  <div className="space-y-2">
                    <ToggleOptionWithTooltip
                      label="Phonetic Matching"
                      tooltip={HELP_TEXT.phonetic}
                      icon={<Volume2 className="w-3.5 h-3.5 text-ink-400" />}
                      checked={config.enablePhoneticMatching ?? true}
                      onChange={(v) => updateConfig({ enablePhoneticMatching: v })}
                    />
                    <ToggleOptionWithTooltip
                      label="N-gram Similarity"
                      tooltip={HELP_TEXT.ngram}
                      icon={<Braces className="w-3.5 h-3.5 text-ink-400" />}
                      checked={config.enableNgramMatching ?? true}
                      onChange={(v) => updateConfig({ enableNgramMatching: v })}
                    />
                    <ToggleOptionWithTooltip
                      label="Acronym Expansion"
                      tooltip={HELP_TEXT.acronym}
                      icon={<FileText className="w-3.5 h-3.5 text-ink-400" />}
                      checked={config.enableAcronymExpansion ?? true}
                      onChange={(v) => updateConfig({ enableAcronymExpansion: v })}
                    />
                    <ToggleOptionWithTooltip
                      label="Plural Normalization"
                      tooltip={HELP_TEXT.plural}
                      icon={<Hash className="w-3.5 h-3.5 text-ink-400" />}
                      checked={config.enablePluralNormalization ?? true}
                      onChange={(v) => updateConfig({ enablePluralNormalization: v })}
                    />
                    <ToggleOptionWithTooltip
                      label="Compound Decomposition"
                      tooltip={HELP_TEXT.compound}
                      icon={<Layers className="w-3.5 h-3.5 text-ink-400" />}
                      checked={config.enableCompoundDecomposition ?? true}
                      onChange={(v) => updateConfig({ enableCompoundDecomposition: v })}
                    />
                  </div>
                  {config.enableNgramMatching && (
                    <div className="mt-3 pt-3 border-t border-ink-200 dark:border-ink-700">
                      <LimitInputWithTooltip
                        label="N-gram Threshold"
                        tooltip="Minimum Jaccard similarity (0-1) for n-gram matching. Higher = stricter."
                        value={config.ngramThreshold ?? 0.6}
                        onChange={(v) => updateConfig({ ngramThreshold: v })}
                        min={0.3}
                        max={0.9}
                        step={0.05}
                      />
                    </div>
                  )}
                </div>

                {/* Behavior Toggles */}
                <div className="p-3 rounded-lg bg-ink-100/50 dark:bg-ink-800/50">
                  <h5 className="text-xs font-medium text-ink-500 dark:text-ink-400 mb-2">
                    Enforcement Behavior
                  </h5>
                  <div className="space-y-2">
                    <ToggleOptionWithTooltip
                      label="Enforce on save"
                      tooltip={HELP_TEXT.enforceOnSave}
                      checked={config.enforceOnSave}
                      onChange={(v) => updateConfig({ enforceOnSave: v })}
                    />
                    <ToggleOptionWithTooltip
                      label="Enforce on import"
                      tooltip={HELP_TEXT.enforceOnImport}
                      checked={config.enforceOnImport}
                      onChange={(v) => updateConfig({ enforceOnImport: v })}
                    />
                  </div>
                </div>

                {/* Documentation link */}
                <a
                  href="/docs/TAXONOMY_GUIDE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg bg-frame-50 dark:bg-frame-900/20 text-frame-600 dark:text-frame-400 hover:bg-frame-100 dark:hover:bg-frame-900/30 transition-colors text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Taxonomy Guide</span>
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reclassification Actions */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-2">
          <button
            onClick={() => onReclassify?.(true)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700 text-ink-700 dark:text-ink-300 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>Preview Changes</span>
          </button>
          <button
            onClick={() => onReclassify?.(false)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-frame-500 hover:bg-frame-600 text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Reclassify All</span>
          </button>
        </div>
        <p className="text-xs text-ink-400 text-center">
          Preview changes before applying to see what will be modified
        </p>
      </div>

      {/* Preview Results */}
      <AnimatePresence>
        {previewChanges && previewChanges.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-ink-100/50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  Proposed Changes ({previewChanges.length})
                </h4>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-frame-600 dark:text-frame-400 hover:underline"
                >
                  {showPreview ? 'Hide' : 'Show all'}
                </button>
              </div>

              {/* Change Summary */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                  <div className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                    {previewChanges.filter(c => c.action === 'demote').length}
                  </div>
                  <div className="text-xs text-amber-600 dark:text-amber-400">Demotions</div>
                </div>
                <div className="text-center p-2 rounded bg-red-100 dark:bg-red-900/30">
                  <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                    {previewChanges.filter(c => c.action === 'remove').length}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">Removals</div>
                </div>
                <div className="text-center p-2 rounded bg-emerald-100 dark:bg-emerald-900/30">
                  <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                    {previewChanges.filter(c => c.action === 'promote').length}
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Promotions</div>
                </div>
              </div>

              {/* Detailed Changes */}
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="max-h-48 overflow-y-auto space-y-1"
                  >
                    {previewChanges.map((change, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs p-2 rounded bg-paper-50 dark:bg-ink-900"
                      >
                        {change.action === 'demote' ? (
                          <ArrowDown className="w-3 h-3 text-amber-500" />
                        ) : change.action === 'remove' ? (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        ) : (
                          <Check className="w-3 h-3 text-emerald-500" />
                        )}
                        <span className="font-medium">{change.term}</span>
                        <span className="text-ink-400">→</span>
                        <span className="text-ink-500">{change.reason}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper Components

function StatBadge({ icon: Icon, label, count, limit }: {
  icon: React.ElementType
  label: string
  count: number
  limit?: number
}) {
  const isOverLimit = limit && count > limit
  return (
    <div className={`p-2 rounded-lg text-center ${
      isOverLimit ? 'bg-red-100 dark:bg-red-900/30' : 'bg-ink-100 dark:bg-ink-800'
    }`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${
        isOverLimit ? 'text-red-500' : 'text-ink-400'
      }`} />
      <div className={`text-sm font-semibold ${
        isOverLimit ? 'text-red-700 dark:text-red-300' : 'text-ink-900 dark:text-paper-50'
      }`}>
        {count}{limit && <span className="text-ink-400">/{limit}</span>}
      </div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  )
}

function StatCard({ icon: Icon, label, count, limit, avgPerDoc }: {
  icon: React.ElementType
  label: string
  count: number
  limit?: number
  avgPerDoc?: number
}) {
  const isOverLimit = limit && count > limit
  return (
    <div className={`p-4 rounded-xl border ${
      isOverLimit
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-ink-100/50 dark:bg-ink-800/50 border-ink-200 dark:border-ink-700'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${isOverLimit ? 'text-red-500' : 'text-ink-400'}`} />
        <span className="text-xs text-ink-500 dark:text-ink-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${
        isOverLimit ? 'text-red-700 dark:text-red-300' : 'text-ink-900 dark:text-paper-50'
      }`}>
        {count}
        {limit && (
          <span className="text-sm font-normal text-ink-400">/{limit}</span>
        )}
      </div>
      {avgPerDoc !== undefined && (
        <div className="text-xs text-ink-400 mt-1">
          ~{avgPerDoc.toFixed(1)} per doc
        </div>
      )}
    </div>
  )
}

function LimitInput({ label, value, onChange, min, max }: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}) {
  return (
    <div>
      <label className="block text-xs text-ink-500 dark:text-ink-400 mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= min && v <= max) {
            onChange(v)
          }
        }}
        min={min}
        max={max}
        className="w-full px-3 py-2 rounded-lg bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-sm text-ink-900 dark:text-paper-50 focus:outline-none focus:ring-2 focus:ring-frame-500"
      />
    </div>
  )
}

function LimitInputWithTooltip({ label, tooltip, value, onChange, min, max, step = 1 }: {
  label: string
  tooltip: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400 mb-1">
        {label}
        <Tooltip content={tooltip} wide>
          <HelpCircle className="w-3 h-3 hover:text-frame-500" />
        </Tooltip>
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= min && v <= max) {
            onChange(v)
          }
        }}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 rounded-lg bg-paper-50 dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-sm text-ink-900 dark:text-paper-50 focus:outline-none focus:ring-2 focus:ring-frame-500"
      />
    </div>
  )
}

function ToggleOption({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-frame-500' : 'bg-ink-300 dark:bg-ink-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </label>
  )
}

function ToggleOptionWithTooltip({ label, tooltip, icon, checked, onChange }: {
  label: string
  tooltip: string
  icon?: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
        <Tooltip content={tooltip} wide>
          <HelpCircle className="w-3 h-3 text-ink-400 hover:text-frame-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Tooltip>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${
          checked ? 'bg-frame-500' : 'bg-ink-300 dark:bg-ink-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </label>
  )
}
