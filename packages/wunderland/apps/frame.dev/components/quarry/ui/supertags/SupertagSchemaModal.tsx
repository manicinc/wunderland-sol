/**
 * Supertag Schema Modal
 * @module codex/ui/SupertagSchemaModal
 *
 * @description
 * Slide-in drawer modal for creating and editing supertag schemas.
 * Wraps SupertagSchemaDesigner in an animated modal overlay.
 *
 * @features
 * - Slide-in from right animation
 * - Backdrop click to close
 * - Escape key to close
 * - Responsive width
 */

'use client'

import React, { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SupertagSchemaDesigner } from './SupertagSchemaDesigner'
import type { SupertagSchema } from '@/lib/supertags/types'

interface SupertagSchemaModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Existing schema to edit (null for creating new) */
  schema?: SupertagSchema | null
  /** Callback after saving successfully */
  onSave?: (schema: SupertagSchema) => void
  /** Theme for styling */
  theme?: string
}

const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

export function SupertagSchemaModal({
  isOpen,
  onClose,
  schema,
  onSave,
  theme = 'dark',
}: SupertagSchemaModalProps) {
  const isDark = DARK_THEMES.includes(theme)

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSave = useCallback((savedSchema: SupertagSchema) => {
    onSave?.(savedSchema)
    onClose()
  }, [onSave, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed inset-0 z-[200]',
              isDark ? 'bg-black/60' : 'bg-black/40',
              'backdrop-blur-sm'
            )}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.8 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDragEnd={(_, info) => {
              // Close if dragged more than 150px to the right or with velocity
              if (info.offset.x > 150 || info.velocity.x > 500) {
                onClose()
              }
            }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[201]',
              'w-full sm:w-[480px] md:w-[540px] lg:w-[600px]',
              'max-w-full',
              'flex flex-col',
              'shadow-2xl',
              isDark
                ? 'bg-zinc-900 border-l border-zinc-800'
                : 'bg-white border-l border-zinc-200'
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="supertag-modal-title"
          >
            {/* Mobile close button - visible only on small screens */}
            <div className={cn(
              'sm:hidden flex items-center justify-between px-4 py-3 border-b',
              isDark ? 'border-zinc-800' : 'border-zinc-200'
            )}>
              <h2
                id="supertag-modal-title"
                className={cn(
                  'text-sm font-semibold',
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                )}
              >
                {schema ? 'Edit Supertag' : 'Create Supertag'}
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  'p-2 -mr-2 rounded-lg transition-colors',
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400'
                    : 'hover:bg-zinc-100 text-zinc-500'
                )}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Designer content */}
            <div className="flex-1 overflow-hidden">
              <SupertagSchemaDesigner
                schema={schema}
                onSave={handleSave}
                onCancel={onClose}
                theme={isDark ? 'dark' : 'light'}
              />
            </div>

            {/* Drag indicator for mobile */}
            <div
              className={cn(
                'sm:hidden absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-full opacity-50',
                isDark ? 'bg-zinc-600' : 'bg-zinc-300'
              )}
              aria-hidden="true"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SupertagSchemaModal
