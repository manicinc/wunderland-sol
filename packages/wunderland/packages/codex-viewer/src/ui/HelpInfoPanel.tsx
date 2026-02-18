/**
 * Help & Info panel with keyboard shortcuts and tips
 * @module codex/ui/HelpInfoPanel
 * 
 * @remarks
 * - Keyboard shortcuts reference card
 * - Search tips and limitations
 * - Quick start guide
 * - Pro tips for power users
 * - Links to docs and community
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { X, Keyboard, Search, Zap, Book, ExternalLink, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface HelpInfoPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Close panel callback */
  onClose: () => void
}

/**
 * Help & Info side panel with keyboard shortcuts and tips
 * 
 * @example
 * ```tsx
 * <HelpInfoPanel
 *   isOpen={helpOpen}
 *   onClose={() => setHelpOpen(false)}
 * />
 * ```
 */
export default function HelpInfoPanel({ isOpen, onClose }: HelpInfoPanelProps) {
  if (!isOpen) return null

  const shortcuts = [
    { key: 'm', action: 'Toggle metadata panel', category: 'Navigation' },
    { key: '/', action: 'Focus search input', category: 'Search' },
    { key: 'b', action: 'Toggle bookmarks panel', category: 'Bookmarks' },
    { key: ',', action: 'Open preferences', category: 'Settings' },
    { key: 's', action: 'Toggle sidebar (mobile)', category: 'Navigation' },
    { key: 'g h', action: 'Go to home', category: 'Navigation' },
    { key: 'Esc', action: 'Clear search / Close modals', category: 'General' },
    { key: '↑ ↓', action: 'Navigate results', category: 'Search' },
  ]

  const tips = [
    {
      icon: Search,
      title: 'Hybrid search (BM25 + semantic)',
      description:
        "Type a query, then toggle the Semantic button to re-rank with on-device MiniLM embeddings. It's all local—no servers, no telemetry.",
      color: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      icon: Zap,
      title: 'All data stays in your browser',
      description: 'Bookmarks, history, and preferences are stored locally. No tracking, no telemetry, GDPR compliant.',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      icon: Book,
      title: 'GitHub PAT for higher limits',
      description: 'Set GH_PAT env var to get 5,000 API requests/hour instead of 60. Free and optional.',
      color: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help & Info</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close help panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quick reference for keyboard shortcuts, tips, and getting started
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              <Keyboard className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {shortcut.action}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-xs font-mono border-2 border-gray-700 dark:border-gray-300">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* Pro Tips */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Pro Tips
            </h3>
            <div className="space-y-4">
              {tips.map((tip, index) => {
                const Icon = tip.icon
                return (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${tip.color}`} />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {tip.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Quick Start */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Quick Start
            </h3>
            <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Browse the knowledge tree in the left sidebar (Tree or Outline view)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Search for content by name using the search bar (press / to focus)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Press ′b′ to bookmark files for quick access later</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>Toggle metadata panel (press ′m′) to see tags, backlinks, and relations</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span>Customize your experience in Settings (press ′,′)</span>
              </li>
            </ol>
          </section>

          {/* Useful Links */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Useful Links
            </h3>
            <div className="space-y-2">
              <a
                href="https://github.com/framersai/codex"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">GitHub Repository</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <a
                href="https://openstrand.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">OpenStrand Schema</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
              <Link
                href="/codex/architecture"
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">Architecture Guide</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </Link>
              <a
                href="https://discord.gg/VXXC4SJMKh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 hover:from-cyan-100 hover:to-blue-100 dark:hover:from-cyan-900/20 dark:hover:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-gray-700 dark:text-gray-300 font-semibold">Join Discord Community</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> to toggle this panel
          </p>
        </div>
      </motion.div>
    </>
  )
}

