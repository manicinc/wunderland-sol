/**
 * AI Toast Container
 * @module codex/ui/AIToastContainer
 * 
 * @description
 * Renders subtle toast notifications for AI features.
 * Positioned at bottom-right, non-intrusive design.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, AlertCircle, Check, Info } from 'lucide-react'
import { subscribeToToasts, type ToastEvent, type ToastOptions } from '@/lib/ai/toast'

interface ToastItem extends ToastOptions {
  id: string
}

export default function AIToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  
  useEffect(() => {
    const unsubscribe = subscribeToToasts((event: ToastEvent) => {
      if (event.type === 'show' && event.toast) {
        setToasts(prev => {
          // Remove existing toast with same ID
          const filtered = prev.filter(t => t.id !== event.toast!.id)
          return [...filtered, event.toast as ToastItem]
        })
        
        // Auto-dismiss
        if (event.toast.duration && event.toast.duration > 0) {
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== event.toast!.id))
          }, event.toast.duration)
        }
      } else if (event.type === 'dismiss' && event.id) {
        setToasts(prev => prev.filter(t => t.id !== event.id))
      } else if (event.type === 'dismissAll') {
        setToasts([])
      }
    })
    
    return unsubscribe
  }, [])
  
  // Position map
  const getPositionClasses = (position?: string) => {
    switch (position) {
      case 'top-right': return 'top-4 right-4'
      case 'top-left': return 'top-4 left-4'
      case 'bottom-left': return 'bottom-4 left-4'
      default: return 'bottom-4 right-4'
    }
  }
  
  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    const pos = toast.position || 'bottom-right'
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(toast)
    return acc
  }, {} as Record<string, ToastItem[]>)
  
  return (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-[99999] flex flex-col gap-2 ${getPositionClasses(position)}`}
        >
          <AnimatePresence mode="popLayout">
            {positionToasts.map((toast) => (
              <Toast
                key={toast.id}
                toast={toast}
                onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INDIVIDUAL TOAST
═══════════════════════════════════════════════════════════════════════════ */

interface ToastProps {
  toast: ToastItem
  onDismiss: () => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const isDark = typeof window !== 'undefined' && 
    document.documentElement.classList.contains('dark')
  
  // Type-based styling
  const typeConfig = {
    subtle: {
      bg: isDark ? 'bg-zinc-800/95' : 'bg-white/95',
      border: isDark ? 'border-zinc-700' : 'border-zinc-200',
      text: isDark ? 'text-zinc-300' : 'text-zinc-700',
      icon: <Sparkles className="w-4 h-4 text-cyan-500" />,
    },
    info: {
      bg: isDark ? 'bg-cyan-900/95' : 'bg-cyan-50/95',
      border: isDark ? 'border-cyan-700' : 'border-cyan-200',
      text: isDark ? 'text-cyan-100' : 'text-cyan-800',
      icon: <Info className="w-4 h-4 text-cyan-500" />,
    },
    success: {
      bg: isDark ? 'bg-emerald-900/95' : 'bg-emerald-50/95',
      border: isDark ? 'border-emerald-700' : 'border-emerald-200',
      text: isDark ? 'text-emerald-100' : 'text-emerald-800',
      icon: <Check className="w-4 h-4 text-emerald-500" />,
    },
    warning: {
      bg: isDark ? 'bg-amber-900/95' : 'bg-amber-50/95',
      border: isDark ? 'border-amber-700' : 'border-amber-200',
      text: isDark ? 'text-amber-100' : 'text-amber-800',
      icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
    },
    error: {
      bg: isDark ? 'bg-red-900/95' : 'bg-red-50/95',
      border: isDark ? 'border-red-700' : 'border-red-200',
      text: isDark ? 'text-red-100' : 'text-red-800',
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    },
  }
  
  const config = typeConfig[toast.type || 'subtle']
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border
        backdrop-blur-lg max-w-sm
        ${config.bg} ${config.border}
      `}
    >
      {config.icon}
      
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.text}`}>
          {toast.message}
        </p>
      </div>
      
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className={`
            px-2 py-1 text-xs font-medium rounded-md transition-colors
            ${isDark 
              ? 'bg-white/10 hover:bg-white/20 text-white' 
              : 'bg-black/5 hover:bg-black/10 text-gray-800'
            }
          `}
        >
          {toast.action.label}
        </button>
      )}
      
      <button
        onClick={onDismiss}
        className={`
          p-1 rounded-md transition-opacity opacity-50 hover:opacity-100
          ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}
        `}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

