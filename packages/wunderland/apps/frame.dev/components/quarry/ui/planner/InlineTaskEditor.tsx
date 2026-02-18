/**
 * InlineTaskEditor - Premium inline task creation/editing
 *
 * Features:
 * - Sleek dark mode support with proper theming
 * - Expandable inline editor with glass morphism styling
 * - Title, description, date, time, duration fields
 * - Priority selector with color indicators
 * - Tag selector with prominent autocomplete dropdown
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 *
 * @module codex/ui/planner/InlineTaskEditor
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  X,
  Check,
  Clock,
  Calendar,
  Tag,
  ChevronDown,
  Trash2,
  Sparkles,
  Hash,
  FileText,
  ExternalLink,
  Link2,
  Unlink,
  Search,
  Download,
  Play,
  Circle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { Task, TaskPriority, TaskStatus, CreateTaskInput, UpdateTaskInput } from '@/lib/planner/types'
import { DURATION_OPTIONS, formatDuration } from '@/lib/planner/types'
import { searchStrands } from '@/lib/storage/localCodex'

interface StrandSearchResult {
  id: string
  path: string
  title: string
  snippet?: string
  score?: number
}

interface InlineTaskEditorProps {
  task?: Task | null
  initialDate?: Date
  initialTime?: string
  availableTags?: string[]
  availableStrands?: StrandSearchResult[]
  onSave: (input: CreateTaskInput | UpdateTaskInput) => void
  onCancel: () => void
  onDelete?: (taskId: string) => void
  onNavigateToStrand?: (path: string) => void
  onImportFromStrand?: (strandPath: string) => void
  theme?: string
  showStatusButtons?: boolean
}

const priorityOptions: { value: TaskPriority; label: string; color: string; ring: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500', ring: 'ring-orange-500/30' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500', ring: 'ring-rose-500/30' },
]

const statusOptions: { value: TaskStatus; label: string; color: string; icon: string }[] = [
  { value: 'pending', label: 'Pending', color: 'bg-zinc-500', icon: '○' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500', icon: '◐' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500', icon: '●' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-zinc-400', icon: '✕' },
]

// Dark themes list
const DARK_THEMES = ['dark', 'sepia-dark', 'terminal-dark', 'oceanic-dark']

export default function InlineTaskEditor({
  task,
  initialDate,
  initialTime,
  availableTags = [],
  availableStrands = [],
  onSave,
  onCancel,
  onDelete,
  onNavigateToStrand,
  onImportFromStrand,
  theme = 'light',
  showStatusButtons = false,
}: InlineTaskEditorProps) {
  const isDark = DARK_THEMES.includes(theme)
  const isEditing = !!task

  // Form state
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [dueDate, setDueDate] = useState(
    task?.dueDate || (initialDate ? format(initialDate, 'yyyy-MM-dd') : '')
  )
  // Default to current hour rounded up if no time provided
  const defaultTime = initialTime || (
    initialDate ? `${String(new Date().getHours()).padStart(2, '0')}:00` : ''
  )
  const [dueTime, setDueTime] = useState(task?.dueTime || defaultTime)
  // Default duration: 30 minutes for new tasks
  const [duration, setDuration] = useState<number | undefined>(task?.duration ?? (task ? undefined : 30))
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'pending')
  const [tags, setTags] = useState<string[]>(task?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [showDurationMenu, setShowDurationMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  // Strand linking state
  const [linkedStrand, setLinkedStrand] = useState<string | undefined>(task?.strandPath)
  const [strandSearch, setStrandSearch] = useState('')
  const [strandResults, setStrandResults] = useState<StrandSearchResult[]>([])
  const [showStrandPicker, setShowStrandPicker] = useState(false)
  const [isSearchingStrands, setIsSearchingStrands] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (title.trim()) {
          handleSave()
        } else {
          onCancel()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [title, onCancel])

  // Search strands when typing
  useEffect(() => {
    if (!strandSearch.trim()) {
      setStrandResults(availableStrands.slice(0, 5))
      return
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearchingStrands(true)
      try {
        const results = await searchStrands(strandSearch, 8)
        setStrandResults(results)
      } catch (err) {
        console.error('[InlineTaskEditor] Strand search error:', err)
        setStrandResults([])
      } finally {
        setIsSearchingStrands(false)
      }
    }, 200)

    return () => clearTimeout(searchTimeout)
  }, [strandSearch, availableStrands])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave()
      }
    },
    [onCancel]
  )

  const handleSave = () => {
    if (!title.trim()) return

    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      duration: duration || undefined,
      priority,
      status,
      tags: tags.length > 0 ? tags : undefined,
      strandPath: linkedStrand || undefined,
      taskType: linkedStrand ? 'linked' as const : 'standalone' as const,
    }

    onSave(input)
  }

  const handleLinkStrand = (strand: StrandSearchResult) => {
    setLinkedStrand(strand.path)
    setShowStrandPicker(false)
    setStrandSearch('')
  }

  const handleUnlinkStrand = () => {
    setLinkedStrand(undefined)
  }

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (normalizedTag && !tags.includes(normalizedTag)) {
      setTags([...tags, normalizedTag])
    }
    setTagInput('')
    setShowTagSuggestions(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  // Filter tag suggestions
  const tagSuggestions = (availableTags || []).filter(
    (t) =>
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tags.includes(t.toLowerCase())
  )

  const selectedPriority = priorityOptions.find((p) => p.value === priority)
  const selectedStatus = statusOptions.find((s) => s.value === status)

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        rounded-2xl overflow-hidden backdrop-blur-xl
        ${isDark
          ? 'bg-zinc-900/95 border border-zinc-700/50 shadow-2xl shadow-black/50'
          : 'bg-white/95 border border-zinc-200/80 shadow-2xl shadow-zinc-300/30'
        }
      `}
      onKeyDown={handleKeyDown}
    >
      {/* Header with gradient accent */}
      <div className={`
        relative px-4 py-3 border-b
        ${isDark
          ? 'border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-800/50 to-zinc-900'
          : 'border-zinc-100 bg-gradient-to-r from-zinc-50 via-white to-zinc-50'
        }
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
              <Sparkles className="w-4 h-4 text-rose-500" />
            </div>
            <span className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
              {isEditing ? 'Edit Task' : 'New Task'}
            </span>
          </div>
          <button
            onClick={onCancel}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Linked Strand Banner - Show if task is linked to a strand */}
      {task?.strandPath && (
        <div className={`
          mx-4 mt-3 px-3 py-2 rounded-lg flex items-center justify-between gap-2
          ${isDark
            ? 'bg-emerald-900/30 border border-emerald-700/50'
            : 'bg-emerald-50 border border-emerald-200'
          }
        `}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                Linked Strand
              </p>
              <p className={`text-xs truncate ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} title={task.strandPath}>
                {task.strandPath.split('/').pop()}
              </p>
            </div>
          </div>
          {onNavigateToStrand && (
            <button
              onClick={() => onNavigateToStrand(task.strandPath!)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0
                ${isDark
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }
              `}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Strand
            </button>
          )}
        </div>
      )}

      {/* Title Input - Large and prominent */}
      <div className="px-4 pt-4 pb-2">
        <input
          ref={titleRef}
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`
            w-full text-lg font-medium bg-transparent outline-none
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600
            ${isDark ? 'text-zinc-100' : 'text-zinc-900'}
          `}
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        />
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <textarea
          placeholder="Add details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`
            w-full text-sm bg-transparent outline-none resize-none
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600
            ${isDark ? 'text-zinc-400' : 'text-zinc-600'}
          `}
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        />
      </div>

      {/* Fields Grid - Sleek compact layout */}
      <div className={`
        mx-4 mb-4 p-3 rounded-xl grid grid-cols-2 gap-3
        ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}
      `}>
        {/* Date */}
        <div className="space-y-1">
          <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <Calendar className="w-3 h-3" />
            Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`
              w-full px-2 py-1.5 text-xs rounded-lg border transition-colors
              ${isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300 focus:border-rose-500/50'
                : 'bg-white border-zinc-200 text-zinc-700 focus:border-rose-400'
              }
              focus:outline-none focus:ring-2 focus:ring-rose-500/20
            `}
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          />
        </div>

        {/* Time */}
        <div className="space-y-1">
          <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            <Clock className="w-3 h-3" />
            Time
          </label>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className={`
              w-full px-2 py-1.5 text-xs rounded-lg border transition-colors
              ${isDark
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300 focus:border-rose-500/50'
                : 'bg-white border-zinc-200 text-zinc-700 focus:border-rose-400'
              }
              focus:outline-none focus:ring-2 focus:ring-rose-500/20
            `}
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          />
        </div>

        {/* Duration dropdown */}
        <div className="space-y-1">
          <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Duration
          </label>
          <div className="relative">
            <button
              onClick={() => setShowDurationMenu(!showDurationMenu)}
              className={`
                w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg border transition-colors
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }
              `}
            >
              <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {duration ? formatDuration(duration) : '—'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showDurationMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`
                    absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl overflow-hidden
                    ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
                  `}
                >
                  <button
                    onClick={() => {
                      setDuration(undefined)
                      setShowDurationMenu(false)
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-xs
                      ${isDark ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-50 text-zinc-500'}
                    `}
                  >
                    No duration
                  </button>
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setDuration(opt.value)
                        setShowDurationMenu(false)
                      }}
                      className={`
                        w-full px-3 py-2 text-left text-xs
                        ${duration === opt.value
                          ? isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600'
                          : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                        }
                      `}
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Priority selector */}
        <div className="space-y-1">
          <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            Priority
          </label>
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className={`
                w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg border transition-colors
                ${isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                }
              `}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedPriority?.color}`} />
                <span>{selectedPriority?.label}</span>
              </div>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showPriorityMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`
                    absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl overflow-hidden
                    ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}
                  `}
                >
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setPriority(opt.value)
                        setShowPriorityMenu(false)
                      }}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 text-left text-xs
                        ${priority === opt.value
                          ? `${isDark ? 'bg-zinc-700' : 'bg-zinc-100'} ring-1 ${opt.ring}`
                          : isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'
                        }
                      `}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                      {opt.label}
                      {priority === opt.value && (
                        <Check className="w-3 h-3 ml-auto text-rose-500" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status selector - Only shown when editing or showStatusButtons is true */}
        {(isEditing || showStatusButtons) && (
          <div className="space-y-1 col-span-2">
            <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              <Play className="w-3 h-3" />
              Status
            </label>
            <div className="flex gap-1.5">
              {statusOptions.map((opt) => {
                const isSelected = status === opt.value
                const StatusIcon = opt.value === 'pending' ? Circle
                  : opt.value === 'in_progress' ? Play
                  : opt.value === 'completed' ? CheckCircle2
                  : XCircle
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all
                      ${isSelected
                        ? `${opt.color} text-white border-transparent shadow-sm`
                        : isDark
                          ? 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                      }
                    `}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Strand Linking Section */}
      <div className={`mx-4 mb-4 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-2 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          <Link2 className="w-3 h-3" />
          Link to Strand
        </label>

        {/* Current linked strand */}
        {linkedStrand ? (
          <div className={`
            flex items-center justify-between gap-2 p-2 rounded-lg
            ${isDark ? 'bg-emerald-900/30 border border-emerald-700/50' : 'bg-emerald-50 border border-emerald-200'}
          `}>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span className={`text-xs truncate ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {linkedStrand.split('/').pop()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onImportFromStrand && (
                <button
                  onClick={() => onImportFromStrand(linkedStrand)}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-emerald-800 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}
                  `}
                  title="Import tasks from strand"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              {onNavigateToStrand && (
                <button
                  onClick={() => onNavigateToStrand(linkedStrand)}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-emerald-800 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-600'}
                  `}
                  title="View strand"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleUnlinkStrand}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-red-900/50 text-red-400' : 'hover:bg-red-100 text-red-500'}
                `}
                title="Unlink strand"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2">
              <Search className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
              <input
                type="text"
                placeholder="Search strands to link..."
                value={strandSearch}
                onChange={(e) => {
                  setStrandSearch(e.target.value)
                  setShowStrandPicker(true)
                }}
                onFocus={() => setShowStrandPicker(true)}
                className={`
                  flex-1 text-sm bg-transparent outline-none
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                  ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
                `}
              />
              {isSearchingStrands && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
            </div>

            {/* Strand search results dropdown */}
            <AnimatePresence>
              {showStrandPicker && strandResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`
                    absolute left-0 right-0 mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden max-h-48 overflow-y-auto
                    ${isDark
                      ? 'bg-zinc-800 border-zinc-600 shadow-black/50'
                      : 'bg-white border-zinc-200 shadow-zinc-300/50'
                    }
                  `}
                >
                  {strandResults.map((strand) => (
                    <button
                      key={strand.id}
                      onClick={() => handleLinkStrand(strand)}
                      className={`
                        w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm
                        ${isDark ? 'hover:bg-zinc-700/50 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-700'}
                      `}
                    >
                      <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{strand.title}</p>
                        <p className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {strand.path}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Tags Section - Prominent dropdown */}
      <div className={`mx-4 mb-4 p-3 rounded-xl ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}>
        <label className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold mb-2 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          <Hash className="w-3 h-3" />
          Tags
        </label>

        {/* Current tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}
                `}
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tag input with autocomplete */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Tag className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`} />
            <input
              ref={tagInputRef}
              type="text"
              placeholder="Type to add tags..."
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value)
                setShowTagSuggestions(true)
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  handleAddTag(tagInput)
                }
              }}
              className={`
                flex-1 text-sm bg-transparent outline-none
                placeholder:text-zinc-400 dark:placeholder:text-zinc-600
                ${isDark ? 'text-zinc-300' : 'text-zinc-700'}
              `}
            />
          </div>

          {/* Prominent Tag Autocomplete Dropdown */}
          <AnimatePresence>
            {showTagSuggestions && (tagSuggestions.length > 0 || tagInput.trim()) && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className={`
                  absolute left-0 right-0 mt-2 z-50 rounded-xl border shadow-2xl overflow-hidden
                  ${isDark
                    ? 'bg-zinc-800 border-zinc-600 shadow-black/50'
                    : 'bg-white border-zinc-200 shadow-zinc-300/50'
                  }
                `}
              >
                {/* Create new tag option */}
                {tagInput.trim() && !tagSuggestions.includes(tagInput.toLowerCase()) && (
                  <button
                    onClick={() => handleAddTag(tagInput)}
                    className={`
                      w-full flex items-center gap-2 px-4 py-3 text-left text-sm border-b
                      ${isDark
                        ? 'border-zinc-700 hover:bg-zinc-700/50 text-zinc-200'
                        : 'border-zinc-100 hover:bg-zinc-50 text-zinc-800'
                      }
                    `}
                  >
                    <div className={`p-1 rounded ${isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
                      <Hash className="w-3 h-3 text-rose-500" />
                    </div>
                    <span>Create tag <strong>"{tagInput}"</strong></span>
                  </button>
                )}

                {/* Existing tag suggestions */}
                {tagSuggestions.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <div className={`px-3 py-2 text-[10px] uppercase tracking-wider font-semibold ${
                      isDark ? 'text-zinc-500 bg-zinc-800/80' : 'text-zinc-400 bg-zinc-50'
                    }`}>
                      Suggestions
                    </div>
                    {tagSuggestions.slice(0, 8).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className={`
                          w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm
                          ${isDark
                            ? 'hover:bg-zinc-700/50 text-zinc-300'
                            : 'hover:bg-zinc-50 text-zinc-700'
                          }
                        `}
                      >
                        <Hash className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Close hint */}
                <div className={`px-3 py-2 text-[10px] ${
                  isDark ? 'text-zinc-600 bg-zinc-900/50' : 'text-zinc-400 bg-zinc-50'
                }`}>
                  Press Enter to add • Click outside to close
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions Footer */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-t
        ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-100 bg-zinc-50/50'}
      `}>
        <div className="flex items-center gap-2">
          {isEditing && onDelete && (
            <button
              onClick={() => onDelete(task!.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${isDark
                  ? 'text-rose-400 hover:bg-rose-900/30'
                  : 'text-rose-500 hover:bg-rose-50'
                }
              `}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] hidden sm:block ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'}+Enter to save
          </span>
          <button
            onClick={onCancel}
            className={`
              px-4 py-2 rounded-lg text-xs font-medium transition-colors
              ${isDark
                ? 'text-zinc-400 hover:bg-zinc-800'
                : 'text-zinc-500 hover:bg-zinc-100'
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
              transition-all duration-200
              ${title.trim()
                ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40'
                : isDark
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
              }
            `}
          >
            <Check className="w-3.5 h-3.5" />
            {isEditing ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
