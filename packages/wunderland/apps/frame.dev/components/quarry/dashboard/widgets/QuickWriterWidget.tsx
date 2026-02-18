/**
 * Quick Writer Widget
 * @module components/quarry/dashboard/widgets/QuickWriterWidget
 *
 * Dashboard widget wrapper for the embeddable WYSIWYG WriterWidget.
 * Provides a compact writing interface for quick notes and strands.
 */

'use client'

import React, { Suspense, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { PenLine, Maximize2, X } from 'lucide-react'
import type { WidgetProps } from '../types'
import type { ThemeName } from '@/types/theme'

// ============================================================================
// DYNAMIC IMPORT
// ============================================================================

const WriterWidget = dynamic(
  () => import('../../ui/writer/WriterWidget').then(mod => mod.WriterWidget),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    ),
  }
)

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickWriterWidget({ theme, size, onNavigate }: WidgetProps) {
  const isDark = theme?.includes('dark') ?? false
  const [isExpanded, setIsExpanded] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  // Determine height based on widget size
  const getMinHeight = useCallback(() => {
    switch (size) {
      case 'small':
        return 120
      case 'large':
        return 400
      default:
        return 200
    }
  }, [size])

  const handlePublish = useCallback((strandPath: string) => {
    // Navigate to the new strand
    onNavigate(`/quarry/strand/${strandPath}`)
    setShowEditor(false)
  }, [onNavigate])

  const handleOpenFull = useCallback(() => {
    onNavigate('/quarry/write')
  }, [onNavigate])

  // Compact mode - just show trigger button
  if (size === 'small' && !showEditor) {
    return (
      <div
        className={`
          h-full flex flex-col items-center justify-center p-4 rounded-xl
          cursor-pointer transition-all duration-200
          ${isDark
            ? 'bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 hover:from-zinc-800/70 hover:to-zinc-900/70'
            : 'bg-gradient-to-br from-zinc-50 to-white hover:from-zinc-100 hover:to-zinc-50'
          }
        `}
        onClick={() => setShowEditor(true)}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`
            p-4 rounded-2xl mb-2
            ${isDark
              ? 'bg-cyan-500/10 text-cyan-400'
              : 'bg-cyan-100 text-cyan-600'
            }
          `}
        >
          <PenLine className="w-6 h-6" />
        </motion.div>
        <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          Quick Write
        </span>
        <span className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Click to start
        </span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - only show in compact states */}
      {!showEditor && (
        <div
          className={`
            flex items-center justify-between px-3 py-2 border-b
            ${isDark ? 'border-zinc-800' : 'border-zinc-100'}
          `}
        >
          <div className="flex items-center gap-2">
            <PenLine className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              Quick Writer
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenFull}
              title="Open full editor"
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                }
              `}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {showEditor ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  </div>
                }
              >
                <WriterWidget
                  theme={theme as ThemeName}
                  size={size === 'large' ? 'expanded' : 'compact'}
                  showHeader={true}
                  resizable={false}
                  minHeight={getMinHeight()}
                  onClose={() => setShowEditor(false)}
                  onPublish={handlePublish}
                />
              </Suspense>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`
                h-full flex flex-col items-center justify-center p-4
                cursor-pointer transition-colors
                ${isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}
              `}
              onClick={() => setShowEditor(true)}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  p-5 rounded-2xl mb-3
                  ${isDark
                    ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 text-cyan-400'
                    : 'bg-gradient-to-br from-cyan-100 to-blue-100 text-cyan-600'
                  }
                `}
              >
                <PenLine className="w-8 h-8" />
              </motion.div>
              <span className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Start Writing
              </span>
              <span className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Create a quick note or strand
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default QuickWriterWidget

