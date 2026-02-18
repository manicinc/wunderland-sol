/**
 * Export Wizard Component
 * @module components/quarry/ui/ExportWizard
 *
 * Multi-step wizard for exporting content to various formats.
 */

'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  FileText,
  File,
  FileJson,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react'
import { FormatCard, FormatCardGrid } from '../misc/FormatCard'
import type { ExportFormat, ExportOptions } from '@/lib/import-export/core/types'
import { getExportManager } from '@/lib/import-export/core/ExportManager'

// ============================================================================
// TYPES
// ============================================================================

type Step = 'format' | 'content' | 'configure' | 'export'

export interface ExportWizardProps {
  /** Whether the wizard is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Callback when export completes */
  onComplete?: () => void
  /** Pre-selected strand paths */
  preselectedPaths?: string[]
}

interface FormatOption {
  id: ExportFormat
  name: string
  description: string
  icon: typeof FileText
  color: 'blue' | 'amber' | 'green' | 'purple' | 'pink' | 'cyan'
}

// ============================================================================
// FORMAT OPTIONS
// ============================================================================

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'markdown',
    name: 'Markdown (ZIP)',
    description: 'Export as markdown files in a ZIP archive',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'pdf',
    name: 'PDF Document',
    description: 'Export as a formatted PDF document',
    icon: File,
    color: 'red' as any,
  },
  {
    id: 'docx',
    name: 'Microsoft Word',
    description: 'Export as a .docx document',
    icon: File,
    color: 'cyan',
  },
  {
    id: 'json',
    name: 'JSON Data',
    description: 'Export with full metadata as JSON',
    icon: FileJson,
    color: 'green',
  },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function ExportWizard({ open, onClose, onComplete, preselectedPaths = [] }: ExportWizardProps) {
  const [step, setStep] = useState<Step>('format')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [contentSelection, setContentSelection] = useState<'all' | 'current' | 'custom'>('all')
  const [selectedPaths, setSelectedPaths] = useState<string[]>(preselectedPaths)
  const [options, setOptions] = useState<Partial<ExportOptions>>({
    includeMetadata: true,
    formatOptions: {
      pagination: 'letter',
      includeTOC: true,
    },
  })
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setStep('format')
    setSelectedFormat(null)
    setContentSelection('all')
    setSelectedPaths(preselectedPaths)
    setOptions({
      includeMetadata: true,
      formatOptions: {
        pagination: 'letter',
        includeTOC: true,
      },
    })
    setExporting(false)
    setProgress(0)
    setError(null)
  }, [preselectedPaths])

  const handleClose = useCallback(() => {
    if (!exporting) {
      resetWizard()
      onClose()
    }
  }, [exporting, resetWizard, onClose])

  // Handle format selection
  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format)
    setError(null)
  }

  // Start export
  const handleStartExport = async () => {
    if (!selectedFormat) return

    setExporting(true)
    setError(null)
    setProgress(0)

    try {
      const manager = getExportManager()

      const exportOptions: Partial<ExportOptions> = {
        ...options,
        format: selectedFormat,
        strandPaths: contentSelection === 'all' ? [] : selectedPaths,
      }

      // Progress callback
      const onProgress = (current: number, total: number, message?: string) => {
        setProgress(Math.round((current / total) * 100))
      }

      // Execute export
      const result = await manager.exportToBlob({
        ...exportOptions,
        onProgress,
      })

      if (result.result.success && result.blob) {
        // Trigger download
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)

        setProgress(100)
        setTimeout(() => {
          setExporting(false)
          onComplete?.()
          handleClose()
        }, 1500)
      } else {
        throw new Error(result.result.errors?.[0] || 'Export failed')
      }
    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'Export failed')
      setExporting(false)
    }
  }

  // Step navigation
  const canProceed = () => {
    switch (step) {
      case 'format':
        return selectedFormat !== null
      case 'content':
        return contentSelection !== 'custom' || selectedPaths.length > 0
      case 'configure':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (step === 'format' && canProceed()) setStep('content')
    else if (step === 'content' && canProceed()) setStep('configure')
    else if (step === 'configure') {
      setStep('export')
      handleStartExport()
    }
  }

  const prevStep = () => {
    if (step === 'content') setStep('format')
    else if (step === 'configure') setStep('content')
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Content</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Step {step === 'format' ? 1 : step === 'content' ? 2 : step === 'configure' ? 3 : 4} of 4
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={exporting}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Select Format */}
              {step === 'format' && (
                <motion.div
                  key="format"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select Export Format
                  </h3>
                  <FormatCardGrid columns={2}>
                    {FORMAT_OPTIONS.map((format) => (
                      <FormatCard
                        key={format.id}
                        name={format.name}
                        description={format.description}
                        icon={format.icon}
                        color={format.color}
                        selected={selectedFormat === format.id}
                        onClick={() => handleFormatSelect(format.id)}
                      />
                    ))}
                  </FormatCardGrid>
                </motion.div>
              )}

              {/* Step 2: Select Content */}
              {step === 'content' && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Content</h3>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <input
                        type="radio"
                        name="content"
                        value="all"
                        checked={contentSelection === 'all'}
                        onChange={() => setContentSelection('all')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">All Strands</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Export all content from the Codex
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <input
                        type="radio"
                        name="content"
                        value="current"
                        checked={contentSelection === 'current'}
                        onChange={() => setContentSelection('current')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Current Weave</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Export only the currently selected weave
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <input
                        type="radio"
                        name="content"
                        value="custom"
                        checked={contentSelection === 'custom'}
                        onChange={() => setContentSelection('custom')}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Custom Selection</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Choose specific strands to export
                        </div>
                      </div>
                    </label>
                  </div>

                  {contentSelection === 'custom' && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedPaths.length === 0
                          ? 'No strands selected'
                          : `${selectedPaths.length} strand(s) selected`}
                      </p>
                      {/* TODO: Add strand selector UI */}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Configure Options */}
              {step === 'configure' && (
                <motion.div
                  key="configure"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Options</h3>

                  {/* General Options */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">General</h4>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.includeMetadata}
                        onChange={(e) =>
                          setOptions({ ...options, includeMetadata: e.target.checked })
                        }
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Include metadata</span>
                    </label>
                  </div>

                  {/* Format-specific Options */}
                  {(selectedFormat === 'pdf' || selectedFormat === 'docx') && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">Document Options</h4>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Page Size
                        </label>
                        <select
                          value={options.formatOptions?.pagination || 'letter'}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              formatOptions: {
                                ...options.formatOptions,
                                pagination: e.target.value as 'letter' | 'a4',
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="letter">Letter (8.5" × 11")</option>
                          <option value="a4">A4 (8.27" × 11.69")</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={options.formatOptions?.includeTOC}
                          onChange={(e) =>
                            setOptions({
                              ...options,
                              formatOptions: {
                                ...options.formatOptions,
                                includeTOC: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include table of contents
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Export Summary</h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <strong>Format:</strong>{' '}
                        {FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.name}
                      </p>
                      <p>
                        <strong>Content:</strong>{' '}
                        {contentSelection === 'all'
                          ? 'All strands'
                          : contentSelection === 'current'
                            ? 'Current weave'
                            : `${selectedPaths.length} selected`}
                      </p>
                      <p>
                        <strong>Metadata:</strong> {options.includeMetadata ? 'Included' : 'Excluded'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Export Progress */}
              {step === 'export' && (
                <motion.div
                  key="export"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    {exporting ? (
                      <>
                        <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Exporting...
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Generating your export file
                        </p>

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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Export Failed</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Export Complete!
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your download should start automatically.
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {step !== 'export' && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={prevStep}
                disabled={step === 'format' || exporting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={nextStep}
                disabled={!canProceed() || exporting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {step === 'configure' ? 'Start Export' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
