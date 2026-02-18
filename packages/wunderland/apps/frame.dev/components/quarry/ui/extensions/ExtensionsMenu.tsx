/**
 * Extensions Management Menu
 * @module codex/ui/ExtensionsMenu
 * 
 * @remarks
 * Comprehensive extensions configuration panel with:
 * - Theme gallery with lazy loading
 * - Install/uninstall controls
 * - Enable/disable toggles
 * - Premium status indicators
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Trash2, Check, Loader2, Sparkles, Lock, 
  Eye, EyeOff, Settings, Palette, Package, Zap, Info, AlertCircle
} from 'lucide-react'

// Lazy load extensions package
let extensionManager: any = null
let loadAvailableThemes: any = null
let lazyApplyTheme: any = null
let validateRepoAccess: any = null

const CALLING_REPO = 'framersai/frame.dev'

if (typeof window !== 'undefined') {
  try {
    const ext = require('@framers/codex-extensions')
    extensionManager = ext.extensionManager
    loadAvailableThemes = ext.loadAvailableThemes
    lazyApplyTheme = ext.lazyApplyTheme
    validateRepoAccess = ext.validateRepoAccess
  } catch (err) {
    console.warn('[ExtensionsMenu] Package not available:', err)
  }
}

interface ExtensionsMenuProps {
  /** Whether menu is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
  /** Current theme */
  theme?: string
  /** Premium access */
  hasPremium?: boolean
}

interface ExtensionState {
  id: string
  name: string
  installed: boolean
  enabled: boolean
  loading: boolean
  premium: boolean
}

/**
 * Comprehensive extensions management UI
 */
export default function ExtensionsMenu({
  isOpen,
  onClose,
  theme = 'light',
  hasPremium = false,
}: ExtensionsMenuProps) {
  const [activeTab, setActiveTab] = useState<'themes' | 'plugins' | 'settings'>('themes')
  const [themes, setThemes] = useState<any[]>([])
  const [extensionStates, setExtensionStates] = useState<Map<string, ExtensionState>>(new Map())
  const [loading, setLoading] = useState(true)
  const [repoAccess, setRepoAccess] = useState<any>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  
  const isDark = theme.includes('dark')

  // Load extensions on mount
  useEffect(() => {
    if (!isOpen || !loadAvailableThemes || !validateRepoAccess) return
    
    const loadExtensions = async () => {
      setLoading(true)
      
      // Validate repo access
      const access = validateRepoAccess(CALLING_REPO)
      setRepoAccess(access)
      
      if (!access) {
        setLoading(false)
        return
      }
      
      // Load available themes
      const availableThemes = await loadAvailableThemes(CALLING_REPO)
      setThemes(availableThemes)
      
      // Initialize extension states
      const states = new Map<string, ExtensionState>()
      availableThemes.forEach((t: any) => {
        states.set(t.id, {
          id: t.id,
          name: t.name,
          installed: true, // All bundled themes are pre-installed
          enabled: true,
          loading: false,
          premium: t.tags?.includes('premium') || false,
        })
      })
      setExtensionStates(states)
      
      // Load active theme from localStorage
      const savedTheme = localStorage.getItem('codex-active-theme')
      if (savedTheme) {
        setSelectedTheme(savedTheme)
      }
      
      setLoading(false)
    }
    
    loadExtensions()
  }, [isOpen])

  const handleApplyTheme = async (themeId: string) => {
    const state = extensionStates.get(themeId)
    if (!state) return
    
    // Check premium
    if (state.premium && !hasPremium) {
      alert('This is a premium theme. Upgrade to Codex Pro to unlock.')
      return
    }
    
    // Update loading state
    setExtensionStates(prev => {
      const newStates = new Map(prev)
      newStates.set(themeId, { ...state, loading: true })
      return newStates
    })
    
    // Apply theme
    if (lazyApplyTheme) {
      const success = await lazyApplyTheme(themeId, CALLING_REPO)
      if (success) {
        setSelectedTheme(themeId)
      }
    }
    
    // Reset loading state
    setExtensionStates(prev => {
      const newStates = new Map(prev)
      newStates.set(themeId, { ...state, loading: false })
      return newStates
    })
  }

  const handleToggleEnabled = (extensionId: string) => {
    setExtensionStates(prev => {
      const newStates = new Map(prev)
      const state = newStates.get(extensionId)
      if (state) {
        newStates.set(extensionId, { ...state, enabled: !state.enabled })
      }
      return newStates
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`
            relative w-full max-w-4xl max-h-[90vh] flex flex-col
            ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}
            border rounded-xl shadow-2xl overflow-hidden
          `}
        >
          {/* Header */}
          <div className={`
            px-6 py-4 border-b flex items-center justify-between
            ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${isDark ? 'bg-purple-900/50' : 'bg-purple-100'}
              `}>
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Extensions</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Customize your Codex experience
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className={`
            flex border-b
            ${isDark ? 'border-gray-800' : 'border-gray-200'}
          `}>
            <button
              onClick={() => setActiveTab('themes')}
              className={`
                flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                ${activeTab === 'themes'
                  ? isDark
                    ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400'
                    : 'bg-white text-purple-600 border-b-2 border-purple-600'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Palette className="w-4 h-4" />
              Themes
            </button>
            <button
              onClick={() => setActiveTab('plugins')}
              className={`
                flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                ${activeTab === 'plugins'
                  ? isDark
                    ? 'bg-gray-800 text-emerald-400 border-b-2 border-emerald-400'
                    : 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Zap className="w-4 h-4" />
              Plugins
              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">Soon</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`
                flex-1 px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2
                ${activeTab === 'settings'
                  ? isDark
                    ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400'
                    : 'bg-white text-cyan-600 border-b-2 border-cyan-600'
                  : isDark
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading extensions...</p>
                </div>
              </div>
            ) : !repoAccess ? (
              <div className={`
                p-6 rounded-lg border-2 border-dashed text-center
                ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}
              `}>
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <h3 className="font-semibold text-lg mb-2">Repository Not Approved</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  This repository is not authorized to use Codex extensions. Contact team@frame.dev for access.
                </p>
              </div>
            ) : activeTab === 'themes' ? (
              <div className="space-y-4">
                {/* Access Info */}
                <div className={`
                  p-3 rounded-lg border
                  ${isDark ? 'bg-cyan-950/30 border-cyan-800' : 'bg-cyan-50 border-cyan-200'}
                `}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-cyan-800 dark:text-cyan-200">
                      <strong>Access Level:</strong> {repoAccess.level} • 
                      <strong> Premium:</strong> {repoAccess.premium ? 'Yes' : 'No'} • 
                      <strong> Can Install:</strong> {repoAccess.canInstall ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>

                {/* Theme Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {themes.map((theme: any) => {
                    const state = extensionStates.get(theme.id)
                    if (!state) return null

                    const isActive = selectedTheme === theme.id
                    const isLocked = state.premium && !hasPremium

                    return (
                      <div
                        key={theme.id}
                        className={`
                          relative p-5 rounded-xl border-2 transition-all
                          ${isActive
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-lg'
                            : 'border-gray-200 dark:border-gray-800'
                          }
                          ${isLocked ? 'opacity-70' : ''}
                        `}
                      >
                        {/* Active Badge */}
                        {isActive && (
                          <div className="absolute -top-2 -right-2 px-2 py-1 bg-purple-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
                            <Check className="w-3 h-3" />
                            ACTIVE
                          </div>
                        )}

                        {/* Premium Badge */}
                        {state.premium && (
                          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-[10px] font-bold shadow-md">
                            {isLocked ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            PRO
                          </div>
                        )}

                        {/* Theme Info */}
                        <h3 className="font-bold text-base mb-1">{theme.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {theme.tags?.join(' • ')}
                        </p>

                        {/* Color Palette Preview */}
                        <div className="flex gap-2 mb-4">
                          <div 
                            className="flex-1 h-12 rounded-lg border"
                            style={{ backgroundColor: theme.colors.primary }}
                            title="Primary"
                          />
                          <div 
                            className="flex-1 h-12 rounded-lg border"
                            style={{ backgroundColor: theme.colors.secondary }}
                            title="Secondary"
                          />
                          <div 
                            className="flex-1 h-12 rounded-lg border"
                            style={{ backgroundColor: theme.colors.accent }}
                            title="Accent"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplyTheme(theme.id)}
                            disabled={isLocked || state.loading || isActive}
                            className={`
                              flex-1 px-3 py-2 rounded-lg font-semibold text-xs transition-all
                              flex items-center justify-center gap-2
                              ${isLocked
                                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                                : isActive
                                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-default'
                                  : isDark
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }
                            `}
                          >
                            {state.loading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Applying...
                              </>
                            ) : isActive ? (
                              <>
                                <Check className="w-3 h-3" />
                                Applied
                              </>
                            ) : isLocked ? (
                              <>
                                <Lock className="w-3 h-3" />
                                Locked
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                Apply
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleToggleEnabled(theme.id)}
                            disabled={isLocked}
                            className={`
                              px-3 py-2 rounded-lg transition-colors
                              ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                              ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            title={state.enabled ? 'Disable' : 'Enable'}
                          >
                            {state.enabled ? (
                              <Eye className="w-4 h-4 text-green-500" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>

                        {/* Locked Message */}
                        {isLocked && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 text-center">
                            Upgrade to Pro to unlock
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Premium Upsell */}
                {!hasPremium && themes.some((t: any) => t.tags?.includes('premium')) && (
                  <div className={`
                    mt-6 p-4 rounded-xl border-2
                    ${isDark 
                      ? 'bg-gradient-to-br from-amber-950/50 to-orange-950/50 border-amber-800' 
                      : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                    }
                  `}>
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm mb-1">Unlock Premium Themes</h4>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                          Get access to all {themes.filter((t: any) => t.tags?.includes('premium')).length} premium themes with Codex Pro.
                        </p>
                        <a
                          href="/pricing"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          Upgrade to Pro
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'plugins' ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="font-bold text-lg mb-2">Plugins Coming Soon</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Custom renderers, behavior extensions, and more will be available in a future update.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Extension Settings</h3>
                
                {/* Repository Info */}
                <div className={`
                  p-4 rounded-lg
                  ${isDark ? 'bg-gray-800' : 'bg-gray-50'}
                `}>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                    Repository Access
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Repository:</span>
                      <code className="text-xs font-mono">{CALLING_REPO}</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Access Level:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        {repoAccess?.level || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium:</span>
                      <span className={repoAccess?.premium ? 'text-green-600' : 'text-gray-500'}>
                        {repoAccess?.premium ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clear Cache */}
                <button
                  onClick={() => {
                    localStorage.removeItem('codex-extensions')
                    localStorage.removeItem('codex-active-theme')
                    alert('Extension cache cleared. Refresh to reload defaults.')
                  }}
                  className={`
                    w-full px-4 py-2 rounded-lg font-semibold text-sm transition
                    ${isDark 
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' 
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                    }
                  `}
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Clear Extension Cache
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`
            px-6 py-3 border-t flex items-center justify-between
            ${isDark ? 'border-gray-800 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}
          `}>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {themes.length} extension{themes.length !== 1 ? 's' : ''} available
            </p>
            <button
              onClick={onClose}
              className={`
                px-4 py-2 rounded-lg font-semibold text-sm transition
                ${isDark 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }
              `}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

