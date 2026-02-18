/**
 * Template Selector Component
 * @module codex/templates/TemplateSelector
 * 
 * @remarks
 * Full-featured template browser with:
 * - Category tabs
 * - Search functionality
 * - Favorites and recent templates
 * - Grid/list view toggle
 * - Template preview
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Search, X, Heart, Clock, Star, Grid3X3, List,
  Filter, Sparkles, Plus, Settings
} from 'lucide-react'
import DynamicIcon from '../ui/common/DynamicIcon'
import { Tooltip } from '../ui/common/Tooltip'
import TemplateCard from './TemplateCard'
import TemplatePreview from './TemplatePreview'
import TemplateOnboardingModal from './TemplateOnboardingModal'
import {
  loadAllTemplates,
  loadAllTemplatesUnified,
  getCategories,
  filterTemplates,
  toggleFavorite,
  getTemplatePreferences,
} from './templateService'
import type { 
  LoadedTemplate, 
  TemplateCategoryMeta, 
  TemplateFilterOptions,
  TemplateCategory,
  TemplateDifficulty 
} from './types'

interface TemplateSelectorProps {
  /** Callback when template is selected */
  onSelectTemplate: (template: LoadedTemplate) => void
  /** Initially selected template ID */
  selectedTemplateId?: string
  /** Whether to show preview panel */
  showPreview?: boolean
  /** Compact mode */
  compact?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Filter to specific categories */
  allowedCategories?: TemplateCategory[]
  /** Hide certain templates by ID */
  hiddenTemplates?: string[]
  /** Callback to create a new template */
  onCreateTemplate?: () => void
  /** Callback to manage templates (go to settings) */
  onManageTemplates?: () => void
}

type ViewMode = 'grid' | 'list'

// Stable empty array reference to prevent infinite re-renders
const EMPTY_HIDDEN_TEMPLATES: string[] = []

export default function TemplateSelector({
  onSelectTemplate,
  selectedTemplateId,
  showPreview = true,
  compact = false,
  isDark = false,
  allowedCategories,
  hiddenTemplates,
  onCreateTemplate,
  onManageTemplates,
}: TemplateSelectorProps) {
  // Use stable reference for empty array to prevent useEffect re-runs
  const stableHiddenTemplates = hiddenTemplates ?? EMPTY_HIDDEN_TEMPLATES
  // State
  const [templates, setTemplates] = useState<LoadedTemplate[]>([])
  const [categories, setCategories] = useState<TemplateCategoryMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all' | 'favorites' | 'recent'>('all')
  const [activeDifficulty, setActiveDifficulty] = useState<TemplateDifficulty | 'all'>('all')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [previewTemplate, setPreviewTemplate] = useState<LoadedTemplate | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Load templates on mount (local + remote)
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [loadedTemplates, loadedCategories] = await Promise.all([
          loadAllTemplatesUnified({ includeRemote: true }),
          getCategories(),
        ])

        // Apply allowed categories filter
        let filtered = loadedTemplates
        if (allowedCategories) {
          filtered = filtered.filter(t => allowedCategories.includes(t.category))
        }

        // Apply hidden templates filter
        if (stableHiddenTemplates.length > 0) {
          filtered = filtered.filter(t => !stableHiddenTemplates.includes(t.id))
        }

        setTemplates(filtered)
        setCategories(loadedCategories.filter(c =>
          !allowedCategories || allowedCategories.includes(c.id)
        ))
      } catch (err) {
        setError('Failed to load templates')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [allowedCategories, stableHiddenTemplates])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let base = templates

    // Handle special categories
    if (activeCategory === 'favorites') {
      base = templates.filter(t => t.isFavorite)
    } else if (activeCategory === 'recent') {
      const prefs = getTemplatePreferences()
      base = prefs.recent
        .map(id => templates.find(t => t.id === id))
        .filter((t): t is LoadedTemplate => t !== undefined)
    }

    const options: TemplateFilterOptions = {
      query: searchQuery,
      category: activeCategory === 'favorites' || activeCategory === 'recent' 
        ? 'all' 
        : activeCategory,
      difficulty: activeDifficulty,
      featuredOnly: showFeaturedOnly,
      sortBy: activeCategory === 'recent' ? 'recent' : 'popularity',
    }

    return filterTemplates(base, options)
  }, [templates, searchQuery, activeCategory, activeDifficulty, showFeaturedOnly])

  // Handle favorite toggle
  const handleToggleFavorite = useCallback((templateId: string) => {
    const isFavorite = toggleFavorite(templateId)
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isFavorite } : t
    ))
  }, [])

  // Handle template click
  const handleTemplateClick = useCallback((template: LoadedTemplate) => {
    if (showPreview) {
      setPreviewTemplate(template)
    } else {
      onSelectTemplate(template)
    }
  }, [showPreview, onSelectTemplate])

  // Handle preview selection
  const handlePreviewSelect = useCallback(() => {
    if (previewTemplate) {
      onSelectTemplate(previewTemplate)
    }
  }, [previewTemplate, onSelectTemplate])

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setActiveCategory('all')
    setActiveDifficulty('all')
    setShowFeaturedOnly(false)
  }, [])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (activeCategory !== 'all') count++
    if (activeDifficulty !== 'all') count++
    if (showFeaturedOnly) count++
    return count
  }, [searchQuery, activeCategory, activeDifficulty, showFeaturedOnly])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* Search skeleton */}
        <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse mb-3" />

        {/* Category tabs skeleton */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              style={{ width: `${60 + (i % 3) * 20}px` }}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-8 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Template grid skeleton */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <div className="h-4 w-24 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-cyan-500 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, tags, or category..."
          className={`
            w-full pl-10 pr-10 py-2.5 text-sm rounded-lg
            border border-zinc-200 dark:border-zinc-700
            bg-white dark:bg-zinc-800
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            placeholder:text-zinc-400
          `}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
          >
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Category Tabs + Filters */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        {/* All Templates */}
        <CategoryTab
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          icon={<Grid3X3 className="w-3.5 h-3.5" />}
          label="All"
          count={templates.length}
          tooltip="Browse all available templates across every category"
        />

        {/* Favorites */}
        <CategoryTab
          active={activeCategory === 'favorites'}
          onClick={() => setActiveCategory('favorites')}
          icon={<Heart className="w-3.5 h-3.5" />}
          label="Favorites"
          count={templates.filter(t => t.isFavorite).length}
          accentColor="#EF4444"
          tooltip="Templates you've marked as favorites for quick access"
        />

        {/* Recent */}
        <CategoryTab
          active={activeCategory === 'recent'}
          onClick={() => setActiveCategory('recent')}
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Recent"
          count={getTemplatePreferences().recent.length}
          accentColor="#8B5CF6"
          tooltip="Templates you've used recently, sorted by last use"
        />

        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

        {/* Category tabs */}
        {categories.map(cat => (
          <CategoryTab
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            icon={<DynamicIcon name={cat.icon} className="w-3.5 h-3.5" />}
            label={cat.name}
            count={templates.filter(t => t.category === cat.id).length}
            accentColor={cat.color}
            tooltip={cat.description || `Browse ${cat.name} templates`}
          />
        ))}

        {/* Filter toggle */}
        <Tooltip
          content="Filters"
          description="Filter by difficulty level or show only featured templates"
          placement="bottom"
        >
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              ${showFilters || activeFilterCount > 0
                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}
              hover:bg-zinc-200 dark:hover:bg-zinc-700
            `}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-cyan-500 text-white text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </Tooltip>

        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <Tooltip content="Grid View" description="Display templates as cards in a grid" placement="bottom">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="List View" description="Display templates in a compact list" placement="bottom">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>

        {/* Create/Manage buttons */}
        {(onCreateTemplate || onManageTemplates) && (
          <div className="flex items-center gap-1 ml-1">
            {onCreateTemplate && (
              <Tooltip
                content="Create Template"
                description="Design your own custom template with fields and content"
                placement="bottom"
              >
                <button
                  onClick={onCreateTemplate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create
                </button>
              </Tooltip>
            )}
            {onManageTemplates && (
              <Tooltip
                content="Manage Templates"
                description="Import, export, and configure template sources"
                placement="bottom"
              >
                <button
                  onClick={onManageTemplates}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            {/* Difficulty */}
            <select
              value={activeDifficulty}
              onChange={(e) => setActiveDifficulty(e.target.value as TemplateDifficulty | 'all')}
              className="px-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            {/* Featured toggle */}
            <button
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                ${showFeaturedOnly
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}
              `}
            >
              <Star className={`w-3.5 h-3.5 ${showFeaturedOnly ? 'fill-current' : ''}`} />
              Featured Only
            </button>

            {/* Reset */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="ml-auto text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Reset all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Template Grid/List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 mb-2">No templates found</p>
            {searchQuery && (
              <p className="text-xs text-zinc-400 mb-3">
                Try searching for different keywords or browse by category
              </p>
            )}
            <div className="flex flex-col items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-cyan-500 hover:underline"
                >
                  Clear filters and browse all
                </button>
              )}
              {onCreateTemplate && (
                <button
                  onClick={onCreateTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg text-sm font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create your own template
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
              : 'space-y-2'
          }>
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={handleTemplateClick}
                onToggleFavorite={handleToggleFavorite}
                variant={viewMode === 'list' ? 'compact' : 'default'}
                showCategory={activeCategory === 'all' || activeCategory === 'favorites' || activeCategory === 'recent'}
                isSelected={template.id === selectedTemplateId || template.id === previewTemplate?.id}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700">
        <p className="text-xs text-zinc-500 text-center">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} 
          {activeFilterCount > 0 && ' (filtered)'}
        </p>
      </div>

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onSelect={handlePreviewSelect}
          onClose={() => setPreviewTemplate(null)}
          onToggleFavorite={() => handleToggleFavorite(previewTemplate.id)}
          isDark={isDark}
        />
      )}

      {/* Onboarding Modal (first-time users) */}
      <TemplateOnboardingModal />
    </div>
  )
}

/** Category tab button */
function CategoryTab({
  active,
  onClick,
  icon,
  label,
  count,
  accentColor,
  tooltip,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
  accentColor?: string
  tooltip?: string
}) {
  const button = (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        whitespace-nowrap transition-all
        ${active
          ? 'text-white shadow-sm'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}
      `}
      style={active ? { backgroundColor: accentColor || '#06B6D4' } : undefined}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`
          text-[10px] px-1.5 py-0.5 rounded-full
          ${active
            ? 'bg-white/20'
            : 'bg-zinc-200 dark:bg-zinc-700'}
        `}>
          {count}
        </span>
      )}
    </button>
  )

  if (tooltip) {
    return (
      <Tooltip content={label} description={tooltip} placement="bottom">
        {button}
      </Tooltip>
    )
  }

  return button
}
