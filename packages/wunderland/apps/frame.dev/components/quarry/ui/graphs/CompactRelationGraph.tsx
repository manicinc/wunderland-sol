/**
 * CompactRelationGraph - Ultra-compact relationship visualization for right panel
 * @module codex/ui/CompactRelationGraph
 * 
 * Simple, informative graph showing strand relationships at a glance.
 * Optimized for small panel space with click-to-navigate.
 */

'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FileText, ArrowLeft, ArrowRight, Tag, Link2, Sparkles } from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'

interface CompactRelationGraphProps {
  metadata: StrandMetadata
  currentFile: GitHubFile | null
  allFiles: GitHubFile[]
  onNavigate?: (path: string) => void
  theme?: string
}

interface RelationItem {
  id: string
  label: string
  type: 'prerequisite' | 'reference' | 'tag'
  path?: string
}

// Find file path from slug/name
function findFilePath(slug: string, files: GitHubFile[]): string | undefined {
  const normalized = slug.toLowerCase().replace(/[^a-z0-9]/g, '')
  return files.find(f => {
    const fileName = f.name.toLowerCase().replace(/\.md$/, '').replace(/[^a-z0-9]/g, '')
    return fileName === normalized || f.path.toLowerCase().includes(slug.toLowerCase())
  })?.path
}

const TYPE_STYLES = {
  prerequisite: {
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    icon: ArrowLeft,
    label: 'Requires',
  },
  reference: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: ArrowRight,
    label: 'References',
  },
  tag: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Tag,
    label: 'Tagged',
  },
}

export default function CompactRelationGraph({
  metadata,
  currentFile,
  allFiles,
  onNavigate,
  theme = 'light',
}: CompactRelationGraphProps) {
  const isDark = theme?.includes('dark')
  
  // Build relation items
  const { prerequisites, references, tags, hasRelations } = useMemo(() => {
    const prereqs: RelationItem[] = []
    const refs: RelationItem[] = []
    const tagItems: RelationItem[] = []
    
    // Parse relationships
    const relationships = metadata.relationships
    if (relationships) {
      if (Array.isArray(relationships)) {
        relationships.forEach((rel: any, i: number) => {
          const slug = rel.targetSlug || rel.target || rel.slug || (typeof rel === 'string' ? rel : null)
          if (slug) {
            const relType = rel.type?.toLowerCase() || 'references'
            if (relType === 'requires' || relType === 'prerequisite') {
              prereqs.push({
                id: `prereq-${i}`,
                label: slug,
                type: 'prerequisite',
                path: findFilePath(slug, allFiles),
              })
            } else {
              refs.push({
                id: `ref-${i}`,
                label: slug,
                type: 'reference',
                path: findFilePath(slug, allFiles),
              })
            }
          }
        })
      } else if (typeof relationships === 'object') {
        const rel = relationships as Record<string, any>
        const prereqList = rel.prerequisites || rel.requires || []
        const refList = rel.references || rel.seeAlso || rel.related || []
        
        prereqList.forEach((p: string, i: number) => {
          prereqs.push({
            id: `prereq-${i}`,
            label: p,
            type: 'prerequisite',
            path: findFilePath(p, allFiles),
          })
        })
        
        refList.forEach((r: string, i: number) => {
          refs.push({
            id: `ref-${i}`,
            label: r,
            type: 'reference',
            path: findFilePath(r, allFiles),
          })
        })
      }
    }
    
    // Parse tags (max 5)
    const rawTags = Array.isArray(metadata.tags) 
      ? metadata.tags 
      : metadata.tags ? [metadata.tags] : []
    
    rawTags.slice(0, 5).forEach((t, i) => {
      tagItems.push({
        id: `tag-${i}`,
        label: String(t),
        type: 'tag',
      })
    })
    
    return {
      prerequisites: prereqs,
      references: refs,
      tags: tagItems,
      hasRelations: prereqs.length > 0 || refs.length > 0 || tagItems.length > 0,
    }
  }, [metadata, allFiles])
  
  // Empty state
  if (!hasRelations) {
    return (
      <div className={`
        flex flex-col items-center justify-center py-4 text-center
        ${isDark ? 'text-zinc-500' : 'text-zinc-400'}
      `}>
        <Link2 className="w-6 h-6 mb-2 opacity-50" />
        <p className="text-[10px]">No relationships defined</p>
      </div>
    )
  }
  
  const currentTitle = metadata.title || currentFile?.name?.replace('.md', '') || 'Current'
  
  return (
    <div className="space-y-2">
      {/* Current node - compact */}
      <div className={`
        flex items-center gap-2 px-2 py-1.5 rounded-lg
        ${isDark ? 'bg-cyan-900/30 border border-cyan-800' : 'bg-cyan-50 border border-cyan-200'}
      `}>
        <div className={`
          w-6 h-6 rounded-full flex items-center justify-center
          bg-gradient-to-br from-cyan-500 to-blue-500
        `}>
          <FileText className="w-3 h-3 text-white" />
        </div>
        <span className={`text-[11px] font-medium truncate flex-1 ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
          {currentTitle}
        </span>
        <Sparkles className={`w-3 h-3 ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`} />
      </div>
      
      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <RelationSection
          title="Requires"
          items={prerequisites}
          type="prerequisite"
          onNavigate={onNavigate}
          isDark={isDark}
        />
      )}
      
      {/* References */}
      {references.length > 0 && (
        <RelationSection
          title="References"
          items={references}
          type="reference"
          onNavigate={onNavigate}
          isDark={isDark}
        />
      )}
      
      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-1">
          <p className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Tags
          </p>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <motion.span
                key={tag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`
                  px-1.5 py-0.5 rounded text-[10px] font-medium
                  ${TYPE_STYLES.tag.bg} ${TYPE_STYLES.tag.text}
                `}
              >
                {tag.label}
              </motion.span>
            ))}
          </div>
        </div>
      )}
      
      {/* Summary count */}
      <div className={`
        text-center pt-1 text-[9px]
        ${isDark ? 'text-zinc-600' : 'text-zinc-400'}
      `}>
        {prerequisites.length + references.length} links • {tags.length} tags
      </div>
    </div>
  )
}

function RelationSection({
  title,
  items,
  type,
  onNavigate,
  isDark,
}: {
  title: string
  items: RelationItem[]
  type: 'prerequisite' | 'reference'
  onNavigate?: (path: string) => void
  isDark: boolean
}) {
  const styles = TYPE_STYLES[type]
  const Icon = styles.icon
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${styles.text}`} />
        <p className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {title}
        </p>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => item.path && onNavigate?.(item.path)}
            disabled={!item.path}
            className={`
              w-full flex items-center gap-1.5 px-2 py-1 rounded text-left
              transition-colors text-[10px]
              ${item.path 
                ? `cursor-pointer ${styles.bg} hover:brightness-95 dark:hover:brightness-110 ${styles.text}` 
                : `${isDark ? 'bg-zinc-800/50 text-zinc-500' : 'bg-zinc-100 text-zinc-400'} cursor-default`
              }
            `}
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
            {!item.path && (
              <span className={`text-[8px] ml-auto ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                external
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}














