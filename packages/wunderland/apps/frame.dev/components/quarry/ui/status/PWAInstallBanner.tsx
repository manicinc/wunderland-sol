/**
 * PWA Install Banner
 * @module codex/ui/PWAInstallBanner
 * 
 * @remarks
 * Shows a non-intrusive banner prompting users to install the app.
 * Dismissible and respects user choice (won't show again after dismissal).
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'

interface PWAInstallBannerProps {
  /** Whether app is installable */
  isInstallable: boolean
  /** Install callback */
  onInstall: () => Promise<boolean>
  /** Theme */
  theme?: string
}

/**
 * Banner prompting user to install PWA
 */
export default function PWAInstallBanner({
  isInstallable,
  onInstall,
  theme = 'light',
}: PWAInstallBannerProps) {
  const [dismissed, setDismissed] = useState(true)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    // Show if: installable, not dismissed, or dismissed more than a week ago
    if (isInstallable && (!dismissedAt || now - parseInt(dismissedAt, 10) > oneWeek)) {
      // Wait 3 seconds before showing (don't be annoying)
      const timer = setTimeout(() => setDismissed(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable])

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    setDismissed(true)
  }

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const installed = await onInstall()
      if (installed) {
        setDismissed(true)
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error)
    } finally {
      setInstalling(false)
    }
  }

  if (dismissed || !isInstallable) return null

  const isDark = theme?.includes('dark')
  const isTerminal = theme?.includes('terminal')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`
          fixed bottom-20 md:bottom-4 right-4 z-50
          max-w-sm rounded-lg shadow-2xl
          ${isTerminal
            ? 'bg-black border-2 border-green-500 text-green-400'
            : isDark
            ? 'bg-gray-900 border border-gray-700'
            : 'bg-white border border-gray-200'
          }
        `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`
                p-2 rounded-lg
                ${isTerminal
                  ? 'bg-green-900/30'
                  : isDark
                  ? 'bg-cyan-900/30'
                  : 'bg-cyan-100'
                }
              `}>
                <Smartphone className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${
                  isTerminal
                    ? 'text-green-400'
                    : isDark
                    ? 'text-white'
                    : 'text-gray-900'
                }`}>
                  Install Quarry Codex
                </h3>
                <p className={`text-xs ${
                  isTerminal
                    ? 'text-green-500/70'
                    : isDark
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }`}>
                  Access offline, faster loads
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className={`
                p-1 rounded
                ${isTerminal
                  ? 'hover:bg-green-900/30'
                  : isDark
                  ? 'hover:bg-gray-800'
                  : 'hover:bg-gray-100'
                }
              `}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                text-sm font-semibold transition-all
                ${isTerminal
                  ? 'bg-green-600 hover:bg-green-500 text-black'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {installing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${isTerminal
                  ? 'hover:bg-green-900/30 text-green-400'
                  : isDark
                  ? 'hover:bg-gray-800 text-gray-300'
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

