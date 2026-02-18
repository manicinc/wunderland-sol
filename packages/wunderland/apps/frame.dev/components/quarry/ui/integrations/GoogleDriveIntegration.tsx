/**
 * Google Drive Integration Component
 * @module components/quarry/ui/GoogleDriveIntegration
 *
 * OAuth connection and management for Google Drive.
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CheckCircle2, XCircle, Settings, LogOut, Loader2 } from 'lucide-react'
import { getGoogleOAuthClient } from '@/lib/import-export/converters/google/GoogleOAuthClient'
import type { GoogleOAuthConfig } from '@/lib/import-export/converters/google/GoogleOAuthClient'

// ============================================================================
// TYPES
// ============================================================================

export interface GoogleDriveIntegrationProps {
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void
  /** Show custom credentials option */
  showCustomCredentials?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GoogleDriveIntegration({
  onConnectionChange,
  showCustomCredentials = true,
}: GoogleDriveIntegrationProps) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const [customConfig, setCustomConfig] = useState<Partial<GoogleOAuthConfig>>({
    clientId: '',
    clientSecret: '',
  })

  const oauthClient = getGoogleOAuthClient()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    setLoading(true)
    try {
      const isAuth = await oauthClient.isAuthenticated()
      setConnected(isAuth)
      onConnectionChange?.(isAuth)
    } catch (err) {
      console.error('Failed to check auth status:', err)
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)

    try {
      // Update config if custom credentials provided
      if (showCustom && customConfig.clientId) {
        oauthClient.updateConfig(customConfig)
      }

      await oauthClient.authorize()
      setConnected(true)
      onConnectionChange?.(true)
    } catch (err) {
      console.error('OAuth error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Drive')
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    setError(null)

    try {
      await oauthClient.revokeAccess()
      setConnected(false)
      onConnectionChange?.(false)
    } catch (err) {
      console.error('Disconnect error:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div
        className={`p-4 rounded-lg border-2 ${
          connected
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Cloud
              className={`w-6 h-6 flex-shrink-0 ${
                connected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
              }`}
            />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Google Drive {connected ? 'Connected' : 'Not Connected'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {connected
                  ? 'You can now import documents from Google Drive'
                  : 'Connect your Google account to import documents from Google Drive'}
              </p>
            </div>
          </div>
          {connected ? (
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-gray-400 flex-shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Connect Google Drive
                  </>
                )}
              </button>
              {showCustomCredentials && (
                <button
                  onClick={() => setShowCustom(!showCustom)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Custom Credentials
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100 text-sm">Connection Error</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Credentials Form */}
      <AnimatePresence>
        {showCustom && !connected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Custom OAuth Credentials
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use your own Google Cloud project credentials. This is optional and only needed if you want to
                  use your own OAuth app.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={customConfig.clientId || ''}
                    onChange={(e) =>
                      setCustomConfig({ ...customConfig, clientId: e.target.value })
                    }
                    placeholder="your-client-id.apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client Secret (Optional)
                  </label>
                  <input
                    type="password"
                    value={customConfig.clientSecret || ''}
                    onChange={(e) =>
                      setCustomConfig({ ...customConfig, clientSecret: e.target.value })
                    }
                    placeholder="your-client-secret"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                  <strong>Note:</strong> You'll need to create a Google Cloud project and enable the Drive API.
                </p>
                <p>Redirect URI: {typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/google/callback</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Info */}
      {connected && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Scopes:</strong> Read-only access to Google Drive files and documents
          </p>
          <p className="mt-1">Your credentials are encrypted and stored locally in your browser.</p>
        </div>
      )}
    </div>
  )
}
