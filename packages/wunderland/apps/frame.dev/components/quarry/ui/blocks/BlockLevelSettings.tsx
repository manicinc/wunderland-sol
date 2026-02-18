/**
 * Block-Level Settings Panel
 * @module codex/ui/BlockLevelSettings
 *
 * @description
 * Settings panel for configuring block-level features including:
 * - Block tagging system
 * - Supertags configuration
 * - Query system preferences
 * - Transclusion settings
 *
 * @features
 * - Toggle features on/off
 * - Granular control over behavior
 * - Schema management
 * - Saved queries management
 * - Keyboard shortcut configuration
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tag,
  Sparkles,
  Search,
  Link2,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  RotateCcw,
  Download,
  Upload,
  Check,
  X,
  AlertCircle,
  Keyboard,
  Layers,
  Star,
  Clock,
  Hash,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllSchemas, deleteSchema, type SupertagSchema } from '@/lib/supertags'
import { getSavedQueries, deleteSavedQuery, type SavedQuery } from '@/lib/query'
import { DEFAULT_SUPERTAG_CONFIG, type SupertagConfig } from '@/lib/supertags/types'
import { DEFAULT_QUERY_CONFIG, type QueryConfig } from '@/lib/query/types'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface BlockLevelSettingsProps {
  /** Theme for styling */
  theme?: 'light' | 'dark'
  /** Callback when settings change */
  onChange?: (settings: BlockLevelSettingsData) => void
  /** Callback to open supertag designer */
  onOpenSupertagDesigner?: (schema?: SupertagSchema) => void
  /** Callback to open query builder */
  onOpenQueryBuilder?: (query?: SavedQuery) => void
  /** Additional class names */
  className?: string
}

export interface BlockLevelSettingsData {
  blockTags: BlockTagSettings
  supertags: SupertagConfig
  queries: QueryConfig
  transclusion: TransclusionSettings
  shortcuts: KeyboardShortcuts
}

interface BlockTagSettings {
  enabled: boolean
  showInSidebar: boolean
  autoSuggest: boolean
  showTagCloud: boolean
  maxSuggestions: number
}

interface TransclusionSettings {
  enabled: boolean
  showBacklinks: boolean
  inlinePreview: boolean
  maxPreviewLength: number
  autoSync: boolean
}

interface KeyboardShortcuts {
  openQueryPalette: string
  addTag: string
  openBacklinks: string
  quickSearch: string
  addSupertag: string
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULTS
═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_BLOCK_TAG_SETTINGS: BlockTagSettings = {
  enabled: true,
  showInSidebar: true,
  autoSuggest: true,
  showTagCloud: true,
  maxSuggestions: 10,
}

const DEFAULT_TRANSCLUSION_SETTINGS: TransclusionSettings = {
  enabled: true,
  showBacklinks: true,
  inlinePreview: true,
  maxPreviewLength: 200,
  autoSync: true,
}

const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  openQueryPalette: 'Cmd+P',
  addTag: 'Cmd+T',
  openBacklinks: 'Cmd+B',
  quickSearch: 'Cmd+K',
  addSupertag: 'Cmd+Shift+T',
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SettingsSectionProps {
  title: string
  icon: typeof Settings
  description?: string
  expanded: boolean
  onToggleExpand: () => void
  children: React.ReactNode
  theme: 'light' | 'dark'
}

function SettingsSection({
  title,
  icon: Icon,
  description,
  expanded,
  onToggleExpand,
  children,
  theme,
}: SettingsSectionProps) {
  const isDark = theme === 'dark'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isDark ? 'bg-zinc-800/30 border-zinc-700' : 'bg-white border-zinc-200'
    )}>
      <button
        onClick={onToggleExpand}
        className={cn(
          'w-full flex items-center gap-3 p-4 text-left',
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
        )}
      >
        <div className={cn(
          'p-2 rounded-lg',
          isDark ? 'bg-zinc-700' : 'bg-zinc-100'
        )}>
          <Icon className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'text-sm font-semibold',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            {title}
          </h3>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-500" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              'p-4 pt-0 border-t',
              isDark ? 'border-zinc-700/50' : 'border-zinc-200'
            )}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ToggleSettingProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  theme: 'light' | 'dark'
}

function ToggleSetting({ label, description, checked, onChange, theme }: ToggleSettingProps) {
  const isDark = theme === 'dark'

  return (
    <label className="flex items-start justify-between gap-3 py-2 cursor-pointer">
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
          onChange={e => onChange(e.target.checked)}
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
  theme: 'light' | 'dark'
}

function NumberSetting({ label, description, value, onChange, min = 1, max = 100, theme }: NumberSettingProps) {
  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between gap-3 py-2">
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
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
        min={min}
        max={max}
        className={cn(
          'w-20 px-2 py-1 rounded text-sm text-right outline-none',
          isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
        )}
      />
    </div>
  )
}

interface ShortcutSettingProps {
  label: string
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
}

function ShortcutSetting({ label, value, onChange, theme }: ShortcutSettingProps) {
  const isDark = theme === 'dark'
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault()
    const keys: string[] = []
    if (e.metaKey || e.ctrlKey) keys.push('Cmd')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
      keys.push(e.key.toUpperCase())
    }
    if (keys.length > 1) {
      setTempValue(keys.join('+'))
    }
  }

  const handleSave = () => {
    onChange(tempValue)
    setEditing(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className={cn(
        'text-sm',
        isDark ? 'text-zinc-300' : 'text-zinc-700'
      )}>
        {label}
      </span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={tempValue}
            onKeyDown={handleKeyDown}
            onChange={() => {}} // Read-only, handled by keydown
            autoFocus
            className={cn(
              'w-28 px-2 py-1 rounded text-xs font-mono text-center outline-none ring-2 ring-blue-500',
              isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-800'
            )}
            placeholder="Press keys..."
          />
          <button onClick={handleSave} className="p-1 rounded hover:bg-green-500/20">
            <Check className="w-4 h-4 text-green-500" />
          </button>
          <button onClick={handleCancel} className="p-1 rounded hover:bg-red-500/20">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            'px-2 py-1 rounded text-xs font-mono',
            isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          )}
        >
          {value}
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export function BlockLevelSettings({
  theme = 'dark',
  onChange,
  onOpenSupertagDesigner,
  onOpenQueryBuilder,
  className,
}: BlockLevelSettingsProps) {
  const isDark = theme === 'dark'

  // Settings state
  const [blockTags, setBlockTags] = useState<BlockTagSettings>(DEFAULT_BLOCK_TAG_SETTINGS)
  const [supertagConfig, setSupertagConfig] = useState<SupertagConfig>(DEFAULT_SUPERTAG_CONFIG)
  const [queryConfig, setQueryConfig] = useState<QueryConfig>(DEFAULT_QUERY_CONFIG)
  const [transclusion, setTransclusion] = useState<TransclusionSettings>(DEFAULT_TRANSCLUSION_SETTINGS)
  const [shortcuts, setShortcuts] = useState<KeyboardShortcuts>(DEFAULT_SHORTCUTS)

  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tags']))
  const [schemas, setSchemas] = useState<SupertagSchema[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [loading, setLoading] = useState(true)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [schemaData, queryData] = await Promise.all([
          getAllSchemas(),
          getSavedQueries(),
        ])
        setSchemas(schemaData)
        setSavedQueries(queryData)
      } catch (error) {
        console.error('Failed to load settings data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('codex_block_settings')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.blockTags) setBlockTags(data.blockTags)
        if (data.supertags) setSupertagConfig(data.supertags)
        if (data.queries) setQueryConfig(data.queries)
        if (data.transclusion) setTransclusion(data.transclusion)
        if (data.shortcuts) setShortcuts(data.shortcuts)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }, [])

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    const data: BlockLevelSettingsData = {
      blockTags,
      supertags: supertagConfig,
      queries: queryConfig,
      transclusion,
      shortcuts,
    }
    localStorage.setItem('codex_block_settings', JSON.stringify(data))
    onChange?.(data)
  }, [blockTags, supertagConfig, queryConfig, transclusion, shortcuts, onChange])

  // Auto-save on changes
  useEffect(() => {
    saveSettings()
  }, [saveSettings])

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

  // Delete schema
  const handleDeleteSchema = async (id: string) => {
    try {
      await deleteSchema(id)
      setSchemas(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      console.error('Failed to delete schema:', error)
    }
  }

  // Delete saved query
  const handleDeleteQuery = async (id: string) => {
    try {
      await deleteSavedQuery(id)
      setSavedQueries(prev => prev.filter(q => q.id !== id))
    } catch (error) {
      console.error('Failed to delete query:', error)
    }
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setBlockTags(DEFAULT_BLOCK_TAG_SETTINGS)
    setSupertagConfig(DEFAULT_SUPERTAG_CONFIG)
    setQueryConfig(DEFAULT_QUERY_CONFIG)
    setTransclusion(DEFAULT_TRANSCLUSION_SETTINGS)
    setShortcuts(DEFAULT_SHORTCUTS)
  }

  // Export settings
  const exportSettings = () => {
    const data = {
      blockTags,
      supertags: supertagConfig,
      queries: queryConfig,
      transclusion,
      shortcuts,
      schemas,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'codex-block-settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import settings
  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.blockTags) setBlockTags(data.blockTags)
        if (data.supertags) setSupertagConfig(data.supertags)
        if (data.queries) setQueryConfig(data.queries)
        if (data.transclusion) setTransclusion(data.transclusion)
        if (data.shortcuts) setShortcuts(data.shortcuts)
      } catch (error) {
        console.error('Failed to import settings:', error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={cn(
            'text-lg font-semibold',
            isDark ? 'text-zinc-200' : 'text-zinc-800'
          )}>
            Block-Level Features
          </h2>
          <p className="text-sm text-zinc-500">
            Configure tags, supertags, queries, and transclusion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSettings}
            className={cn(
              'p-2 rounded-lg',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Export settings"
          >
            <Download className="w-4 h-4" />
          </button>
          <label className={cn(
            'p-2 rounded-lg cursor-pointer',
            isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
          )} title="Import settings">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={importSettings} className="hidden" />
          </label>
          <button
            onClick={resetToDefaults}
            className={cn(
              'p-2 rounded-lg',
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
            )}
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Block Tags Section */}
      <SettingsSection
        title="Block Tags"
        icon={Tag}
        description="Tag individual blocks within strands"
        expanded={expandedSections.has('tags')}
        onToggleExpand={() => toggleSection('tags')}
        theme={theme}
      >
        <div className="space-y-3 pt-4">
          <ToggleSetting
            label="Enable block tagging"
            description="Allow adding tags to individual blocks"
            checked={blockTags.enabled}
            onChange={v => setBlockTags(prev => ({ ...prev, enabled: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Show in sidebar"
            description="Display block tags panel in the sidebar"
            checked={blockTags.showInSidebar}
            onChange={v => setBlockTags(prev => ({ ...prev, showInSidebar: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Auto-suggest tags"
            description="Suggest existing tags while typing"
            checked={blockTags.autoSuggest}
            onChange={v => setBlockTags(prev => ({ ...prev, autoSuggest: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Show tag cloud"
            description="Display a visual cloud of popular tags"
            checked={blockTags.showTagCloud}
            onChange={v => setBlockTags(prev => ({ ...prev, showTagCloud: v }))}
            theme={theme}
          />
          <NumberSetting
            label="Max suggestions"
            description="Number of tag suggestions to show"
            value={blockTags.maxSuggestions}
            onChange={v => setBlockTags(prev => ({ ...prev, maxSuggestions: v }))}
            min={3}
            max={20}
            theme={theme}
          />
        </div>
      </SettingsSection>

      {/* Supertags Section */}
      <SettingsSection
        title="Supertags"
        icon={Sparkles}
        description="Tags with structured fields (like Tana)"
        expanded={expandedSections.has('supertags')}
        onToggleExpand={() => toggleSection('supertags')}
        theme={theme}
      >
        <div className="space-y-4 pt-4">
          <ToggleSetting
            label="Enable supertags"
            description="Allow creating and applying supertags to blocks"
            checked={supertagConfig.enabled}
            onChange={v => setSupertagConfig(prev => ({ ...prev, enabled: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Show inline fields"
            description="Display supertag fields directly in content"
            checked={supertagConfig.showInlineFields}
            onChange={v => setSupertagConfig(prev => ({ ...prev, showInlineFields: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Auto-suggest supertags"
            description="Suggest supertags based on content"
            checked={supertagConfig.autoSuggest}
            onChange={v => setSupertagConfig(prev => ({ ...prev, autoSuggest: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Allow custom schemas"
            description="Enable creating custom supertag schemas"
            checked={supertagConfig.allowCustomSchemas}
            onChange={v => setSupertagConfig(prev => ({ ...prev, allowCustomSchemas: v }))}
            theme={theme}
          />

          {/* Schema list */}
          <div className={cn(
            'p-3 rounded-lg',
            isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                'text-sm font-medium',
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              )}>
                Supertag Schemas ({schemas.length})
              </span>
              {onOpenSupertagDesigner && (
                <button
                  onClick={() => onOpenSupertagDesigner()}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs',
                    isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  )}
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {schemas.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2 text-center">
                  No custom schemas yet
                </p>
              ) : (
                schemas.map(schema => (
                  <div
                    key={schema.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded',
                      isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${schema.color}20` }}
                      >
                        <Sparkles className="w-3 h-3" style={{ color: schema.color }} />
                      </div>
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      )}>
                        #{schema.tagName}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {schema.fields.length} fields
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onOpenSupertagDesigner && (
                        <button
                          onClick={() => onOpenSupertagDesigner(schema)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Edit className="w-3 h-3 text-zinc-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSchema(schema.id)}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Query System Section */}
      <SettingsSection
        title="Query System"
        icon={Search}
        description="Structured search and saved queries"
        expanded={expandedSections.has('queries')}
        onToggleExpand={() => toggleSection('queries')}
        theme={theme}
      >
        <div className="space-y-4 pt-4">
          <ToggleSetting
            label="Enable query caching"
            description="Cache query results for faster repeated searches"
            checked={queryConfig.enableCache}
            onChange={v => setQueryConfig(prev => ({ ...prev, enableCache: v }))}
            theme={theme}
          />
          <NumberSetting
            label="Cache TTL (ms)"
            description="How long to cache results"
            value={queryConfig.cacheTTL}
            onChange={v => setQueryConfig(prev => ({ ...prev, cacheTTL: v }))}
            min={10000}
            max={300000}
            theme={theme}
          />
          <ToggleSetting
            label="Enable facets"
            description="Compute facets (filters) for search results"
            checked={queryConfig.enableFacets}
            onChange={v => setQueryConfig(prev => ({ ...prev, enableFacets: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Enable highlights"
            description="Highlight matching text in results"
            checked={queryConfig.enableHighlights}
            onChange={v => setQueryConfig(prev => ({ ...prev, enableHighlights: v }))}
            theme={theme}
          />
          <NumberSetting
            label="Default limit"
            description="Default number of results per page"
            value={queryConfig.defaultLimit}
            onChange={v => setQueryConfig(prev => ({ ...prev, defaultLimit: v }))}
            min={5}
            max={50}
            theme={theme}
          />
          <NumberSetting
            label="Max limit"
            description="Maximum results allowed per query"
            value={queryConfig.maxLimit}
            onChange={v => setQueryConfig(prev => ({ ...prev, maxLimit: v }))}
            min={20}
            max={500}
            theme={theme}
          />

          {/* Saved queries list */}
          <div className={cn(
            'p-3 rounded-lg',
            isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                'text-sm font-medium',
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              )}>
                Saved Queries ({savedQueries.length})
              </span>
              {onOpenQueryBuilder && (
                <button
                  onClick={() => onOpenQueryBuilder()}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs',
                    isDark ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                  )}
                >
                  <Plus className="w-3 h-3" />
                  New
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {savedQueries.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2 text-center">
                  No saved queries yet
                </p>
              ) : (
                savedQueries.map(query => (
                  <div
                    key={query.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded',
                      isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {query.isPinned ? (
                        <Star className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Clock className="w-3 h-3 text-zinc-500" />
                      )}
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      )}>
                        {query.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onOpenQueryBuilder && (
                        <button
                          onClick={() => onOpenQueryBuilder(query)}
                          className="p-1 rounded hover:bg-white/10"
                        >
                          <Edit className="w-3 h-3 text-zinc-500" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteQuery(query.id)}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Transclusion Section */}
      <SettingsSection
        title="Transclusion & Backlinks"
        icon={Link2}
        description="Block references and bidirectional links"
        expanded={expandedSections.has('transclusion')}
        onToggleExpand={() => toggleSection('transclusion')}
        theme={theme}
      >
        <div className="space-y-3 pt-4">
          <ToggleSetting
            label="Enable transclusion"
            description="Allow embedding blocks from other strands"
            checked={transclusion.enabled}
            onChange={v => setTransclusion(prev => ({ ...prev, enabled: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Show backlinks panel"
            description="Display backlinks in the sidebar"
            checked={transclusion.showBacklinks}
            onChange={v => setTransclusion(prev => ({ ...prev, showBacklinks: v }))}
            theme={theme}
          />
          <ToggleSetting
            label="Inline preview"
            description="Show preview on hover over block references"
            checked={transclusion.inlinePreview}
            onChange={v => setTransclusion(prev => ({ ...prev, inlinePreview: v }))}
            theme={theme}
          />
          <NumberSetting
            label="Preview length"
            description="Max characters to show in preview"
            value={transclusion.maxPreviewLength}
            onChange={v => setTransclusion(prev => ({ ...prev, maxPreviewLength: v }))}
            min={50}
            max={500}
            theme={theme}
          />
          <ToggleSetting
            label="Auto-sync references"
            description="Keep transcluded content in sync automatically"
            checked={transclusion.autoSync}
            onChange={v => setTransclusion(prev => ({ ...prev, autoSync: v }))}
            theme={theme}
          />
        </div>
      </SettingsSection>

      {/* Keyboard Shortcuts Section */}
      <SettingsSection
        title="Keyboard Shortcuts"
        icon={Keyboard}
        description="Customize keyboard bindings"
        expanded={expandedSections.has('shortcuts')}
        onToggleExpand={() => toggleSection('shortcuts')}
        theme={theme}
      >
        <div className="space-y-2 pt-4">
          <ShortcutSetting
            label="Open Query Palette"
            value={shortcuts.openQueryPalette}
            onChange={v => setShortcuts(prev => ({ ...prev, openQueryPalette: v }))}
            theme={theme}
          />
          <ShortcutSetting
            label="Add Tag to Block"
            value={shortcuts.addTag}
            onChange={v => setShortcuts(prev => ({ ...prev, addTag: v }))}
            theme={theme}
          />
          <ShortcutSetting
            label="Open Backlinks"
            value={shortcuts.openBacklinks}
            onChange={v => setShortcuts(prev => ({ ...prev, openBacklinks: v }))}
            theme={theme}
          />
          <ShortcutSetting
            label="Quick Search"
            value={shortcuts.quickSearch}
            onChange={v => setShortcuts(prev => ({ ...prev, quickSearch: v }))}
            theme={theme}
          />
          <ShortcutSetting
            label="Add Supertag"
            value={shortcuts.addSupertag}
            onChange={v => setShortcuts(prev => ({ ...prev, addSupertag: v }))}
            theme={theme}
          />
        </div>
      </SettingsSection>
    </div>
  )
}

export default BlockLevelSettings
