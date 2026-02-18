/**
 * Delete Confirmation Modal for Quarry Codex
 * @module components/quarry/ui/DeleteConfirmModal
 * 
 * @description
 * A two-step confirmation modal for deleting strands, looms, and weaves.
 * Ensures users don't accidentally delete content.
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { 
  AlertTriangle, 
  X, 
  Trash2, 
  FileText, 
  Folder, 
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Z_INDEX } from '../../constants'
import { useModalAccessibility } from '@/components/quarry/hooks'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DeleteTarget {
  /** Path of the item to delete */
  path: string
  /** Display name */
  name: string
  /** Type of item */
  type: 'strand' | 'loom' | 'weave' | 'folder' | 'file'
  /** Number of children if applicable */
  childCount?: number
}

interface DeleteConfirmModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** Target to delete */
  target: DeleteTarget | null
  /** Callback when deletion is confirmed */
  onConfirm: (path: string) => void
  /** Theme for styling */
  theme?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTypeIcon(type: DeleteTarget['type']) {
  switch (type) {
    case 'strand':
    case 'file':
      return FileText
    case 'loom':
    case 'folder':
      return Folder
    case 'weave':
      return Layers
    default:
      return FileText
  }
}

function getTypeLabel(type: DeleteTarget['type']) {
  switch (type) {
    case 'strand': return 'strand'
    case 'file': return 'file'
    case 'loom': return 'loom'
    case 'folder': return 'folder'
    case 'weave': return 'weave'
    default: return 'item'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  target,
  onConfirm,
  theme = 'light',
}: DeleteConfirmModalProps) {
  // Accessibility hook
  const { backdropRef, contentRef, modalProps, handleBackdropClick } = useModalAccessibility({
    isOpen,
    onClose,
    modalId: 'delete-confirm-modal',
    trapFocus: true,
    lockScroll: true,
  })

  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const isDark = theme?.includes('dark')
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setConfirmText('')
    }
  }, [isOpen])
  
  // Handle first step confirmation
  const handleFirstConfirm = useCallback(() => {
    setStep(2)
  }, [])
  
  // Handle final deletion
  const handleFinalConfirm = useCallback(() => {
    if (target) {
      onConfirm(target.path)
      onClose()
    }
  }, [target, onConfirm, onClose])
  
  if (!isOpen || !target) return null
  
  const TypeIcon = getTypeIcon(target.type)
  const typeLabel = getTypeLabel(target.type)
  const hasChildren = target.childCount && target.childCount > 0
  const expectedText = 'delete'
  const isConfirmValid = confirmText.toLowerCase() === expectedText
  
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef as React.RefObject<HTMLDivElement>}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: Z_INDEX.MODAL - 1 }}
            onClick={handleBackdropClick}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: Z_INDEX.MODAL }}
          >
            <div
              ref={contentRef as React.RefObject<HTMLDivElement>}
              {...modalProps}
              className={`
                w-full max-w-md rounded-xl shadow-2xl overflow-hidden
                ${isDark ? 'bg-zinc-900' : 'bg-white'}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`
                px-5 py-4 border-b flex items-center justify-between
                ${isDark ? 'border-zinc-800 bg-red-950/20' : 'border-zinc-100 bg-red-50'}
              `}>
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isDark ? 'bg-red-900/40' : 'bg-red-100'}
                  `}>
                    <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <h2 id="delete-confirm-modal-title" className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      Delete {typeLabel}
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isDark 
                      ? 'hover:bg-zinc-800 text-zinc-400' 
                      : 'hover:bg-zinc-100 text-zinc-500'
                    }
                  `}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Target Info */}
                <div className={`
                  flex items-center gap-3 p-3 rounded-lg
                  ${isDark ? 'bg-zinc-800' : 'bg-zinc-50'}
                `}>
                  <TypeIcon className={`w-5 h-5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {target.name}
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      {target.path}
                    </p>
                  </div>
                </div>
                
                {/* Warning about children */}
                {hasChildren && (
                  <div className={`
                    flex items-start gap-2 p-3 rounded-lg
                    ${isDark ? 'bg-amber-900/20 border border-amber-800/50' : 'bg-amber-50 border border-amber-200'}
                  `}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                      This {typeLabel} contains <strong>{target.childCount ?? 0}</strong> item{(target.childCount ?? 0) > 1 ? 's' : ''} 
                      which will also be deleted.
                    </p>
                  </div>
                )}
                
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${step >= 1 
                      ? isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                      : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                    }
                  `}>
                    {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} />
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${step >= 2 
                      ? isDark ? 'bg-red-600 text-white' : 'bg-red-500 text-white'
                      : isDark ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-200 text-zinc-500'
                    }
                  `}>
                    2
                  </div>
                </div>
                
                {/* Step 1: Initial confirmation */}
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <p className={`text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        Are you sure you want to delete this {typeLabel}?
                        {hasChildren && ' All contents will be permanently removed.'}
                      </p>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={onClose}
                          className={`
                            flex-1 px-4 py-2.5 rounded-lg font-medium text-sm
                            border transition-colors
                            ${isDark
                              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            }
                          `}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleFirstConfirm}
                          className={`
                            flex-1 px-4 py-2.5 rounded-lg font-medium text-sm
                            text-white transition-colors
                            ${isDark
                              ? 'bg-red-700 hover:bg-red-600'
                              : 'bg-red-500 hover:bg-red-600'
                            }
                          `}
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Step 2: Type to confirm */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-4"
                    >
                      <div>
                        <p className={`text-sm mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          Type <span className="font-mono font-bold text-red-500">delete</span> to confirm:
                        </p>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder="Type 'delete' here"
                          autoFocus
                          className={`
                            w-full px-4 py-2.5 rounded-lg border text-sm
                            font-mono focus:outline-none focus:ring-2
                            ${isDark
                              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-red-500/50 focus:border-red-500'
                              : 'bg-white border-zinc-200 text-zinc-900 focus:ring-red-500/30 focus:border-red-500'
                            }
                            ${isConfirmValid 
                              ? isDark ? 'border-green-600' : 'border-green-500'
                              : ''
                            }
                          `}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && isConfirmValid) {
                              handleFinalConfirm()
                            }
                          }}
                        />
                        {isConfirmValid && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-1 mt-1 text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}
                          >
                            <Check className="w-3 h-3" />
                            Confirmed
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(1)}
                          className={`
                            flex-1 px-4 py-2.5 rounded-lg font-medium text-sm
                            border transition-colors
                            ${isDark
                              ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                              : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                            }
                          `}
                        >
                          Back
                        </button>
                        <button
                          onClick={handleFinalConfirm}
                          disabled={!isConfirmValid}
                          className={`
                            flex-1 px-4 py-2.5 rounded-lg font-medium text-sm
                            text-white transition-colors flex items-center justify-center gap-2
                            ${isConfirmValid
                              ? isDark ? 'bg-red-700 hover:bg-red-600' : 'bg-red-500 hover:bg-red-600'
                              : isDark ? 'bg-zinc-700 cursor-not-allowed' : 'bg-zinc-300 cursor-not-allowed'
                            }
                          `}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
  
  // Use portal to render modal at document root
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return modalContent
}

