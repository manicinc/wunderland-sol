/**
 * Offline Indicator Component
 * @module components/quarry/ui/common/OfflineIndicator
 * 
 * @description
 * Shows current online/offline status with visual feedback.
 * - Monitors network status
 * - Shows LLM availability
 * - Displays feature limitations when offline
 * 
 * @example
 * ```tsx
 * <OfflineIndicator 
 *   position="bottom-right"
 *   showDetails
 * />
 * ```
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, WifiOff, Cloud, CloudOff, Zap, ZapOff,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface OfflineIndicatorProps {
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline'
  /** Show expanded details */
  showDetails?: boolean
  /** Always visible or only when offline */
  alwaysVisible?: boolean
  /** Dark mode */
  isDark?: boolean
  /** Additional className */
  className?: string
  /** Compact mode */
  compact?: boolean
}

interface ConnectionStatus {
  isOnline: boolean
  isLLMAvailable: boolean
  isSyncEnabled: boolean
  lastChecked: Date
}

// ============================================================================
// HOOKS
// ============================================================================

function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isLLMAvailable: false,
    isSyncEnabled: false,
    lastChecked: new Date(),
  })

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, lastChecked: new Date() }))
      checkLLMAvailability()
    }

    const handleOffline = () => {
      setStatus(prev => ({ 
        ...prev, 
        isOnline: false, 
        isLLMAvailable: false,
        lastChecked: new Date() 
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial LLM check
    checkLLMAvailability()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check LLM availability
  const checkLLMAvailability = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    try {
      // Check localStorage for API keys
      const hasOpenAI = !!localStorage.getItem('openai_api_key')
      const hasAnthropic = !!localStorage.getItem('anthropic_api_key')
      const hasOllama = !!localStorage.getItem('ollama_enabled')
      
      setStatus(prev => ({
        ...prev,
        isLLMAvailable: hasOpenAI || hasAnthropic || hasOllama,
        lastChecked: new Date(),
      }))
    } catch {
      // Storage not available
    }
  }, [])

  return status
}

// ============================================================================
// POSITION STYLES
// ============================================================================

const positionClasses: Record<string, string> = {
  'top-left': 'fixed top-4 left-4 z-50',
  'top-right': 'fixed top-4 right-4 z-50',
  'bottom-left': 'fixed bottom-4 left-4 z-50',
  'bottom-right': 'fixed bottom-4 right-4 z-50',
  'inline': 'relative',
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OfflineIndicator({
  position = 'bottom-right',
  showDetails = false,
  alwaysVisible = false,
  isDark = false,
  className,
  compact = false,
}: OfflineIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const status = useConnectionStatus()

  // Determine if we should show the indicator
  const shouldShow = alwaysVisible || !status.isOnline || !status.isLLMAvailable

  // Feature limitations when offline
  const limitations = [
    { 
      available: status.isOnline, 
      label: 'Network Connection',
      icon: status.isOnline ? Wifi : WifiOff,
    },
    { 
      available: status.isLLMAvailable, 
      label: 'AI Features (LLM)',
      icon: status.isLLMAvailable ? Zap : ZapOff,
    },
    { 
      available: status.isOnline, 
      label: 'Cloud Sync',
      icon: status.isOnline ? Cloud : CloudOff,
    },
  ]

  const offlineFeatures = [
    'Local flashcard reviews',
    'Cached quiz questions',
    'Offline NLP generation',
    'Study progress tracking',
  ]

  // Don't render if online and not always visible
  if (!shouldShow) return null

  // Status icon and color
  const StatusIcon = status.isOnline ? Wifi : WifiOff
  const statusColor = status.isOnline 
    ? status.isLLMAvailable ? 'text-green-500' : 'text-amber-500'
    : 'text-red-500'
  const statusBg = status.isOnline
    ? status.isLLMAvailable 
      ? isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
      : isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
    : isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'

  // Compact version
  if (compact) {
    return (
      <div className={cn(positionClasses[position], className)}>
        <div className={cn(
          'p-2 rounded-lg border shadow-lg',
          statusBg
        )}>
          <StatusIcon className={cn('w-4 h-4', statusColor)} />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className={cn(positionClasses[position], className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className={cn(
        'rounded-xl border shadow-lg overflow-hidden',
        statusBg,
        isDark ? 'bg-zinc-800/95 backdrop-blur' : 'bg-white/95 backdrop-blur'
      )}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center gap-3 p-3 transition-colors',
            isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'
          )}
        >
          <StatusIcon className={cn('w-5 h-5', statusColor)} />
          
          <div className="flex-1 text-left">
            <p className={cn(
              'font-medium text-sm',
              isDark ? 'text-zinc-200' : 'text-zinc-800'
            )}>
              {status.isOnline 
                ? status.isLLMAvailable ? 'All Systems Online' : 'Limited Mode'
                : 'Offline Mode'
              }
            </p>
            <p className={cn(
              'text-xs',
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            )}>
              {status.isOnline 
                ? status.isLLMAvailable ? 'Full features available' : 'AI features unavailable'
                : 'Using cached data'
              }
            </p>
          </div>

          {isExpanded ? (
            <ChevronUp className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
          ) : (
            <ChevronDown className={cn('w-4 h-4', isDark ? 'text-zinc-400' : 'text-zinc-500')} />
          )}
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'border-t',
                isDark ? 'border-zinc-700' : 'border-zinc-200'
              )}
            >
              <div className="p-3 space-y-3">
                {/* Connection status */}
                <div className="space-y-1.5">
                  <p className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    isDark ? 'text-zinc-500' : 'text-zinc-400'
                  )}>
                    Status
                  </p>
                  {limitations.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Icon className={cn(
                          'w-3.5 h-3.5',
                          item.available ? 'text-green-500' : 'text-red-500'
                        )} />
                        <span className={cn(
                          'text-sm',
                          isDark ? 'text-zinc-300' : 'text-zinc-600'
                        )}>
                          {item.label}
                        </span>
                        {item.available ? (
                          <CheckCircle className="w-3 h-3 text-green-500 ml-auto" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500 ml-auto" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Offline features */}
                {!status.isOnline && (
                  <div className="space-y-1.5">
                    <p className={cn(
                      'text-xs font-medium uppercase tracking-wide',
                      isDark ? 'text-zinc-500' : 'text-zinc-400'
                    )}>
                      Available Offline
                    </p>
                    <ul className="space-y-1">
                      {offlineFeatures.map((feature, i) => (
                        <li key={i} className={cn(
                          'text-xs flex items-center gap-2',
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        )}>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Last checked */}
                <p className={cn(
                  'text-[10px]',
                  isDark ? 'text-zinc-600' : 'text-zinc-400'
                )}>
                  Last checked: {status.lastChecked.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ============================================================================
// INLINE BADGE VERSION
// ============================================================================

interface OfflineBadgeProps {
  isDark?: boolean
  className?: string
}

export function OfflineBadge({ isDark, className }: OfflineBadgeProps) {
  const status = useConnectionStatus()

  if (status.isOnline && status.isLLMAvailable) return null

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      !status.isOnline
        ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
        : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700',
      className
    )}>
      {status.isOnline ? <ZapOff className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {status.isOnline ? 'Limited' : 'Offline'}
    </span>
  )
}

export default OfflineIndicator

