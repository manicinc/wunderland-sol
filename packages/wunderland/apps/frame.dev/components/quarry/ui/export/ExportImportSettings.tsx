/**
 * Export/Import Settings
 *
 * Comprehensive UI for importing and exporting Codex content.
 * Supports multiple formats: Obsidian, Notion, Google Docs, PDF, DOCX, etc.
 *
 * @module codex/ui/ExportImportSettings
 */

'use client'

import React, { useState } from 'react'
import {
  Download,
  Upload,
  FileArchive,
  FileText,
  File,
  FileJson,
  Cloud,
  FolderOpen,
  BookOpen,
  Sparkles,
  Info,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  Check,
} from 'lucide-react'
import { ImportWizard } from './ImportWizard'
import { ExportWizard } from './ExportWizard'
import { motion } from 'framer-motion'

// ============================================================================
// TYPES
// ============================================================================

interface ExportImportSettingsProps {
  /** Whether premium features are available */
  isPremium?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ExportImportSettings({ isPremium = false }: ExportImportSettingsProps) {
  const [importWizardOpen, setImportWizardOpen] = useState(false)
  const [exportWizardOpen, setExportWizardOpen] = useState(false)

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg">
              <FileArchive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Import & Export
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Transfer content between Codex and other tools
              </p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-cyan-900 dark:text-cyan-100">
                  Bulk Import/Export Now Available!
                </p>
                <p className="text-cyan-800 dark:text-cyan-200">
                  Import entire vaults from Obsidian, Notion, or Google Docs. Export to PDF, Word, or Markdown.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                    <Check className="w-3 h-3" /> OAuth Integration
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                    <Check className="w-3 h-3" /> Async Processing
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                    <Check className="w-3 h-3" /> Progress Tracking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Import Card */}
          <motion.button
            onClick={() => setImportWizardOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl text-left transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
                  <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Import Content
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Bring content from other tools into Codex
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Obsidian
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Notion
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Google Docs
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Markdown
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>

          {/* Export Card */}
          <motion.button
            onClick={() => setExportWizardOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 rounded-2xl text-left transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition-colors">
                  <Download className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Export Content
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Save Codex content in various formats
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      PDF
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Word (DOCX)
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      Markdown
                    </span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      JSON
                    </span>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        </div>

        {/* Import Formats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Supported Import Formats
            </h4>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* Obsidian */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Obsidian Vault
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Import entire vaults with wiki links, tags, and folder structure preserved
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                      <Check className="w-3 h-3" /> Wiki Links
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                      <Check className="w-3 h-3" /> Frontmatter
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                      <Check className="w-3 h-3" /> Tags
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notion */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Notion Export
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Import pages and databases from Notion HTML/Markdown exports
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                      <Check className="w-3 h-3" /> Hierarchy
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                      <Check className="w-3 h-3" /> Databases
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Docs */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    Google Drive
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-medium text-amber-700 dark:text-amber-300">
                      OAuth
                    </span>
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Connect and import Google Docs from Drive folders
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
                      <Check className="w-3 h-3" /> Auto-sync
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
                      <Check className="w-3 h-3" /> Encrypted
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Markdown */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Markdown Files
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Import standard markdown files with YAML frontmatter
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 rounded text-xs text-cyan-700 dark:text-cyan-300">
                      <Check className="w-3 h-3" /> GFM
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 rounded text-xs text-cyan-700 dark:text-cyan-300">
                      <Check className="w-3 h-3" /> Code Blocks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Formats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Supported Export Formats
            </h4>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {/* PDF */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <File className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    PDF Document
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Professional formatted documents with pagination and TOC
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                      <Check className="w-3 h-3" /> Letter/A4
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                      <Check className="w-3 h-3" /> Syntax Highlighting
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DOCX */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <File className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Microsoft Word
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Editable .docx files compatible with Word, Google Docs
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                      <Check className="w-3 h-3" /> Editable
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
                      <Check className="w-3 h-3" /> Metadata
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Markdown ZIP */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <FileArchive className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Markdown Archive
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    ZIP with all markdown files and folder structure
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                      <Check className="w-3 h-3" /> Backup
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                      <Check className="w-3 h-3" /> Portable
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* JSON */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <FileJson className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    JSON Data
                  </h5>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Machine-readable format with complete metadata
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-300">
                      <Check className="w-3 h-3" /> Full Metadata
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-300">
                      <Check className="w-3 h-3" /> API Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Features */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Advanced Features
          </h4>

          <div className="grid gap-2">
            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded">
                <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Paginated Document View</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Toggle between continuous scroll and letter-size page view. Perfect for print preview.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">OAuth Integration</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Secure Google Drive connection with encrypted token storage. Supports custom OAuth credentials.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                <FileArchive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">GitHub PR Generation</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Auto-create pull requests for imported content. Works with or without GitHub PAT.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 mb-3">
            <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Documentation & Guides
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Learn more about import/export features and best practices
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <a
              href="/docs/import-export-guide.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">Complete Import/Export Guide</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </a>

            <a
              href="/docs/oauth-setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">Google OAuth Setup Guide</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </a>

            <a
              href="/docs/developer-guide-converters.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">Developer Guide: Custom Converters</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
            </a>
          </div>
        </div>

        {/* Info Footer */}
        <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>All import/export operations run in the background with real-time progress tracking.</p>
            <p>Large files are processed in parallel using Web Workers for optimal performance.</p>
            <p>OAuth tokens are encrypted with AES-256-GCM and stored only in your browser.</p>
          </div>
        </div>
      </div>

      {/* Wizards */}
      <ImportWizard
        open={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        onComplete={() => {
          setImportWizardOpen(false)
          // Optional: show success message
        }}
      />

      <ExportWizard
        open={exportWizardOpen}
        onClose={() => setExportWizardOpen(false)}
        onComplete={() => {
          setExportWizardOpen(false)
          // Optional: show success message
        }}
      />
    </>
  )
}
