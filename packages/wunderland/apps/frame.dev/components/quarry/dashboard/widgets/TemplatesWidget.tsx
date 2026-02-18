/**
 * Templates Widget
 *
 * Dashboard widget showing quick access to templates and recent drafts.
 * @module components/quarry/dashboard/widgets/TemplatesWidget
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  ArrowRight,
  Plus,
  Upload,
  Star,
  Clock,
  Sparkles,
} from 'lucide-react'
import type { WidgetProps } from '../types'

interface TemplateDraft {
  id: string
  name: string
  category: string
  importedAt: string
}

interface FavoriteTemplate {
  id: string
  name: string
  category: string
}

export function TemplatesWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [drafts, setDrafts] = useState<TemplateDraft[]>([])
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([])

  // Load drafts and favorites from localStorage
  useEffect(() => {
    try {
      const storedDrafts = localStorage.getItem('quarry-template-drafts')
      if (storedDrafts) {
        const parsed = JSON.parse(storedDrafts)
        setDrafts(parsed.slice(0, 3))
      }

      const storedFavorites = localStorage.getItem('quarry-template-favorites')
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites)
        setFavorites(parsed.slice(0, 3))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Featured templates (static)
  const featuredTemplates = useMemo(() => [
    { id: 'cornell-notes', name: 'Cornell Notes', category: 'study' },
    { id: 'research-paper', name: 'Research Paper', category: 'academic' },
    { id: 'meeting-notes', name: 'Meeting Notes', category: 'work' },
  ], [])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => onNavigate('/quarry/templates')}
          className={`
            w-full flex items-center gap-2 p-2 rounded-lg text-sm font-medium
            ${isDark
              ? 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/40'
              : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
            }
            transition-colors
          `}
        >
          <FileText className="w-4 h-4" />
          Browse Templates
        </button>
        <button
          onClick={() => onNavigate('/quarry/templates?tab=create')}
          className={`
            w-full flex items-center gap-2 p-2 rounded-lg text-sm
            ${isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}
            transition-colors
          `}
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onNavigate('/quarry/templates')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium
            ${isDark
              ? 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/40'
              : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
            }
            transition-colors
          `}
        >
          <FileText className="w-4 h-4" />
          Browse
        </button>
        <button
          onClick={() => onNavigate('/quarry/templates?tab=create')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm
            ${isDark
              ? 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }
            transition-colors
          `}
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
        <button
          onClick={() => onNavigate('/quarry/templates?tab=import')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm
            ${isDark
              ? 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }
            transition-colors
          `}
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
      </div>

      {/* Favorites or Featured */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {favorites.length > 0 ? (
            <>
              <Star className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Favorites
              </span>
            </>
          ) : (
            <>
              <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Featured
              </span>
            </>
          )}
        </div>
        <div className="space-y-1">
          {(favorites.length > 0 ? favorites : featuredTemplates).map((template, index) => (
            <motion.button
              key={template.id}
              onClick={() => onNavigate(`/quarry/new?template=${template.id}`)}
              className={`
                w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm
                ${isDark ? 'hover:bg-zinc-700/50 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                transition-colors
              `}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
              <span className="truncate flex-1">{template.name}</span>
              <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {template.category}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Recent Drafts
            </span>
          </div>
          <div className="space-y-1">
            {drafts.map((draft, index) => (
              <motion.button
                key={draft.id}
                onClick={() => onNavigate(`/codex?settings=templates&edit=${draft.id}`)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm
                  ${isDark ? 'hover:bg-zinc-700/50 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-600'}
                  transition-colors
                `}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 + 0.15 }}
              >
                <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
                <span className="truncate flex-1">{draft.name}</span>
                <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {formatTime(draft.importedAt)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* View All Link */}
      <button
        onClick={() => onNavigate('/quarry/templates')}
        className={`
          w-full flex items-center justify-center gap-2 py-2 rounded-lg
          text-sm font-medium transition-colors
          ${isDark
            ? 'text-cyan-400 hover:bg-cyan-500/10'
            : 'text-cyan-600 hover:bg-cyan-50'
          }
        `}
      >
        View All Templates
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default TemplatesWidget
