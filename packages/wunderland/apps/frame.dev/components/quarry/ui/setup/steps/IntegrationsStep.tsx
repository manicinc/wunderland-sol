/**
 * Integrations Step
 * Import data from external tools
 * @module quarry/ui/setup/steps/IntegrationsStep
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Check,
  X,
  ExternalLink,
  AlertCircle,
  Loader2,
  Clock,
  FolderOpen,
  File,
} from 'lucide-react'
import { useSetupWizard } from '../SetupWizardContext'
import type { Integration, IntegrationId, ImportedItem } from '../types'

// ============================================================================
// INTEGRATION OPTIONS
// ============================================================================

const INTEGRATIONS: Integration[] = [
  {
    id: 'notion',
    name: 'Notion',
    description: 'Import pages and databases from Notion',
    icon: '📝',
    importFormat: 'HTML/Markdown export',
    instructions: 'Export your Notion workspace as HTML or Markdown, then upload the ZIP file.',
    fileTypes: ['.zip', '.html', '.md'],
    requiresAuth: false,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Import your Obsidian vault',
    icon: '💎',
    importFormat: 'Markdown files',
    instructions: 'Select your vault folder or upload markdown files directly.',
    fileTypes: ['.md', '.txt'],
    requiresAuth: false,
  },
  {
    id: 'evernote',
    name: 'Evernote',
    description: 'Import notes from Evernote',
    icon: '🐘',
    importFormat: 'ENEX export',
    instructions: 'Export your notebooks as ENEX files from Evernote.',
    fileTypes: ['.enex'],
    requiresAuth: false,
  },
  {
    id: 'google-docs',
    name: 'Google Docs',
    description: 'Import documents from Google Drive',
    icon: '📄',
    importFormat: 'Google Takeout',
    instructions: 'Use Google Takeout to export your documents, then upload the ZIP.',
    fileTypes: ['.zip', '.docx', '.html'],
    requiresAuth: false,
  },
  {
    id: 'markdown-files',
    name: 'Markdown Files',
    description: 'Import any markdown files',
    icon: '📋',
    importFormat: 'Markdown',
    instructions: 'Upload markdown files or a ZIP containing your notes.',
    fileTypes: ['.md', '.txt', '.zip'],
    requiresAuth: false,
  },
  {
    id: 'bleep',
    name: 'Bleep',
    description: 'Import from Bleep app',
    icon: '🔔',
    importFormat: 'Bleep export',
    instructions: 'Coming soon! Export your Bleep data to import here.',
    fileTypes: ['.json'],
    requiresAuth: false,
    comingSoon: true,
  },
  {
    id: 'shorthand',
    name: 'ShortHand',
    description: 'Import from ShortHand notes',
    icon: '✍️',
    importFormat: 'ShortHand export',
    instructions: 'Coming soon! Connect your ShortHand account.',
    fileTypes: ['.json'],
    requiresAuth: true,
    comingSoon: true,
  },
]

// ============================================================================
// INTEGRATION CARD
// ============================================================================

interface IntegrationCardProps {
  integration: Integration
  selected: boolean
  onToggle: () => void
  onFileSelect: (files: File[]) => void
  uploadedCount: number
}

function IntegrationCard({
  integration,
  selected,
  onToggle,
  onFileSelect,
  uploadedCount,
}: IntegrationCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFileSelect(files)
      }
    },
    [onFileSelect]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFileSelect(files)
    }
  }

  return (
    <motion.div
      whileHover={{ scale: integration.comingSoon ? 1 : 1.01 }}
      className={`
        relative rounded-xl border-2 overflow-hidden
        ${
          integration.comingSoon
            ? 'border-zinc-200 dark:border-zinc-700 opacity-60'
            : selected
              ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/5'
              : 'border-zinc-200 dark:border-zinc-700'
        }
      `}
    >
      {/* Coming Soon Badge */}
      {integration.comingSoon && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Coming Soon
        </div>
      )}

      {/* Header */}
      <button
        onClick={integration.comingSoon ? undefined : onToggle}
        disabled={integration.comingSoon}
        className={`
          w-full p-4 flex items-center gap-3 text-left
          ${integration.comingSoon ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Checkbox */}
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
            ${
              selected
                ? 'border-cyan-500 bg-cyan-500'
                : 'border-zinc-300 dark:border-zinc-600'
            }
          `}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Icon */}
        <span className="text-2xl">{integration.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            {integration.name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
            {integration.description}
          </p>
        </div>

        {/* Upload count */}
        {uploadedCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
            {uploadedCount} file{uploadedCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded section */}
      <AnimatePresence>
        {selected && !integration.comingSoon && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {/* Instructions */}
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                How to export from {integration.name}
              </button>

              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    {integration.instructions}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  p-6 rounded-lg border-2 border-dashed cursor-pointer
                  transition-colors text-center
                  ${
                    isDragging
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-cyan-400 dark:hover:border-cyan-500'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={integration.fileTypes.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload
                  className={`
                    w-8 h-8 mx-auto mb-2
                    ${isDragging ? 'text-cyan-500' : 'text-zinc-400'}
                  `}
                />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-cyan-600 dark:text-cyan-400">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {integration.fileTypes.join(', ')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// FILE PREVIEW
// ============================================================================

interface FilePreviewProps {
  files: { integration: IntegrationId; file: File }[]
  onRemove: (integration: IntegrationId, fileName: string) => void
}

function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null

  return (
    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
      <h4 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
        <FolderOpen className="w-4 h-4" />
        Uploaded Files ({files.length})
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {files.map(({ integration, file }) => (
          <div
            key={`${integration}-${file.name}`}
            className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-zinc-900"
          >
            <File className="w-4 h-4 text-zinc-400" />
            <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">
              {file.name}
            </span>
            <span className="text-xs text-zinc-400">
              {(file.size / 1024).toFixed(1)} KB
            </span>
            <button
              onClick={() => onRemove(integration, file.name)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function IntegrationsStep() {
  const {
    state,
    toggleIntegration,
    setImportConfig,
    addImportedData,
    setLoading,
    setError,
  } = useSetupWizard()
  const [uploadedFiles, setUploadedFiles] = useState<
    { integration: IntegrationId; file: File }[]
  >([])
  const [processing, setProcessing] = useState(false)

  const handleFileSelect = useCallback(
    (integration: IntegrationId, files: File[]) => {
      const newFiles = files.map((file) => ({ integration, file }))
      setUploadedFiles((prev) => [...prev, ...newFiles])

      // Update import config
      const existingFiles = state.importConfigs[integration]?.files || []
      setImportConfig(integration, {
        integrationId: integration,
        enabled: true,
        files: [...existingFiles, ...files],
        options: {
          preserveStructure: true,
          mergeTags: true,
          skipDuplicates: true,
        },
      })
    },
    [state.importConfigs, setImportConfig]
  )

  const handleRemoveFile = useCallback(
    (integration: IntegrationId, fileName: string) => {
      setUploadedFiles((prev) =>
        prev.filter(
          (f) => !(f.integration === integration && f.file.name === fileName)
        )
      )

      const existingFiles = state.importConfigs[integration]?.files || []
      setImportConfig(integration, {
        files: existingFiles.filter((f) => f.name !== fileName),
      })
    },
    [state.importConfigs, setImportConfig]
  )

  const getUploadedCountForIntegration = (id: IntegrationId) => {
    return uploadedFiles.filter((f) => f.integration === id).length
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Import your existing notes from other apps.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
          This step is optional - you can always import later.
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            selected={state.selectedIntegrations.includes(integration.id)}
            onToggle={() => toggleIntegration(integration.id)}
            onFileSelect={(files) => handleFileSelect(integration.id, files)}
            uploadedCount={getUploadedCountForIntegration(integration.id)}
          />
        ))}
      </div>

      {/* File Preview */}
      <FilePreview files={uploadedFiles} onRemove={handleRemoveFile} />

      {/* Import Options */}
      {uploadedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
        >
          <h4 className="font-medium text-zinc-900 dark:text-white mb-3">
            Import Options
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Preserve folder structure
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Merge tags from imported notes
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Skip duplicate notes
              </span>
            </label>
          </div>
        </motion.div>
      )}

      {/* Skip Message */}
      {uploadedFiles.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No files uploaded. You can skip this step and import later.
          </p>
        </div>
      )}
    </div>
  )
}
