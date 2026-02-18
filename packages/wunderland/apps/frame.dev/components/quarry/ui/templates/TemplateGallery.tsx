/**
 * Template Gallery Component
 * @module codex/ui/TemplateGallery
 *
 * @description
 * Unified browse experience for local and remote templates with:
 * - Source filtering (local, remote, specific repos)
 * - Category tabs with remote categories
 * - Search across all sources
 * - Install/update actions for remote templates
 * - Offline indicator and cached template access
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Download,
  CloudOff,
  RefreshCw,
  Globe,
  HardDrive,
  Star,
  Filter,
  ChevronDown,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import DynamicIcon from '../common/DynamicIcon'
import { cn } from '@/lib/utils'
import type {
  TemplateSource,
  RemoteTemplate,
  TemplateRepository,
  TemplateSyncStatus,
  TemplateDraft,
} from '@/lib/templates/types'
import TemplateBuilder from './TemplateBuilder'
import TemplatePublishModal from './TemplatePublishModal'
import type {
  LoadedTemplate,
  TemplateCategoryMeta,
  TemplateCategory,
} from '@/components/quarry/templates/types'
import {
  getAllRemoteTemplates,
  searchRemoteTemplates,
  getTemplateSourcePreferences,
  subscribeSyncStatus,
  fetchAllTemplates,
} from '@/lib/templates/remoteTemplateLoader'
import {
  loadAllTemplates as loadLocalTemplates,
  getCategories as getLocalCategories,
} from '@/components/quarry/templates/templateService'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface TemplateGalleryProps {
  /** Callback when template is selected for use */
  onSelectTemplate: (template: LoadedTemplate | RemoteTemplate) => void
  /** Initially selected template */
  selectedTemplateId?: string
  /** Whether to show the preview panel */
  showPreview?: boolean
  /** Filter to specific sources */
  sources?: TemplateSource[]
  /** Compact mode for embedded usage */
  compact?: boolean
  /** Theme */
  isDark?: boolean
  /** Close handler */
  onClose?: () => void
}

type SourceFilter = 'all' | 'local' | 'remote' | string

interface UnifiedTemplate {
  id: string
  name: string
  description: string
  shortDescription: string
  category: TemplateCategory
  icon: string
  tags: string[]
  featured: boolean
  source: TemplateSource
  sourceId?: string
  sourceName?: string
  original: LoadedTemplate | RemoteTemplate
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateGallery({
  onSelectTemplate,
  selectedTemplateId,
  showPreview = true,
  sources = ['local', 'remote'],
  compact = false,
  isDark = true,
  onClose,
}: TemplateGalleryProps) {
  // Data state
  const [localTemplates, setLocalTemplates] = useState<LoadedTemplate[]>([])
  const [remoteTemplates, setRemoteTemplates] = useState<RemoteTemplate[]>([])
  const [categories, setCategories] = useState<TemplateCategoryMeta[]>([])
  const [repositories, setRepositories] = useState<TemplateRepository[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<TemplateSyncStatus>({
    isSyncing: false,
    progress: 0,
  })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Preview
  const [previewTemplate, setPreviewTemplate] = useState<UnifiedTemplate | null>(null)

  // Template Builder
  const [showBuilder, setShowBuilder] = useState(false)
  const [publishDraft, setPublishDraft] = useState<TemplateDraft | null>(null)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setSyncStatus)
    return unsubscribe
  }, [])

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true)
      setError(null)

      try {
        // Load local templates
        if (sources.includes('local')) {
          const [local, cats] = await Promise.all([
            loadLocalTemplates(),
            getLocalCategories(),
          ])
          setLocalTemplates(local)
          setCategories(cats)
        }

        // Load remote templates
        if (sources.includes('remote')) {
          const prefs = getTemplateSourcePreferences()
          setRepositories(prefs.repositories)

          try {
            const remote = await getAllRemoteTemplates()
            setRemoteTemplates(remote)

            // Merge categories from remote registries
            // TODO: Implement category merging when registry categories are fetched
          } catch (err) {
            console.warn('[TemplateGallery] Error loading remote templates:', err)
            if (!isOffline) {
              setError('Some remote templates could not be loaded')
            }
          }
        }
      } catch (err) {
        console.error('[TemplateGallery] Error loading templates:', err)
        setError('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [sources, isOffline])

  // Convert to unified format
  const unifiedTemplates = useMemo<UnifiedTemplate[]>(() => {
    const unified: UnifiedTemplate[] = []

    // Add local templates
    for (const t of localTemplates) {
      unified.push({
        id: `local:${t.id}`,
        name: t.name,
        description: t.description,
        shortDescription: t.shortDescription,
        category: t.category,
        icon: t.icon,
        tags: t.tags,
        featured: t.featured,
        source: 'local',
        sourceName: 'Local',
        original: t,
      })
    }

    // Add remote templates
    for (const t of remoteTemplates) {
      const repo = repositories.find((r) => r.id === t.sourceId)
      unified.push({
        id: `remote:${t.sourceId}:${t.id}`,
        name: t.name,
        description: t.description,
        shortDescription: t.shortDescription,
        category: t.category,
        icon: t.icon,
        tags: t.tags,
        featured: t.featured,
        source: 'remote',
        sourceId: t.sourceId,
        sourceName: repo?.name || t.sourceId,
        original: t,
      })
    }

    return unified
  }, [localTemplates, remoteTemplates, repositories])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...unifiedTemplates]

    // Source filter
    if (sourceFilter === 'local') {
      filtered = filtered.filter((t) => t.source === 'local')
    } else if (sourceFilter === 'remote') {
      filtered = filtered.filter((t) => t.source === 'remote')
    } else if (sourceFilter !== 'all') {
      // Specific repository
      filtered = filtered.filter((t) => t.sourceId === sourceFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((t) => t.category === categoryFilter)
    }

    // Featured only
    if (showFeaturedOnly) {
      filtered = filtered.filter((t) => t.featured)
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.shortDescription.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    // Sort: featured first, then by name
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return a.name.localeCompare(b.name)
    })

    return filtered
  }, [unifiedTemplates, sourceFilter, categoryFilter, showFeaturedOnly, searchQuery])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isOffline) return

    setLoading(true)
    try {
      const prefs = getTemplateSourcePreferences()
      const enabledRepos = prefs.repositories.filter((r) => r.enabled)

      const allRemote: RemoteTemplate[] = []
      for (const repo of enabledRepos) {
        const templates = await fetchAllTemplates(repo, { maxConcurrent: 5 })
        allRemote.push(...templates)
      }

      setRemoteTemplates(allRemote)
      setError(null)
    } catch (err) {
      console.error('[TemplateGallery] Error refreshing:', err)
      setError('Failed to refresh templates')
    } finally {
      setLoading(false)
    }
  }, [isOffline])

  // Handle template selection
  const handleSelect = useCallback(
    (template: UnifiedTemplate) => {
      onSelectTemplate(template.original)
    },
    [onSelectTemplate]
  )

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        isDark ? 'bg-neutral-900 text-neutral-100' : 'bg-white text-neutral-900'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        )}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Template Gallery</h2>
          {isOffline && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs">
              <CloudOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
          {syncStatus.isSyncing && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing {syncStatus.progress}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBuilder(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isDark
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
            )}
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
          <button
            onClick={handleRefresh}
            disabled={isOffline || loading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-neutral-800 disabled:opacity-50'
                : 'hover:bg-neutral-100 disabled:opacity-50'
            )}
            title="Refresh templates"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div
        className={cn(
          'px-4 py-3 border-b space-y-3',
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        )}
      >
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg text-sm',
              isDark
                ? 'bg-neutral-800 border-neutral-700 placeholder-neutral-500 focus:border-cyan-500'
                : 'bg-neutral-50 border-neutral-200 placeholder-neutral-400 focus:border-cyan-500',
              'border focus:outline-none focus:ring-1 focus:ring-cyan-500'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Source filters */}
          <SourceTab
            active={sourceFilter === 'all'}
            onClick={() => setSourceFilter('all')}
            isDark={isDark}
          >
            All
          </SourceTab>
          {sources.includes('local') && (
            <SourceTab
              active={sourceFilter === 'local'}
              onClick={() => setSourceFilter('local')}
              isDark={isDark}
              icon={<HardDrive className="w-3 h-3" />}
            >
              Local
            </SourceTab>
          )}
          {sources.includes('remote') && (
            <SourceTab
              active={sourceFilter === 'remote'}
              onClick={() => setSourceFilter('remote')}
              isDark={isDark}
              icon={<Globe className="w-3 h-3" />}
            >
              Remote
            </SourceTab>
          )}

          {/* Separator */}
          <div className={cn('w-px h-6', isDark ? 'bg-neutral-700' : 'bg-neutral-200')} />

          {/* Category dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                showFilters || categoryFilter !== 'all'
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'bg-cyan-50 text-cyan-600'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              <Filter className="w-3 h-3" />
              <span>{categoryFilter === 'all' ? 'Category' : categoryFilter}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'absolute left-0 top-full mt-1 z-50 w-48',
                    'rounded-lg shadow-xl border p-1',
                    isDark
                      ? 'bg-neutral-900 border-neutral-700'
                      : 'bg-white border-neutral-200'
                  )}
                >
                  <button
                    onClick={() => {
                      setCategoryFilter('all')
                      setShowFilters(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm',
                      categoryFilter === 'all'
                        ? isDark
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-cyan-50 text-cyan-600'
                        : isDark
                          ? 'hover:bg-neutral-800 text-neutral-300'
                          : 'hover:bg-neutral-100 text-neutral-600'
                    )}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoryFilter(cat.id)
                        setShowFilters(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                        categoryFilter === cat.id
                          ? isDark
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-cyan-50 text-cyan-600'
                          : isDark
                            ? 'hover:bg-neutral-800 text-neutral-300'
                            : 'hover:bg-neutral-100 text-neutral-600'
                      )}
                    >
                      <DynamicIcon name={cat.icon} className="w-4 h-4" />
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Featured toggle */}
          <button
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              showFeaturedOnly
                ? isDark
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-amber-50 text-amber-600'
                : isDark
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            )}
          >
            <Star className="w-3 h-3" />
            <span>Featured</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className={cn(
            'mx-4 mt-3 p-3 rounded-lg flex items-center gap-2',
            'bg-red-500/10 text-red-400 border border-red-500/20'
          )}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No templates found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-cyan-500 text-sm hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateGalleryCard
                key={template.id}
                template={template}
                isDark={isDark}
                isSelected={selectedTemplateId === template.id}
                onClick={() => handleSelect(template)}
                onPreview={() => setPreviewTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {showPreview && previewTemplate && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              'fixed right-0 top-16 bottom-0 w-96 border-l shadow-xl',
              isDark ? 'bg-neutral-900 border-neutral-700' : 'bg-white border-neutral-200'
            )}
          >
            <TemplatePreviewPanel
              template={previewTemplate}
              isDark={isDark}
              onClose={() => setPreviewTemplate(null)}
              onSelect={() => {
                handleSelect(previewTemplate)
                setPreviewTemplate(null)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Builder Modal */}
      {showBuilder && (
        <TemplateBuilder
          onSave={(draft) => {
            console.log('[TemplateGallery] Draft saved:', draft.name)
          }}
          onClose={() => setShowBuilder(false)}
          onPublish={(draft) => {
            setPublishDraft(draft)
            setShowBuilder(false)
          }}
          isDark={isDark}
        />
      )}

      {/* Publish Modal */}
      {publishDraft && (
        <TemplatePublishModal
          isOpen={!!publishDraft}
          onClose={() => setPublishDraft(null)}
          template={publishDraft}
          isDark={isDark}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SourceTabProps {
  active: boolean
  onClick: () => void
  isDark: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

function SourceTab({ active, onClick, isDark, icon, children }: SourceTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
        active
          ? isDark
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-cyan-50 text-cyan-600'
          : isDark
            ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

interface TemplateGalleryCardProps {
  template: UnifiedTemplate
  isDark: boolean
  isSelected: boolean
  onClick: () => void
  onPreview: () => void
}

function TemplateGalleryCard({
  template,
  isDark,
  isSelected,
  onClick,
  onPreview,
}: TemplateGalleryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'group relative rounded-xl border overflow-hidden cursor-pointer transition-colors',
        isSelected
          ? isDark
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-cyan-500 bg-cyan-50'
          : isDark
            ? 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
            : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300'
      )}
      onClick={onClick}
    >
      {/* Source badge */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
            template.source === 'local'
              ? isDark
                ? 'bg-neutral-700 text-neutral-300'
                : 'bg-neutral-200 text-neutral-600'
              : isDark
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-cyan-50 text-cyan-600'
          )}
        >
          {template.source === 'local' ? (
            <HardDrive className="w-3 h-3" />
          ) : (
            <Globe className="w-3 h-3" />
          )}
          <span>{template.sourceName}</span>
        </div>
      </div>

      {/* Featured badge */}
      {template.featured && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
            <Star className="w-3 h-3 fill-current" />
            <span>Featured</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 pt-10">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              isDark ? 'bg-neutral-700' : 'bg-neutral-200'
            )}
          >
            <DynamicIcon name={template.icon} className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-medium truncate',
                isDark ? 'text-neutral-100' : 'text-neutral-900'
              )}
            >
              {template.name}
            </h3>
            <p
              className={cn(
                'text-sm mt-0.5 line-clamp-2',
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              )}
            >
              {template.shortDescription}
            </p>
          </div>
        </div>

        {/* Tags */}
        {(template.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {(template.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cn(
                  'px-2 py-0.5 rounded text-xs',
                  isDark ? 'bg-neutral-700 text-neutral-400' : 'bg-neutral-200 text-neutral-500'
                )}
              >
                {tag}
              </span>
            ))}
            {(template.tags?.length ?? 0) > 3 && (
              <span className={cn('text-xs', isDark ? 'text-neutral-500' : 'text-neutral-400')}>
                +{(template.tags?.length ?? 0) - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 border-t',
          isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-200 bg-neutral-100/50'
        )}
      >
        <span className={cn('text-xs', isDark ? 'text-neutral-500' : 'text-neutral-400')}>
          {template.category}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              isDark
                ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200'
            )}
          >
            Preview
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className={cn(
              'px-2 py-1 rounded text-xs transition-colors',
              isDark
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
            )}
          >
            Use
          </button>
        </div>
      </div>
    </motion.div>
  )
}

interface TemplatePreviewPanelProps {
  template: UnifiedTemplate
  isDark: boolean
  onClose: () => void
  onSelect: () => void
}

function TemplatePreviewPanel({
  template,
  isDark,
  onClose,
  onSelect,
}: TemplatePreviewPanelProps) {
  const remoteTemplate = template.source === 'remote' ? (template.original as RemoteTemplate) : null

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          isDark ? 'border-neutral-700' : 'border-neutral-200'
        )}
      >
        <h3 className="font-medium">Template Preview</h3>
        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Icon and name */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isDark ? 'bg-neutral-800' : 'bg-neutral-100'
            )}
          >
            <DynamicIcon name={template.icon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{template.name}</h2>
            <p className={cn('text-sm', isDark ? 'text-neutral-400' : 'text-neutral-500')}>
              {template.category}
            </p>
          </div>
        </div>

        {/* Source info */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            isDark ? 'bg-neutral-800' : 'bg-neutral-100'
          )}
        >
          {template.source === 'local' ? (
            <>
              <HardDrive className="w-4 h-4 text-neutral-500" />
              <span className={cn('text-sm', isDark ? 'text-neutral-300' : 'text-neutral-600')}>
                Local template
              </span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 text-cyan-500" />
              <span className={cn('text-sm', isDark ? 'text-neutral-300' : 'text-neutral-600')}>
                {template.sourceName}
              </span>
              {remoteTemplate && (
                <span className={cn('text-xs', isDark ? 'text-neutral-500' : 'text-neutral-400')}>
                  v{remoteTemplate.remote.version}
                </span>
              )}
            </>
          )}
        </div>

        {/* Description */}
        <div>
          <h4
            className={cn(
              'text-sm font-medium mb-1',
              isDark ? 'text-neutral-300' : 'text-neutral-700'
            )}
          >
            Description
          </h4>
          <p className={cn('text-sm', isDark ? 'text-neutral-400' : 'text-neutral-500')}>
            {template.description}
          </p>
        </div>

        {/* Tags */}
        {(template.tags?.length ?? 0) > 0 && (
          <div>
            <h4
              className={cn(
                'text-sm font-medium mb-2',
                isDark ? 'text-neutral-300' : 'text-neutral-700'
              )}
            >
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {(template.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-100 text-neutral-500'
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Featured badge */}
        {template.featured && (
          <div className="flex items-center gap-2 text-amber-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm">Featured template</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'px-4 py-3 border-t',
          isDark ? 'border-neutral-700' : 'border-neutral-200'
        )}
      >
        <button
          onClick={onSelect}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            isDark
              ? 'bg-cyan-500 text-white hover:bg-cyan-400'
              : 'bg-cyan-600 text-white hover:bg-cyan-500'
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Use Template</span>
        </button>
      </div>
    </div>
  )
}

export { TemplateGallery }
