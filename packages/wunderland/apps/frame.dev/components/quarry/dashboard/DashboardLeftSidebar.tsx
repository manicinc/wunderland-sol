/**
 * Dashboard Left Sidebar
 * 
 * Custom left panel content for the dashboard page.
 * Contains collapsible sections for clock, quick capture, bookmarks, and templates.
 * Uses lightweight components for performance (no heavy SVG animations).
 * Note: Ambience/Jukebox has been moved to the right sidebar.
 * @module components/quarry/dashboard/DashboardLeftSidebar
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Plus,
  FileText,
  Lightbulb,
  ListTodo,
  Bookmark,
  Star,
  ArrowRight,
  Clock,
  Music,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClockWidget } from '@/components/quarry/dashboard/widgets/ClockWidget'
import RetroJukebox from '@/components/quarry/ui/soundscapes/RetroJukebox'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'
import { getAllBookmarks, type BookmarkRecord } from '@/lib/codexDatabase'

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardLeftSidebarProps {
  theme: string
  onNavigate?: (path: string) => void
}

interface CollapsibleSectionProps {
  title: string
  icon: LucideIcon
  isExpanded: boolean
  onToggle: () => void
  isDark: boolean
  badge?: React.ReactNode
  children: React.ReactNode
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  isDark,
  badge,
  children 
}: CollapsibleSectionProps) {
  return (
    <div className={cn(
      'border-b',
      isDark ? 'border-zinc-800' : 'border-zinc-200'
    )}>
      {/* Section Header - Always visible */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2',
          'text-left transition-colors',
          isDark 
            ? 'hover:bg-zinc-800/50 text-zinc-300' 
            : 'hover:bg-zinc-100 text-zinc-700'
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <Icon className={cn(
            'w-4 h-4',
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          )} />
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isDark ? 'text-zinc-500' : 'text-zinc-400',
            isExpanded ? 'rotate-180' : ''
          )} 
        />
      </button>

      {/* Section Content - Collapsible */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// COMPACT QUICK CAPTURE
// ============================================================================

interface CompactQuickCaptureProps {
  isDark: boolean
  onNavigate: (path: string) => void
}

function CompactQuickCapture({ isDark, onNavigate }: CompactQuickCaptureProps) {
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState<'note' | 'idea' | 'task'>('note')

  const captureTypes = [
    { type: 'note' as const, icon: FileText, label: 'Note', color: 'text-blue-500' },
    { type: 'idea' as const, icon: Lightbulb, label: 'Idea', color: 'text-amber-500' },
    { type: 'task' as const, icon: ListTodo, label: 'Task', color: 'text-emerald-500' },
  ]

  const handleSubmit = () => {
    if (!title.trim()) return
    const params = new URLSearchParams({ action: 'create', title: title.trim(), type: selectedType })
    onNavigate(`/codex?${params.toString()}`)
    setTitle('')
  }

  return (
    <div className="p-3 space-y-2">
      {/* Type selector */}
      <div className="flex gap-1">
        {captureTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors',
              selectedType === type
                ? isDark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-800'
                : isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'
            )}
          >
            <Icon className={cn('w-3 h-3', selectedType === type && color)} />
            {label}
          </button>
        ))}
      </div>
      {/* Input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Quick note..."
          className={cn(
            'flex-1 px-2 py-1.5 text-sm rounded-md border',
            isDark 
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' 
              : 'bg-white border-zinc-300 text-zinc-800 placeholder-zinc-400'
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className={cn(
            'px-2 py-1.5 rounded-md transition-colors',
            title.trim()
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-200 text-zinc-400'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// COMPACT BOOKMARKS
// ============================================================================

interface CompactBookmarksProps {
  isDark: boolean
  onNavigate: (path: string) => void
}

function CompactBookmarks({ isDark, onNavigate }: CompactBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])

  useEffect(() => {
    getAllBookmarks()
      .then((records) => setBookmarks(records.slice(0, 5)))
      .catch((e) => console.error('[CompactBookmarks] Failed to load:', e))
  }, [])

  if (bookmarks.length === 0) {
    return (
      <div className={cn('p-3 text-center text-xs', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
        No bookmarks yet
      </div>
    )
  }

  return (
    <div className="p-2 space-y-1">
      {bookmarks.map((bm) => {
        const parts = bm.path.split('/')
        const fileName = parts[parts.length - 1]
        const title = bm.title || fileName.replace(/\.mdx?$/, '').replace(/-/g, ' ')
        return (
          <button
            key={bm.path}
            onClick={() => onNavigate(`/codex/${bm.path}`)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
              isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
            )}
          >
            <Star className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-amber-500' : 'text-amber-500')} />
            <span className={cn('text-xs truncate', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
              {title}
            </span>
          </button>
        )
      })}
      <button
        onClick={() => onNavigate('/quarry/bookmarks')}
        className={cn(
          'w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors rounded-md',
          isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
        )}
      >
        View all <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

// ============================================================================
// COMPACT TEMPLATES
// ============================================================================

interface CompactTemplatesProps {
  isDark: boolean
  onNavigate: (path: string) => void
}

function CompactTemplates({ isDark, onNavigate }: CompactTemplatesProps) {
  const quickTemplates = [
    { id: 'blank', name: 'Blank Note', icon: FileText },
    { id: 'cornell-notes', name: 'Cornell Notes', icon: FileText },
    { id: 'meeting-notes', name: 'Meeting Notes', icon: FileText },
  ]

  return (
    <div className="px-2 py-1 space-y-0.5">
      {quickTemplates.map((t) => (
        <button
          key={t.id}
          onClick={() => onNavigate(`/quarry/new?template=${t.id}`)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors',
            isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
          )}
        >
          <t.icon className={cn('w-3 h-3 flex-shrink-0', isDark ? 'text-cyan-500' : 'text-cyan-600')} />
          <span className={cn('text-xs truncate', isDark ? 'text-zinc-300' : 'text-zinc-700')}>
            {t.name}
          </span>
        </button>
      ))}
      <button
        onClick={() => onNavigate('/quarry/templates')}
        className={cn(
          'w-full flex items-center justify-center gap-1 py-1 text-xs font-medium transition-colors rounded-md',
          isDark ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20' : 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50'
        )}
      >
        Browse all <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardLeftSidebar({ theme, onNavigate }: DashboardLeftSidebarProps) {
  const isDark = theme.includes('dark')
  const navigate = onNavigate || (() => {})

  // Audio hook
  const { soundscape, isPlaying, volume, toggle, setVolume, setSoundscape, getAnalyser } = useAmbienceSounds()

  // Collapsible section state
  const [clockExpanded, setClockExpanded] = useState(true)
  const [quickCaptureExpanded, setQuickCaptureExpanded] = useState(true)
  const [bookmarksExpanded, setBookmarksExpanded] = useState(false)
  const [templatesExpanded, setTemplatesExpanded] = useState(false)
  const [ambienceExpanded, setAmbienceExpanded] = useState(true)
  const [showScene, setShowScene] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Clock Section - Always at top */}
      <CollapsibleSection
        title="Clock"
        icon={Clock}
        isExpanded={clockExpanded}
        onToggle={() => setClockExpanded(!clockExpanded)}
        isDark={isDark}
      >
        <div className="flex justify-center py-3">
          <ClockWidget theme={theme} size="medium" compact={false} onNavigate={navigate} />
        </div>
      </CollapsibleSection>

      {/* Quick Capture Section - Collapsible */}
      <CollapsibleSection
        title="Quick Capture"
        icon={Plus}
        isExpanded={quickCaptureExpanded}
        onToggle={() => setQuickCaptureExpanded(!quickCaptureExpanded)}
        isDark={isDark}
      >
        <CompactQuickCapture isDark={isDark} onNavigate={navigate} />
      </CollapsibleSection>

      {/* Bookmarks Section - Collapsible */}
      <CollapsibleSection
        title="Bookmarks"
        icon={Bookmark}
        isExpanded={bookmarksExpanded}
        onToggle={() => setBookmarksExpanded(!bookmarksExpanded)}
        isDark={isDark}
      >
        <CompactBookmarks isDark={isDark} onNavigate={navigate} />
      </CollapsibleSection>

      {/* Templates Section - Collapsible */}
      <CollapsibleSection
        title="Templates"
        icon={FileText}
        isExpanded={templatesExpanded}
        onToggle={() => setTemplatesExpanded(!templatesExpanded)}
        isDark={isDark}
      >
        <CompactTemplates isDark={isDark} onNavigate={navigate} />
      </CollapsibleSection>

      {/* Spacer - pushes ambience to bottom */}
      <div className="flex-1 min-h-[10px]" />

      {/* Ambience Section - Always at bottom with full jukebox */}
      <CollapsibleSection
        title="Ambience"
        icon={Music}
        isExpanded={ambienceExpanded}
        onToggle={() => setAmbienceExpanded(!ambienceExpanded)}
        isDark={isDark}
        badge={isPlaying ? (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        ) : undefined}
      >
        <div className={cn(
          'relative overflow-hidden',
          // Outer glow effect when playing
          isPlaying && isDark && 'shadow-[0_0_20px_rgba(139,92,246,0.3),0_0_40px_rgba(236,72,153,0.15)]',
          isPlaying && !isDark && 'shadow-[0_0_15px_rgba(139,92,246,0.2)]'
        )}>
          {/* Holographic border gradient */}
          <div className={cn(
            'absolute inset-0 p-[1px]',
            isDark
              ? 'bg-gradient-to-br from-violet-500/40 via-cyan-500/30 to-rose-500/40'
              : 'bg-gradient-to-br from-violet-400/30 via-cyan-400/20 to-rose-400/30'
          )}>
            <div className={cn(
              'absolute inset-[1px]',
              isDark ? 'bg-zinc-900/95' : 'bg-white/95'
            )} />
          </div>

          {/* Animated holographic shimmer when playing */}
          {isPlaying && (
            <div
              className={cn(
                'absolute inset-0 pointer-events-none',
                'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                'animate-[shimmer_3s_ease-in-out_infinite]'
              )}
              style={{
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
          )}

          {/* Inner content container */}
          <div className={cn(
            'relative border-2 overflow-hidden',
            isDark
              ? 'border-zinc-800/80 bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950'
              : 'border-zinc-200 bg-gradient-to-b from-zinc-50 via-white to-zinc-100'
          )}>
            <div className={cn(
              'px-2 py-2',
              isDark
                ? 'bg-gradient-to-b from-zinc-900/50 to-zinc-950/50'
                : 'bg-gradient-to-b from-zinc-50/50 to-white/50'
            )}>
              <div className={cn(
                'rounded-lg overflow-hidden',
                isDark
                  ? 'ring-1 ring-zinc-800/50 shadow-inner'
                  : 'ring-1 ring-zinc-200/50 shadow-inner'
              )}>
                <RetroJukebox
                  nowPlaying={soundscape || undefined}
                  isPlaying={isPlaying}
                  analyser={getAnalyser()}
                  volume={volume}
                  currentSoundscape={soundscape || undefined}
                  onTogglePlay={toggle}
                  onVolumeChange={setVolume}
                  onSelectSoundscape={setSoundscape}
                  showScene={showScene}
                  onToggleScene={() => setShowScene(!showScene)}
                  compact={false}
                  isDark={isDark}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
