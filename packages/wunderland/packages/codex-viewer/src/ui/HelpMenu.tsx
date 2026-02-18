/**
 * Help menu with tutorial options
 * @module codex/ui/HelpMenu
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, Book, Search, GitPullRequest, CheckCircle, RotateCcw } from 'lucide-react'
import { TUTORIALS, type TutorialId } from '../tutorials'
import { isTutorialCompleted, resetAllTutorials } from './TutorialTour'

interface HelpMenuProps {
  /** Start a tutorial */
  onStartTutorial: (tutorialId: TutorialId) => void
}

/**
 * Floating help button with tutorial menu
 * 
 * @example
 * ```tsx
 * <HelpMenu onStartTutorial={(id) => setActiveTutorial(id)} />
 * ```
 */
export default function HelpMenu({ onStartTutorial }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const icons: Record<TutorialId, any> = {
    'getting-started': Book,
    'advanced-search': Search,
    'contributing': GitPullRequest,
  }

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-16 right-0 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
              <h3 className="text-lg font-bold">Tutorials & Help</h3>
              <p className="text-sm opacity-90">Interactive guides to get you started</p>
            </div>

            {/* Tutorial list */}
            <div className="p-2">
              {Object.values(TUTORIALS).map((tutorial) => {
                const Icon = icons[tutorial.id]
                const isCompleted = isTutorialCompleted(tutorial.id)

                return (
                  <button
                    key={tutorial.id}
                    onClick={() => {
                      onStartTutorial(tutorial.id)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors text-left group"
                  >
                    <div className={`p-2 rounded-lg ${
                      isCompleted
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 group-hover:bg-gray-300 dark:group-hover:bg-gray-700'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {tutorial.title}
                        </h4>
                        {isCompleted && (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {tutorial.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {tutorial.steps.length} steps • {Math.ceil(tutorial.steps.length * 0.5)} min
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  if (confirm('Reset all tutorial progress? You can retake any tutorial from the beginning.')) {
                    resetAllTutorials()
                    setIsOpen(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Progress</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help button */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors ${
          isOpen
            ? 'bg-cyan-600 dark:bg-cyan-500 text-white'
            : 'bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Help & Tutorials"
      >
        <HelpCircle className="w-7 h-7" />
      </motion.button>
    </div>
  )
}

