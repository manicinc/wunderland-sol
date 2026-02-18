/**
 * Navigation Quick Tips Component
 * @module codex/ui/NavigationQuickTips
 * 
 * @remarks
 * Shows contextual keyboard shortcuts based on current mode
 */

'use client'

import React from 'react'
import { Keyboard, Command } from 'lucide-react'

interface QuickTip {
  keys: string[]
  action: string
}

const MODE_TIPS: Record<string, QuickTip[]> = {
  browse: [
    { keys: ['j', '↓'], action: 'Next item' },
    { keys: ['k', '↑'], action: 'Previous item' },
    { keys: ['Enter'], action: 'Open' },
    { keys: ['/'], action: 'Search' },
    { keys: ['?'], action: 'Help' },
  ],
  search: [
    { keys: ['Esc'], action: 'Exit search' },
    { keys: ['Enter'], action: 'Go to result' },
    { keys: ['↑', '↓'], action: 'Navigate results' },
  ],
  edit: [
    { keys: ['Esc'], action: 'Exit editor' },
    { keys: ['Ctrl+S'], action: 'Save draft' },
    { keys: ['Tab'], action: 'Switch tab' },
  ],
  command: [
    { keys: ['Esc'], action: 'Cancel' },
    { keys: ['Enter'], action: 'Execute' },
  ],
}

interface NavigationQuickTipsProps {
  mode?: string
  show?: boolean
  theme?: string
}

export default function NavigationQuickTips({ mode = 'browse', show = true, theme = 'light' }: NavigationQuickTipsProps) {
  const tips = MODE_TIPS[mode] || MODE_TIPS.browse
  const isTerminal = theme?.includes('terminal')
  const isSepia = theme?.includes('sepia')

  if (!show) return null

  const containerClasses = isTerminal
    ? 'fixed bottom-20 right-4 z-30 bg-black border-2 border-green-500 shadow-xl max-w-xs pointer-events-none'
    : isSepia
    ? 'fixed bottom-20 right-4 z-30 bg-amber-50 border-2 border-amber-700 shadow-xl max-w-xs pointer-events-none'
    : 'fixed bottom-20 right-4 z-30 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 shadow-xl max-w-xs pointer-events-none'

  return (
      <div className={containerClasses}>
        {/* Header */}
        <div className={
          isTerminal ? 'px-3 py-2 border-b border-green-500 bg-black'
          : isSepia ? 'px-3 py-2 border-b border-amber-600 bg-amber-100'
          : 'px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950'
        }>
          <div className={`flex items-center gap-2 text-xs font-semibold ${
            isTerminal ? 'text-green-400' 
            : isSepia ? 'text-amber-900'
            : 'text-gray-700 dark:text-gray-300'
          }`}>
            <Keyboard className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">{mode} Mode</span>
          </div>
        </div>

        {/* Tips */}
        <div className="p-3 space-y-1.5">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                {tip.keys.map((key, j) => (
                  <React.Fragment key={j}>
                    {j > 0 && <span className={
                      isTerminal ? 'text-green-600 mx-0.5'
                      : isSepia ? 'text-amber-600 mx-0.5'
                      : 'text-gray-400 mx-0.5'
                    }>or</span>}
                    <kbd className={
                      isTerminal ? 'px-1.5 py-0.5 bg-black border border-green-500 text-green-400 font-mono text-[10px]'
                      : isSepia ? 'px-1.5 py-0.5 bg-amber-50 border border-amber-700 text-amber-900 font-mono text-[10px]'
                      : 'px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 font-mono text-[10px]'
                    }>
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
              <span className={
                isTerminal ? 'text-green-300 ml-3'
                : isSepia ? 'text-amber-800 ml-3'
                : 'text-gray-600 dark:text-gray-400 ml-3'
              }>{tip.action}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={
          isTerminal ? 'px-3 py-2 border-t border-green-500 bg-black'
          : isSepia ? 'px-3 py-2 border-t border-amber-600 bg-amber-100'
          : 'px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950'
        }>
          <p className={`text-[10px] flex items-center gap-1 ${
            isTerminal ? 'text-green-400'
            : isSepia ? 'text-amber-700'
            : 'text-gray-500 dark:text-gray-400'
          }`}>
            <Command className="w-3 h-3" />
            Press <kbd className={
              isTerminal ? 'px-1 py-0.5 bg-black border border-green-500 text-green-400 font-mono mx-1'
              : isSepia ? 'px-1 py-0.5 bg-amber-50 border border-amber-700 text-amber-900 font-mono mx-1'
              : 'px-1 py-0.5 bg-gray-200 dark:bg-gray-700 font-mono mx-1'
            }>?</kbd> for all shortcuts
          </p>
        </div>
      </div>
  )
}

