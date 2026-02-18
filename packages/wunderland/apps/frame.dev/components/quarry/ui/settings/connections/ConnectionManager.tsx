/**
 * Connection Manager Component
 * @module components/quarry/ui/settings/connections/ConnectionManager
 *
 * Table view of saved database connections with actions:
 * - Test connection
 * - Activate/deactivate
 * - Edit
 * - Delete
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  HardDrive,
  Github,
  Server,
  Edit2,
  Trash2,
  TestTube,
  Power,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import type {
  DatabaseConnection,
  ConnectionType,
  ConnectionStatus,
  ConnectionTestResult,
} from '@/lib/storage/types'
import { getConnectionTypeLabel } from '@/lib/storage/types'

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionManagerProps {
  connections: DatabaseConnection[]
  activeConnectionId: string | null
  testingId: string | null
  testResults: Map<string, ConnectionTestResult>
  onTest: (connectionId: string) => void
  onActivate: (connectionId: string) => void
  onEdit: (connection: DatabaseConnection) => void
  onDelete: (connectionId: string) => void
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

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-500 animate-pulse',
    connected: 'bg-green-500',
    error: 'bg-red-500',
    syncing: 'bg-blue-500 animate-pulse',
  }

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    />
  )
}

function TestResultBadge({ result }: { result: ConnectionTestResult }) {
  if (result.success) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle className="w-3.5 h-3.5" />
        {result.latencyMs ? `${result.latencyMs}ms` : 'OK'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400" title={result.message}>
      <XCircle className="w-3.5 h-3.5" />
      Failed
    </span>
  )
}

function getConnectionDetails(connection: DatabaseConnection): string {
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
// MAIN COMPONENT
// ============================================================================

export default function ConnectionManager({
  connections,
  activeConnectionId,
  testingId,
  testResults,
  onTest,
  onActivate,
  onEdit,
  onDelete,
}: ConnectionManagerProps) {
  if (connections.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Server className="w-6 h-6 text-gray-400" />
        </div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No connections</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add a connection to start managing your content
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {connections.map((connection, index) => {
        const isActive = connection.id === activeConnectionId
        const isTesting = testingId === connection.id
        const testResult = testResults.get(connection.id)

        return (
          <motion.div
            key={connection.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 ${isActive ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
          >
            <div className="flex items-center gap-4">
              {/* Icon & Status */}
              <div className="relative">
                <div
                  className={`p-2.5 rounded-lg ${
                    isActive
                      ? 'bg-cyan-100 dark:bg-cyan-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <ConnectionTypeIcon
                    type={connection.type}
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <StatusDot status={connection.status} />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {connection.name}
                  </h4>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {getConnectionTypeLabel(connection.type)} • {getConnectionDetails(connection)}
                </p>
                {connection.lastConnected && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last connected: {new Date(connection.lastConnected).toLocaleDateString()}
                  </p>
                )}
                {connection.lastError && connection.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {connection.lastError}
                  </p>
                )}
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="flex-shrink-0">
                  <TestResultBadge result={testResult} />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onTest(connection.id)}
                  disabled={isTesting}
                  className="p-2 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Test connection"
                >
                  {isTesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                </button>

                {!isActive && (
                  <button
                    onClick={() => onActivate(connection.id)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Activate connection"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => onEdit(connection)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Edit connection"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDelete(connection.id)}
                  disabled={isActive}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isActive ? 'Disconnect first to delete' : 'Delete connection'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}




