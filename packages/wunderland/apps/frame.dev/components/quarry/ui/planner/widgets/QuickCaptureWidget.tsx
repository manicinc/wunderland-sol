/**
 * QuickCaptureWidget
 *
 * Dashboard widget for quickly adding tasks (mini braindump).
 *
 * @module components/quarry/ui/planner/widgets/QuickCaptureWidget
 */

'use client'

import { useState, useCallback, memo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, Plus, Send, Calendar, Clock, Tag, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreateTaskInput } from '@/lib/planner/types'
import { useProjects } from '@/lib/planner/hooks/useProjects'

export interface QuickCaptureWidgetProps {
  onCreateTask: (input: CreateTaskInput) => Promise<unknown>
  onViewBraindump?: () => void
  pendingCount?: number
  theme?: 'light' | 'dark'
  className?: string
}

function QuickCaptureWidgetComponent({
  onCreateTask,
  onViewBraindump,
  pendingCount = 0,
  theme = 'dark',
  className,
}: QuickCaptureWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { projects } = useProjects()

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      await onCreateTask({
        title: title.trim(),
        // No due date = goes to braindump
      })

      setTitle('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to create task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [title, isSubmitting, onCreateTask])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setTitle('')
      setIsExpanded(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        theme === 'dark'
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-white border-gray-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Inbox
            className={cn(
              'w-5 h-5',
              theme === 'dark' ? 'text-violet-400' : 'text-violet-500'
            )}
          />
          <h3
            className={cn(
              'font-semibold',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            Quick Capture
          </h3>
          {pendingCount > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                theme === 'dark'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'bg-violet-100 text-violet-600'
              )}
            >
              {pendingCount}
            </span>
          )}
        </div>
        {onViewBraindump && (
          <button
            onClick={onViewBraindump}
            className={cn(
              'flex items-center gap-1 text-xs transition-colors',
              theme === 'dark'
                ? 'text-zinc-500 hover:text-zinc-300'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            View inbox
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div
        className={cn(
          'relative rounded-lg border transition-all',
          isExpanded
            ? theme === 'dark'
              ? 'border-violet-500/50 ring-1 ring-violet-500/20'
              : 'border-violet-400/50 ring-1 ring-violet-400/20'
            : theme === 'dark'
              ? 'border-zinc-700'
              : 'border-gray-200'
        )}
      >
        <div className="flex items-center gap-2 p-2">
          <Plus
            className={cn(
              'w-4 h-4 flex-shrink-0',
              theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => {
              if (!title.trim()) setIsExpanded(false)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Add a task to your inbox..."
            className={cn(
              'flex-1 bg-transparent text-sm focus:outline-none',
              theme === 'dark'
                ? 'text-white placeholder:text-zinc-500'
                : 'text-gray-900 placeholder:text-gray-400'
            )}
          />
          <AnimatePresence>
            {title.trim() && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  'bg-violet-500 text-white hover:bg-violet-600',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Success message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute inset-x-0 top-0 flex items-center justify-center py-2 rounded-lg',
                'bg-emerald-500/20 text-emerald-400 text-xs font-medium'
              )}
            >
              ✓ Added to inbox
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick actions (when expanded) */}
      <AnimatePresence>
        {isExpanded && title.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'flex items-center gap-2 pt-3 mt-3 border-t',
                theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'
              )}
            >
              <p
                className={cn(
                  'text-xs',
                  theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'
                )}
              >
                Press Enter to add, or add details:
              </p>
              <button
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <Calendar className="w-3 h-3" />
                Date
              </button>
              <button
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <Clock className="w-3 h-3" />
                Time
              </button>
              <button
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <Tag className="w-3 h-3" />
                Project
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const QuickCaptureWidget = memo(QuickCaptureWidgetComponent)
export default QuickCaptureWidget
