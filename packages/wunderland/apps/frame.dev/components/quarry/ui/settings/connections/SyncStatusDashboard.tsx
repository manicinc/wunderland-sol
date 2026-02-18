/**
 * Sync Status Dashboard
 * @module components/quarry/ui/settings/connections/SyncStatusDashboard
 *
 * Dashboard showing:
 * - Current sync status
 * - Last sync time
 * - Pending changes
 * - Conflict count
 * - Connected devices
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  Laptop,
  Smartphone,
  Globe,
  Loader2,
  ChevronRight,
  Upload,
  XCircle,
  Monitor,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { ConnectionManager } from '@/lib/storage/connectionManager'
import type { SyncStatus, SyncDevice } from '@/lib/storage/types'

// ============================================================================
// TYPES
// ============================================================================

interface SyncStatusDashboardProps {
  manager: ConnectionManager | null
  activeConnectionId: string | null
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function DeviceIcon({ type, className = '' }: { type: string; className?: string }) {
  const icons: Record<string, React.ElementType> = {
    electron: Monitor,
    web: Globe,
    mobile: Smartphone,
    unknown: Laptop,
  }
  const IconComponent = icons[type] || Laptop
  return <IconComponent className={className} />
}

function StatusIndicator({
  status,
  size = 'md',
}: {
  status: 'connected' | 'syncing' | 'error' | 'offline'
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  const statusConfig = {
    connected: 'bg-green-500',
    syncing: 'bg-blue-500 animate-pulse',
    error: 'bg-red-500',
    offline: 'bg-gray-400',
  }

  return (
    <span
      className={`inline-block rounded-full ${sizeClasses[size]} ${statusConfig[status]}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SyncStatusDashboard({
  manager,
  activeConnectionId,
}: SyncStatusDashboardProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [devices, setDevices] = useState<SyncDevice[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDevices, setShowDevices] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load sync status
  useEffect(() => {
    if (!manager || !activeConnectionId) {
      setSyncStatus(null)
      setDevices([])
      return
    }

    // Get initial status
    const status = manager.getSyncStatus(activeConnectionId)
    if (status) {
      setSyncStatus(status)
    } else {
      // Create default status
      setSyncStatus({
        connectionId: activeConnectionId,
        isSyncing: false,
        pendingChanges: 0,
        conflictCount: 0,
      })
    }

    // Get devices
    setDevices(manager.getDevices())

    // Subscribe to status changes
    const unsubscribe = manager.onStatusChange((connId, _status) => {
      if (connId === activeConnectionId) {
        // Refresh status
        const updated = manager.getSyncStatus(connId)
        if (updated) {
          setSyncStatus(updated)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [manager, activeConnectionId])

  // Manual sync
  const handleSync = useCallback(async () => {
    if (!manager || !activeConnectionId) return

    setIsSyncing(true)
    setError(null)

    try {
      // Update status
      manager.updateSyncStatus(activeConnectionId, {
        isSyncing: true,
        message: 'Syncing...',
      })

      // Simulate sync (in real implementation, this would call actual sync)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update status
      manager.updateSyncStatus(activeConnectionId, {
        isSyncing: false,
        lastSync: new Date().toISOString(),
        message: undefined,
      })

      const updated = manager.getSyncStatus(activeConnectionId)
      if (updated) {
        setSyncStatus(updated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      manager.updateSyncStatus(activeConnectionId, {
        isSyncing: false,
      })
    } finally {
      setIsSyncing(false)
    }
  }, [manager, activeConnectionId])

  // No active connection
  if (!activeConnectionId) {
    return (
      <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl">
        <WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect to a backend to view sync status
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Sync Status Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Last Sync */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Sync</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {syncStatus?.lastSync ? formatRelativeTime(syncStatus.lastSync) : 'Never'}
          </p>
        </div>

        {/* Status */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={isSyncing ? 'syncing' : syncStatus?.isSyncing ? 'syncing' : 'connected'}
            />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {isSyncing || syncStatus?.isSyncing ? 'Syncing' : 'Connected'}
            </p>
          </div>
        </div>

        {/* Pending Changes */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {syncStatus?.pendingChanges || 0}
          </p>
        </div>

        {/* Conflicts */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Conflicts</span>
          </div>
          <p
            className={`text-lg font-semibold ${
              (syncStatus?.conflictCount || 0) > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {syncStatus?.conflictCount || 0}
          </p>
        </div>
      </div>

      {/* Sync Message */}
      {syncStatus?.message && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <p className="text-sm text-blue-700 dark:text-blue-300">{syncStatus.message}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Conflicts Warning */}
      {(syncStatus?.conflictCount || 0) > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {syncStatus?.conflictCount} conflict{(syncStatus?.conflictCount || 0) > 1 ? 's' : ''}{' '}
                need resolution
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Review and resolve before syncing
              </p>
            </div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors">
            View Conflicts
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-400 text-white rounded-lg font-medium transition-colors"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        <button
          onClick={() => setShowDevices(!showDevices)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Monitor className="w-4 h-4" />
          Devices ({devices.length})
          <motion.div animate={{ rotate: showDevices ? 90 : 0 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* Device Registry */}
      <AnimatePresence>
        {showDevices && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Connected Devices
              </h4>

              {devices.length === 0 ? (
                <div className="p-4 text-center bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No devices registered. This device will be registered on first sync.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg"
                    >
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <DeviceIcon
                          type={device.type}
                          className="w-5 h-5 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {device.name}
                          </p>
                          <StatusIndicator
                            status={device.isOnline ? 'connected' : 'offline'}
                            size="sm"
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {device.platform} • Last seen: {formatRelativeTime(device.lastSeen)}
                        </p>
                      </div>
                      {device.appVersion && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          v{device.appVersion}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => manager?.registerDevice('This Device')}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <Monitor className="w-4 h-4" />
                Register This Device
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

