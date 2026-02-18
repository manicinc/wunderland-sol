/**
 * API Key Settings
 *
 * UI component for configuring LLM provider API keys.
 * Settings override environment variables.
 *
 * @module codex/ui/APIKeySettings
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Cpu,
  Cloud,
  Server,
  CheckCircle,
  XCircle,
  Info,
  Trash2,
  Star,
  Zap,
} from 'lucide-react'
import { useAPIKeys } from '@/lib/config/useAPIKeys'
import {
  type APIProvider,
  DEFAULT_BASE_URLS,
} from '@/lib/config/apiKeyStorage'

// ============================================================================
// TYPES
// ============================================================================

interface ProviderConfig {
  id: APIProvider
  name: string
  description: string
  icon: React.ReactNode
  keyPrefix?: string
  keyPlaceholder: string
  docsUrl: string
  generateUrl?: string
  supportsCustomUrl: boolean
  defaultModel?: string
}

// ============================================================================
// PROVIDER CONFIGURATIONS
// ============================================================================

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet/Haiku - Best for analysis',
    icon: <Sparkles className="w-5 h-5 text-orange-500" />,
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    generateUrl: 'https://console.anthropic.com/settings/keys',
    supportsCustomUrl: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o Mini - Fast and affordable',
    icon: <Cpu className="w-5 h-5 text-emerald-500" />,
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
    generateUrl: 'https://platform.openai.com/api-keys',
    supportsCustomUrl: true,
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models via one API',
    icon: <Cloud className="w-5 h-5 text-purple-500" />,
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-xxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://openrouter.ai/docs',
    generateUrl: 'https://openrouter.ai/keys',
    supportsCustomUrl: false,
    defaultModel: 'anthropic/claude-3-haiku',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large/Small - European AI leader',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    keyPrefix: '',
    keyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://docs.mistral.ai/',
    generateUrl: 'https://console.mistral.ai/api-keys/',
    supportsCustomUrl: true,
    defaultModel: 'mistral-small-latest',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run models locally - No API key needed',
    icon: <Server className="w-5 h-5 text-cyan-500" />,
    keyPlaceholder: 'No API key required',
    docsUrl: 'https://ollama.ai/docs',
    supportsCustomUrl: true,
    defaultModel: 'llama3.2',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function APIKeySettings() {
  const {
    keys,
    loading,
    configuredProviders,
    preferredProvider,
    save,
    remove,
    validate,
    setPreferred,
  } = useAPIKeys()

  const [expandedProvider, setExpandedProvider] = useState<APIProvider | null>(null)
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartEdit = useCallback((provider: ProviderConfig) => {
    setEditingProvider(provider.id)
    setKeyInput(keys[provider.id]?.key || '')
    setUrlInput(keys[provider.id]?.baseUrl || '')
    setShowKey(false)
    setValidationResult(null)
    setError(null)
  }, [keys])

  const handleCancelEdit = useCallback(() => {
    setEditingProvider(null)
    setKeyInput('')
    setUrlInput('')
    setShowKey(false)
    setValidationResult(null)
    setError(null)
  }, [])

  const handleValidate = useCallback(async () => {
    if (!editingProvider) return

    setValidating(true)
    setValidationResult(null)
    setError(null)

    try {
      const result = await validate(editingProvider, keyInput, urlInput || undefined)
      setValidationResult(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setValidating(false)
    }
  }, [editingProvider, keyInput, urlInput, validate])

  const handleSave = useCallback(async () => {
    if (!editingProvider) return

    setSaving(true)
    setError(null)

    try {
      await save(editingProvider, {
        key: keyInput,
        baseUrl: urlInput || undefined,
      })
      handleCancelEdit()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }, [editingProvider, keyInput, urlInput, save, handleCancelEdit])

  const handleRemove = useCallback(async (provider: APIProvider) => {
    if (!confirm(`Remove the ${provider} API key? You can add it again later.`)) {
      return
    }
    await remove(provider)
  }, [remove])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            API Keys
          </h3>
        </div>
        {/* API Playground Link */}
        <a
          href="/quarry/api-playground"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
            bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300
            border border-cyan-200 dark:border-cyan-800
            hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          API Playground
        </a>
      </div>

      {/* Info Banner */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium">Settings override environment variables</p>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              API keys configured here take priority over .env files. Keys are encrypted and stored locally in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Default Provider Selection */}
      {configuredProviders.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Default Provider
            </h4>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Select which provider to use by default when generating content. This will be used unless you specify otherwise.
          </p>
          <div className="flex flex-wrap gap-2">
            {configuredProviders.map((providerId) => {
              const provider = PROVIDERS.find(p => p.id === providerId)
              if (!provider) return null
              const isSelected = preferredProvider === providerId
              
              return (
                <button
                  key={providerId}
                  onClick={() => setPreferred(isSelected ? null : providerId)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
                    ${isSelected
                      ? 'bg-amber-500 text-white shadow-md scale-105'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-gray-200 dark:border-gray-700'
                    }
                  `}
                >
                  {provider.icon}
                  <span>{provider.name}</span>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              )
            })}
          </div>
          {!preferredProvider && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
              No default selected. The first available provider will be used automatically.
            </p>
          )}
        </div>
      )}

      {/* Provider List */}
      <div className="space-y-3">
        {PROVIDERS.map((provider) => {
          const isConfigured = configuredProviders.includes(provider.id)
          const isEditing = editingProvider === provider.id
          const storedKey = keys[provider.id]
          const isFromSettings = !!storedKey?.key

          return (
            <div
              key={provider.id}
              className={`
                rounded-xl border-2 transition-all overflow-hidden
                ${isEditing
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10'
                  : isConfigured
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                }
              `}
            >
              {/* Provider Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => !isEditing && setExpandedProvider(
                  expandedProvider === provider.id ? null : provider.id
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isConfigured
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                    }
                  `}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h4>
                      {isConfigured && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded">
                          <CheckCircle className="w-2.5 h-2.5" />
                          {isFromSettings ? 'Settings' : 'Env'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {provider.description}
                    </p>
                  </div>
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {isConfigured ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(provider)
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        {isFromSettings && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemove(provider.id)
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEdit(provider)
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 rounded-lg transition-colors"
                      >
                        Configure
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Edit Form */}
              {isEditing && (
                <div className="px-4 pb-4 space-y-4 border-t border-cyan-200 dark:border-cyan-800 pt-4">
                  {/* API Key Input */}
                  {provider.id !== 'ollama' && (
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyInput}
                          onChange={(e) => setKeyInput(e.target.value)}
                          placeholder={provider.keyPlaceholder}
                          className="w-full px-4 py-2.5 pr-20 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {showKey ? (
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      {provider.generateUrl && (
                        <a
                          href={provider.generateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          Get your API key
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Custom Base URL */}
                  {provider.supportsCustomUrl && (
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                        Base URL (optional)
                      </label>
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder={DEFAULT_BASE_URLS[provider.id]}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Use a custom endpoint (e.g., Azure OpenAI, local proxy)
                      </p>
                    </div>
                  )}

                  {/* Validation Result */}
                  {validationResult && (
                    <div className={`
                      flex items-start gap-2 p-3 rounded-lg
                      ${validationResult.valid
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }
                    `}>
                      {validationResult.valid ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">
                            API key is valid
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-red-700 dark:text-red-300">
                            {validationResult.error || 'Invalid API key'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {provider.id !== 'ollama' && (
                      <button
                        onClick={handleValidate}
                        disabled={validating || !keyInput}
                        className="px-4 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {validating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || (provider.id !== 'ollama' && !keyInput)}
                      className="flex-1 px-4 py-2 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Info (when not editing) */}
              {expandedProvider === provider.id && !isEditing && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Default Model</p>
                      <p className="font-mono text-gray-900 dark:text-white mt-0.5">
                        {provider.defaultModel || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Status</p>
                      <p className={`mt-0.5 ${isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                        {isConfigured ? 'Configured' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    View documentation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Privacy Notice */}
      <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
        <p className="flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            API keys are encrypted (AES-256-GCM) and stored only in your browser's localStorage.
          </span>
        </p>
        <p className="flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Keys are never sent to Frame.dev servers. All LLM requests go directly to the provider.
          </span>
        </p>
      </div>
    </div>
  )
}
