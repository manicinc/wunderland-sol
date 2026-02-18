/**
 * Research Settings
 *
 * UI component for configuring research preferences including
 * search provider API keys, citation styles, and cache settings.
 *
 * @module codex/ui/ResearchSettings
 */

'use client'

import React, { useState } from 'react'
import {
  Globe,
  Key,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ExternalLink,
  Sparkles,
  Clock,
  Quote,
  Trash2,
  Info,
  CheckCircle,
  RotateCcw,
  Search,
} from 'lucide-react'
import {
  useResearchPreferences,
  useSearchProviderKeys,
} from '@/lib/research/useResearchPreferences'
import { CACHE_DURATION_OPTIONS } from '@/lib/research/preferences'
import { type SearchProvider } from '@/lib/research/types'
import { getCitationStyles, type CitationStyle } from '@/lib/research/citationFormatter'

// ============================================================================
// PROVIDER DOCUMENTATION
// ============================================================================

interface ProviderInfo {
  id: SearchProvider
  name: string
  description: string
  freeTier?: string
  getKeyUrl?: string
  docsUrl?: string
  icon: 'globe' | 'sparkles' | 'zap' | 'search'
  requiresKey: boolean
  tooltip: string
}

const PROVIDER_DOCS: Record<string, ProviderInfo> = {
  brave: {
    id: 'brave',
    name: 'Brave Search',
    description: 'Privacy-focused search with excellent results',
    freeTier: '2,000 queries/month free',
    getKeyUrl: 'https://brave.com/search/api/',
    docsUrl: 'https://api.search.brave.com/app/documentation',
    icon: 'globe',
    requiresKey: true,
    tooltip: 'Brave Search provides high-quality web results with strong privacy. Great for general research. Sign up takes ~2 minutes.',
  },
  serper: {
    id: 'serper',
    name: 'Serper.dev',
    description: 'Google Search results via API',
    freeTier: '2,500 queries free (one-time)',
    getKeyUrl: 'https://serper.dev/',
    docsUrl: 'https://serper.dev/docs',
    icon: 'search',
    requiresKey: true,
    tooltip: 'Serper provides Google search results programmatically. Best accuracy for finding specific content. Quick signup with email.',
  },
  serpapi: {
    id: 'serpapi',
    name: 'SerpAPI',
    description: 'Google Search Results API with rich data',
    freeTier: '100 searches/month free',
    getKeyUrl: 'https://serpapi.com/manage-api-key',
    docsUrl: 'https://serpapi.com/search-api',
    icon: 'search',
    requiresKey: true,
    tooltip: 'SerpAPI provides comprehensive Google search results including knowledge graphs, related questions, and local results. Free tier includes 100 searches/month.',
  },
  searxng: {
    id: 'searxng',
    name: 'SearXNG',
    description: 'Free metasearch via public instances',
    freeTier: 'Always free, no signup',
    docsUrl: 'https://docs.searxng.org/',
    icon: 'sparkles',
    requiresKey: false,
    tooltip: 'SearXNG aggregates results from multiple search engines. Uses public instances automatically. No API key needed - works out of the box!',
  },
  semanticscholar: {
    id: 'semanticscholar',
    name: 'Semantic Scholar',
    description: 'Academic paper search & citations',
    freeTier: 'Free, no signup required',
    docsUrl: 'https://api.semanticscholar.org/',
    icon: 'sparkles',
    requiresKey: false,
    tooltip: 'Powers academic search for arXiv, papers, and citations. Automatically used when searching with site:arxiv.org or academic queries.',
  },
}

// ============================================================================
// TYPES
// ============================================================================

interface SearchProviderCardProps {
  provider: SearchProvider
  providerInfo: ProviderInfo
  isConfigured: boolean
  onSaveKey: (key: string) => void
  onRemoveKey: () => void
  currentKey: string | null
}

// ============================================================================
// SEARCH PROVIDER CARD
// ============================================================================

function SearchProviderCard({
  provider: _provider,
  providerInfo,
  isConfigured,
  onSaveKey,
  onRemoveKey,
  currentKey,
}: SearchProviderCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleStartEdit = () => {
    setIsEditing(true)
    setKeyInput(currentKey || '')
    setShowKey(false)
  }

  const handleSave = () => {
    if (keyInput.trim()) {
      onSaveKey(keyInput.trim())
    }
    setIsEditing(false)
    setKeyInput('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setKeyInput('')
  }

  const handleRemove = () => {
    if (confirm(`Remove the ${providerInfo.name} API key?`)) {
      onRemoveKey()
    }
  }

  // Skip providers that don't need API keys in the key section
  if (!providerInfo.requiresKey) return null

  return (
    <div
      className={`
        rounded-xl border-2 transition-all overflow-hidden
        ${isEditing
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10'
          : isConfigured
            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
        }
      `}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${isConfigured
              ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
            }
          `}>
            <Globe className={`w-5 h-5 ${isConfigured ? 'text-emerald-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {providerInfo.name}
              </h4>
              {isConfigured && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Configured
                </span>
              )}
              {/* Info tooltip trigger */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showTooltip && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700">
                    <p>{providerInfo.tooltip}</p>
                    {providerInfo.docsUrl && (
                      <a
                        href={providerInfo.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300"
                      >
                        View docs <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {providerInfo.description}
            </p>
            {providerInfo.freeTier && (
              <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">
                {providerInfo.freeTier}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <>
                <button
                  onClick={handleStartEdit}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleRemove}
                  className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 rounded-lg transition-colors"
              >
                Configure
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="px-4 pb-4 space-y-4 border-t border-violet-200 dark:border-violet-800 pt-4">
          {/* Get API Key Link */}
          {providerInfo.getKeyUrl && (
            <a
              href={providerInfo.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Get your free API key from {providerInfo.name}
              <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          )}

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-4 py-2.5 pr-20 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
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
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!keyInput.trim()}
              className="flex-1 px-4 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// FREE PROVIDER CARD (No API key needed)
// ============================================================================

function FreeProviderCard({ providerInfo }: { providerInfo: ProviderInfo }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {providerInfo.name}
              </h4>
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 rounded">
                <CheckCircle className="w-2.5 h-2.5" />
                Free
              </span>
              {/* Info tooltip */}
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 rounded-full transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showTooltip && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl border border-gray-700">
                    <p>{providerInfo.tooltip}</p>
                    {providerInfo.docsUrl && (
                      <a
                        href={providerInfo.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300"
                      >
                        View docs <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {providerInfo.description}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {providerInfo.freeTier}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ResearchSettings() {
  const { prefs, loading: prefsLoading, update, reset } = useResearchPreferences()
  const {
    configuredProviders,
    loading: keysLoading,
    getKey,
    saveKey,
    removeKey,
  } = useSearchProviderKeys()

  const citationStyles = getCitationStyles()

  if (prefsLoading || keysLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Research Settings
        </h3>
      </div>

      {/* Search Provider API Keys */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Search Provider API Keys
          </h4>
        </div>

        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium">Enhance search with premium providers</p>
              <p className="mt-1 text-blue-600 dark:text-blue-400">
                DuckDuckGo and Semantic Scholar work without API keys. Add Brave, Serper, or SerpAPI for better web search results.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {(['brave', 'serper', 'serpapi'] as const).map((provider) => (
            <SearchProviderCard
              key={provider}
              provider={provider}
              providerInfo={PROVIDER_DOCS[provider]}
              isConfigured={configuredProviders.includes(provider)}
              currentKey={getKey(provider)}
              onSaveKey={(key) => saveKey(provider, key)}
              onRemoveKey={() => removeKey(provider)}
            />
          ))}
        </div>
      </div>

      {/* Free Providers (No API Key Needed) */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Free Providers (No API Key Needed)
          </h4>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          These providers work automatically without any configuration.
        </p>

        <div className="space-y-3">
          {(['searxng', 'semanticscholar'] as const).map((provider) => (
            <FreeProviderCard
              key={provider}
              providerInfo={PROVIDER_DOCS[provider]}
            />
          ))}
        </div>
      </div>

      {/* Default Citation Style */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Quote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Default Citation Style
          </h4>
        </div>

        <select
          value={prefs.defaultCitationStyle}
          onChange={(e) => update({ defaultCitationStyle: e.target.value as CitationStyle })}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
        >
          {citationStyles.map((style) => (
            <option key={style.id} value={style.id}>
              {style.label} - {style.description}
            </option>
          ))}
        </select>

        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          This style will be used when copying citations from research results.
        </p>
      </div>

      {/* Auto-Enrich Toggle */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Auto-Enrich Academic Papers
          </h4>
        </div>

        <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Automatically fetch paper metadata
            </span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Get authors, citation counts, and abstracts from Semantic Scholar
            </p>
          </div>
          <input
            type="checkbox"
            checked={prefs.autoEnrichEnabled}
            onChange={(e) => update({ autoEnrichEnabled: e.target.checked })}
            className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
          />
        </label>
      </div>

      {/* Cache Duration */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Search Cache Duration
          </h4>
        </div>

        <select
          value={prefs.cacheDurationMs}
          onChange={(e) => update({ cacheDurationMs: Number(e.target.value) })}
          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
        >
          {CACHE_DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          How long to cache search results before fetching fresh data.
        </p>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      {/* Privacy Notice */}
      <div className="text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
        <p className="flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            API keys are stored only in your browser&apos;s localStorage and never sent to our servers.
          </span>
        </p>
        <p className="flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Search requests go directly to the provider (Brave, Serper, etc.).
          </span>
        </p>
      </div>
    </div>
  )
}
