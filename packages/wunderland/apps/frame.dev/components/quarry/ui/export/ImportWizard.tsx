/**
 * Import Wizard Component
 * @module components/quarry/ui/ImportWizard
 *
 * Multi-step wizard for importing content from various sources.
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FolderOpen,
  Cloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Notebook,
} from 'lucide-react'
import { FormatCard, FormatCardGrid } from '../misc/FormatCard'
import { GoogleDriveIntegration } from '../integrations/GoogleDriveIntegration'
import type { ImportFormat, ImportOptions } from '@/lib/import-export/core/types'
import { getImportManager } from '@/lib/import-export/core/ImportManager'
import { enqueueJob, subscribeToJobs } from '@/lib/jobs/jobQueue'
import type { JobType } from '@/lib/jobs/types'

// ============================================================================
// TYPES
// ============================================================================

type Step = 'source' | 'configure' | 'preview' | 'import'

export interface ImportWizardProps {
  /** Whether the wizard is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Callback when import completes */
  onComplete?: () => void
}

interface SourceOption {
  id: ImportFormat
  name: string
  description: string
  icon: typeof Upload
  color: 'blue' | 'amber' | 'green' | 'purple' | 'pink' | 'cyan'
  badge?: string
}

// ============================================================================
// SOURCE OPTIONS
// ============================================================================

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Vault',
    description: 'Import markdown files from an Obsidian vault (ZIP)',
    icon: FolderOpen,
    color: 'purple',
  },
  {
    id: 'notion',
    name: 'Notion Export',
    description: 'Import pages from a Notion export (ZIP)',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'evernote',
    name: 'Evernote',
    description: 'Import notes from an Evernote ENEX export',
    icon: Notebook,
    color: 'green',
  },
  {
    id: 'google-docs',
    name: 'Google Drive',
    description: 'Import documents from Google Drive folder',
    icon: Cloud,
    color: 'amber',
    badge: 'OAuth',
  },
  {
    id: 'markdown',
    name: 'Markdown Files',
    description: 'Import standard markdown files',
    icon: FileText,
    color: 'cyan',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function ImportWizard({ open, onClose, onComplete }: ImportWizardProps) {
  const [step, setStep] = useState<Step>('source')
  const [selectedSource, setSelectedSource] = useState<ImportFormat | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [googleFolderId, setGoogleFolderId] = useState('')
  const [googleConnected, setGoogleConnected] = useState(false)
  const [options, setOptions] = useState<Partial<ImportOptions>>({
    conflictResolution: 'ask',
    preserveStructure: true,
    importUserData: true,
  })
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setStep('source')
    setSelectedSource(null)
    setFiles(null)
    setGoogleFolderId('')
    setOptions({
      conflictResolution: 'ask',
      preserveStructure: true,
      importUserData: true,
    })
    setImporting(false)
    setProgress(0)
    setProgressMessage('')
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (!importing) {
      resetWizard()
      onClose()
    }
  }, [importing, resetWizard, onClose])

  // Handle source selection
  const handleSourceSelect = (source: ImportFormat) => {
    setSelectedSource(source)
    setError(null)
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(e.target.files)
      setError(null)
    }
  }

  // Start import
  const handleStartImport = async () => {
    if (!selectedSource) return

    setImporting(true)
    setError(null)
    setProgress(0)

    try {
      const manager = getImportManager()

      // Prepare input based on source
      let input: File | Blob | string

      if (selectedSource === 'google-docs') {
        if (!googleFolderId) {
          throw new Error('Please enter a Google Drive folder ID')
        }
        input = googleFolderId
      } else {
        if (!files || files.length === 0) {
          throw new Error('Please select a file to import')
        }
        input = files[0]
      }

      // Create import job
      const jobType = `import-${selectedSource}` as JobType
      const jobId = await enqueueJob(jobType, {
        source: selectedSource,
        files: selectedSource !== 'google-docs' && files ? Array.from(files) : undefined,
        googleFolderId: selectedSource === 'google-docs' ? googleFolderId : undefined,
        targetWeave: options.targetWeave || `${selectedSource}-import`,
        // 'ask' is not valid for background jobs, default to 'skip'
        conflictResolution: options.conflictResolution === 'ask' ? 'skip' : (options.conflictResolution || 'skip'),
        preserveStructure: options.preserveStructure ?? true,
        importUserData: options.importUserData,
        options: options.formatOptions,
      })

      if (!jobId) {
        throw new Error('Failed to create import job (duplicate detected)')
      }

      // Subscribe to job events
      const unsubscribe = subscribeToJobs((event) => {
        if (event.job.id !== jobId) return

        switch (event.type) {
          case 'job:progress':
            setProgress(event.job.progress)
            setProgressMessage(event.job.message || 'Importing...')
            break

          case 'job:completed':
            setProgress(100)
            setProgressMessage('Import complete!')
            setTimeout(() => {
              setImporting(false)
              onComplete?.()
              handleClose()
              unsubscribe()
            }, 1500)
            break

          case 'job:failed':
            setError(event.job.error || 'Import failed')
            setImporting(false)
            unsubscribe()
            break

          case 'job:cancelled':
            setError('Import cancelled')
            setImporting(false)
            unsubscribe()
            break
        }
      })
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
      setImporting(false)
    }
  }

  // Step navigation
  const canProceed = () => {
    switch (step) {
      case 'source':
        return selectedSource !== null
      case 'configure':
        if (selectedSource === 'google-docs') {
          return googleConnected && googleFolderId.trim() !== ''
        }
        return files !== null && files.length > 0
      case 'preview':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (step === 'source' && canProceed()) setStep('configure')
    else if (step === 'configure' && canProceed()) setStep('preview')
    else if (step === 'preview') {
      setStep('import')
      handleStartImport()
    }
  }

  const prevStep = () => {
    if (step === 'configure') setStep('source')
    else if (step === 'preview') setStep('configure')
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Import Content</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Step {step === 'source' ? 1 : step === 'configure' ? 2 : step === 'preview' ? 3 : 4} of 4
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={importing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Source */}
              {step === 'source' && (
                <motion.div
                  key="source"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select Import Source
                  </h3>
                  <FormatCardGrid columns={2}>
                    {SOURCE_OPTIONS.map((source) => (
                      <FormatCard
                        key={source.id}
                        name={source.name}
                        description={source.description}
                        icon={source.icon}
                        color={source.color}
                        badge={source.badge}
                        selected={selectedSource === source.id}
                        onClick={() => handleSourceSelect(source.id)}
                      />
                    ))}
                  </FormatCardGrid>
                </motion.div>
              )}

              {/* Step 2: Configure */}
              {step === 'configure' && (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configure Import</h3>

                  {selectedSource === 'google-docs' ? (
                    <div className="space-y-4">
                      <GoogleDriveIntegration
                        onConnectionChange={setGoogleConnected}
                        showCustomCredentials
                      />
                      {googleConnected && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Google Drive Folder ID
                          </label>
                          <input
                            type="text"
                            value={googleFolderId}
                            onChange={(e) => setGoogleFolderId(e.target.value)}
                            placeholder="Enter folder ID from Drive URL"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Find this in the URL: drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select File
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <input
                          type="file"
                          accept={selectedSource === 'evernote' ? '.enex,.xml' : '.zip'}
                          onChange={handleFileSelect}
                          className="hidden"
                          id="import-file"
                        />
                        <label
                          htmlFor="import-file"
                          className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                        >
                          Choose file
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {files && files.length > 0
                            ? files[0].name
                            : selectedSource === 'evernote'
                            ? 'ENEX file exported from Evernote'
                            : 'ZIP file containing your export'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Options */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">Import Options</h4>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.preserveStructure}
                        onChange={(e) =>
                          setOptions({ ...options, preserveStructure: e.target.checked })
                        }
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Preserve folder structure
                      </span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Conflict Resolution
                      </label>
                      <select
                        value={options.conflictResolution}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            conflictResolution: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ask">Ask me</option>
                        <option value="replace">Replace existing</option>
                        <option value="merge">Merge with existing</option>
                        <option value="skip">Skip existing</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Preview */}
              {step === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Import</h3>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source:</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {SOURCE_OPTIONS.find((s) => s.id === selectedSource)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">File:</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {files?.[0]?.name || googleFolderId || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preserve Structure:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {options.preserveStructure ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        On Conflict:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {options.conflictResolution}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-medium">Ready to import</p>
                        <p className="mt-1">
                          This will import your content into the Codex. You can review and edit imported items after
                          completion.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Import Progress */}
              {step === 'import' && (
                <motion.div
                  key="import"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    {importing ? (
                      <>
                        <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Importing...</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{progressMessage}</p>

                        {/* Progress Bar */}
                        <div className="mt-6 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="bg-blue-600 h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{progress}% complete</p>
                      </>
                    ) : error ? (
                      <>
                        <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Import Failed</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Import Complete!</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your content has been successfully imported.
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {step !== 'import' && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={prevStep}
                disabled={step === 'source' || importing}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={nextStep}
                disabled={!canProceed() || importing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {step === 'preview' ? 'Start Import' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
