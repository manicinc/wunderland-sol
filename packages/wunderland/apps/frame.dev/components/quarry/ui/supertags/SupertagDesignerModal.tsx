/**
 * Modal wrapper for SupertagSchemaDesigner
 * @module codex/ui/SupertagDesignerModal
 *
 * @description
 * Provides a modal dialog for creating and editing supertag schemas.
 * Wraps SupertagSchemaDesigner with animation and backdrop.
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SupertagSchemaDesigner } from './SupertagSchemaDesigner'
import type { SupertagSchema } from '@/lib/supertags'

export interface SupertagDesignerModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Existing schema to edit (null for new) */
  schema?: SupertagSchema | null
  /** Callback when schema is saved */
  onSave?: (schema: SupertagSchema) => void
  /** Theme for styling */
  theme?: 'light' | 'dark'
}

export function SupertagDesignerModal({
  isOpen,
  onClose,
  schema,
  onSave,
  theme = 'dark',
}: SupertagDesignerModalProps) {
  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-2 sm:p-4"
          style={{ zIndex: 1100 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden',
              isDark
                ? 'bg-zinc-900 border border-zinc-700/50'
                : 'bg-white border border-zinc-200'
            )}
          >
            {/* Designer Content - no duplicate header */}
            <SupertagSchemaDesigner
              schema={schema}
              onSave={(saved) => {
                onSave?.(saved)
                onClose()
              }}
              onCancel={onClose}
              theme={theme}
              className="max-h-[90vh] sm:max-h-[85vh]"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default SupertagDesignerModal
