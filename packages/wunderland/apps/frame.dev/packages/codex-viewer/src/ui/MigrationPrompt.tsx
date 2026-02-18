/**
 * Migration prompt UI for upgrading from localStorage to SQL storage
 * @module codex/ui/MigrationPrompt
 *
 * @remarks
 * - Shows once on first load after upgrade
 * - Displays progress bar during migration
 * - Allows user to skip (keeps data in localStorage)
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, ArrowRight, X, CheckCircle, AlertCircle } from 'lucide-react'
import {
  migrateLocalStorageToSQL,
  clearOldLocalStorage,
  getMigrationStats,
  type MigrationResult,
} from '../lib/migrationUtils'

interface MigrationPromptProps {
  /** Called after successful migration */
  onMigrate: (result: MigrationResult) => void
  /** Called when user skips migration */
  onSkip: () => void
  /** Force show the prompt (for testing) */
  forceShow?: boolean
}

/**
 * Migration prompt component
 *
 * @example
 * ```tsx
 * <MigrationPrompt
 *   onMigrate={(result) => {
 *     console.log(`Migrated ${result.bookmarks} bookmarks`);
 *     setShowMigration(false);
 *   }}
 *   onSkip={() => setShowMigration(false)}
 * />
 * ```
 */
export default function MigrationPrompt({
  onMigrate,
  onSkip,
  forceShow = false,
}: MigrationPromptProps) {
  const [migrating, setMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [stats, setStats] = useState({
    localStorageBookmarks: 0,
    localStorageHistory: 0,
    sqlBookmarks: 0,
    sqlHistory: 0,
  })

  useEffect(() => {
    getMigrationStats().then(setStats)
  }, [])

  const handleMigrate = async () => {
    setMigrating(true)
    setProgress(10)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85))
      }, 200)

      const migrationResult = await migrateLocalStorageToSQL()
      clearInterval(progressInterval)
      setProgress(95)

      if (migrationResult.success) {
        // Clear localStorage after successful migration
        await clearOldLocalStorage()
        setProgress(100)
        setResult(migrationResult)

        // Wait a bit to show success state
        setTimeout(() => {
          onMigrate(migrationResult)
        }, 1500)
      } else {
        setProgress(100)
        setResult(migrationResult)
      }
    } catch (error) {
      console.error('[Migration] Migration failed:', error)
      setResult({
        bookmarks: 0,
        history: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      setProgress(100)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  const hasMigratableData = stats.localStorageBookmarks > 0 || stats.localStorageHistory > 0

  if (!forceShow && !hasMigratableData) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Storage Upgrade</h3>
                  <p className="text-cyan-50 text-sm">Enhanced data persistence</p>
                </div>
              </div>
              {!migrating && !result && (
                <button
                  onClick={handleSkip}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Skip migration"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {!migrating && !result && (
              <>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  We're upgrading to a more powerful storage system with SQL support,
                  groupings, and advanced search.
                </p>

                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-2 text-sm">
                    Data to migrate:
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Bookmarks</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {stats.localStorageBookmarks}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                      <span>Reading History</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {stats.localStorageHistory}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleMigrate}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
                  >
                    Migrate Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="px-6 py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Skip
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Your data will remain in localStorage if you skip
                </p>
              </>
            )}

            {migrating && !result && (
              <div className="py-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
                  Migrating your data...
                </h4>

                {/* Progress Bar */}
                <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                  />
                </div>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {progress}%
                </p>
              </div>
            )}

            {result && (
              <div className="py-4">
                {result.success ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                      Migration Complete!
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Successfully migrated {result.bookmarks} bookmarks and {result.history}{' '}
                      history entries
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">
                      Migration Failed
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {result.error || 'An unknown error occurred'}
                    </p>
                    <button
                      onClick={handleSkip}
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-800 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
