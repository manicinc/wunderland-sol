/**
 * Keyboard Shortcuts Modal
 * @module codex/ui/KeyboardShortcutsModal
 * 
 * @remarks
 * Beautiful reference guide for all hotkeys
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard, Search, Edit, Eye, Map, HelpCircle, Zap, PlusCircle, PenTool, Sparkles, AtSign, Calculator, Layers } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  theme?: string
}

interface Shortcut {
  key: string
  description: string
  category: 'navigation' | 'create' | 'editing' | 'view' | 'search' | 'canvas' | 'ai' | 'dynamic' | 'misc'
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { key: '/', description: 'Focus search', category: 'navigation' },
  { key: 'Esc', description: 'Close modal/panel', category: 'navigation' },
  { key: '↑/↓ or j/k', description: 'Navigate up/down', category: 'navigation' },
  { key: '←/→ or h/l', description: 'Toggle sidebar/metadata', category: 'navigation' },
  { key: 'w/s', description: 'Navigate (WASD)', category: 'navigation' },
  { key: 'Shift+↑/↓', description: 'Scroll up/down', category: 'navigation' },
  { key: 'Page Up/Down', description: 'Fast scroll', category: 'navigation' },
  { key: 'Home/End', description: 'Jump to top/bottom', category: 'navigation' },
  { key: 'gg', description: 'Jump to top (Vim)', category: 'navigation' },
  { key: 'Enter/Space', description: 'Activate/select item', category: 'navigation' },

  // Create
  { key: '⌘/Ctrl+N', description: 'New blank strand', category: 'create' },
  { key: '⌘/Ctrl+Shift+N', description: 'Open strand wizard', category: 'create' },
  { key: '⌘/Ctrl+E', description: 'Export canvas as strand', category: 'create' },

  // Editing
  { key: 'e', description: 'Open editor', category: 'editing' },
  { key: 'Ctrl+S', description: 'Save changes', category: 'editing' },
  { key: 'Ctrl+P', description: 'Publish strand', category: 'editing' },
  
  // View
  { key: 'g', description: 'Toggle knowledge graph', category: 'view' },
  { key: 'm', description: 'Toggle metadata panel', category: 'view' },
  { key: 't', description: 'Cycle theme', category: 'view' },
  { key: 'f', description: 'Toggle fullscreen', category: 'view' },
  
  // Search & Q&A
  { key: 's', description: 'Advanced search', category: 'search' },
  { key: 'q', description: 'Ask question (Q&A)', category: 'search' },
  { key: '⌘/Ctrl+Shift+R', description: 'Web Research panel', category: 'search' },
  { key: '⌘/Ctrl+Shift+C', description: 'Add citation', category: 'search' },

  // Canvas
  { key: 'd', description: 'Toggle drawing mode', category: 'canvas' },
  { key: '⌘/Ctrl+D', description: 'Quick drawing mode (from anywhere)', category: 'canvas' },
  { key: '⌘/Ctrl+S', description: 'Save canvas drawing', category: 'canvas' },
  { key: 'Long press', description: 'Open radial menu (touch)', category: 'canvas' },
  { key: 'Right-click', description: 'Open context menu', category: 'canvas' },

  // AI Features
  { key: 'Tab', description: 'Accept AI suggestion', category: 'ai' },
  { key: 'Esc', description: 'Dismiss AI suggestion', category: 'ai' },
  { key: '⌘/Ctrl+Space', description: 'Trigger AI suggestion', category: 'ai' },
  { key: '⌘/Ctrl+Shift+I', description: 'Generate image from selection', category: 'ai' },
  { key: '/image', description: 'Open image generation (slash command)', category: 'ai' },

  // Dynamic Documents (Embark-style)
  { key: '@', description: 'Insert @mention (places, dates, people, etc.)', category: 'dynamic' },
  { key: '@name', description: 'Search and link entities', category: 'dynamic' },
  { key: '/formula', description: 'Insert formula field', category: 'dynamic' },
  { key: '/map-view', description: 'Insert interactive map view', category: 'dynamic' },
  { key: '/calendar-view', description: 'Insert calendar view', category: 'dynamic' },
  { key: '/table-view', description: 'Insert data table view', category: 'dynamic' },
  { key: '/chart-view', description: 'Insert chart visualization', category: 'dynamic' },
  { key: '/list-view', description: 'Insert list view', category: 'dynamic' },
  { key: '↑/↓ in @menu', description: 'Navigate mention suggestions', category: 'dynamic' },
  { key: 'Enter', description: 'Confirm mention/view selection', category: 'dynamic' },

  // Misc
  { key: 'k', description: 'Show keyboard shortcuts', category: 'misc' },
  { key: '?', description: 'Show help panel', category: 'misc' },
  { key: ',', description: 'Open settings', category: 'misc' },
  { key: 'r', description: 'Refresh content', category: 'misc' },
]

const CATEGORY_ICONS = {
  navigation: Search,
  create: PlusCircle,
  editing: Edit,
  view: Eye,
  search: Zap,
  canvas: PenTool,
  ai: Sparkles,
  dynamic: AtSign,
  misc: HelpCircle,
}

const CATEGORY_LABELS = {
  navigation: 'Navigation',
  create: 'Create',
  editing: 'Editing',
  view: 'View',
  search: 'Search, Research & Q&A',
  canvas: 'Canvas',
  ai: 'AI Features',
  dynamic: '@Mentions, Formulas & Views',
  misc: 'Miscellaneous',
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  theme = 'light',
}: KeyboardShortcutsModalProps) {
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  const isSepia = theme.includes('sepia')

  if (!isOpen) return null

  const categories = Array.from(new Set(SHORTCUTS.map(s => s.category)))

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className={`
            relative w-full max-w-3xl mx-4 rounded-2xl shadow-2xl overflow-hidden
            ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}
            ${isTerminal ? 'terminal-border' : ''}
          `}
        >
          {/* Header */}
          <div className={`
            px-6 py-4 border-b flex items-center justify-between
            ${isDark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}
            ${isTerminal ? 'bg-black border-cyan-500' : ''}
          `}>
            <div className="flex items-center gap-3">
              <div className={`
                p-2 rounded-lg
                ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-100'}
                ${isTerminal ? 'bg-black border-2 border-cyan-500' : ''}
              `}>
                <Keyboard className={`
                  w-5 h-5
                  ${isTerminal ? 'text-cyan-500' : 'text-cyan-600 dark:text-cyan-400'}
                `} />
              </div>
              <div>
                <h2 className={`
                  text-xl font-bold
                  ${isTerminal ? 'terminal-text text-cyan-500' : ''}
                `}>
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm opacity-70">
                  Navigate faster with hotkeys
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {categories.map(category => {
                const Icon = CATEGORY_ICONS[category]
                const shortcuts = SHORTCUTS.filter(s => s.category === category)
                
                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`
                        w-4 h-4
                        ${isTerminal ? 'text-cyan-500' : 'text-cyan-600 dark:text-cyan-400'}
                      `} />
                      <h3 className={`
                        font-semibold text-sm uppercase tracking-wider
                        ${isDark ? 'text-gray-400' : 'text-gray-600'}
                        ${isTerminal ? 'text-cyan-500' : ''}
                      `}>
                        {CATEGORY_LABELS[category]}
                      </h3>
                    </div>

                    {/* Shortcuts */}
                    <div className="space-y-2">
                      {shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className={`
                            flex items-center justify-between px-4 py-3 rounded-lg
                            ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}
                            ${isTerminal ? 'bg-black/50 border border-cyan-900' : ''}
                          `}
                        >
                          <span className={`
                            text-sm
                            ${isTerminal ? 'text-amber-500' : ''}
                          `}>
                            {shortcut.description}
                          </span>
                          
                          <kbd className={`
                            px-3 py-1.5 rounded font-mono text-xs font-semibold
                            ${isDark 
                              ? 'bg-gray-700 text-gray-300 border border-gray-600' 
                              : 'bg-white text-gray-700 border border-gray-300'
                            }
                            ${isTerminal 
                              ? 'bg-black text-cyan-500 border-cyan-500' 
                              : ''
                            }
                            shadow-sm
                          `}>
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer Tip */}
          <div className={`
            px-6 py-4 border-t text-sm text-center
            ${isDark ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-gray-50'}
            ${isTerminal ? 'bg-black border-cyan-500 text-amber-500' : 'text-gray-600'}
          `}>
            💡 <strong>Pro tip:</strong> Press <kbd className="px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono text-xs">k</kbd> anytime to see these shortcuts
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

