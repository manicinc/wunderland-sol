/**
 * StrandNode - Custom React Flow node for strands
 * @module quarry/atlas/nodes/StrandNode
 */

'use client'

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { FileText, Hash, Calendar } from 'lucide-react'

export interface StrandNodeData {
  id: string
  label: string
  path: string
  description?: string
  tags?: string[]
  subjects?: string[]
  topics?: string[]
  strandType?: 'file' | 'folder' | 'weave' | 'loom'
  emoji?: string
  lastModified?: string
  onClick?: (path: string) => void
}

interface StrandNodeProps {
  data: StrandNodeData
  selected: boolean
}

function StrandNode({ data, selected }: StrandNodeProps) {
  const handleClick = () => {
    if (data.onClick) {
      data.onClick(data.path)
    }
  }

  const allTags = [
    ...(data.tags || []),
    ...(data.subjects || []),
    ...(data.topics || []),
  ].slice(0, 3)

  return (
    <div
      onClick={handleClick}
      className={`
        group relative px-3 py-2 rounded-lg border shadow-sm transition-all duration-200 cursor-pointer
        min-w-[140px] max-w-[220px]
        ${selected
          ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500 shadow-cyan-500/20 scale-105'
          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-cyan-400 hover:shadow-md'
        }
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-cyan-500 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-cyan-500 !border-white"
      />

      {/* Content */}
      <div className="flex items-start gap-2">
        {/* Icon/Emoji */}
        <div className={`
          w-7 h-7 rounded flex items-center justify-center shrink-0
          ${data.strandType === 'weave'
            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
            : data.strandType === 'loom'
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
              : data.strandType === 'folder'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
          }
        `}>
          {data.emoji ? (
            <span className="text-sm">{data.emoji}</span>
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-zinc-900 dark:text-white truncate">
            {data.label}
          </h4>
          {data.description && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {allTags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            >
              <Hash className="w-2 h-2" />
              {tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}

      {/* Hover indicator */}
      <div className={`
        absolute -inset-px rounded-lg border-2 pointer-events-none transition-opacity
        ${selected
          ? 'border-cyan-500 opacity-100'
          : 'border-cyan-400 opacity-0 group-hover:opacity-100'
        }
      `} />
    </div>
  )
}

export default memo(StrandNode)
