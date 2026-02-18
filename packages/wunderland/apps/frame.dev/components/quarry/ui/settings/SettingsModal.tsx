/**
 * Settings modal for GitHub PAT configuration, LLM API keys, and viewer preferences
 * @module codex/ui/SettingsModal
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Key, Eye, EyeOff, Check, AlertCircle, ExternalLink, Zap, Bot, Sparkles, Server, Globe, Shield, ShieldCheck, BarChart3, HardDrive, Search, Calendar, Clock, Bell, RotateCcw, Lock, User } from 'lucide-react'
import AccountSettings from './AccountSettings'
import GitHubStorageSettings from './GitHubStorageSettings'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { THEME_METADATA, type ThemeName } from '@/types/theme'
import { Z_INDEX } from '../../constants'
import { useAPIKeys } from '@/lib/config/useAPIKeys'
import type { APIProvider } from '@/lib/config/apiKeyStorage'
import {
  type SearchProvider,
  SEARCH_PROVIDERS,
  getConfiguredSearchProviders,
  saveSearchProviderKey,
  removeSearchProviderKey,
} from '@/lib/research'
import {
  usePlannerPreferences,
  VIEW_OPTIONS,
  WEEK_START_OPTIONS,
  TIME_FORMAT_OPTIONS,
  DEFAULT_DURATION_OPTIONS,
  REMINDER_OPTIONS,
  type PlannerPreferences,
} from '@/lib/planner/hooks/usePlannerPreferences'
import { isPublicAccess } from '@/lib/config/publicAccess'

interface SettingsModalProps {
  /** Whether modal is open */
  isOpen: boolean
  /** Close callback */
  onClose: () => void
}

// LLM Provider configurations
const LLM_PROVIDERS: {
  id: APIProvider
  name: string
  icon: React.ComponentType<{ className?: string }>
  keyPrefix: string
  envVar: string
  docsUrl: string
  description: string
}[] = [
    {
      id: 'openai',
      name: 'OpenAI',
      icon: Sparkles,
      keyPrefix: 'sk-',
      envVar: 'OPENAI_API_KEY',
      docsUrl: 'https://platform.openai.com/api-keys',
      description: 'GPT-4, GPT-4o, and embeddings',
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: Bot,
      keyPrefix: 'sk-ant-',
      envVar: 'ANTHROPIC_API_KEY',
      docsUrl: 'https://console.anthropic.com/settings/keys',
      description: 'Claude 3.5 Sonnet, Opus, Haiku',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      icon: Globe,
      keyPrefix: 'sk-or-',
      envVar: 'OPENROUTER_API_KEY',
      docsUrl: 'https://openrouter.ai/keys',
      description: 'Multi-provider gateway',
    },
    {
      id: 'ollama',
      name: 'Ollama',
      icon: Server,
      keyPrefix: '',
      envVar: 'OLLAMA_BASE_URL',
      docsUrl: 'https://ollama.ai/download',
      description: 'Local LLMs (Llama, Mistral)',
    },
  ]

/**
 * Encrypt a string using Web Crypto API (AES-GCM)
 * @param text - Plain text to encrypt
 * @param passphrase - Encryption key derived from browser fingerprint
 */
async function encrypt(text: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)

  // Derive key from passphrase
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a string using Web Crypto API (AES-GCM)
 */
async function decrypt(ciphertext: string, passphrase: string): Promise<string | null> {
  try {
    const encoder = new TextEncoder()
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

/**
 * Generate a browser fingerprint for encryption passphrase
 */
function getBrowserFingerprint(): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('fingerprint', 2, 2)
  const canvasHash = canvas.toDataURL().slice(0, 50)

  return btoa(
    navigator.userAgent +
    navigator.language +
    screen.colorDepth +
    screen.width +
    screen.height +
    canvasHash
  ).slice(0, 32)
}

/**
 * Settings modal for GitHub PAT and preferences
 * 
 * @remarks
 * - PAT stored encrypted in localStorage (AES-GCM with browser fingerprint)
 * - Shows current rate limit status
 * - Validates PAT format (ghp_...)
 * - Links to GitHub token generator
 */
export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<{ limit: number; remaining: number; reset: Date } | null>(null)
  const { theme, setTheme } = useTheme()
  const themeOrder: ThemeName[] = ['light', 'dark', 'sepia-light', 'sepia-dark', 'oceanic-light', 'oceanic-dark']

  // LLM API Keys state
  const { keys, configuredProviders, preferredProvider, save: saveAPIKey, remove: removeAPIKey, validate, setPreferred, isFromSettings } = useAPIKeys()
  const [llmKeyInputs, setLlmKeyInputs] = useState<Record<string, string>>({})
  const [llmShowKeys, setLlmShowKeys] = useState<Record<string, boolean>>({})
  const [llmSaving, setLlmSaving] = useState<Record<string, boolean>>({})
  const [llmErrors, setLlmErrors] = useState<Record<string, string | null>>({})
  const [llmEnvKeys, setLlmEnvKeys] = useState<Record<string, boolean>>({})

  // Search API Keys state
  const [searchKeyInputs, setSearchKeyInputs] = useState<Record<string, string>>({})
  const [searchShowKeys, setSearchShowKeys] = useState<Record<string, boolean>>({})
  const [searchSaving, setSearchSaving] = useState<Record<string, boolean>>({})
  const [searchErrors, setSearchErrors] = useState<Record<string, string | null>>({})
  const [searchConfiguredProviders, setSearchConfiguredProviders] = useState<SearchProvider[]>(['duckduckgo'])

  // Planner preferences
  const { preferences, setPreference, resetToDefaults: resetPlannerPrefs } = usePlannerPreferences()

  // Data management state
  const [clearingData, setClearingData] = useState(false)
  const [dataCleared, setDataCleared] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Tab state - Account tab first
  const [activeTab, setActiveTab] = useState<'account' | 'integrations' | 'planner' | 'appearance'>('account')

  const SETTINGS_TABS = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'integrations' as const, label: 'Integrations', icon: Key },
    { id: 'planner' as const, label: 'Planner', icon: Calendar },
    { id: 'appearance' as const, label: 'Appearance', icon: Eye },
  ]

  // Check which providers have env keys on mount
  useEffect(() => {
    if (!isOpen) return

    const checkEnvKeys = async () => {
      const envStatus: Record<string, boolean> = {}
      for (const provider of LLM_PROVIDERS) {
        const fromSettings = await isFromSettings(provider.id)
        // If configured but not from settings, it's from env
        const isConfigured = configuredProviders.includes(provider.id)
        envStatus[provider.id] = isConfigured && !fromSettings
      }
      setLlmEnvKeys(envStatus)
    }
    checkEnvKeys()
  }, [isOpen, configuredProviders, isFromSettings])

  // Load configured search providers on mount
  useEffect(() => {
    if (!isOpen) return
    getConfiguredSearchProviders().then(setSearchConfiguredProviders)
  }, [isOpen])

  // Load encrypted PAT on mount
  useEffect(() => {
    if (!isOpen) return

    const loadPAT = async () => {
      try {
        const encrypted = localStorage.getItem('gh_pat_encrypted')
        if (!encrypted) return

        const fingerprint = getBrowserFingerprint()
        const decrypted = await decrypt(encrypted, fingerprint)
        if (decrypted) {
          setPat(decrypted)
          checkRateLimit(decrypted)
        }
      } catch (err) {
        console.warn('Failed to decrypt PAT:', err)
      }
    }

    loadPAT()
  }, [isOpen])

  /**
   * Check GitHub rate limit for the PAT
   */
  const checkRateLimit = async (token: string) => {
    try {
      const headers: HeadersInit = {}
      if (token) headers['Authorization'] = `token ${token}`

      const res = await fetch('https://api.github.com/rate_limit', { headers })
      const data = await res.json()

      if (data.rate) {
        setRateLimit({
          limit: data.rate.limit,
          remaining: data.rate.remaining,
          reset: new Date(data.rate.reset * 1000),
        })
      }
    } catch (err) {
      console.warn('Failed to check rate limit:', err)
    }
  }

  /**
   * Save PAT to encrypted localStorage
   */
  const handleSave = async () => {
    setError(null)
    setSaving(true)
    setSaved(false)

    try {
      // Validate format
      if (pat && !pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
        throw new Error('Invalid PAT format. Should start with ghp_ or github_pat_')
      }

      // Encrypt and store
      if (pat) {
        const fingerprint = getBrowserFingerprint()
        const encrypted = await encrypt(pat, fingerprint)
        localStorage.setItem('gh_pat_encrypted', encrypted)
        await checkRateLimit(pat)
      } else {
        // Clear if empty
        localStorage.removeItem('gh_pat_encrypted')
        setRateLimit(null)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save PAT')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Clear stored PAT
   */
  const handleClear = () => {
    setPat('')
    localStorage.removeItem('gh_pat_encrypted')
    setRateLimit(null)
    setSaved(false)
  }

  /**
   * Save LLM API key for a provider
   */
  const handleSaveLLMKey = useCallback(async (providerId: APIProvider) => {
    const key = llmKeyInputs[providerId]
    if (!key?.trim()) return

    setLlmSaving(prev => ({ ...prev, [providerId]: true }))
    setLlmErrors(prev => ({ ...prev, [providerId]: null }))

    try {
      // Validate key format
      const provider = LLM_PROVIDERS.find(p => p.id === providerId)
      if (provider && provider.keyPrefix && !key.startsWith(provider.keyPrefix)) {
        throw new Error(`Invalid key format (should start with ${provider.keyPrefix})`)
      }

      // Validate with provider API (for non-Ollama)
      if (providerId !== 'ollama') {
        const result = await validate(providerId, key)
        if (!result.valid) {
          throw new Error(result.error || 'Invalid API key')
        }
      }

      // Save encrypted
      await saveAPIKey(providerId, { key })

      // Clear input after saving
      setLlmKeyInputs(prev => ({ ...prev, [providerId]: '' }))
    } catch (err) {
      setLlmErrors(prev => ({ ...prev, [providerId]: err instanceof Error ? err.message : 'Failed to save' }))
    } finally {
      setLlmSaving(prev => ({ ...prev, [providerId]: false }))
    }
  }, [llmKeyInputs, validate, saveAPIKey])

  /**
   * Remove LLM API key for a provider
   */
  const handleRemoveLLMKey = useCallback(async (providerId: APIProvider) => {
    await removeAPIKey(providerId)
    setLlmKeyInputs(prev => ({ ...prev, [providerId]: '' }))
    setLlmErrors(prev => ({ ...prev, [providerId]: null }))
  }, [removeAPIKey])

  /**
   * Mask an API key for display
   */
  const maskKey = (key: string): string => {
    if (!key || key.length < 12) return '••••••••'
    return `${key.slice(0, 7)}••••••••${key.slice(-4)}`
  }

  /**
   * Save search API key for a provider
   */
  const handleSaveSearchKey = useCallback(async (providerId: SearchProvider) => {
    const key = searchKeyInputs[providerId]
    if (!key?.trim()) return

    setSearchSaving(prev => ({ ...prev, [providerId]: true }))
    setSearchErrors(prev => ({ ...prev, [providerId]: null }))

    try {
      await saveSearchProviderKey(providerId, key.trim())
      setSearchKeyInputs(prev => ({ ...prev, [providerId]: '' }))
      // Refresh configured providers
      const updated = await getConfiguredSearchProviders()
      setSearchConfiguredProviders(updated)
    } catch (err) {
      setSearchErrors(prev => ({ ...prev, [providerId]: err instanceof Error ? err.message : 'Failed to save' }))
    } finally {
      setSearchSaving(prev => ({ ...prev, [providerId]: false }))
    }
  }, [searchKeyInputs])

  /**
   * Remove search API key for a provider
   */
  const handleRemoveSearchKey = useCallback(async (providerId: SearchProvider) => {
    await removeSearchProviderKey(providerId)
    setSearchKeyInputs(prev => ({ ...prev, [providerId]: '' }))
    setSearchErrors(prev => ({ ...prev, [providerId]: null }))
    // Refresh configured providers
    const updated = await getConfiguredSearchProviders()
    setSearchConfiguredProviders(updated)
  }, [])

  /**
   * Clear all IndexedDB databases for this app
   */
  const handleClearIndexedDB = useCallback(async () => {
    setClearingData(true)
    setDataCleared(false)

    try {
      // Get all IndexedDB database names
      const databases = await indexedDB.databases()

      // Delete each database
      for (const db of databases) {
        if (db.name) {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name!)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
            request.onblocked = () => {
              console.warn(`Database ${db.name} deletion blocked`)
              resolve() // Continue anyway
            }
          })
        }
      }

      // Clear localStorage too
      localStorage.clear()

      setDataCleared(true)
      setShowClearConfirm(false)
      setTimeout(() => setDataCleared(false), 3000)

      // Recommend page refresh
      setTimeout(() => {
        if (window.confirm('Data cleared successfully. Refresh the page to complete the reset?')) {
          window.location.reload()
        }
      }, 500)
    } catch (err) {
      console.error('Failed to clear data:', err)
      alert('Failed to clear some data. Please try again or clear manually via DevTools.')
    } finally {
      setClearingData(false)
    }
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.PRIORITY_MODAL }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 rounded-2xl shadow-2xl border-2 border-gray-300 dark:border-gray-700"
        >
          {/* Header with Tab Bar */}
          <div className="sticky top-0 z-10 border-b-2 border-gray-300 dark:border-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex px-4 sm:px-6 gap-1 overflow-x-auto scrollbar-hide">
              {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
                      ${isActive
                        ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 border-t-2 border-x-2 border-violet-500 -mb-[2px]'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Public Access Mode Banner */}
          {isPublicAccess() && (
            <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <Lock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Public access mode — some settings are view-only</span>
            </div>
          )}

          {/* Content - responsive padding for mobile */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

            {/* Account Tab */}
            {activeTab === 'account' && (
              <AccountSettings />
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <>
                {/* GitHub PAT Section */}
                <section className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        GitHub Personal Access Token
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Increase rate limit from 60 to 5,000 requests/hour
                      </p>
                    </div>
                    <a
                      href="https://github.com/settings/tokens/new?description=Frame%20Codex%20Viewer&scopes=public_repo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1"
                    >
                      Generate PAT
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* PAT Input */}
                  <div className="relative">
                    <input
                      type={showPat ? 'text' : 'password'}
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPat(!showPat)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label={showPat ? 'Hide token' : 'Show token'}
                    >
                      {showPat ? (
                        <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  {/* Rate Limit Display */}
                  {rateLimit && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950 dark:to-cyan-950 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                            Rate Limit
                          </p>
                          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                            {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">Resets</p>
                          <p className="text-sm font-mono text-emerald-900 dark:text-emerald-100">
                            {rateLimit.reset.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${(rateLimit.remaining / rateLimit.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Security Notice */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                    <p className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">🔒</span>
                      <span>
                        Your PAT is encrypted using AES-256-GCM with a browser fingerprint and stored only in your browser's localStorage.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400 flex-shrink-0">ℹ️</span>
                      <span>
                        <strong>Required scope:</strong> <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded">public_repo</code> (read-only access to public repositories)
                      </span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved!
                        </>
                      ) : (
                        'Save PAT'
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-4 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Auto-Merge Option */}
                  {pat && (
                    <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Auto-Merge PRs
                          </span>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Automatically merge PRs when publishing weave/loom configs
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => {
                            // This would need to be connected to preferences
                            // For now, we'll show this as a UI element
                          }}
                          className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500/30"
                        />
                      </label>
                    </div>
                  )}
                </section>

                {/* LLM API Keys Section */}
                <section className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        LLM API Keys
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configure AI providers for Q&A, generation, and embeddings
                      </p>
                    </div>
                  </div>

                  {/* Provider List */}
                  <div className="space-y-3">
                    {LLM_PROVIDERS.map((provider) => {
                      const Icon = provider.icon
                      const isConfigured = configuredProviders.includes(provider.id)
                      const isFromEnv = llmEnvKeys[provider.id]
                      const storedKey = keys[provider.id]?.key
                      const isPreferred = preferredProvider === provider.id

                      return (
                        <div
                          key={provider.id}
                          className={`p-4 rounded-xl border-2 transition-all ${isConfigured
                              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${isConfigured
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                  : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                <Icon className={`w-5 h-5 ${isConfigured
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                  }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {provider.name}
                                  </span>
                                  {isConfigured && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isFromEnv
                                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                      }`}>
                                      {isFromEnv ? '📁 .env' : '🔐 Saved'}
                                    </span>
                                  )}
                                  {isPreferred && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                                      ⭐ Preferred
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {provider.description}
                                </p>

                                {/* Show masked key if configured */}
                                {isConfigured && storedKey && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded">
                                      {llmShowKeys[provider.id] ? storedKey : maskKey(storedKey)}
                                    </code>
                                    <button
                                      onClick={() => setLlmShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                    >
                                      {llmShowKeys[provider.id] ? (
                                        <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                                      ) : (
                                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                                      )}
                                    </button>
                                  </div>
                                )}

                                {/* Show env info if from .env */}
                                {isConfigured && isFromEnv && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    Using key from {provider.envVar} environment variable
                                  </p>
                                )}
                              </div>
                            </div>

                            <a
                              href={provider.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
                            >
                              Get Key
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {/* Input to add/override key */}
                          <div className="mt-3 space-y-2">
                            <div className="flex gap-2">
                              <input
                                type={llmShowKeys[provider.id] ? 'text' : 'password'}
                                value={llmKeyInputs[provider.id] || ''}
                                onChange={(e) => setLlmKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                placeholder={isConfigured ? 'Enter new key to override...' : `${provider.keyPrefix}...`}
                                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                              />
                              <button
                                onClick={() => handleSaveLLMKey(provider.id)}
                                disabled={!llmKeyInputs[provider.id]?.trim() || llmSaving[provider.id]}
                                className="px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                {llmSaving[provider.id] ? (
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </button>
                              {isConfigured && !isFromEnv && (
                                <button
                                  onClick={() => handleRemoveLLMKey(provider.id)}
                                  className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {/* Error display */}
                            {llmErrors[provider.id] && (
                              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 dark:text-red-300">{llmErrors[provider.id]}</p>
                              </div>
                            )}

                            {/* Set as preferred button */}
                            {isConfigured && !isPreferred && (
                              <button
                                onClick={() => setPreferred(provider.id)}
                                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                              >
                                Set as preferred provider
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Info notice */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                    <p className="flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 flex-shrink-0">🔒</span>
                      <span>
                        API keys are encrypted with AES-256-GCM and stored locally. Keys from .env are read-only.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400 flex-shrink-0">💡</span>
                      <span>
                        Settings keys take priority over .env keys. You can override any .env key by saving a new one here.
                      </span>
                    </p>
                  </div>
                </section>

                {/* Search API Keys Section */}
                <section className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        Web Search API Keys
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Configure search providers for web research
                      </p>
                    </div>
                  </div>

                  {/* Search Provider List */}
                  <div className="space-y-3">
                    {Object.values(SEARCH_PROVIDERS)
                      .filter(provider => provider.requiresKey)
                      .map((provider) => {
                        const isConfigured = searchConfiguredProviders.includes(provider.id)
                        const storedKey = typeof window !== 'undefined'
                          ? localStorage.getItem(`quarry-search-${provider.id}-key`)
                          : null

                        return (
                          <div
                            key={provider.id}
                            className={`p-4 rounded-xl border-2 transition-all ${isConfigured
                                ? 'border-cyan-300 dark:border-cyan-700 bg-cyan-50/50 dark:bg-cyan-900/10'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${isConfigured
                                    ? 'bg-cyan-100 dark:bg-cyan-900/50'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                  }`}>
                                  <Globe className={`w-5 h-5 ${isConfigured
                                      ? 'text-cyan-600 dark:text-cyan-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                    }`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {provider.name}
                                    </span>
                                    {isConfigured && (
                                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300">
                                        🔐 Saved
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {provider.description}
                                  </p>
                                  {provider.freeTier && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                      {provider.freeTier}
                                    </p>
                                  )}

                                  {/* Show masked key if configured */}
                                  {isConfigured && storedKey && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <code className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded">
                                        {searchShowKeys[provider.id] ? storedKey : maskKey(storedKey)}
                                      </code>
                                      <button
                                        onClick={() => setSearchShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                      >
                                        {searchShowKeys[provider.id] ? (
                                          <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <a
                                href={
                                  provider.id === 'brave' ? 'https://api.search.brave.com/register' :
                                    provider.id === 'serper' ? 'https://serper.dev/' :
                                      provider.id === 'searchapi' ? 'https://www.searchapi.io/' :
                                        provider.id === 'google-cse' ? 'https://programmablesearchengine.google.com/controlpanel/create' :
                                          '#'
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
                              >
                                Get Key
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>

                            {/* Input to add/override key */}
                            <div className="mt-3 space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type={searchShowKeys[provider.id] ? 'text' : 'password'}
                                  value={searchKeyInputs[provider.id] || ''}
                                  onChange={(e) => setSearchKeyInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                  placeholder={isConfigured ? 'Enter new key to override...' : 'Enter API key...'}
                                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                                />
                                <button
                                  onClick={() => handleSaveSearchKey(provider.id)}
                                  disabled={!searchKeyInputs[provider.id]?.trim() || searchSaving[provider.id]}
                                  className="px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {searchSaving[provider.id] ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    'Save'
                                  )}
                                </button>
                                {isConfigured && (
                                  <button
                                    onClick={() => handleRemoveSearchKey(provider.id)}
                                    className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              {/* Error display */}
                              {searchErrors[provider.id] && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-red-700 dark:text-red-300">{searchErrors[provider.id]}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* Free provider notice */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-100 dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                    <p className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓</span>
                      <span>
                        <strong>DuckDuckGo</strong> is always available for free (no API key required). It provides instant answers and definitions.
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span className="text-cyan-600 dark:text-cyan-400 flex-shrink-0">💡</span>
                      <span>
                        Configure Brave or Serper for comprehensive web search results. Both offer generous free tiers.
                      </span>
                    </p>
                  </div>
                </section>

                {/* GitHub Storage Section */}
                <section className="space-y-4">
                  <GitHubStorageSettings />
                </section>
              </>
            )}

            {/* Planner Tab */}
            {activeTab === 'planner' && (
              <>
                {/* Planner Settings Section */}
                <section className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Planner Settings
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Customize your calendar and task planner
                      </p>
                    </div>
                    <button
                      onClick={resetPlannerPrefs}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                      title="Reset to defaults"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>

                  {/* View & Display Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Default View */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default View
                      </label>
                      <select
                        value={preferences.defaultView}
                        onChange={(e) => setPreference('defaultView', e.target.value as PlannerPreferences['defaultView'])}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {VIEW_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Week Starts On */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Week Starts On
                      </label>
                      <select
                        value={preferences.weekStartsOn}
                        onChange={(e) => setPreference('weekStartsOn', Number(e.target.value) as 0 | 1 | 6)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {WEEK_START_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Format */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time Format
                      </label>
                      <select
                        value={preferences.timeFormat}
                        onChange={(e) => setPreference('timeFormat', e.target.value as '12h' | '24h')}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {TIME_FORMAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Default Event Duration */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default Event Duration
                      </label>
                      <select
                        value={preferences.defaultEventDuration}
                        onChange={(e) => setPreference('defaultEventDuration', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        {DEFAULT_DURATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Work Hours */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Work Hours
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">Start</label>
                        <select
                          value={preferences.workDayStart}
                          onChange={(e) => setPreference('workDayStart', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">End</label>
                        <select
                          value={preferences.workDayEnd}
                          onChange={(e) => setPreference('workDayEnd', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Notifications & Reminders */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-500" />
                      Notifications & Reminders
                    </h4>
                    <div className="space-y-4">
                      {/* Default Reminder */}
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600 dark:text-gray-400">Default Reminder</label>
                        <select
                          value={preferences.defaultReminderMinutes}
                          onChange={(e) => setPreference('defaultReminderMinutes', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          {REMINDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Toggle Options */}
                      <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Browser Notifications</span>
                          <button
                            onClick={() => setPreference('enableBrowserNotifications', !preferences.enableBrowserNotifications)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.enableBrowserNotifications
                                ? 'bg-indigo-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.enableBrowserNotifications ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </label>

                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Sound Alerts</span>
                          <button
                            onClick={() => setPreference('enableSoundAlerts', !preferences.enableSoundAlerts)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.enableSoundAlerts
                                ? 'bg-indigo-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.enableSoundAlerts ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                          </button>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Display Options */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Display Options</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show Week Numbers</span>
                        <button
                          onClick={() => setPreference('showWeekNumbers', !preferences.showWeekNumbers)}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.showWeekNumbers
                              ? 'bg-indigo-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.showWeekNumbers ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Hide Weekends</span>
                        <button
                          onClick={() => setPreference('hideWeekends', !preferences.hideWeekends)}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.hideWeekends
                              ? 'bg-indigo-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.hideWeekends ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Show Declined Events</span>
                        <button
                          onClick={() => setPreference('showDeclinedEvents', !preferences.showDeclinedEvents)}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.showDeclinedEvents
                              ? 'bg-indigo-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.showDeclinedEvents ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </label>

                      <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Compact Mode</span>
                        <button
                          onClick={() => setPreference('compactMode', !preferences.compactMode)}
                          className={`w-10 h-6 rounded-full p-1 transition-colors ${preferences.compactMode
                              ? 'bg-indigo-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${preferences.compactMode ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Privacy & Analytics Section */}
                <section className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Privacy & Analytics
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        How Quarry Codex handles your data
                      </p>
                    </div>
                  </div>

                  {/* No External Tracking Banner */}
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                          No External Tracking on Codex Pages
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          Codex pages have zero external analytics. No Google Analytics, no Microsoft Clarity,
                          no tracking cookies. Your reading habits remain completely private.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Local Analytics Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      Local-Only Analytics
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      The following data is stored locally in your browser and never transmitted externally:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span><strong>Content Growth:</strong> Strand counts, word counts, tag evolution over time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span><strong>Reading Activity:</strong> Which strands you&apos;ve visited and when</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span><strong>Bookmarks:</strong> Your saved strands and annotations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span><strong>Preferences:</strong> Theme, font size, sidebar settings</span>
                      </li>
                    </ul>
                  </div>

                  {/* Storage Location */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-gray-500" />
                      Where Your Data Lives
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">IndexedDB</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Analytics, history, bookmarks, AI-generated content
                        </p>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">localStorage</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Preferences, theme, sidebar state
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Data Management */}
                  <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-red-500" />
                      Data Management
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Clear all locally stored data including analytics, preferences, bookmarks, and API keys.
                      This action cannot be undone.
                    </p>

                    {!showClearConfirm ? (
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Clear All Data
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Are you sure? This will delete all your data and refresh the page.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleClearIndexedDB}
                            disabled={clearingData}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                            {clearingData ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Clearing...
                              </>
                            ) : dataCleared ? (
                              <>
                                <Check className="w-4 h-4" />
                                Cleared!
                              </>
                            ) : (
                              'Yes, Clear Everything'
                            )}
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            disabled={clearingData}
                            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Learn More Link */}
                  <div className="pt-2">
                    <a
                      href="/quarry/privacy"
                      className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Learn more about Codex privacy
                    </a>
                  </div>
                </section>
              </>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {themeOrder.map((name) => {
                    const meta = THEME_METADATA[name]
                    const isActive = theme === name
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setTheme(name)}
                        className={`
                        flex items-start gap-3 p-3 border-2 rounded-lg text-left transition-all
                        ${isActive ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}
                      `}
                        aria-pressed={isActive}
                      >
                        <span
                          className="inline-block w-8 h-8 rounded-sm border"
                          style={{ backgroundColor: meta.backgroundColor, borderColor: meta.accentColor }}
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold">{meta.label}</span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{meta.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}