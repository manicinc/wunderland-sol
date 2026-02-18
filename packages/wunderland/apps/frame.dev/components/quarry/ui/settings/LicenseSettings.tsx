/**
 * License Settings
 *
 * UI component for license activation, status display, and feature gating.
 * Supports premium license activation with RSA signature verification.
 *
 * @module codex/ui/LicenseSettings
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  Key,
  Check,
  X,
  AlertCircle,
  Crown,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  Lock,
} from 'lucide-react'
import { useLicense } from '@/lib/license'
import type { LicenseStatus, LicensedFeature } from '@/lib/license/types'
import { getFeatureFlags } from '@/lib/config/featureFlags'

// ============================================================================
// TYPES
// ============================================================================

interface LicenseSettingsProps {
  /** Callback when license status changes */
  onLicenseChange?: (isValid: boolean) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FEATURE_LABELS: Record<LicensedFeature, { label: string; icon: React.ReactNode }> = {
  quizzes: { label: 'Quizzes', icon: <Sparkles className="w-4 h-4" /> },
  flashcards: { label: 'Flashcards (FSRS)', icon: <Sparkles className="w-4 h-4" /> },
  qna: { label: 'AI Q&A', icon: <Sparkles className="w-4 h-4" /> },
  export: { label: 'Full Export', icon: <Sparkles className="w-4 h-4" /> },
  import: { label: 'Full Import', icon: <Sparkles className="w-4 h-4" /> },
  advanced_themes: { label: 'Advanced Themes', icon: <Sparkles className="w-4 h-4" /> },
  desktop_app: { label: 'Desktop App', icon: <Sparkles className="w-4 h-4" /> },
  mobile_app: { label: 'Mobile App', icon: <Sparkles className="w-4 h-4" /> },
  priority_support: { label: 'Priority Support', icon: <Shield className="w-4 h-4" /> },
  offline_storage: { label: 'Offline Storage', icon: <Sparkles className="w-4 h-4" /> },
  ai_generation: { label: 'AI Generation', icon: <Sparkles className="w-4 h-4" /> },
}

const STATUS_DISPLAY: Record<LicenseStatus, { label: string; color: string; icon: React.ReactNode }> = {
  valid: { label: 'Active', color: 'emerald', icon: <CheckCircle className="w-5 h-5" /> },
  expired: { label: 'Expired', color: 'amber', icon: <Clock className="w-5 h-5" /> },
  invalid: { label: 'Invalid', color: 'red', icon: <XCircle className="w-5 h-5" /> },
  revoked: { label: 'Revoked', color: 'red', icon: <XCircle className="w-5 h-5" /> },
  machine_mismatch: { label: 'Machine Mismatch', color: 'amber', icon: <AlertCircle className="w-5 h-5" /> },
  not_activated: { label: 'Not Activated', color: 'gray', icon: <Lock className="w-5 h-5" /> },
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LicenseSettings({ onLicenseChange }: LicenseSettingsProps) {
  const {
    isLoading,
    isValid,
    status,
    license,
    daysRemaining,
    enabledFeatures,
    activate,
    deactivate,
    refresh,
  } = useLicense()

  const [licenseKey, setLicenseKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const flags = getFeatureFlags()

  const handleActivate = useCallback(async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key')
      return
    }

    setError(null)
    setSuccess(false)
    setActivating(true)

    try {
      const result = await activate(licenseKey.trim())

      if (result.success) {
        setSuccess(true)
        setLicenseKey('')
        onLicenseChange?.(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Activation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed')
    } finally {
      setActivating(false)
    }
  }, [licenseKey, activate, onLicenseChange])

  const handleDeactivate = useCallback(async () => {
    if (!confirm('Are you sure you want to deactivate your license? You can reactivate it later.')) {
      return
    }

    try {
      await deactivate()
      onLicenseChange?.(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deactivation failed')
    }
  }, [deactivate, onLicenseChange])

  const handleCopyLicenseId = useCallback(() => {
    if (license?.licenseId) {
      navigator.clipboard.writeText(license.licenseId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [license])

  const statusDisplay = STATUS_DISPLAY[status]

  // Community edition notice
  if (flags.edition === 'community') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Edition & License
          </h3>
        </div>

        <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 mb-3">
              <Sparkles className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Community Edition
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              You're using the free open-source edition. Upgrade to Premium for full offline mode, quizzes, flashcards, and more.
            </p>
            <a
              href="https://github.com/framersai/quarry#editions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Premium Features
          </p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(FEATURE_LABELS).map(([key, { label }]) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500"
              >
                <Lock className="w-3 h-3" />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            License
          </h3>
        </div>
        {isValid && (
          <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
            Premium Active
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-4 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : isValid && license ? (
        /* Active License Display */
        <div className="space-y-4">
          {/* License Status Card */}
          <div className={`p-4 rounded-xl border-2 border-${statusDisplay.color}-300 dark:border-${statusDisplay.color}-800 bg-${statusDisplay.color}-50 dark:bg-${statusDisplay.color}-900/20`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-${statusDisplay.color}-600 dark:text-${statusDisplay.color}-400`}>
                  {statusDisplay.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {license.type === 'premium' ? 'Premium License' : license.type === 'trial' ? 'Trial License' : 'Educational License'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {license.email}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold uppercase bg-${statusDisplay.color}-200 dark:bg-${statusDisplay.color}-800 text-${statusDisplay.color}-700 dark:text-${statusDisplay.color}-200 rounded`}>
                {statusDisplay.label}
              </span>
            </div>

            {/* License Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 dark:text-gray-400">License ID</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <code className="font-mono text-gray-900 dark:text-gray-100">
                    {license.licenseId.slice(0, 8)}...
                  </code>
                  <button
                    onClick={handleCopyLicenseId}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Copy license ID"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Expires</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                  {license.expiresAt === 0 ? (
                    'Never (Perpetual)'
                  ) : (
                    <>
                      {new Date(license.expiresAt).toLocaleDateString()}
                      {daysRemaining !== undefined && (
                        <span className={`ml-1 ${daysRemaining < 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                          ({daysRemaining}d)
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Enabled Features */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Enabled Features
            </p>
            <div className="grid grid-cols-2 gap-2">
              {enabledFeatures.map((feature) => {
                const info = FEATURE_LABELS[feature]
                return (
                  <div
                    key={feature}
                    className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  >
                    <Check className="w-3 h-3" />
                    <span className="text-xs">{info?.label || feature}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={refresh}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors text-sm"
            >
              Refresh Status
            </button>
            <button
              onClick={handleDeactivate}
              className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-medium rounded-xl transition-colors text-sm"
            >
              Deactivate
            </button>
          </div>
        </div>
      ) : (
        /* License Activation Form */
        <div className="space-y-4">
          {/* Status Display (if not activated) */}
          {status !== 'not_activated' && (
            <div className={`p-3 rounded-lg border border-${statusDisplay.color}-200 dark:border-${statusDisplay.color}-800 bg-${statusDisplay.color}-50 dark:bg-${statusDisplay.color}-900/20`}>
              <div className="flex items-center gap-2">
                <span className={`text-${statusDisplay.color}-600 dark:text-${statusDisplay.color}-400`}>
                  {statusDisplay.icon}
                </span>
                <p className={`text-xs font-medium text-${statusDisplay.color}-700 dark:text-${statusDisplay.color}-300`}>
                  License {statusDisplay.label.toLowerCase()}. Please enter a valid license key.
                </p>
              </div>
            </div>
          )}

          {/* Activation Form */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                License Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="Enter your license key..."
                  className="w-full px-4 py-3 pr-24 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  License activated successfully!
                </p>
              </div>
            )}

            {/* Activate Button */}
            <button
              onClick={handleActivate}
              disabled={activating || !licenseKey.trim()}
              className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {activating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Activate License
                </>
              )}
            </button>

            {/* Help Links */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <a
                href="https://github.com/framersai/quarry#editions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                Get a license
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://frame.dev/support"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1"
              >
                Need help?
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
