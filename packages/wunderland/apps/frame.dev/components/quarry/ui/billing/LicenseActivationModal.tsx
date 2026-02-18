/**
 * License Activation Modal
 *
 * Modal for entering and activating a license key.
 * Works with both Gumroad keys and Quarry-generated keys.
 *
 * @module components/quarry/ui/billing/LicenseActivationModal
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Key,
  Check,
  AlertCircle,
  Loader2,
  Crown,
  ExternalLink,
  Mail,
  Sparkles,
} from 'lucide-react'
import { useLicense } from '@/lib/license'

// ============================================================================
// TYPES
// ============================================================================

interface LicenseActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function LicenseActivationModal({
  isOpen,
  onClose,
  onSuccess,
}: LicenseActivationModalProps) {
  const { activate, isLoading: licenseLoading } = useLicense()

  const [licenseKey, setLicenseKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLicenseKey('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  // Format license key as user types (auto-format QUARRY keys)
  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase()

    // Remove any non-alphanumeric characters except dashes
    value = value.replace(/[^A-Z0-9-]/g, '')

    // Auto-format QUARRY keys
    if (value.startsWith('QUARRY') && !value.includes('-', 6)) {
      // Add dashes at appropriate positions
      const parts = value.replace(/QUARRY-?/, '').replace(/-/g, '')
      let formatted = 'QUARRY'
      for (let i = 0; i < parts.length && i < 16; i += 4) {
        formatted += '-' + parts.slice(i, i + 4)
      }
      value = formatted
    }

    setLicenseKey(value)
    setError(null)
  }, [])

  // Activate license
  const handleActivate = useCallback(async () => {
    const trimmedKey = licenseKey.trim()

    if (!trimmedKey) {
      setError('Please enter a license key')
      return
    }

    setIsActivating(true)
    setError(null)

    try {
      const result = await activate(trimmedKey)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to activate license')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed')
    } finally {
      setIsActivating(false)
    }
  }, [licenseKey, activate, onSuccess, onClose])

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate()
    }
  }, [handleActivate, isActivating])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-center">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-3">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Activate Premium License
                </h2>
                <p className="text-amber-100 text-sm">
                  Enter your license key to unlock all features
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Success State */}
                {success ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      License Activated!
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      All premium features are now unlocked.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* License Key Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        License Key
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <Key className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={licenseKey}
                          onChange={handleKeyChange}
                          onKeyDown={handleKeyDown}
                          placeholder="QUARRY-XXXX-XXXX-XXXX-XXXX"
                          className="w-full pl-10 pr-20 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                          autoComplete="off"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {showKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Also supports Gumroad keys (XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX)
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    )}

                    {/* Activate Button */}
                    <button
                      onClick={handleActivate}
                      disabled={isActivating || licenseLoading || !licenseKey.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Activate License
                        </>
                      )}
                    </button>

                    {/* Help Links */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                      <a
                        href="https://quarry.space/#pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Get a license
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href="mailto:support@quarry.space"
                        className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:underline"
                      >
                        <Mail className="w-3 h-3" />
                        Need help?
                      </a>
                    </div>
                  </>
                )}
              </div>

              {/* Premium Features Preview */}
              {!success && (
                <div className="px-6 pb-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Premium features you'll unlock:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        'Unlimited devices',
                        'Cloud sync',
                        'AI Q&A',
                        'Flashcards (FSRS)',
                        'Full export',
                        'Priority support',
                      ].map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400"
                        >
                          <Check className="w-3 h-3 text-emerald-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
