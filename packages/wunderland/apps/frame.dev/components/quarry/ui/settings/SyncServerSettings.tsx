/**
 * Sync Server Settings Component
 * @module components/quarry/ui/settings/SyncServerSettings
 *
 * Settings panel for self-hosted sync server configuration.
 * Allows users to configure a custom sync backend URL.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Cloud,
  Server,
  Lock,
  ExternalLink,
  Shield,
  FileText,
  Check,
  X,
  Loader2,
  RefreshCw,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getSyncConfig,
  setSyncConfig,
  testSyncServerConnection,
  validateSyncUrl,
  getDefaultSyncUrl,
  type SyncServerConfig,
} from '@/lib/config/syncConfig'

// ============================================================================
// LICENSE TEXT
// ============================================================================

const LICENSE_INFO = {
  title: 'Self-Hosted Sync Server License',
  features: [
    'Freely modify source code for personal/internal use',
    'Full data sovereignty on your own infrastructure',
    'Compatible API implementation required',
  ],
  docsUrl: 'https://github.com/framersai/quarry-sync/blob/main/docs/SELF_HOSTING.md',
  apiDocsUrl: 'https://github.com/framersai/quarry-sync/blob/main/docs/API_REFERENCE.md',
}

// ============================================================================
// COMPONENT
// ============================================================================

interface SyncServerSettingsProps {
  className?: string
}

export function SyncServerSettings({ className }: SyncServerSettingsProps) {
  const [config, setConfig] = useState<SyncServerConfig | null>(null)
  const [customUrl, setCustomUrl] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    version?: string
  } | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load config on mount
  useEffect(() => {
    getSyncConfig().then((cfg) => {
      setConfig(cfg)
      setUseCustom(cfg.useCustomServer)
      setCustomUrl(cfg.customServerUrl || '')
      if (cfg.lastTestResult) {
        setTestResult({
          success: cfg.lastTestResult.success,
          message: cfg.lastTestResult.message,
        })
      }
    })
  }, [])

  // Track changes
  useEffect(() => {
    if (!config) return
    const changed =
      useCustom !== config.useCustomServer ||
      customUrl !== (config.customServerUrl || '')
    setHasChanges(changed)
  }, [config, useCustom, customUrl])

  // Validate URL on change
  useEffect(() => {
    if (!useCustom || !customUrl) {
      setUrlError(null)
      return
    }
    const result = validateSyncUrl(customUrl)
    if (!result.valid) {
      setUrlError(result.error || 'Invalid URL')
    } else if (result.error) {
      setUrlError(result.error) // Warning
    } else {
      setUrlError(null)
    }
  }, [customUrl, useCustom])

  const handleTestConnection = useCallback(async () => {
    if (!customUrl) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await testSyncServerConnection(customUrl)
      setTestResult(result)

      // Save test result
      await setSyncConfig({
        lastTestResult: {
          success: result.success,
          message: result.message,
          testedAt: Date.now(),
        },
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsTesting(false)
    }
  }, [customUrl])

  const handleSave = useCallback(async () => {
    setIsSaving(true)

    try {
      await setSyncConfig({
        useCustomServer: useCustom,
        customServerUrl: useCustom ? customUrl : undefined,
      })

      // Reload config
      const newConfig = await getSyncConfig()
      setConfig(newConfig)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }, [useCustom, customUrl])

  const handleReset = useCallback(() => {
    if (!config) return
    setUseCustom(config.useCustomServer)
    setCustomUrl(config.customServerUrl || '')
    setTestResult(null)
  }, [config])

  const defaultUrl = getDefaultSyncUrl()

  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
              <Cloud className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">
                Sync Server Configuration
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Configure where your data syncs across devices
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-5">
        {/* Server Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Sync Server
          </h4>

          {/* Default Server Option */}
          <label
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
              !useCustom
                ? 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            )}
          >
            <input
              type="radio"
              name="sync-server"
              checked={!useCustom}
              onChange={() => setUseCustom(false)}
              className="mt-1 text-violet-600 focus:ring-violet-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="font-medium text-zinc-900 dark:text-white">
                  Quarry Cloud
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Default
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Sync via {defaultUrl.replace('wss://', '').replace('/api/v1/sync', '')}
              </p>
            </div>
          </label>

          {/* Custom Server Option */}
          <label
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all',
              useCustom
                ? 'border-violet-300 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            )}
          >
            <input
              type="radio"
              name="sync-server"
              checked={useCustom}
              onChange={() => setUseCustom(true)}
              className="mt-1 text-violet-600 focus:ring-violet-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="font-medium text-zinc-900 dark:text-white">
                  Self-Hosted Server
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Use your own sync server for full data control
              </p>
            </div>
          </label>
        </div>

        {/* Custom URL Input */}
        {useCustom && (
          <div className="space-y-3 pl-7">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Sync Server URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://sync.example.com/api/v1/sync"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900',
                    'text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400',
                    'focus:outline-none focus:ring-2',
                    urlError && !urlError.startsWith('Warning')
                      ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                      : urlError
                        ? 'border-amber-300 dark:border-amber-700 focus:ring-amber-500'
                        : 'border-zinc-200 dark:border-zinc-700 focus:ring-violet-500'
                  )}
                />
              </div>
              {urlError && (
                <p
                  className={cn(
                    'text-xs mt-1.5 flex items-center gap-1',
                    urlError.startsWith('Warning')
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {urlError}
                </p>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={!customUrl || isTesting || (urlError && !urlError.startsWith('Warning'))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
                  'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Test Connection
              </button>

              {testResult && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-sm',
                    testResult.success
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>
                    {testResult.success
                      ? `Connected${testResult.version ? ` (v${testResult.version})` : ''}`
                      : testResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2 pt-2">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Features
          </h4>
          <div className="flex flex-wrap gap-2">
            <FeatureTag icon={Lock} label="End-to-End Encrypted" />
            <FeatureTag icon={Server} label="Your Infrastructure" />
            <FeatureTag icon={Shield} label="Full Data Control" />
          </div>
        </div>

        {/* Documentation Links */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {LICENSE_INFO.title}
              </h4>
              <ul className="space-y-1">
                {LICENSE_INFO.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="text-violet-500 mt-1">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={LICENSE_INFO.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-colors"
                >
                  Self-Hosting Guide
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={LICENSE_INFO.apiDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline transition-colors"
                >
                  API Reference
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Save/Reset Buttons */}
        {hasChanges && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (useCustom && (!customUrl || (urlError && !urlError.startsWith('Warning'))))}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                'bg-violet-600 hover:bg-violet-700 text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FeatureTag({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 dark:bg-zinc-800/60 border border-violet-200 dark:border-violet-700/50 text-xs font-medium text-violet-700 dark:text-violet-300">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default SyncServerSettings
