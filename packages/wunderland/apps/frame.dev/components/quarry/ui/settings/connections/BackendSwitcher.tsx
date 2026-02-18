/**
 * Backend Switcher Component
 * @module components/quarry/ui/settings/connections/BackendSwitcher
 *
 * Radio button group for switching between storage backends.
 * Shows confirmation dialog before switching to prevent data loss.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HardDrive,
  Github,
  Server,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Power,
  PowerOff,
  ArrowRight,
} from 'lucide-react'
import type { DatabaseConnection, ConnectionType } from '@/lib/storage/types'
import { getConnectionTypeLabel } from '@/lib/storage/types'
import { isPublicAccess, getDisabledTooltip } from '@/lib/config/publicAccess'

// ============================================================================
// TYPES
// ============================================================================

interface BackendSwitcherProps {
  connections: DatabaseConnection[]
  activeConnectionId: string | null
  onSwitchBackend: (connectionId: string) => Promise<void>
  onDisconnect: () => Promise<void>
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ConnectionTypeIcon({ type, className = '' }: { type: ConnectionType; className?: string }) {
  const icons = {
    local: HardDrive,
    github: Github,
    postgres: Server,
  }
  const IconComponent = icons[type]
  return <IconComponent className={className} />
}

function getConnectionSummary(connection: DatabaseConnection): string {
  switch (connection.type) {
    case 'local':
      return connection.vaultPath
    case 'github':
      return `${connection.owner}/${connection.repo}`
    case 'postgres':
      return `${connection.host}:${connection.port}/${connection.database}`
    default:
      return ''
  }
}

// ============================================================================
// CONFIRMATION MODAL
// ============================================================================

interface ConfirmSwitchModalProps {
  isOpen: boolean
  fromConnection: DatabaseConnection | null
  toConnection: DatabaseConnection
  isSwitching: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmSwitchModal({
  isOpen,
  fromConnection,
  toConnection,
  isSwitching,
  onConfirm,
  onCancel,
}: ConfirmSwitchModalProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !isSwitching && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Switch Storage Backend?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This will change where your content is stored
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Visual transition */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {fromConnection ? (
              <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <ConnectionTypeIcon
                  type={fromConnection.type}
                  className="w-8 h-8 text-gray-400 mb-2"
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {fromConnection.name}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <PowerOff className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  No connection
                </span>
              </div>
            )}

            <ArrowRight className="w-6 h-6 text-gray-400" />

            <div className="flex flex-col items-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl border-2 border-cyan-200 dark:border-cyan-800">
              <ConnectionTypeIcon
                type={toConnection.type}
                className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-2"
              />
              <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                {toConnection.name}
              </span>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              What happens when you switch:
            </h4>
            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                Content will be loaded from the new backend
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                Unsaved changes may be lost
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                Search index will be rebuilt
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSwitching}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSwitching}
              className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSwitching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  Switch Backend
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BackendSwitcher({
  connections,
  activeConnectionId,
  onSwitchBackend,
  onDisconnect,
}: BackendSwitcherProps) {
  const [pendingConnection, setPendingConnection] = useState<DatabaseConnection | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const publicMode = isPublicAccess()

  const activeConnection = connections.find((c) => c.id === activeConnectionId) || null

  const handleSelectConnection = useCallback(
    (connection: DatabaseConnection) => {
      if (connection.id === activeConnectionId) return

      // Show confirmation modal
      setPendingConnection(connection)
    },
    [activeConnectionId]
  )

  const handleConfirmSwitch = useCallback(async () => {
    if (!pendingConnection) return

    setIsSwitching(true)
    try {
      await onSwitchBackend(pendingConnection.id)
      setPendingConnection(null)
    } finally {
      setIsSwitching(false)
    }
  }, [pendingConnection, onSwitchBackend])

  const handleCancelSwitch = useCallback(() => {
    if (!isSwitching) {
      setPendingConnection(null)
    }
  }, [isSwitching])

  if (connections.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl">
        <PowerOff className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No connections available. Add a connection to get started.
        </p>
      </div>
    )
  }

  // Group connections by type
  const groupedConnections = connections.reduce(
    (acc, conn) => {
      if (!acc[conn.type]) acc[conn.type] = []
      acc[conn.type].push(conn)
      return acc
    },
    {} as Record<ConnectionType, DatabaseConnection[]>
  )

  return (
    <>
      <div className="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Currently Active */}
        <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Currently Active</p>
          {activeConnection ? (
            <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <ConnectionTypeIcon
                  type={activeConnection.type}
                  className="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{activeConnection.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getConnectionSummary(activeConnection)}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-cyan-500" />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <PowerOff className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">No backend connected</p>
            </div>
          )}
        </div>

        {/* Connection Options */}
        <div className="space-y-4">
          {(['local', 'github', 'postgres'] as ConnectionType[]).map((type) => {
            const typeConnections = groupedConnections[type] || []
            if (typeConnections.length === 0) return null

            return (
              <div key={type}>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {getConnectionTypeLabel(type)}
                </p>
                <div className="space-y-2">
                  {typeConnections.map((connection) => {
                    const isActive = connection.id === activeConnectionId

                    return (
                      <button
                        key={connection.id}
                        onClick={() => handleSelectConnection(connection)}
                        disabled={isActive || publicMode}
                        title={publicMode ? getDisabledTooltip('Backend switching') : undefined}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          isActive
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/10 cursor-default'
                            : publicMode
                              ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                              : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {/* Radio */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isActive
                              ? 'border-cyan-500 bg-cyan-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        {/* Icon */}
                        <ConnectionTypeIcon
                          type={connection.type}
                          className={`w-5 h-5 ${
                            isActive
                              ? 'text-cyan-600 dark:text-cyan-400'
                              : 'text-gray-400'
                          }`}
                        />

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <p
                            className={`font-medium ${
                              isActive
                                ? 'text-cyan-700 dark:text-cyan-300'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {connection.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getConnectionSummary(connection)}
                          </p>
                        </div>

                        {/* Status */}
                        {isActive && (
                          <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                            Active
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Disconnect Button */}
        {activeConnection && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onDisconnect}
              disabled={publicMode}
              title={publicMode ? getDisabledTooltip('Disconnect') : undefined}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <PowerOff className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {pendingConnection && (
          <ConfirmSwitchModal
            isOpen={true}
            fromConnection={activeConnection}
            toConnection={pendingConnection}
            isSwitching={isSwitching}
            onConfirm={handleConfirmSwitch}
            onCancel={handleCancelSwitch}
          />
        )}
      </AnimatePresence>
    </>
  )
}


