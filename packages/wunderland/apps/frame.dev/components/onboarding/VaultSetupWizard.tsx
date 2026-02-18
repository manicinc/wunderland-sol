/**
 * Vault Setup Wizard - First-launch Onboarding
 * @module components/onboarding/VaultSetupWizard
 *
 * Step-by-step wizard for setting up the local vault folder.
 * Shown on first launch to let users choose where their markdown files are stored.
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Shield,
  HardDrive,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  showVaultPicker,
  createVault,
  isFileSystemAccessSupported,
  getDefaultVaultPath,
} from '@/lib/vault'
import {
  setFirstLaunchCompleted,
  setVaultPath,
  setVaultName,
} from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface VaultSetupWizardProps {
  /** Callback when setup is complete */
  onComplete: (handle: FileSystemDirectoryHandle) => void
  /** Callback when user skips setup (IndexedDB-only mode) */
  onSkip?: () => void
  /** Theme */
  theme?: string
}

type WizardStep = 'welcome' | 'location' | 'creating' | 'complete'

// ============================================================================
// COMPONENT
// ============================================================================

export function VaultSetupWizard({
  onComplete,
  onSkip,
  theme = 'light',
}: VaultSetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('welcome')
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vaultDisplayName, setVaultDisplayName] = useState('My Vault')

  const isDark = theme.includes('dark')
  const isSupported = isFileSystemAccessSupported()
  const defaultPath = getDefaultVaultPath()

  // Handle folder selection
  const handleSelectFolder = useCallback(async () => {
    setError(null)
    try {
      const handle = await showVaultPicker()
      if (handle) {
        setSelectedHandle(handle)
        setVaultDisplayName(handle.name || 'My Vault')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select folder')
    }
  }, [])

  // Handle vault creation
  const handleCreateVault = useCallback(async () => {
    if (!selectedHandle) return

    setIsCreating(true)
    setStep('creating')
    setError(null)

    try {
      // Create the vault structure
      const config = await createVault(selectedHandle, vaultDisplayName)

      // Save settings to database
      await setFirstLaunchCompleted(true)
      await setVaultPath(selectedHandle.name)
      await setVaultName(config.name)

      // Show success
      setStep('complete')

      // Wait a moment then complete
      setTimeout(() => {
        onComplete(selectedHandle)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
      setStep('location')
    } finally {
      setIsCreating(false)
    }
  }, [selectedHandle, vaultDisplayName, onComplete])

  // Handle skip (IndexedDB-only mode)
  const handleSkip = useCallback(async () => {
    await setFirstLaunchCompleted(true)
    onSkip?.()
  }, [onSkip])

  // Render step content
  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className={`inline-flex p-4 rounded-full mb-4 ${
                isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
              }`}>
                <Sparkles className={`w-12 h-12 ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`} />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Welcome to Quarry
              </h2>
              <p className={`text-lg ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Your local-first knowledge base
              </p>
            </div>

            <div className="space-y-4">
              <FeatureCard
                icon={<HardDrive className="w-5 h-5" />}
                title="Your Files, Your Control"
                description="All your notes are stored as markdown files on your computer, not in the cloud."
                isDark={isDark}
              />
              <FeatureCard
                icon={<Shield className="w-5 h-5" />}
                title="Survives Uninstall"
                description="Your knowledge persists even if you uninstall the app. Just point to your folder again."
                isDark={isDark}
              />
              <FeatureCard
                icon={<FolderOpen className="w-5 h-5" />}
                title="Works Everywhere"
                description="Access your notes with any text editor, sync with Git, or backup however you like."
                isDark={isDark}
              />
            </div>

            {!isSupported && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                isDark ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isDark ? 'text-amber-400' : 'text-amber-600'
                }`} />
                <div>
                  <p className={`font-medium ${
                    isDark ? 'text-amber-300' : 'text-amber-800'
                  }`}>
                    Browser Not Supported
                  </p>
                  <p className={`text-sm mt-1 ${
                    isDark ? 'text-amber-200/70' : 'text-amber-700'
                  }`}>
                    Your browser doesn&apos;t support local file access. Use Chrome, Edge, or Opera for the full experience, or continue with browser-only storage.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {!isSupported && onSkip && (
                <button
                  onClick={handleSkip}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Continue Without Vault
                </button>
              )}
              <button
                onClick={() => setStep('location')}
                disabled={!isSupported}
                className={`flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  isSupported
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-400 cursor-not-allowed text-gray-200'
                }`}
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )

      case 'location':
        return (
          <motion.div
            key="location"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className={`inline-flex p-4 rounded-full mb-4 ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <FolderOpen className={`w-12 h-12 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`} />
              </div>
              <h2 className={`text-2xl font-bold mb-2 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Choose Vault Location
              </h2>
              <p className={`${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Select where to store your knowledge base
              </p>
            </div>

            {/* Folder selection */}
            <div className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
              selectedHandle
                ? isDark
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-green-500 bg-green-50'
                : isDark
                  ? 'border-gray-600 bg-gray-800/50'
                  : 'border-gray-300 bg-gray-50'
            }`}>
              {selectedHandle ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className={`w-6 h-6 ${
                    isDark ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {selectedHandle.name}
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Folder selected
                    </p>
                  </div>
                  <button
                    onClick={handleSelectFolder}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    }`}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className={`text-sm mb-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Recommended: <code className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs">{defaultPath}</code>
                  </p>
                  <button
                    onClick={handleSelectFolder}
                    className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Choose Folder
                  </button>
                </div>
              )}
            </div>

            {/* Vault name */}
            {selectedHandle && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Vault Name
                </label>
                <input
                  type="text"
                  value={vaultDisplayName}
                  onChange={(e) => setVaultDisplayName(e.target.value)}
                  placeholder="My Vault"
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-indigo-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                />
              </div>
            )}

            {error && (
              <div className={`p-3 rounded-lg ${
                isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setStep('welcome')}
                className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleCreateVault}
                disabled={!selectedHandle || isCreating}
                className={`flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  selectedHandle && !isCreating
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-400 cursor-not-allowed text-gray-200'
                }`}
              >
                Create Vault
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )

      case 'creating':
        return (
          <motion.div
            key="creating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <Loader2 className={`w-16 h-16 mx-auto animate-spin ${
              isDark ? 'text-indigo-400' : 'text-indigo-600'
            }`} />
            <h2 className={`text-xl font-bold mt-6 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Creating Your Vault
            </h2>
            <p className={`mt-2 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Setting up folder structure...
            </p>
          </motion.div>
        )

      case 'complete':
        return (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className={`inline-flex p-4 rounded-full mb-4 ${
              isDark ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <CheckCircle className={`w-16 h-16 ${
                isDark ? 'text-green-400' : 'text-green-600'
              }`} />
            </div>
            <h2 className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Vault Created!
            </h2>
            <p className={`mt-2 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Your knowledge base is ready
            </p>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full max-w-lg mx-4 p-6 rounded-2xl shadow-2xl ${
          isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {/* Progress indicator */}
        {step !== 'creating' && step !== 'complete' && (
          <div className="flex gap-2 mb-6">
            {['welcome', 'location'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  step === s || (step === 'location' && s === 'welcome')
                    ? 'bg-indigo-600'
                    : isDark ? 'bg-gray-700' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function FeatureCard({
  icon,
  title,
  description,
  isDark,
}: {
  icon: React.ReactNode
  title: string
  description: string
  isDark: boolean
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      isDark ? 'bg-gray-800/50' : 'bg-gray-50'
    }`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${
        isDark ? 'bg-gray-700 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
      }`}>
        {icon}
      </div>
      <div>
        <h3 className={`font-medium ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h3>
        <p className={`text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {description}
        </p>
      </div>
    </div>
  )
}

export default VaultSetupWizard
