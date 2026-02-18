/**
 * Plugins Sidebar View
 *
 * Sidebar panel for managing Quarry plugins.
 * Allows installing, enabling/disabling, and configuring plugins.
 *
 * @module codex/ui/PluginsSidebarView
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
  ChevronLeft,
  Info,
  Settings,
  Save,
} from 'lucide-react'
import type { PluginState, RegistryPlugin } from '@/lib/plugins/types'
import { quarryPluginManager, initializePlugins, pluginUIRegistry } from '@/lib/plugins'
import { isPublicAccess } from '@/lib/config/publicAccess'
import PluginCard from './PluginCard'
import PluginWidgetContainer from '../widgets/PluginWidgetContainer'
import PluginRepoInfoPopover from './PluginRepoInfoPopover'

interface PluginsSidebarViewProps {
  /** Current theme */
  theme?: string
}

/**
 * Plugins Sidebar View Component
 */
export default function PluginsSidebarView({ theme = 'light' }: PluginsSidebarViewProps) {
  const [plugins, setPlugins] = useState<PluginState[]>([])
  const [registryPlugins, setRegistryPlugins] = useState<RegistryPlugin[]>([])
  const [loading, setLoading] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [installUrl, setInstallUrl] = useState('')
  const [installError, setInstallError] = useState<string | null>(null)
  const [showInstallPanel, setShowInstallPanel] = useState(false)
  const [showRegistry, setShowRegistry] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [settingsPluginId, setSettingsPluginId] = useState<string | null>(null)
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Check if public access mode is enabled (locks plugin management)
  const publicAccessMode = isPublicAccess()

  const isDark = theme.includes('dark')

  // Initialize plugin manager and load plugins
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        await initializePlugins()
        setPlugins(quarryPluginManager.getAll())
      } catch (error) {
        console.error('[PluginsSidebarView] Failed to initialize:', error)
      } finally {
        setLoading(false)
      }
    }

    init()

    // Subscribe to plugin changes
    const unsubscribe = quarryPluginManager.onChange(() => {
      setPlugins(quarryPluginManager.getAll())
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Load registry
  const loadRegistry = useCallback(async () => {
    try {
      const registry = await quarryPluginManager.fetchRegistry(true)
      setRegistryPlugins(registry.plugins)
    } catch (error) {
      console.error('[PluginsSidebarView] Failed to load registry:', error)
    }
  }, [])

  // Install from URL
  const handleInstallFromUrl = async () => {
    if (!installUrl.trim()) return

    setInstalling(true)
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromUrl(installUrl)
      if (result.success) {
        setInstallUrl('')
        setShowInstallPanel(false)
      } else {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(false)
    }
  }

  // Install from ZIP
  const handleInstallFromZip = async (file: File) => {
    setInstalling(true)
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromZip(file)
      if (result.success) {
        setShowInstallPanel(false)
      } else {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(false)
    }
  }

  // Install from registry
  const handleInstallFromRegistry = async (pluginId: string) => {
    setInstalling(true)
    setInstallError(null)

    try {
      const result = await quarryPluginManager.installFromRegistry(pluginId)
      if (!result.success) {
        setInstallError(result.errors?.join(', ') || 'Installation failed')
      }
    } catch (error) {
      setInstallError((error as Error).message)
    } finally {
      setInstalling(false)
    }
  }

  // Toggle plugin
  const handleToggle = async (id: string) => {
    await quarryPluginManager.togglePlugin(id)
  }

  // Uninstall plugin
  const handleUninstall = async (id: string) => {
    await quarryPluginManager.uninstallPlugin(id)
  }

  // Open settings for a plugin
  const handleOpenSettings = (id: string) => {
    const plugin = plugins.find(p => p.id === id)
    if (plugin) {
      setSettingsValues(plugin.settings || {})
      setSettingsPluginId(id)
    }
  }

  // Save plugin settings
  const handleSaveSettings = async () => {
    if (settingsPluginId) {
      quarryPluginManager.setPluginSettings(settingsPluginId, settingsValues)
      setSettingsPluginId(null)
    }
  }

  // Get the plugin being edited
  const settingsPlugin = settingsPluginId ? plugins.find(p => p.id === settingsPluginId) : null

  // Filter plugins by search
  const filteredPlugins = plugins.filter((p) =>
    p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const enabledPlugins = filteredPlugins.filter((p) => p.enabled)
  const installedPlugins = filteredPlugins.filter((p) => !p.enabled)

  return (
    <div className={`relative flex flex-col h-full overflow-hidden ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Puzzle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
          <span className="font-semibold text-xs sm:text-sm">Plugins</span>
          <span className={`text-[10px] sm:text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            ({plugins.length})
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Plugin repo info popover */}
          <PluginRepoInfoPopover theme={theme} size="sm" />

          {/* Only show install button if not in public access mode */}
          {!publicAccessMode && (
            <button
              onClick={() => setShowInstallPanel(!showInstallPanel)}
              className={`
                p-1 sm:p-1.5 rounded transition-colors
                ${showInstallPanel
                  ? 'bg-purple-500 text-white'
                  : isDark
                    ? 'hover:bg-zinc-700 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                }
              `}
              aria-label="Install plugin"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Public Access Mode Banner */}
      {publicAccessMode && (
        <div className={`px-3 py-2 border-b text-xs flex items-center gap-2 ${
          isDark 
            ? 'bg-amber-900/30 border-amber-800/50 text-amber-200' 
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Public access mode — plugin management locked</span>
        </div>
      )}

      {/* Install Panel */}
      <AnimatePresence>
        {showInstallPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-3 border-b ${isDark ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'}`}>
              {/* URL Input */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={installUrl}
                  onChange={(e) => setInstallUrl(e.target.value)}
                  placeholder="Plugin URL..."
                  className={`
                    flex-1 px-2.5 py-1.5 text-xs rounded border
                    ${isDark
                      ? 'bg-zinc-900 border-zinc-600 text-zinc-200 placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
                    }
                    focus:outline-none focus:ring-1 focus:ring-purple-500
                  `}
                  onKeyDown={(e) => e.key === 'Enter' && handleInstallFromUrl()}
                />
                <button
                  onClick={handleInstallFromUrl}
                  disabled={installing || !installUrl.trim()}
                  className={`
                    px-2.5 py-1.5 rounded text-xs font-medium transition-colors
                    bg-purple-500 text-white hover:bg-purple-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Upload & Registry Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={installing}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs
                    ${isDark
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                      : 'bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                    }
                    transition-colors disabled:opacity-50
                  `}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload ZIP
                </button>

                <button
                  onClick={() => {
                    setShowRegistry(!showRegistry)
                    if (!showRegistry) loadRegistry()
                  }}
                  disabled={installing}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs
                    ${showRegistry
                      ? 'bg-purple-500 text-white'
                      : isDark
                        ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                        : 'bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                    }
                    transition-colors disabled:opacity-50
                  `}
                >
                  <Package className="w-3.5 h-3.5" />
                  Browse Registry
                </button>
              </div>

              {/* Hidden file input */}
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

              {/* Error Display */}
              {installError && (
                <div className={`
                  mt-2 p-2 rounded text-xs flex items-start gap-2
                  ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}
                `}>
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{installError}</span>
                  <button onClick={() => setInstallError(null)} className="ml-auto">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registry Browser */}
      <AnimatePresence>
        {showRegistry && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden max-h-48 border-b border-zinc-200 dark:border-zinc-700"
          >
            <div className={`p-2 ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-50/50'}`}>
              {registryPlugins.length === 0 ? (
                <div className={`text-center py-4 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading registry...
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {registryPlugins.map((plugin) => {
                    const isInstalled = quarryPluginManager.isInstalled(plugin.id)
                    return (
                      <div
                        key={plugin.id}
                        className={`
                          flex items-center justify-between p-2 rounded text-xs
                          ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-100'}
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{plugin.name}</div>
                          <div className={`truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {plugin.description}
                          </div>
                        </div>
                        {isInstalled ? (
                          <span className="text-green-500 text-[10px] font-medium">Installed</span>
                        ) : (
                          <button
                            onClick={() => handleInstallFromRegistry(plugin.id)}
                            disabled={installing}
                            className="px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                          >
                            Install
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {plugins.length > 0 && (
        <div className="p-1.5 sm:p-2">
          <div className="relative">
            <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`
                w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded
                ${isDark
                  ? 'bg-zinc-800 text-zinc-200 placeholder-zinc-500'
                  : 'bg-zinc-100 text-zinc-800 placeholder-zinc-400'
                }
                focus:outline-none focus:ring-1 focus:ring-purple-500
              `}
            />
          </div>
        </div>
      )}

      {/* Plugin List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 sm:p-2 space-y-2 sm:space-y-4">
        {loading ? (
          <div className={`text-center py-8 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading plugins...
          </div>
        ) : plugins.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No plugins installed</p>
            <p className="text-[10px] mt-1">
              Click + to install plugins
            </p>
          </div>
        ) : (
          <div>
            {/* All Plugins - Single list with inline toggle */}
            <h3 className={`text-[10px] font-semibold uppercase mb-2 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Installed ({filteredPlugins.length}) • {enabledPlugins.length} enabled
            </h3>
            <div className="space-y-2">
              {filteredPlugins
                .sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))
                .map((plugin) => (
                  <PluginCard
                    key={plugin.id}
                    plugin={plugin}
                    theme={theme}
                    onToggle={() => handleToggle(plugin.id)}
                    onSettings={() => handleOpenSettings(plugin.id)}
                    onUninstall={() => handleUninstall(plugin.id)}
                    canUninstall={!publicAccessMode && !plugin.isBundled}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Plugin Settings Panel */}
      <AnimatePresence>
        {settingsPlugin && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`absolute inset-0 z-10 flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
          >
            {/* Settings Header */}
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <button
                onClick={() => setSettingsPluginId(null)}
                className={`p-1 rounded ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Settings className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-sm truncate">{settingsPlugin.manifest.name}</span>
            </div>

            {/* Settings Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {settingsPlugin.manifest.settings && Object.entries(settingsPlugin.manifest.settings).map(([key, schema]) => (
                <div key={key} className="space-y-1">
                  <label className={`block text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {schema.label || key}
                  </label>
                  {schema.description && (
                    <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {schema.description}
                    </p>
                  )}
                  {schema.type === 'boolean' ? (
                    <button
                      onClick={() => setSettingsValues(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`
                        relative w-10 h-5 rounded-full transition-colors
                        ${settingsValues[key] ? 'bg-purple-500' : isDark ? 'bg-zinc-600' : 'bg-zinc-300'}
                      `}
                    >
                      <motion.div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        animate={{ left: settingsValues[key] ? '22px' : '2px' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  ) : schema.type === 'select' ? (
                    <select
                      value={settingsValues[key] ?? schema.default ?? ''}
                      onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className={`
                        w-full px-2.5 py-1.5 text-xs rounded border
                        ${isDark
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                          : 'bg-white border-zinc-300 text-zinc-800'
                        }
                        focus:outline-none focus:ring-1 focus:ring-purple-500
                      `}
                    >
                      {schema.options?.map((opt) => (
                        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                          {typeof opt === 'string' ? opt : opt.label}
                        </option>
                      ))}
                    </select>
                  ) : schema.type === 'number' ? (
                    <input
                      type="number"
                      value={settingsValues[key] ?? schema.default ?? ''}
                      onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      min={schema.min}
                      max={schema.max}
                      className={`
                        w-full px-2.5 py-1.5 text-xs rounded border
                        ${isDark
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                          : 'bg-white border-zinc-300 text-zinc-800'
                        }
                        focus:outline-none focus:ring-1 focus:ring-purple-500
                      `}
                    />
                  ) : (
                    <input
                      type="text"
                      value={settingsValues[key] ?? schema.default ?? ''}
                      onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: e.target.value }))}
                      className={`
                        w-full px-2.5 py-1.5 text-xs rounded border
                        ${isDark
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
                          : 'bg-white border-zinc-300 text-zinc-800'
                        }
                        focus:outline-none focus:ring-1 focus:ring-purple-500
                      `}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className={`p-3 border-t ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
              <button
                onClick={handleSaveSettings}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plugin Widgets Area */}
      <PluginWidgetContainer theme={theme} />
    </div>
  )
}
