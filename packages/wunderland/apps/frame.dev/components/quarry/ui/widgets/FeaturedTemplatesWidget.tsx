/**
 * Featured Templates Widget
 * @module codex/ui/FeaturedTemplatesWidget
 *
 * @description
 * Compact widget showing featured templates from remote repositories.
 * Designed to be embedded in the welcome panel/dashboard.
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  ArrowRight,
  RefreshCw,
  Star,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import DynamicIcon from '../common/DynamicIcon'
import { cn } from '@/lib/utils'
import type { RemoteTemplate } from '@/lib/templates/types'
import { getAllRemoteTemplates } from '@/lib/templates/remoteTemplateLoader'

interface FeaturedTemplatesWidgetProps {
  /** Theme */
  isDark?: boolean
  /** Max templates to show */
  maxTemplates?: number
  /** Callback when template is selected */
  onSelectTemplate?: (template: RemoteTemplate) => void
  /** Callback to open full template gallery */
  onOpenGallery?: () => void
  /** Compact mode - even smaller */
  compact?: boolean
}

/**
 * Featured Templates Widget - Compact template showcase
 */
export default function FeaturedTemplatesWidget({
  isDark = false,
  maxTemplates = 4,
  onSelectTemplate,
  onOpenGallery,
  compact = false,
}: FeaturedTemplatesWidgetProps) {
  const [templates, setTemplates] = useState<RemoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load featured templates
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Get all remote templates (fetches if needed)
      const allTemplates = await getAllRemoteTemplates()

      // Sort by featured, then by download count or rating
      const sorted = [...allTemplates].sort((a, b) => {
        // Featured first
        if (a.featured && !b.featured) return -1
        if (!a.featured && b.featured) return 1
        // Then by downloads from remote metadata
        const aDownloads = a.remote?.downloads || 0
        const bDownloads = b.remote?.downloads || 0
        return bDownloads - aDownloads
      })

      setTemplates(sorted.slice(0, maxTemplates))
    } catch (err) {
      console.error('[FeaturedTemplates] Load error:', err)
      setError('Could not load templates')
    } finally {
      setLoading(false)
    }
  }, [maxTemplates])

  if (loading) {
    return (
      <div className={cn(
        'p-4 rounded-xl',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Templates</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      </div>
    )
  }

  if (error || templates.length === 0) {
    return (
      <div className={cn(
        'p-4 rounded-xl',
        isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Templates</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-2">
          {error || 'No templates available'}
        </p>
        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="w-full mt-2 py-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Configure template sources →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl overflow-hidden',
      isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3',
        isDark ? 'border-b border-zinc-700/50' : 'border-b border-zinc-200/50'
      )}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Featured Templates
          </span>
        </div>
        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            Browse all
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Template Grid */}
      <div className={cn(
        'p-3',
        compact ? 'space-y-2' : 'grid grid-cols-2 gap-2'
      )}>
        {templates.map((template, index) => (
          <motion.button
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectTemplate?.(template)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg text-left transition-all',
              'hover:scale-[1.02]',
              isDark
                ? 'bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600/50'
                : 'bg-white hover:bg-zinc-50 border border-zinc-200'
            )}
          >
            {/* Icon */}
            <div className={cn(
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              isDark ? 'bg-purple-900/30' : 'bg-purple-100'
            )}>
              <DynamicIcon
                name={template.icon || 'File'}
                className="w-4 h-4 text-purple-600 dark:text-purple-400"
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100 truncate">
                  {template.name}
                </span>
                {template.featured && (
                  <Star className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                {template.shortDescription || template.description}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'px-1.5 py-0.5 text-[9px] rounded',
                  isDark ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-200 text-zinc-600'
                )}>
                  {template.category}
                </span>
                {template.sourceId && (
                  <span className="text-[9px] text-zinc-400 truncate">
                    {template.sourceId}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* CTA Footer */}
      {onOpenGallery && (
        <div className={cn(
          'px-4 py-3',
          isDark ? 'border-t border-zinc-700/50' : 'border-t border-zinc-200/50'
        )}>
          <button
            onClick={onOpenGallery}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors',
              isDark
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
            )}
          >
            <Package className="w-3.5 h-3.5" />
            Create from Template
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
