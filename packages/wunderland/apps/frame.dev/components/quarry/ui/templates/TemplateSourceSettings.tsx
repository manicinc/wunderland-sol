/**
 * Template Source Settings
 * @module codex/ui/TemplateSourceSettings
 *
 * @description
 * Settings tab for managing remote template repositories.
 * Features:
 * - Official source display (always shown)
 * - User-added repositories list
 * - Add repository form with GitHub URL parsing
 * - Cache management (clear, stats)
 * - Rate limit status display
 * - Sync status and manual refresh
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Github,
  Plus,
  Trash2,
  RefreshCw,
  Database,
  Clock,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Loader2,
  Shield,
  Info,
  ChevronDown,
  ChevronRight,
  FileText,
  Edit3,
  Upload,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type TemplateRepository,
  type TemplateSyncStatus,
  type GitHubRateLimitStatus,
  type TemplateDraft,
  OFFICIAL_TEMPLATE_REPO,
} from '@/lib/templates/types'
import { loadDrafts, deleteDraft } from '@/lib/templates/templatePublisher'
import TemplateBuilder from './TemplateBuilder'
import TemplatePublishModal from './TemplatePublishModal'
import {
  getTemplateSourcePreferences,
  addTemplateRepository,
  removeTemplateRepository,
  setRepositoryEnabled,
  parseGitHubUrl,
  getAllRemoteTemplates,
  checkForUpdates,
  getRateLimitStatus,
  subscribeToSyncStatus,
} from '@/lib/templates/remoteTemplateLoader'
import {
  getCacheStats,
  clearAllCache,
} from '@/lib/templates/templateCache'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

interface CacheStatsDisplay {
  registryCount: number
  templateCount: number
  totalSize: string
  lastCleared?: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function TemplateSourceSettings() {
  // State
  const [repositories, setRepositories] = useState<TemplateRepository[]>([])
  const [syncStatus, setSyncStatus] = useState<TemplateSyncStatus>({
    isSyncing: false,
    lastSyncAt: undefined,
    error: undefined,
  })
  const [rateLimit, setRateLimit] = useState<GitHubRateLimitStatus | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStatsDisplay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Add repository form
  const [showAddForm, setShowAddForm] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>('repos')

  // Template drafts
  const [drafts, setDrafts] = useState<TemplateDraft[]>([])
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingDraft, setEditingDraft] = useState<TemplateDraft | null>(null)
  const [publishDraft, setPublishDraft] = useState<TemplateDraft | null>(null)

  // Load initial data
  useEffect(() => {
    loadData()
    setDrafts(loadDrafts())

    // Subscribe to sync status updates
    const unsubscribe = subscribeToSyncStatus(setSyncStatus)
    return unsubscribe
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load preferences
      const prefs = getTemplateSourcePreferences()
      setRepositories(prefs.repositories)

      // Load cache stats
      const stats = await getCacheStats()
      setCacheStats({
        registryCount: stats.registryCount,
        templateCount: stats.templateCount,
        totalSize: formatBytes(stats.totalBytes),
        lastCleared: stats.lastCleared,
      })

      // Load rate limit (non-blocking)
      getRateLimitStatus().then(setRateLimit).catch(() => {})
    } catch (error) {
      console.error('[TemplateSourceSettings] Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle add repository
  const handleAddRepository = async () => {
    if (!repoUrl.trim()) {
      setAddError('Please enter a GitHub repository URL')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      // Parse URL
      const parsed = parseGitHubUrl(repoUrl.trim())
      if (!parsed) {
        setAddError('Invalid GitHub URL. Use format: https://github.com/owner/repo')
        return
      }

      // Check if already added
      const existing = repositories.find(
        (r) => r.owner === parsed.owner && r.repo === parsed.repo
      )
      if (existing) {
        setAddError('This repository is already added')
        return
      }

      // Add repository
      const newRepo = addTemplateRepository(parsed.owner, parsed.repo, parsed.branch)
      setRepositories((prev) => [...prev, newRepo])
      setRepoUrl('')
      setShowAddForm(false)
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Failed to add repository')
    } finally {
      setIsAdding(false)
    }
  }

  // Handle remove repository
  const handleRemoveRepository = (id: string) => {
    const repo = repositories.find((r) => r.id === id)
    if (!repo || repo.isOfficial) return

    removeTemplateRepository(id)
    setRepositories((prev) => prev.filter((r) => r.id !== id))
  }

  // Handle toggle repository
  const handleToggleRepository = (id: string, enabled: boolean) => {
    setRepositoryEnabled(id, enabled)
    setRepositories((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    )
  }

  // Handle sync all
  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      await getAllRemoteTemplates(true)
      await loadData()
    } catch (error) {
      console.error('[TemplateSourceSettings] Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  // Handle clear cache
  const handleClearCache = async () => {
    setIsClearing(true)
    try {
      await clearAllCache()
      await loadData()
    } catch (error) {
      console.error('[TemplateSourceSettings] Failed to clear cache:', error)
    } finally {
      setIsClearing(false)
    }
  }

  // Format bytes helper
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Format date helper
  function formatDate(timestamp?: number): string {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Template Sources
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage remote template repositories for additional templates.
          </p>
        </div>

        {/* Sync button */}
        <button
          onClick={handleSyncAll}
          disabled={isSyncing || syncStatus.isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${(isSyncing || syncStatus.isSyncing) ? 'animate-spin' : ''}`} />
          {isSyncing || syncStatus.isSyncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {/* Sync Status */}
      {syncStatus.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{syncStatus.error}</p>
        </div>
      )}

      {/* My Templates Section */}
      <Section
        title="My Templates"
        icon={<FileText className="w-4 h-4" />}
        expanded={expandedSection === 'drafts'}
        onToggle={() => setExpandedSection(expandedSection === 'drafts' ? null : 'drafts')}
        badge={`${drafts.length} drafts`}
      >
        <div className="space-y-3">
          {/* Draft List */}
          {drafts.length > 0 ? (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-500">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {draft.name || 'Untitled Draft'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {draft.category} • {draft.fields.length} fields
                      {draft.updatedAt && ` • Updated ${new Date(draft.updatedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingDraft(draft)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit draft"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPublishDraft(draft)}
                    className="p-2 text-cyan-500 hover:text-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                    title="Publish to GitHub"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (draft.id) {
                        deleteDraft(draft.id)
                        setDrafts(loadDrafts())
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No template drafts yet</p>
              <p className="text-xs mt-1">Create a template to get started</p>
            </div>
          )}

          {/* Create Template Button */}
          <button
            onClick={() => setShowBuilder(true)}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-cyan-500 hover:text-cyan-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Template
          </button>
        </div>
      </Section>

      {/* Repositories Section */}
      <Section
        title="Repositories"
        icon={<Github className="w-4 h-4" />}
        expanded={expandedSection === 'repos'}
        onToggle={() => setExpandedSection(expandedSection === 'repos' ? null : 'repos')}
        badge={`${repositories.filter((r) => r.enabled).length} active`}
      >
        <div className="space-y-3">
          {/* Repository List */}
          {repositories.map((repo) => (
            <RepositoryCard
              key={repo.id}
              repository={repo}
              onToggle={(enabled) => handleToggleRepository(repo.id, enabled)}
              onRemove={() => handleRemoveRepository(repo.id)}
            />
          ))}

          {/* Add Repository Button/Form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Repository
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GitHub Repository URL
                  </label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRepository()}
                  />
                  {addError && (
                    <p className="mt-1 text-xs text-red-500">{addError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddRepository}
                    disabled={isAdding}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false)
                      setRepoUrl('')
                      setAddError(null)
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Repository must contain a <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">registry.json</code> file at the root.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </Section>

      {/* Cache Management Section */}
      <Section
        title="Cache Management"
        icon={<Database className="w-4 h-4" />}
        expanded={expandedSection === 'cache'}
        onToggle={() => setExpandedSection(expandedSection === 'cache' ? null : 'cache')}
        badge={cacheStats?.totalSize || '0 B'}
      >
        <div className="space-y-4">
          {/* Cache Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Registries</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {cacheStats?.registryCount || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Templates</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {cacheStats?.templateCount || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Size</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {cacheStats?.totalSize || '0 B'}
              </p>
            </div>
          </div>

          {/* Last synced */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Last synced</span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatDate(syncStatus.lastSyncAt)}
            </span>
          </div>

          {/* Clear cache button */}
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            {isClearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear Template Cache
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Clearing the cache will require re-downloading templates on next access.
          </p>
        </div>
      </Section>

      {/* Rate Limit Section */}
      <Section
        title="GitHub Rate Limit"
        icon={<Clock className="w-4 h-4" />}
        expanded={expandedSection === 'ratelimit'}
        onToggle={() => setExpandedSection(expandedSection === 'ratelimit' ? null : 'ratelimit')}
        badge={rateLimit ? `${rateLimit.remaining}/${rateLimit.limit}` : undefined}
      >
        {rateLimit ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Remaining requests</span>
              <span className={`text-sm font-medium ${
                rateLimit.remaining < 10
                  ? 'text-red-600 dark:text-red-400'
                  : rateLimit.remaining < 30
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
              }`}>
                {rateLimit.remaining} / {rateLimit.limit}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  rateLimit.remaining < 10
                    ? 'bg-red-500'
                    : rateLimit.remaining < 30
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Resets at</span>
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(rateLimit.resetAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Template content is fetched via <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800/50 rounded">raw.githubusercontent.com</code> which has no rate limits. The GitHub API is only used for registry metadata.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rate limit information unavailable
          </p>
        )}
      </Section>

      {/* Info Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Offline Support:</strong> Downloaded templates are cached locally and available offline.</p>
            <p className="mt-2"><strong>Stale-while-revalidate:</strong> Cached templates serve instantly while checking for updates in the background.</p>
          </div>
        </div>
      </div>

      {/* Template Builder Modal */}
      {(showBuilder || editingDraft) && (
        <TemplateBuilder
          initialDraft={editingDraft || undefined}
          onSave={(draft) => {
            setDrafts(loadDrafts())
          }}
          onClose={() => {
            setShowBuilder(false)
            setEditingDraft(null)
          }}
          onPublish={(draft) => {
            setPublishDraft(draft)
            setShowBuilder(false)
            setEditingDraft(null)
          }}
          isDark={true}
        />
      )}

      {/* Publish Modal */}
      {publishDraft && (
        <TemplatePublishModal
          isOpen={!!publishDraft}
          onClose={() => setPublishDraft(null)}
          template={publishDraft}
          isDark={true}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface SectionProps {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}

function Section({ title, icon, expanded, onToggle, badge, children }: SectionProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{title}</span>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RepositoryCardProps {
  repository: TemplateRepository
  onToggle: (enabled: boolean) => void
  onRemove: () => void
}

function RepositoryCard({ repository, onToggle, onRemove }: RepositoryCardProps) {
  const isOfficial = repository.isOfficial

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      repository.enabled
        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg ${
          isOfficial
            ? 'bg-purple-100 dark:bg-purple-900/30'
            : 'bg-gray-100 dark:bg-gray-700'
        }`}>
          {isOfficial ? (
            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          ) : (
            <Github className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {repository.name}
            </p>
            {isOfficial && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                Official
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {repository.owner}/{repository.repo}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* External link */}
        <a
          href={`https://github.com/${repository.owner}/${repository.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="View on GitHub"
        >
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Toggle */}
        <button
          onClick={() => onToggle(!repository.enabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            repository.enabled ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              repository.enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>

        {/* Remove (not for official) */}
        {!isOfficial && (
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Remove repository"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
