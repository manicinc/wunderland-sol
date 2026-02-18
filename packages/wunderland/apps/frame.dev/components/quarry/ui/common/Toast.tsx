/**
 * Toast Notification System
 * @module codex/ui/Toast
 * 
 * @remarks
 * Lightweight toast notifications for user feedback.
 * Auto-dismisses after 3 seconds, supports manual dismiss.
 * Supports action buttons for interactive toasts.
 */

'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Info, AlertCircle, Copy, Save, Link2, CloudUpload } from 'lucide-react'
import { Z_INDEX } from '../../constants'

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'action'

interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
  actions?: ToastAction[]
  persistent?: boolean // Don't auto-dismiss
}

interface ShowToastOptions {
  message: string
  type?: ToastType
  duration?: number
  actions?: ToastAction[]
  persistent?: boolean
}

interface ToastContextValue {
  /** Show a toast */
  showToast: (message: string, type?: ToastType, duration?: number) => void
  /** Show a toast with full options */
  showToastWithOptions: (options: ShowToastOptions) => string
  /** Dismiss a specific toast */
  dismissToast: (id: string) => void
  /** Convenience helpers */
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  copied: (label?: string) => void
  saved: () => void
  linked: () => void
  /** Show unsaved changes reminder */
  unsavedChanges: (onPublish: () => void, changeCount?: number) => string
  /** Job queue helpers */
  jobStarted: (jobType: string, itemCount?: number) => string
  jobProgress: (toastId: string, progress: number, message: string) => void
  jobCompleted: (jobType: string, resultCount?: number, onView?: () => void) => void
  jobFailed: (jobType: string, error: string, onRetry?: () => void) => void
  jobCancelled: (jobType: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Toast provider component
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const showToastWithOptions = useCallback((options: ShowToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    const toast: Toast = {
      id,
      message: options.message,
      type: options.type || 'info',
      duration: options.persistent ? 0 : (options.duration || 3000),
      actions: options.actions,
      persistent: options.persistent,
    }
    
    setToasts(prev => [...prev, toast])
    
    // Auto-dismiss after duration unless persistent
    if (!options.persistent && toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, toast.duration)
    }
    
    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error', 5000), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const copied = useCallback((label = 'Copied') => showToast(`${label} to clipboard`, 'success', 2000), [showToast])
  const saved = useCallback(() => showToast('Saved successfully', 'success', 2000), [showToast])
  const linked = useCallback(() => showToast('Link copied to clipboard', 'success', 2000), [showToast])
  
  const unsavedChanges = useCallback((onPublish: () => void, changeCount = 1) => {
    return showToastWithOptions({
      message: changeCount === 1 
        ? 'You have unsaved changes' 
        : `You have ${changeCount} unsaved changes`,
      type: 'action',
      duration: 5000, // 5 seconds before auto-dismiss
      actions: [
        {
          label: 'Publish',
          onClick: onPublish,
          variant: 'primary',
        },
      ],
    })
  }, [showToastWithOptions])

  // Job queue helpers
  const jobStarted = useCallback((jobType: string, itemCount?: number) => {
    const countText = itemCount ? ` for ${itemCount} item${itemCount > 1 ? 's' : ''}` : ''
    return showToastWithOptions({
      message: `${jobType} started${countText}...`,
      type: 'info',
      duration: 3000,
    })
  }, [showToastWithOptions])

  const jobProgress = useCallback((toastId: string, progress: number, message: string) => {
    // For now, just dismiss old and show new - could be enhanced with progress bar
    dismissToast(toastId)
    showToast(`${message} (${progress}%)`, 'info', 2000)
  }, [dismissToast, showToast])

  const jobCompleted = useCallback((jobType: string, resultCount?: number, onView?: () => void) => {
    const countText = resultCount !== undefined ? ` (${resultCount} item${resultCount !== 1 ? 's' : ''})` : ''
    if (onView) {
      showToastWithOptions({
        message: `${jobType} completed${countText}`,
        type: 'success',
        duration: 5000,
        actions: [
          {
            label: 'View',
            onClick: onView,
            variant: 'primary',
          },
        ],
      })
    } else {
      showToast(`${jobType} completed${countText}`, 'success', 4000)
    }
  }, [showToast, showToastWithOptions])

  const jobFailed = useCallback((jobType: string, errorMsg: string, onRetry?: () => void) => {
    if (onRetry) {
      showToastWithOptions({
        message: `${jobType} failed: ${errorMsg}`,
        type: 'error',
        duration: 8000,
        actions: [
          {
            label: 'Retry',
            onClick: onRetry,
            variant: 'primary',
          },
        ],
      })
    } else {
      showToast(`${jobType} failed: ${errorMsg}`, 'error', 6000)
    }
  }, [showToast, showToastWithOptions])

  const jobCancelled = useCallback((jobType: string) => {
    showToast(`${jobType} cancelled`, 'warning', 3000)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ 
      showToast, 
      showToastWithOptions,
      dismissToast, 
      success, 
      error, 
      info, 
      copied, 
      saved, 
      linked,
      unsavedChanges,
      jobStarted,
      jobProgress,
      jobCompleted,
      jobFailed,
      jobCancelled,
    }}>
      {children}
      
      {/* Toast Container */}
      <div 
        className="fixed bottom-4 right-4 flex flex-col gap-2 pointer-events-none max-md:bottom-20 max-md:left-4 max-md:right-4"
        style={{ zIndex: Z_INDEX.TOAST }}
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

/**
 * No-op toast functions for when outside provider context
 */
const noOpToast: ToastContextValue = {
  showToast: () => {},
  showToastWithOptions: () => '',
  dismissToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  copied: () => {},
  saved: () => {},
  linked: () => {},
  unsavedChanges: () => '',
  jobStarted: () => '',
  jobProgress: () => {},
  jobCompleted: () => {},
  jobFailed: () => {},
  jobCancelled: () => {},
}

/**
 * Hook to access toast system
 * Returns no-op functions if used outside ToastProvider (SSR safe)
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Return no-op toast during SSR or if outside provider
    // This prevents crashes while still allowing components to call toast methods
    if (typeof window !== 'undefined') {
      console.warn('useToast called outside ToastProvider context')
    }
    return noOpToast
  }
  return context
}

/**
 * Individual toast item with optional action buttons
 */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [progress, setProgress] = useState(100)
  
  const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
    action: CloudUpload,
  }
  
  const colors = {
    success: 'bg-green-600 text-white border-green-700',
    error: 'bg-red-600 text-white border-red-700',
    info: 'bg-cyan-600 text-white border-cyan-700',
    warning: 'bg-amber-600 text-white border-amber-700',
    action: 'bg-indigo-600 text-white border-indigo-700',
  }
  
  const Icon = icons[toast.type]
  const hasActions = toast.actions && toast.actions.length > 0
  
  // Progress bar animation for auto-dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0 && !toast.persistent) {
      const startTime = Date.now()
      const endTime = startTime + toast.duration
      
      const updateProgress = () => {
        const now = Date.now()
        const remaining = Math.max(0, ((endTime - now) / toast.duration!) * 100)
        setProgress(remaining)
        
        if (remaining > 0) {
          timerRef.current = setTimeout(updateProgress, 50)
        }
      }
      
      updateProgress()
      
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }
  }, [toast.duration, toast.persistent])
  
  const handleActionClick = (action: ToastAction) => {
    action.onClick()
    onDismiss()
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`
        pointer-events-auto relative overflow-hidden
        flex flex-col rounded-lg shadow-lg border
        min-w-[280px] max-w-md
        ${colors[toast.type]}
      `}
    >
      <div className={`flex items-center gap-3 px-4 ${hasActions ? 'pt-3 pb-2' : 'py-3'}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Action Buttons */}
      {hasActions && (
        <div className="flex items-center gap-2 px-4 pb-3">
          {toast.actions!.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleActionClick(action)}
              className={`
                text-xs font-semibold px-3 py-1.5 rounded-md transition-all
                ${action.variant === 'primary' 
                  ? 'bg-white text-indigo-700 hover:bg-indigo-50' 
                  : 'bg-white/20 text-white hover:bg-white/30'}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.duration > 0 && !toast.persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <motion.div 
            className="h-full bg-white/50"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  )
}

/**
 * Convenience export for common toast actions
 */
export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type: 'success' } }))
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type: 'error' } }))
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type: 'info' } }))
    }
  },
  copied: (label = 'Copied') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `${label} to clipboard`, type: 'success' } }))
    }
  },
}

