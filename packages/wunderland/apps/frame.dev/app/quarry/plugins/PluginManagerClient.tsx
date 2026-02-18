/**
 * Plugin Manager Client Component
 *
 * Full-page plugin management interface with tabs for installed/marketplace.
 * Uses the existing plugin infrastructure from lib/plugins.
 *
 * @module quarry/plugins/PluginManagerClient
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Puzzle,
  Plus,
  Upload,
  Globe,
  RefreshCw,
  Search,
  Package,
  Loader2,
  X,
  ChevronDown,
  Settings,
  Save,
  Download,
  Trash2,
  Shield,
  Zap,
  ExternalLink,
  Github,
  Link as LinkIcon,
  Check,
  AlertCircle,
} from 'lucide-react'
import type { PluginState, RegistryPlugin, PluginManifest, SettingDefinition } from '@/lib/plugins/types'
import { quarryPluginManager, initializePlugins } from '@/lib/plugins'
import { isPublicAccess } from '@/lib/config/publicAccess'

type Tab = 'installed' | 'marketplace'
type PluginTypeFilter = 'all' | 'widget' | 'renderer' | 'processor' | 'theme' | 'panel' | 'toolbar' | 'command'

interface PluginManagerClientProps {
  theme?: string
}

export default function PluginManagerClient({ theme = 'light' }: PluginManagerClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('installed')
  const [plugins, setPlugins] = useState<PluginState[]>([])
  const [registryPlugins, setRegistryPlugins] = useState<RegistryPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<PluginTypeFilter>('all')
  const [installError, setInstallError] = useState<string | null>(null)
  const [installSuccess, setInstallSuccess] = useState<string | null>(null)

  // Install modal state
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installUrl, setInstallUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings modal state
  const [settingsPluginId, setSettingsPluginId] = useState<string | null>(null)
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({})

  const publicAccessMode = isPublicAccess()
  const isDark = theme.includes('dark')

  // Initialize plugin manager
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        await initializePlugins()
        setPlugins(quarryPluginManager.getAll())
      } catch (error) {
        console.error('[PluginManager] Failed to initialize:', error)
      } finally {
        setLoading(false)
      }
    }

    init()

    const unsubscribe = quarryPluginManager.onChange(() => {
      setPlugins(quarryPluginManager.getAll())
    })

    return () => unsubscribe()
  }, [])

  // Load registry when marketplace tab is selected
  const loadRegistry = useCallback(async (force = false) => {
    setRegistryLoading(true)
    try {
      const registry = await quarryPluginManager.fetchRegistry(force)
      setRegistryPlugins(registry.plugins)
    } catch (error) {
      console.error('[PluginManager] Failed to load registry:', error)
    } finally {
      setRegistryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'marketplace' && registryPlugins.length === 0) {
      loadRegistry()
    }
  }, [activeTab, registryPlugins.length, loadRegistry])

  // Toggle plugin enabled state
  const handleToggle = async (id: string) => {
    await quarryPluginManager.togglePlugin(id)
  }

  // Uninstall plugin
  const handleUninstall = async (id: string) => {
    if (confirm('Are you sure you want to uninstall this plugin?')) {
      await quarryPluginManager.uninstallPlugin(id)
    }
  }

  // Install from URL
  const handleInstallFromUrl = async () => {
    if (!installUrl.trim()) return

    setInstalling('url')
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromUrl(installUrl)
      if (result.success) {
        setInstallUrl('')
        setShowInstallModal(false)
        setInstallSuccess(`Successfully installed ${result.manifest?.name || 'plugin'}`)
        setTimeout(() => setInstallSuccess(null), 3000)
      } else {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(null)
    }
  }

  // Install from ZIP
  const handleInstallFromZip = async (file: File) => {
    setInstalling('zip')
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromZip(file)
      if (result.success) {
        setShowInstallModal(false)
        setInstallSuccess(`Successfully installed ${result.manifest?.name || 'plugin'}`)
        setTimeout(() => setInstallSuccess(null), 3000)
      } else {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(null)
    }
  }

  // Install from registry
  const handleInstallFromRegistry = async (pluginId: string) => {
    setInstalling(pluginId)
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromRegistry(pluginId)
      if (result.success) {
        setInstallSuccess(`Successfully installed ${result.manifest?.name || 'plugin'}`)
        setTimeout(() => setInstallSuccess(null), 3000)
      } else {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(null)
    }
  }

  // Open settings modal
  const handleOpenSettings = (id: string) => {
    const plugin = plugins.find(p => p.id === id)
    if (plugin) {
      setSettingsValues(plugin.settings || {})
      setSettingsPluginId(id)
    }
  }

  // Save settings
  const handleSaveSettings = () => {
    if (settingsPluginId) {
      quarryPluginManager.setPluginSettings(settingsPluginId, settingsValues)
      setSettingsPluginId(null)
    }
  }

  // Filter plugins
  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || p.manifest.type === typeFilter
    return matchesSearch && matchesType
  })

  const filteredRegistry = registryPlugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || p.type === typeFilter
    const notInstalled = !plugins.some(installed => installed.id === p.id)
    return matchesSearch && matchesType && notInstalled
  })

  const bundledPlugins = filteredPlugins.filter(p => p.isBundled)
  const installedPlugins = filteredPlugins.filter(p => !p.isBundled)
  const settingsPlugin = settingsPluginId ? plugins.find(p => p.id === settingsPluginId) : null

  const enabledCount = plugins.filter(p => p.enabled).length
  const totalCount = plugins.length

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Hidden file input for ZIP upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleInstallFromZip(file)
          e.target.value = ''
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Puzzle className="w-7 h-7 text-pink-500" />
            Plugin Manager
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {enabledCount} of {totalCount} plugins enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!publicAccessMode && (
            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white font-medium text-sm hover:bg-pink-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Install Plugin
            </button>
          )}
          <a
            href="https://github.com/framersai/quarry-plugins"
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
              ${isDark
                ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }
            `}
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">Repository</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {installSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {installSuccess}
          </motion.div>
        )}
        {installError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {installError}
            <button onClick={() => setInstallError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab('installed')}
          className={`
            px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
            ${activeTab === 'installed'
              ? 'text-pink-600 dark:text-pink-400 border-pink-500'
              : 'text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-700 dark:hover:text-zinc-200'
            }
          `}
        >
          Installed ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`
            px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
            ${activeTab === 'marketplace'
              ? 'text-pink-600 dark:text-pink-400 border-pink-500'
              : 'text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-700 dark:hover:text-zinc-200'
            }
          `}
        >
          Marketplace
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`
              w-full pl-10 pr-4 py-2 rounded-lg border text-sm
              ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 placeholder-zinc-500'
                : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
              }
              focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500
            `}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PluginTypeFilter)}
          className={`
            px-3 py-2 rounded-lg border text-sm
            ${isDark
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
              : 'bg-white border-zinc-200 text-zinc-900'
            }
            focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500
          `}
        >
          <option value="all">All Types</option>
          <option value="widget">Widgets</option>
          <option value="renderer">Renderers</option>
          <option value="processor">Processors</option>
          <option value="theme">Themes</option>
          <option value="panel">Panels</option>
          <option value="toolbar">Toolbar</option>
          <option value="command">Commands</option>
        </select>
        {activeTab === 'marketplace' && (
          <button
            onClick={() => loadRegistry(true)}
            disabled={registryLoading}
            className={`
              px-3 py-2 rounded-lg border text-sm flex items-center gap-2
              ${isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'
              }
              disabled:opacity-50
            `}
          >
            <RefreshCw className={`w-4 h-4 ${registryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : activeTab === 'installed' ? (
        <div className="space-y-6">
          {/* Bundled Plugins */}
          {bundledPlugins.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Bundled Plugins
              </h2>
              <div className="grid gap-3">
                {bundledPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    isDark={isDark}
                    onToggle={handleToggle}
                    onSettings={handleOpenSettings}
                    publicAccessMode={publicAccessMode}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Installed Plugins */}
          {installedPlugins.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Installed Plugins
              </h2>
              <div className="grid gap-3">
                {installedPlugins.map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    isDark={isDark}
                    onToggle={handleToggle}
                    onUninstall={handleUninstall}
                    onSettings={handleOpenSettings}
                    publicAccessMode={publicAccessMode}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredPlugins.length === 0 && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {searchQuery ? 'No plugins match your search' : 'No plugins installed'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {registryLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          ) : filteredRegistry.length > 0 ? (
            filteredRegistry.map((plugin) => (
              <RegistryPluginCard
                key={plugin.id}
                plugin={plugin}
                isDark={isDark}
                installing={installing === plugin.id}
                onInstall={() => handleInstallFromRegistry(plugin.id)}
                publicAccessMode={publicAccessMode}
              />
            ))
          ) : (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              {searchQuery ? 'No plugins match your search' : 'No additional plugins available'}
            </div>
          )}
        </div>
      )}

      {/* Install Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                w-full max-w-md rounded-xl shadow-xl border p-6
                ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Install Plugin
                </h3>
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* URL Install */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    From URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/plugin.zip"
                      value={installUrl}
                      onChange={(e) => setInstallUrl(e.target.value)}
                      className={`
                        flex-1 px-3 py-2 rounded-lg border text-sm
                        ${isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          : 'bg-white border-zinc-200 text-zinc-900'
                        }
                        focus:outline-none focus:ring-2 focus:ring-pink-500/50
                      `}
                    />
                    <button
                      onClick={handleInstallFromUrl}
                      disabled={!installUrl.trim() || installing === 'url'}
                      className="px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      {installing === 'url' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                      Install
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className={`px-2 ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'}`}>
                      or
                    </span>
                  </div>
                </div>

                {/* ZIP Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={installing === 'zip'}
                  className={`
                    w-full p-6 rounded-lg border-2 border-dashed text-center transition-colors
                    ${isDark
                      ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                      : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
                    }
                  `}
                >
                  {installing === 'zip' ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-pink-500" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                  )}
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Upload ZIP file
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Click to select a plugin ZIP file
                  </p>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {settingsPlugin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setSettingsPluginId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                w-full max-w-md rounded-xl shadow-xl border
                ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
              `}
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {settingsPlugin.manifest.name} Settings
                </h3>
                <button
                  onClick={() => setSettingsPluginId(null)}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {settingsPlugin.manifest.settings && Object.entries(settingsPlugin.manifest.settings).length > 0 ? (
                  Object.entries(settingsPlugin.manifest.settings).map(([key, def]) => (
                    <SettingField
                      key={key}
                      settingKey={key}
                      definition={def}
                      value={settingsValues[key] ?? def.default}
                      onChange={(value) => setSettingsValues(prev => ({ ...prev, [key]: value }))}
                      isDark={isDark}
                    />
                  ))
                ) : (
                  <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                    No configurable settings for this plugin.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setSettingsPluginId(null)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium
                    ${isDark
                      ? 'text-zinc-300 hover:bg-zinc-800'
                      : 'text-zinc-700 hover:bg-zinc-100'
                    }
                  `}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 rounded-lg bg-pink-500 text-white text-sm font-medium hover:bg-pink-600 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Public Access Warning */}
      {publicAccessMode && (
        <div className="mt-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-100">
                Public Access Mode
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Plugin management is restricted in public access mode. You can view and configure installed plugins, but cannot install or uninstall.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PLUGIN CARD COMPONENT
// ============================================================================

interface PluginCardProps {
  plugin: PluginState
  isDark: boolean
  onToggle: (id: string) => void
  onUninstall?: (id: string) => void
  onSettings: (id: string) => void
  publicAccessMode: boolean
}

function PluginCard({ plugin, isDark, onToggle, onUninstall, onSettings, publicAccessMode }: PluginCardProps) {
  const hasSettings = plugin.manifest.settings && Object.keys(plugin.manifest.settings).length > 0

  return (
    <div
      className={`
        p-4 rounded-xl border transition-colors
        ${plugin.enabled
          ? isDark
            ? 'bg-pink-950/20 border-pink-800/50'
            : 'bg-pink-50 border-pink-200'
          : isDark
            ? 'bg-zinc-800/50 border-zinc-700'
            : 'bg-white border-zinc-200'
        }
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-medium text-zinc-900 dark:text-white">
              {plugin.manifest.name}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono">
              v{plugin.manifest.version}
            </span>
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded font-medium
              ${plugin.manifest.type === 'widget' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
                plugin.manifest.type === 'renderer' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' :
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}
            `}>
              {plugin.manifest.type}
            </span>
            {plugin.isBundled && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Bundled
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {plugin.manifest.description}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            by {plugin.manifest.author}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasSettings && (
            <button
              onClick={() => onSettings(plugin.id)}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }
              `}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {!plugin.isBundled && onUninstall && !publicAccessMode && (
            <button
              onClick={() => onUninstall(plugin.id)}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark
                  ? 'hover:bg-red-900/30 text-zinc-400 hover:text-red-400'
                  : 'hover:bg-red-50 text-zinc-500 hover:text-red-600'
                }
              `}
              title="Uninstall"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onToggle(plugin.id)}
            disabled={publicAccessMode}
            className={`
              relative w-11 h-6 rounded-full transition-colors
              ${plugin.enabled
                ? 'bg-pink-500'
                : isDark
                  ? 'bg-zinc-700'
                  : 'bg-zinc-300'
              }
              ${publicAccessMode ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              className={`
                absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                ${plugin.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>
      </div>
      {plugin.status === 'error' && plugin.error && (
        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">
          Error: {plugin.error}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// REGISTRY PLUGIN CARD
// ============================================================================

interface RegistryPluginCardProps {
  plugin: RegistryPlugin
  isDark: boolean
  installing: boolean
  onInstall: () => void
  publicAccessMode: boolean
}

function RegistryPluginCard({ plugin, isDark, installing, onInstall, publicAccessMode }: RegistryPluginCardProps) {
  return (
    <div
      className={`
        p-4 rounded-xl border transition-colors
        ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-medium text-zinc-900 dark:text-white">
              {plugin.name}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono">
              v{plugin.version}
            </span>
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded font-medium
              ${plugin.type === 'widget' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' :
                plugin.type === 'renderer' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' :
                'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}
            `}>
              {plugin.type}
            </span>
            {plugin.verified && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {plugin.description}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            by {plugin.author}
            {plugin.downloads && ` • ${plugin.downloads.toLocaleString()} downloads`}
          </p>
        </div>
        <button
          onClick={onInstall}
          disabled={installing || publicAccessMode}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 font-medium text-sm hover:bg-pink-200 dark:hover:bg-pink-800/40 transition-colors disabled:opacity-50 shrink-0"
        >
          {installing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Install
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// SETTING FIELD COMPONENT
// ============================================================================

interface SettingFieldProps {
  settingKey: string
  definition: SettingDefinition
  value: any
  onChange: (value: any) => void
  isDark: boolean
}

function SettingField({ settingKey, definition, value, onChange, isDark }: SettingFieldProps) {
  const inputClass = `
    w-full px-3 py-2 rounded-lg border text-sm
    ${isDark
      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
      : 'bg-white border-zinc-200 text-zinc-900'
    }
    focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500
  `

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {definition.label}
      </label>
      {definition.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          {definition.description}
        </p>
      )}

      {definition.type === 'boolean' ? (
        <button
          onClick={() => onChange(!value)}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${value ? 'bg-pink-500' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'}
          `}
        >
          <span
            className={`
              absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
              ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}
            `}
          />
        </button>
      ) : definition.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {definition.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : definition.type === 'number' || definition.type === 'slider' ? (
        <div className="flex items-center gap-3">
          {definition.type === 'slider' && (
            <input
              type="range"
              min={definition.min ?? 0}
              max={definition.max ?? 100}
              step={definition.step ?? 1}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1"
            />
          )}
          <input
            type="number"
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`${inputClass} ${definition.type === 'slider' ? 'w-20' : ''}`}
          />
        </div>
      ) : definition.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border border-zinc-300 dark:border-zinc-600"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            placeholder="#000000"
          />
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={definition.placeholder}
          className={inputClass}
        />
      )}
    </div>
  )
}
