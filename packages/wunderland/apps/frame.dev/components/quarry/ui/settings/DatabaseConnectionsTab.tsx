/**
 * Database Connections Tab
 * @module components/quarry/ui/settings/DatabaseConnectionsTab
 *
 * Main settings tab for database connection management.
 * Contains three sections:
 * - Connection Manager: Add/edit/delete/test connections
 * - Backend Switcher: Switch between Local/GitHub/Postgres
 * - Sync Status Dashboard: View sync state and device registry
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  HardDrive,
  Github,
  Server,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  initConnectionManager,
  type ConnectionManager,
} from '@/lib/storage/connectionManager'
import type {
  DatabaseConnection,
  ConnectionType,
  ConnectionStatus,
  ConnectionTestResult,
} from '@/lib/storage/types'
import { getConnectionTypeLabel } from '@/lib/storage/types'
import ConnectionManagerComponent from './connections/ConnectionManager'
import BackendSwitcher from './connections/BackendSwitcher'
import SyncStatusDashboard from './connections/SyncStatusDashboard'
import { isPublicAccess, getDisabledTooltip } from '@/lib/config/publicAccess'

// ============================================================================
// TYPES
// ============================================================================

interface DatabaseConnectionsTabProps {
  className?: string
}

type ActiveSection = 'connections' | 'switcher' | 'sync'

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Section header with toggle
 */
function SectionHeader({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  badge,
}: {
  title: string
  icon: React.ElementType
  isExpanded: boolean
  onToggle: () => void
  badge?: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
          <Icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        {badge}
      </div>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </button>
  )
}

/**
 * Status badge for connection
 */
function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    disconnected: {
      icon: PowerOff,
      color: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
      label: 'Disconnected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      label: 'Connecting',
    },
    connected: {
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      label: 'Connected',
    },
    error: {
      icon: XCircle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
      label: 'Error',
    },
    syncing: {
      icon: RefreshCw,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      label: 'Syncing',
    },
  }[status]

  const IconComponent = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      <IconComponent
        className={`w-3.5 h-3.5 ${status === 'connecting' || status === 'syncing' ? 'animate-spin' : ''}`}
      />
      {config.label}
    </span>
  )
}

/**
 * Connection type icon
 */
function ConnectionTypeIcon({ type, className = '' }: { type: ConnectionType; className?: string }) {
  const icons = {
    local: HardDrive,
    github: Github,
    postgres: Server,
  }
  const IconComponent = icons[type]
  return <IconComponent className={className} />
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DatabaseConnectionsTab({ className = '' }: DatabaseConnectionsTabProps) {
  // Public access protection
  const publicMode = isPublicAccess()
  
  // State
  const [manager, setManager] = useState<ConnectionManager | null>(null)
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Section expansion
  const [expandedSections, setExpandedSections] = useState<Set<ActiveSection>>(
    new Set(['connections'])
  )

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null)

  // Testing
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Map<string, ConnectionTestResult>>(new Map())

  // Initialize connection manager
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        const mgr = await initConnectionManager()
        if (!mounted) return

        setManager(mgr)
        setConnections(mgr.getConnections())
        setActiveConnectionId(mgr.getState().activeConnectionId)
        setIsLoading(false)

        // Subscribe to changes
        mgr.subscribe((state) => {
          if (!mounted) return
          setConnections([...state.connections])
          setActiveConnectionId(state.activeConnectionId)
        })
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to initialize')
        setIsLoading(false)
      }
    }

    init()
    return () => {
      mounted = false
    }
  }, [])

  // Toggle section expansion
  const toggleSection = useCallback((section: ActiveSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // Test connection
  const handleTestConnection = useCallback(
    async (connectionId: string) => {
      if (!manager) return

      setTestingId(connectionId)
      try {
        const result = await manager.testConnection(connectionId)
        setTestResults((prev) => new Map(prev).set(connectionId, result))
      } finally {
        setTestingId(null)
      }
    },
    [manager]
  )

  // Activate connection
  const handleActivateConnection = useCallback(
    async (connectionId: string) => {
      if (!manager) return

      try {
        await manager.connect(connectionId)
      } catch (err) {
        console.error('Failed to connect:', err)
      }
    },
    [manager]
  )

  // Disconnect
  const handleDisconnect = useCallback(async () => {
    if (!manager) return
    await manager.disconnect()
  }, [manager])

  // Delete connection
  const handleDeleteConnection = useCallback(
    async (connectionId: string) => {
      if (!manager) return

      if (confirm('Are you sure you want to delete this connection?')) {
        await manager.removeConnection(connectionId)
      }
    },
    [manager]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading connections...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-300">Failed to load connections</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const activeConnection = connections.find((c) => c.id === activeConnectionId)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-500" />
            Database Connections
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your content storage backends
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={publicMode}
          title={publicMode ? getDisabledTooltip('Add connection') : undefined}
          className={`flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors ${publicMode ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-4 h-4" />
          Add Connection
        </button>
      </div>

      {/* Active Connection Banner */}
      {activeConnection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <ConnectionTypeIcon
                  type={activeConnection.type}
                  className="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {activeConnection.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getConnectionTypeLabel(activeConnection.type)} • Active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={activeConnection.status} />
              <button
                onClick={handleDisconnect}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Disconnect"
              >
                <PowerOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Connections Section */}
      <div className="space-y-2">
        <SectionHeader
          title="Saved Connections"
          icon={Database}
          isExpanded={expandedSections.has('connections')}
          onToggle={() => toggleSection('connections')}
          badge={
            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {connections.length}
            </span>
          }
        />

        <AnimatePresence>
          {expandedSections.has('connections') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ConnectionManagerComponent
                connections={connections}
                activeConnectionId={activeConnectionId}
                testingId={testingId}
                testResults={testResults}
                onTest={handleTestConnection}
                onActivate={handleActivateConnection}
                onEdit={(conn) => setEditingConnection(conn)}
                onDelete={handleDeleteConnection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Backend Switcher Section */}
      <div className="space-y-2">
        <SectionHeader
          title="Active Backend"
          icon={Power}
          isExpanded={expandedSections.has('switcher')}
          onToggle={() => toggleSection('switcher')}
        />

        <AnimatePresence>
          {expandedSections.has('switcher') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <BackendSwitcher
                connections={connections}
                activeConnectionId={activeConnectionId}
                onSwitchBackend={handleActivateConnection}
                onDisconnect={handleDisconnect}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sync Status Section */}
      <div className="space-y-2">
        <SectionHeader
          title="Sync Status"
          icon={RefreshCw}
          isExpanded={expandedSections.has('sync')}
          onToggle={() => toggleSection('sync')}
        />

        <AnimatePresence>
          {expandedSections.has('sync') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SyncStatusDashboard
                manager={manager}
                activeConnectionId={activeConnectionId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingConnection) && (
          <ConnectionFormModal
            isOpen={true}
            connection={editingConnection}
            manager={manager}
            onClose={() => {
              setShowAddModal(false)
              setEditingConnection(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// CONNECTION FORM MODAL
// ============================================================================

interface ConnectionFormModalProps {
  isOpen: boolean
  connection: DatabaseConnection | null
  manager: ConnectionManager | null
  onClose: () => void
}

function ConnectionFormModal({ isOpen, connection, manager, onClose }: ConnectionFormModalProps) {
  const isEditing = !!connection
  const [type, setType] = useState<ConnectionType>(connection?.type || 'local')

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-500" />
            {isEditing ? 'Edit Connection' : 'Add Connection'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Type Selector (only for new connections) */}
          {!isEditing && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Connection Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['local', 'github', 'postgres'] as ConnectionType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      type === t
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <ConnectionTypeIcon
                      type={t}
                      className={`w-6 h-6 mx-auto mb-2 ${
                        type === t ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        type === t
                          ? 'text-cyan-700 dark:text-cyan-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {getConnectionTypeLabel(t)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type-specific form */}
          {type === 'postgres' && (
            <PostgresConnectionFormInline
              connection={connection as any}
              manager={manager}
              onClose={onClose}
            />
          )}

          {type === 'local' && (
            <LocalConnectionFormInline
              connection={connection as any}
              manager={manager}
              onClose={onClose}
            />
          )}

          {type === 'github' && (
            <GitHubConnectionFormInline
              connection={connection as any}
              manager={manager}
              onClose={onClose}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// INLINE FORMS
// ============================================================================

import PostgresConnectionForm from './connections/PostgresConnectionForm'

function PostgresConnectionFormInline({
  connection,
  manager,
  onClose,
}: {
  connection: any
  manager: ConnectionManager | null
  onClose: () => void
}) {
  return <PostgresConnectionForm connection={connection} manager={manager} onClose={onClose} />
}

function LocalConnectionFormInline({
  connection,
  manager,
  onClose,
}: {
  connection: any
  manager: ConnectionManager | null
  onClose: () => void
}) {
  const [name, setName] = useState(connection?.name || 'Local Vault')
  const [vaultPath, setVaultPath] = useState(connection?.vaultPath || '~/Documents/Quarry')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!manager) return

    setIsSaving(true)
    try {
      const id = connection?.id || `local-${Date.now()}`
      const newConnection = {
        id,
        name,
        type: 'local' as const,
        vaultPath,
        isActive: false,
        status: 'disconnected' as const,
        createdAt: connection?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (connection) {
        await manager.updateConnection(id, newConnection)
      } else {
        await manager.addConnection(newConnection)
      }

      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Connection Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Local Vault"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Vault Path
        </label>
        <input
          type="text"
          value={vaultPath}
          onChange={(e) => setVaultPath(e.target.value)}
          placeholder="~/Documents/Quarry"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          Local folder where your Markdown files are stored
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !name}
          className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {connection ? 'Save Changes' : 'Add Connection'}
        </button>
      </div>
    </div>
  )
}

function GitHubConnectionFormInline({
  connection,
  manager,
  onClose,
}: {
  connection: any
  manager: ConnectionManager | null
  onClose: () => void
}) {
  const [name, setName] = useState(connection?.name || '')
  const [owner, setOwner] = useState(connection?.owner || '')
  const [repo, setRepo] = useState(connection?.repo || '')
  const [branch, setBranch] = useState(connection?.branch || 'main')
  const [pat, setPat] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!manager) return

    setIsSaving(true)
    try {
      const id = connection?.id || `github-${Date.now()}`
      const newConnection = {
        id,
        name: name || `${owner}/${repo}`,
        type: 'github' as const,
        owner,
        repo,
        branch,
        hasToken: !!pat || connection?.hasToken,
        isActive: false,
        status: 'disconnected' as const,
        createdAt: connection?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (connection) {
        await manager.updateConnection(id, newConnection, pat ? { pat } : undefined)
      } else {
        await manager.addConnection(newConnection, pat ? { pat } : undefined)
      }

      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Connection Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My GitHub Docs"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Owner
          </label>
          <input
            type="text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="framersai"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Repository
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="docs"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Branch
        </label>
        <input
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="main"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Personal Access Token {connection?.hasToken && '(leave blank to keep existing)'}
        </label>
        <input
          type="password"
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          Required for private repositories. Token is stored encrypted.
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !owner || !repo}
          className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {connection ? 'Save Changes' : 'Add Connection'}
        </button>
      </div>
    </div>
  )
}

