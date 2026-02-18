/**
 * Bookmarks Widget
 *
 * Shows pinned/favorited strands for quick access.
 * @module components/quarry/dashboard/widgets/BookmarksWidget
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Bookmark,
  Star,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { getAllBookmarks, removeBookmark, type BookmarkRecord } from '@/lib/codexDatabase'
import type { WidgetProps } from '../types'

interface BookmarkedStrand {
  path: string
  title: string
  weave?: string
  pinnedAt: string
}

export function BookmarksWidget({
  theme,
  size,
  onNavigate,
  compact = false,
}: WidgetProps) {
  const isDark = theme.includes('dark')
  const [dbBookmarks, setDbBookmarks] = useState<BookmarkRecord[]>([])

  // Load bookmarks from database
  useEffect(() => {
    getAllBookmarks()
      .then(setDbBookmarks)
      .catch((e) => console.error('[BookmarksWidget] Failed to load bookmarks:', e))
  }, [])

  // Transform database bookmarks to display format
  const bookmarks = useMemo(() => {
    return dbBookmarks
      .slice(0, compact ? 3 : 5)
      .map((record): BookmarkedStrand => {
        // Parse path to get title and weave
        const parts = record.path.split('/')
        const fileName = parts[parts.length - 1]
        const title = record.title || fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')

        let weave: string | undefined
        const weavesIdx = parts.indexOf('weaves')
        if (weavesIdx !== -1 && parts[weavesIdx + 1]) {
          weave = parts[weavesIdx + 1]
        }

        return {
          path: record.path,
          title,
          weave,
          pinnedAt: record.createdAt,
        }
      })
  }, [dbBookmarks, compact])

  const handleRemoveBookmark = useCallback(async (path: string) => {
    try {
      await removeBookmark(path)
      setDbBookmarks((prev) => prev.filter((b) => b.path !== path))
    } catch (e) {
      console.error('[BookmarksWidget] Failed to remove bookmark:', e)
    }
  }, [])

  if (bookmarks.length === 0) {
    return (
      <div className={`text-center py-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm mb-2">No bookmarks yet</p>
        <button
          onClick={() => onNavigate('/quarry')}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
            transition-colors
            ${isDark
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }
          `}
        >
          <Plus className="w-4 h-4" />
          Add from Codex
        </button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {bookmarks.map((bookmark, index) => (
          <motion.button
            key={bookmark.path}
            onClick={() => onNavigate(`/codex?path=${encodeURIComponent(bookmark.path)}`)}
            className={`
              w-full flex items-center gap-2 text-left py-1.5 px-2 rounded
              ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}
              transition-colors
            `}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
            <span className={`text-sm truncate ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {bookmark.title}
            </span>
          </motion.button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark, index) => (
        <motion.div
          key={bookmark.path}
          className={`
            group flex items-center gap-3 p-2 rounded-lg
            ${isDark ? 'hover:bg-zinc-700/50' : 'hover:bg-zinc-50'}
            transition-colors
          `}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <button
            onClick={() => onNavigate(`/codex?path=${encodeURIComponent(bookmark.path)}`)}
            className="flex-1 flex items-start gap-3 text-left min-w-0"
          >
            <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                {bookmark.title}
              </p>
              {bookmark.weave && (
                <p className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {bookmark.weave}
                </p>
              )}
            </div>
          </button>

          {/* Remove button - appears on hover */}
          <button
            onClick={() => handleRemoveBookmark(bookmark.path)}
            className={`
              opacity-0 group-hover:opacity-100 p-1 rounded transition-all
              ${isDark ? 'hover:bg-zinc-600 text-zinc-500' : 'hover:bg-zinc-200 text-zinc-400'}
            `}
            title="Remove bookmark"
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>
        </motion.div>
      ))}

      {/* View all link */}
      <button
        onClick={() => onNavigate('/codex?filter=bookmarked')}
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

export default BookmarksWidget
