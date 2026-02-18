/**
 * Plugin Source Settings
 * @module codex/ui/PluginSourceSettings
 *
 * @description
 * Settings tab for managing remote plugin repositories.
 * Similar to TemplateSourceSettings but for plugins.
 * Features:
 * - Official registry display (always shown)
 * - User-added plugin repositories
 * - Add repository form with GitHub URL parsing
 * - Auto-sync on addition
 * - Cache management
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Puzzle,
  Github,
  Plus,
  Trash2,
  RefreshCw,
  Database,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Shield,
  Info,
  ChevronDown,
  ChevronRight,
  Package,
  Globe,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { quarryPluginManager } from '@/lib/plugins'
import type { PluginRegistry, RegistryPlugin } from '@/lib/plugins/types'
import { DEFAULT_REGISTRY_URL } from '@/lib/plugins/types'

/* ===============================================================================
   TYPES
=============================================================================== */

interface PluginRepository {
  id: string
  name: string
  owner: string
  repo: string
  branch: string
  registryUrl: string
  enabled: boolean
  isOfficial: boolean
  lastSyncAt?: number
}

interface PluginSourcePreferences {
  repositories: PluginRepository[]
  autoSync: boolean
  syncIntervalHours: number
}

const PLUGIN_SOURCE_PREFS_KEY = 'quarry-plugin-sources'

const OFFICIAL_PLUGIN_REPO: PluginRepository = {
  id: 'official',
  name: 'Quarry Plugins',
  owner: 'framersai',
  repo: 'quarry-plugins',
  branch: 'main',
  registryUrl: DEFAULT_REGISTRY_URL,
  enabled: true,
  isOfficial: true,
}

/* ===============================================================================
   STORAGE HELPERS
=============================================================================== */

function getPluginSourcePreferences(): PluginSourcePreferences {
  if (typeof window === 'undefined') {
    return { repositories: [OFFICIAL_PLUGIN_REPO], autoSync: true, syncIntervalHours: 24 }
  }

  try {
    const stored = localStorage.getItem(PLUGIN_SOURCE_PREFS_KEY)
    if (stored) {
      const prefs = JSON.parse(stored)
      // Ensure official repo is always present
      if (!prefs.repositories.find((r: PluginRepository) => r.id === 'official')) {
        prefs.repositories.unshift(OFFICIAL_PLUGIN_REPO)
      }
      return prefs
    }
  } catch {
    // Ignore
  }

  return { repositories: [OFFICIAL_PLUGIN_REPO], autoSync: true, syncIntervalHours: 24 }
}

function savePluginSourcePreferences(prefs: PluginSourcePreferences): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PLUGIN_SOURCE_PREFS_KEY, JSON.stringify(prefs))
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  try {
    // Match github.com URLs
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/)
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: match[3] || 'main',
      }
    }
  } catch {
    // Invalid URL
  }
  return null
}

/* ===============================================================================
   COMPONENT
=============================================================================== */

export default function PluginSourceSettings() {
  // State
  const [repositories, setRepositories] = useState<PluginRepository[]>([])
  const [registry, setRegistry] = useState<PluginRegistry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Add repository form
  const [showAddForm, setShowAddForm] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<string | null>('repos')

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const prefs = getPluginSourcePreferences()
      setRepositories(prefs.repositories)

      // Load registry
      const reg = await quarryPluginManager.fetchRegistry()
      setRegistry(reg)
    } catch (error) {
      console.error('[PluginSourceSettings] Failed to load data:', error)
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

      // Create new repo entry
      const newRepo: PluginRepository = {
        id: `${parsed.owner}-${parsed.repo}`,
        name: `${parsed.owner}/${parsed.repo}`,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch,
        registryUrl: `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/registry.json`,
        enabled: true,
        isOfficial: false,
      }

      // Verify repository has a registry.json
      try {
        const response = await fetch(newRepo.registryUrl)
        if (!response.ok) {
          setAddError('Repository does not have a registry.json file')
          return
        }
        // Validate it's valid JSON
        await response.json()
      } catch {
        setAddError('Could not fetch registry.json from repository')
        return
      }

      // Add to list
      const updatedRepos = [...repositories, newRepo]
      setRepositories(updatedRepos)

      // Save preferences
      const prefs = getPluginSourcePreferences()
      prefs.repositories = updatedRepos
      savePluginSourcePreferences(prefs)

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

    const updatedRepos = repositories.filter((r) => r.id !== id)
    setRepositories(updatedRepos)

    const prefs = getPluginSourcePreferences()
    prefs.repositories = updatedRepos
    savePluginSourcePreferences(prefs)
  }

  // Handle toggle repository
  const handleToggleRepository = (id: string, enabled: boolean) => {
    const updatedRepos = repositories.map((r) =>
      r.id === id ? { ...r, enabled } : r
    )
    setRepositories(updatedRepos)

    const prefs = getPluginSourcePreferences()
    prefs.repositories = updatedRepos
    savePluginSourcePreferences(prefs)
  }

  // Handle sync all
  const handleSyncAll = async () => {
    setIsSyncing(true)
    setSyncError(null)

    try {
      // Force refresh registry
      const reg = await quarryPluginManager.fetchRegistry(true)
      setRegistry(reg)

      // Update last sync time for all repos
      const updatedRepos = repositories.map((r) => ({
        ...r,
        lastSyncAt: Date.now(),
      }))
      setRepositories(updatedRepos)

      const prefs = getPluginSourcePreferences()
      prefs.repositories = updatedRepos
      savePluginSourcePreferences(prefs)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
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
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-purple-500" />
            Plugin Sources
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage plugin repositories for additional plugins.
          </p>
        </div>

        {/* Sync button */}
        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {/* Sync Error */}
      {syncError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>
        </div>
      )}

      {/* Available Plugins Section */}
      <Section
        title="Available Plugins"
        icon={<Package className="w-4 h-4" />}
        expanded={expandedSection === 'available'}
        onToggle={() => setExpandedSection(expandedSection === 'available' ? null : 'available')}
        badge={`${registry?.plugins.length || 0} plugins`}
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {registry?.plugins.map((plugin) => {
            const isInstalled = quarryPluginManager.isInstalled(plugin.id)
            return (
              <div
                key={plugin.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-500">
                    <Puzzle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {plugin.name}
                      </span>
                      {plugin.verified && (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {plugin.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isInstalled ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                      Installed
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        await quarryPluginManager.installFromRegistry(plugin.id)
                      }}
                      className="px-2 py-1 text-xs font-medium text-white bg-purple-500 rounded hover:bg-purple-600 transition-colors"
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {(!registry?.plugins || registry.plugins.length === 0) && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No plugins available</p>
              <p className="text-xs mt-1">Add a repository to discover plugins</p>
            </div>
          )}
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
              lastSync={formatDate(repo.lastSyncAt)}
              onToggle={(enabled) => handleToggleRepository(repo.id, enabled)}
              onRemove={() => handleRemoveRepository(repo.id)}
            />
          ))}

          {/* Add Repository Button/Form */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
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

      {/* Info Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Auto-loading:</strong> Plugins from enabled repositories are automatically available for installation.</p>
            <p className="mt-2"><strong>Security:</strong> Only install plugins from trusted sources. Plugins can access your content and execute code.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===============================================================================
   HELPER COMPONENTS
=============================================================================== */

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
  repository: PluginRepository
  lastSync: string
  onToggle: (enabled: boolean) => void
  onRemove: () => void
}

function RepositoryCard({ repository, lastSync, onToggle, onRemove }: RepositoryCardProps) {
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
            <Puzzle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
            {repository.owner}/{repository.repo} • {lastSync}
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
            repository.enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
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
