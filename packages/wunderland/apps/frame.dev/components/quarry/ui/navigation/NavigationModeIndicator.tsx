/**
 * Navigation Mode Indicator
 * @module codex/ui/NavigationModeIndicator
 * 
 * @remarks
 * Shows current navigation mode and context
 * Provides visual feedback for keyboard state
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useNavigation } from '@/components/quarry/contexts/NavigationContext'
import { 
  Search, Edit, Eye, Terminal, 
  Keyboard, FormInput, ChevronDown 
} from 'lucide-react'

const MODE_CONFIG = {
  browse: {
    icon: Eye,
    label: 'Browse',
    color: 'cyan',
    description: 'Navigate with arrows, Tab between zones',
  },
  search: {
    icon: Search,
    label: 'Search',
    color: 'purple',
    description: 'Type to search, Enter to select',
  },
  edit: {
    icon: Edit,
    label: 'Edit',
    color: 'green',
    description: 'Editing content, Esc to exit',
  },
  command: {
    icon: Terminal,
    label: 'Command',
    color: 'orange',
    description: 'Enter commands, : for more',
  },
}

interface NavigationModeIndicatorProps {
  theme?: string
}

export default function NavigationModeIndicator({ theme = 'light' }: NavigationModeIndicatorProps) {
  const { state } = useNavigation()
  const isDark = theme.includes('dark')
  const isTerminal = theme.includes('terminal')
  
  const config = MODE_CONFIG[state.mode]
  const Icon = config.icon

  // Show special states
  const showFormMode = state.activeFormField !== null
  const showDropdown = state.activeDropdown !== null
  const showModal = state.activeModal !== null

  return (
    <motion.div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[500]
        flex items-center gap-3
        px-4 py-2 rounded-full shadow-lg backdrop-blur-md
        ${isDark ? 'bg-gray-900/90 border border-gray-700' : 'bg-white/90 border border-gray-200'}
        ${isTerminal ? 'bg-black border-cyan-500' : ''}
      `}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Mode Icon */}
      <div className={`
        p-1.5 rounded-lg
        ${config.color === 'cyan' && 'bg-cyan-100 dark:bg-cyan-900/30'}
        ${config.color === 'purple' && 'bg-purple-100 dark:bg-purple-900/30'}
        ${config.color === 'green' && 'bg-green-100 dark:bg-green-900/30'}
        ${config.color === 'orange' && 'bg-orange-100 dark:bg-orange-900/30'}
        ${isTerminal ? 'bg-black border border-cyan-500' : ''}
      `}>
        <Icon className={`
          w-4 h-4
          ${config.color === 'cyan' && 'text-cyan-600 dark:text-cyan-400'}
          ${config.color === 'purple' && 'text-purple-600 dark:text-purple-400'}
          ${config.color === 'green' && 'text-green-600 dark:text-green-400'}
          ${config.color === 'orange' && 'text-orange-600 dark:text-orange-400'}
          ${isTerminal ? 'text-cyan-500' : ''}
        `} />
      </div>

      {/* Mode Label */}
      <div className="flex flex-col">
        <span className={`
          text-sm font-medium
          ${isTerminal ? 'text-cyan-500' : ''}
        `}>
          {config.label} Mode
        </span>
        <span className={`
          text-xs opacity-70
          ${isTerminal ? 'text-amber-500' : ''}
        `}>
          {config.description}
        </span>
      </div>

      {/* Special States */}
      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-700">
        {showFormMode && (
          <div className="flex items-center gap-1 text-xs">
            <FormInput className="w-3 h-3" />
            <span>{state.formMode === 'fill' ? 'Filling' : 'Tab Nav'}</span>
          </div>
        )}
        
        {showDropdown && (
          <div className="flex items-center gap-1 text-xs">
            <ChevronDown className="w-3 h-3" />
            <span>Menu Open</span>
          </div>
        )}
        
        {showModal && (
          <div className="flex items-center gap-1 text-xs">
            <Keyboard className="w-3 h-3" />
            <span>Focus Locked</span>
          </div>
        )}
      </div>

      {/* Zone Indicator */}
      <div className={`
        text-xs px-2 py-1 rounded-full
        ${isDark ? 'bg-gray-800' : 'bg-gray-100'}
        ${isTerminal ? 'bg-black border border-cyan-900' : ''}
      `}>
        Zone: <span className="font-mono">{state.focusedZone}</span>
      </div>
    </motion.div>
  )
}

/**
 * Quick Tips Component
 * Shows contextual keyboard shortcuts
 */
export function NavigationQuickTips({ theme = 'light' }: { theme?: string }) {
  const { state } = useNavigation()
  const isDark = theme.includes('dark')

  const tips = {
    browse: [
      { key: 'Tab', action: 'Next element' },
      { key: 'F6', action: 'Next zone' },
      { key: '/', action: 'Search' },
      { key: 'i', action: 'Edit' },
    ],
    search: [
      { key: 'Enter', action: 'Select' },
      { key: '↑↓', action: 'Navigate results' },
      { key: 'Esc', action: 'Cancel' },
    ],
    edit: [
      { key: 'Ctrl+S', action: 'Save' },
      { key: 'Esc', action: 'Exit edit' },
    ],
    command: [
      { key: ':', action: 'Commands' },
      { key: 'Esc', action: 'Exit' },
    ],
  }

  const currentTips = tips[state.mode]

  return (
    <div className={`
      fixed bottom-4 right-4 z-[400]
      px-4 py-3 rounded-lg shadow-lg backdrop-blur-md
      ${isDark ? 'bg-gray-900/90 border border-gray-700' : 'bg-white/90 border border-gray-200'}
      max-w-xs
    `}>
      <h4 className="text-xs font-semibold mb-2 opacity-70">Quick Tips</h4>
      <div className="space-y-1">
        {currentTips.map((tip, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <kbd className="px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono">
              {tip.key}
            </kbd>
            <span className="ml-3 opacity-70">{tip.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
