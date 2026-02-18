/**
 * AI Writing Assistant Toggle
 * @module codex/ui/AIWritingToggle
 * 
 * @description
 * Toggle component for enabling/disabling AI writing suggestions in the editor.
 * Shows status indicator and tooltip with requirements.
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Settings, AlertCircle } from 'lucide-react'
import { getWritingAssistant } from '@/lib/ai/writingAssistant'
import { 
  useAIPreferences, 
  hasRequiredAPIKeys,
  type AIFeatureStatus 
} from '@/lib/ai'

interface AIWritingToggleProps {
  /** Dark mode */
  isDark?: boolean
  /** Compact mode */
  compact?: boolean
  /** Callback to open settings */
  onOpenSettings?: () => void
}

export default function AIWritingToggle({
  isDark = false,
  compact = false,
  onOpenSettings,
}: AIWritingToggleProps) {
  const [prefs, updatePrefs] = useAIPreferences()
  const [status, setStatus] = useState<AIFeatureStatus>('disabled')
  const [showTooltip, setShowTooltip] = useState(false)
  
  const enabled = prefs.writingAssistant.enabled
  const hasKeys = hasRequiredAPIKeys('writing')
  
  // Subscribe to assistant status
  useEffect(() => {
    const assistant = getWritingAssistant()
    const unsubscribe = assistant.onStatusChange(setStatus)
    return unsubscribe
  }, [])
  
  // Toggle enabled state
  const handleToggle = () => {
    if (!hasKeys && !enabled) {
      // Show tooltip instead of toggling
      setShowTooltip(true)
      return
    }
    updatePrefs('writingAssistant', { enabled: !enabled })
  }
  
  // Status config
  const statusConfig = {
    ready: {
      bgColor: isDark ? 'bg-emerald-900/30' : 'bg-emerald-100',
      textColor: isDark ? 'text-emerald-400' : 'text-emerald-700',
      dotColor: 'bg-emerald-500',
      label: 'Ready',
    },
    working: {
      bgColor: isDark ? 'bg-cyan-900/30' : 'bg-cyan-100',
      textColor: isDark ? 'text-cyan-400' : 'text-cyan-700',
      dotColor: 'bg-cyan-500 animate-pulse',
      label: 'Thinking',
    },
    disabled: {
      bgColor: isDark ? 'bg-zinc-800' : 'bg-zinc-100',
      textColor: isDark ? 'text-zinc-500' : 'text-zinc-600',
      dotColor: 'bg-zinc-400',
      label: 'Off',
    },
    'no-api-key': {
      bgColor: isDark ? 'bg-amber-900/30' : 'bg-amber-100',
      textColor: isDark ? 'text-amber-400' : 'text-amber-700',
      dotColor: 'bg-amber-500',
      label: 'No Key',
    },
    error: {
      bgColor: isDark ? 'bg-red-900/30' : 'bg-red-100',
      textColor: isDark ? 'text-red-400' : 'text-red-700',
      dotColor: 'bg-red-500',
      label: 'Paused',
    },
  }
  
  const config = statusConfig[status]
  
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center gap-1.5 rounded-lg transition-all
          ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}
          ${enabled ? config.bgColor : isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}
        `}
        title="AI Writing Assistant"
      >
        <Sparkles className={`
          ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}
          ${enabled ? config.textColor : isDark ? 'text-zinc-500' : 'text-zinc-500'}
        `} />
        
        {!compact && (
          <>
            <span className={`
              text-[10px] font-medium
              ${enabled ? config.textColor : isDark ? 'text-zinc-500' : 'text-zinc-500'}
            `}>
              AI
            </span>
            
            {/* Status Dot */}
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          </>
        )}
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className={`
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
            px-3 py-2 rounded-lg shadow-lg
            min-w-[180px] text-xs
            ${isDark 
              ? 'bg-zinc-800 border border-zinc-700' 
              : 'bg-white border border-zinc-200'
            }
          `}
        >
          <div className="font-semibold mb-1">
            AI Writing Assistant
          </div>
          
          <div className={`flex items-center gap-1.5 mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
            {config.label}
          </div>
          
          {!hasKeys ? (
            <div className="space-y-2">
              <div className={`flex items-start gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Configure API keys to enable</span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings()
                    setShowTooltip(false)
                  }}
                  className={`
                    flex items-center gap-1.5 w-full px-2 py-1.5 rounded
                    text-[10px] font-medium
                    ${isDark 
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300' 
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }
                  `}
                >
                  <Settings className="w-3 h-3" />
                  Open Settings
                </button>
              )}
            </div>
          ) : (
            <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <p>Get AI suggestions while typing.</p>
              <p className="mt-1">
                <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>Tab</kbd>
                {' '}to accept,{' '}
                <kbd className={`px-1 py-0.5 rounded ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>Esc</kbd>
                {' '}to dismiss
              </p>
            </div>
          )}
          
          {/* Arrow */}
          <div 
            className={`
              absolute top-full left-1/2 -translate-x-1/2 -mt-px
              border-8 border-transparent
              ${isDark ? 'border-t-zinc-800' : 'border-t-white'}
            `}
          />
        </motion.div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE STATUS BADGE
═══════════════════════════════════════════════════════════════════════════ */

interface AIStatusBadgeProps {
  status: AIFeatureStatus
  isDark?: boolean
}

export function AIStatusBadge({ status, isDark = false }: AIStatusBadgeProps) {
  if (status === 'disabled') return null
  
  const config = {
    ready: { color: 'emerald', label: 'AI Ready' },
    working: { color: 'cyan', label: 'AI Thinking...' },
    'no-api-key': { color: 'amber', label: 'API Key Required' },
    error: { color: 'red', label: 'AI Paused' },
  }
  
  const c = config[status as keyof typeof config]
  if (!c) return null
  
  return (
    <span className={`
      inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium
      ${c.color === 'emerald' ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : ''}
      ${c.color === 'cyan' ? (isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700') : ''}
      ${c.color === 'amber' ? (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700') : ''}
      ${c.color === 'red' ? (isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : ''}
    `}>
      <Sparkles className="w-2.5 h-2.5" />
      {c.label}
    </span>
  )
}

