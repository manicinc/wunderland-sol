/**
 * PostgreSQL Connection Form
 * @module components/quarry/ui/settings/connections/PostgresConnectionForm
 *
 * Form for adding/editing PostgreSQL database connections.
 * Handles secure credential storage and connection testing.
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Link2,
  Unlink2,
} from 'lucide-react'
import type { PostgresConnection, ConnectionTestResult } from '@/lib/storage/types'
import { parsePostgresConnectionString, createPostgresConnection } from '@/lib/storage/types'
import type { ConnectionManager } from '@/lib/storage/connectionManager'

// ============================================================================
// TYPES
// ============================================================================

interface PostgresConnectionFormProps {
  connection?: PostgresConnection | null
  manager: ConnectionManager | null
  onClose: () => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PostgresConnectionForm({
  connection,
  manager,
  onClose,
}: PostgresConnectionFormProps) {
  const isEditing = !!connection

  // Form state
  const [name, setName] = useState(connection?.name || '')
  const [host, setHost] = useState(connection?.host || 'localhost')
  const [port, setPort] = useState(connection?.port?.toString() || '5432')
  const [database, setDatabase] = useState(connection?.database || '')
  const [username, setUsername] = useState(connection?.username || 'postgres')
  const [password, setPassword] = useState('')
  const [ssl, setSsl] = useState(connection?.ssl ?? true)
  const [sslMode, setSslMode] = useState<string>(connection?.sslMode || 'require')
  const [schema, setSchema] = useState(connection?.schema || 'public')
  const [poolSize, setPoolSize] = useState(connection?.poolSize?.toString() || '10')

  // Connection string mode
  const [useConnectionString, setUseConnectionString] = useState(false)
  const [connectionString, setConnectionString] = useState(connection?.connectionString || '')

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse connection string
  const handleParseConnectionString = useCallback(() => {
    if (!connectionString) return

    const parsed = parsePostgresConnectionString(connectionString)
    if (parsed) {
      if (parsed.host) setHost(parsed.host)
      if (parsed.port) setPort(parsed.port.toString())
      if (parsed.database) setDatabase(parsed.database)
      if (parsed.username) setUsername(parsed.username)
      if (parsed.ssl !== undefined) setSsl(parsed.ssl)
      if (parsed.sslMode) setSslMode(parsed.sslMode)
      setError(null)
    } else {
      setError('Invalid connection string format')
    }
  }, [connectionString])

  // Toggle connection string mode
  const toggleConnectionStringMode = useCallback(() => {
    setUseConnectionString((prev) => !prev)
    setTestResult(null)
    setError(null)
  }, [])

  // Test connection
  const handleTest = useCallback(async () => {
    if (!manager) return

    setIsTesting(true)
    setTestResult(null)
    setError(null)

    try {
      // Create a temporary connection config
      const testConfig = createPostgresConnection({
        id: connection?.id || `postgres-test-${Date.now()}`,
        name: name || 'Test Connection',
        host,
        database,
        username,
        port: parseInt(port) || 5432,
        ssl,
        sslMode: sslMode as PostgresConnection['sslMode'],
        schema,
        poolSize: parseInt(poolSize) || 10,
        connectionString: useConnectionString ? connectionString : undefined,
      })

      // Add temporarily if new
      if (!connection) {
        await manager.addConnection(testConfig, password ? { password } : undefined)
      }

      // Test
      const result = await manager.testConnection(testConfig.id)
      setTestResult(result)

      // Remove temp connection if new
      if (!connection) {
        await manager.removeConnection(testConfig.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsTesting(false)
    }
  }, [
    manager,
    connection,
    name,
    host,
    port,
    database,
    username,
    password,
    ssl,
    sslMode,
    schema,
    poolSize,
    useConnectionString,
    connectionString,
  ])

  // Save connection
  const handleSave = useCallback(async () => {
    if (!manager) return
    if (!host || !database || !username) {
      setError('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const id = connection?.id || `postgres-${Date.now()}`
      const newConnection = createPostgresConnection({
        id,
        name: name || `${host}/${database}`,
        host,
        database,
        username,
        port: parseInt(port) || 5432,
        ssl,
        sslMode: sslMode as PostgresConnection['sslMode'],
        schema,
        poolSize: parseInt(poolSize) || 10,
        connectionString: useConnectionString ? connectionString : undefined,
      })

      if (connection) {
        await manager.updateConnection(id, newConnection, password ? { password } : undefined)
      } else {
        await manager.addConnection(newConnection, password ? { password } : undefined)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [
    manager,
    connection,
    name,
    host,
    port,
    database,
    username,
    password,
    ssl,
    sslMode,
    schema,
    poolSize,
    useConnectionString,
    connectionString,
    onClose,
  ])

  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {useConnectionString ? 'Connection String' : 'Individual Fields'}
        </span>
        <button
          onClick={toggleConnectionStringMode}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
        >
          {useConnectionString ? <Unlink2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {useConnectionString ? 'Use Fields' : 'Use Connection String'}
        </button>
      </div>

      {/* Connection String Mode */}
      {useConnectionString ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Connection String
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="postgresql://user:password@host:5432/database?sslmode=require"
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm"
              />
              <button
                onClick={handleParseConnectionString}
                className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Parse and fill fields"
              >
                Parse
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Paste your full PostgreSQL connection string
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Connection Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Connection Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production Database"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5432"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Database */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Database <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="quarry"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Username & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password {connection?.hasPassword && '(leave blank to keep)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* SSL Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ssl}
                  onChange={(e) => setSsl(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable SSL
                </span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                SSL Mode
              </label>
              <select
                value={sslMode}
                onChange={(e) => setSslMode(e.target.value)}
                disabled={!ssl}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="disable">Disable</option>
                <option value="require">Require</option>
                <option value="verify-ca">Verify CA</option>
                <option value="verify-full">Verify Full</option>
              </select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Schema
              </label>
              <input
                type="text"
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="public"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pool Size
              </label>
              <input
                type="number"
                value={poolSize}
                onChange={(e) => setPoolSize(e.target.value)}
                placeholder="10"
                min="1"
                max="100"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            testResult.success
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          {testResult.success ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Connection successful
                </p>
                {testResult.version && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {testResult.version} • {testResult.latencyMs}ms
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{testResult.message}</p>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleTest}
          disabled={isTesting || !host || !database || !username}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
          Test
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !host || !database || !username}
          className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Add Connection'}
        </button>
      </div>
    </div>
  )
}

