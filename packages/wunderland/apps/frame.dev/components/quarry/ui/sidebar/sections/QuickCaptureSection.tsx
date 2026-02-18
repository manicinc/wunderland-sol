/**
 * Quick Capture Section
 * 
 * Fast note/idea/task creation section for sidebars.
 * @module components/quarry/ui/sidebar/sections/QuickCaptureSection
 */

'use client'

import React, { useState } from 'react'
import { Plus, FileText, Lightbulb, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollapsibleSidebarSection } from './CollapsibleSidebarSection'

export interface QuickCaptureSectionProps {
  /** Whether in dark mode */
  isDark: boolean
  /** Whether expanded by default */
  defaultExpanded?: boolean
  /** Navigation handler */
  onNavigate: (path: string) => void
}

type CaptureType = 'note' | 'idea' | 'task'

const CAPTURE_TYPES = [
  { type: 'note' as const, icon: FileText, label: 'Note', color: 'text-blue-500' },
  { type: 'idea' as const, icon: Lightbulb, label: 'Idea', color: 'text-amber-500' },
  { type: 'task' as const, icon: ListTodo, label: 'Task', color: 'text-emerald-500' },
]

export function QuickCaptureSection({
  isDark,
  defaultExpanded = true,
  onNavigate,
}: QuickCaptureSectionProps) {
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState<CaptureType>('note')

  const handleSubmit = () => {
    if (!title.trim()) return
    const params = new URLSearchParams({ 
      action: 'create', 
      title: title.trim(), 
      type: selectedType 
    })
    onNavigate(`/codex?${params.toString()}`)
    setTitle('')
  }

  return (
    <CollapsibleSidebarSection
      title="Quick Capture"
      icon={Plus}
      defaultExpanded={defaultExpanded}
      isDark={isDark}
    >
      <div className="p-3 space-y-2">
        {/* Type selector */}
        <div className="flex gap-1">
          {CAPTURE_TYPES.map(({ type, icon: Icon, label, color }) => (
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
    </CollapsibleSidebarSection>
  )
}

export default QuickCaptureSection

