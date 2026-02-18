/**
 * Recent Strands Widget
 *
 * Shows recently viewed/modified strands with quick access.
 * @module components/quarry/dashboard/widgets/RecentStrandsWidget
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  ArrowRight,
  Folder,
} from 'lucide-react'
import { getRecentlyRead, type ReadingProgressRecord } from '@/lib/codexDatabase'
import type { WidgetProps } from '../types'

interface RecentStrand {
  path: string
  title: string
  weave?: string
  loom?: string
  lastModified: string
}

export function RecentStrandsWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [recentlyRead, setRecentlyRead] = useState<ReadingProgressRecord[]>([])

  // Load recent reading history
  useEffect(() => {
    getRecentlyRead(compact ? 3 : 5).then(setRecentlyRead).catch(console.error)
  }, [compact])

  // Transform reading progress to recent strands
  const recentStrands = useMemo(() => {
    return recentlyRead.map((record): RecentStrand => {
      // Parse path to get weave/loom
      const parts = record.path.split('/')
      const fileName = parts[parts.length - 1]
      const title = fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')

      // Extract weave and loom from path
      let weave: string | undefined
      let loom: string | undefined

      const weavesIdx = parts.indexOf('weaves')
      if (weavesIdx !== -1 && parts[weavesIdx + 1]) {
        weave = parts[weavesIdx + 1]
        if (parts[weavesIdx + 2] && parts[weavesIdx + 2] !== fileName) {
          loom = parts[weavesIdx + 2]
        }
      }

      return {
        path: record.path,
        title,
        weave,
        loom,
        lastModified: record.lastReadAt,
      }
    })
  }, [recentlyRead])

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

  if (recentStrands.length === 0) {
    return (
      <div className={`text-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent strands</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {recentStrands.map((strand, index) => (
          <motion.button
            key={strand.path}
            onClick={() => onNavigate(`/codex?path=${encodeURIComponent(strand.path)}`)}
            className={`
              w-full text-left truncate text-sm py-1.5 px-2 rounded
              ${isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'}
              transition-colors
            `}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {strand.title}
          </motion.button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {recentStrands.map((strand, index) => (
        <motion.button
          key={strand.path}
          onClick={() => onNavigate(`/codex?path=${encodeURIComponent(strand.path)}`)}
          className={`
            w-full flex items-start gap-3 p-2 rounded-lg text-left
            ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}
            transition-colors
          `}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {strand.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {strand.weave && (
                <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  <Folder className="w-3 h-3" />
                  {strand.weave}
                  {strand.loom && ` / ${strand.loom}`}
                </span>
              )}
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                <Clock className="w-3 h-3" />
                {formatTime(strand.lastModified)}
              </span>
            </div>
          </div>
        </motion.button>
      ))}

      {/* View all link */}
      <button
        onClick={() => onNavigate('/quarry')}
        className={`
          w-full flex items-center justify-center gap-2 py-2 rounded-lg
          text-sm font-medium transition-colors
          ${isDark
            ? 'text-rose-400 hover:bg-rose-500/10'
            : 'text-rose-600 hover:bg-rose-50'
          }
        `}
      >
        View All
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

export default RecentStrandsWidget
