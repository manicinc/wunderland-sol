/**
 * Mini Graph - Inline relationship visualization
 * 
 * Shows the current strand as a central node with its immediate relationships.
 * Redesigned for responsive, scrollable display in constrained containers.
 * 
 * @module codex/ui/MiniGraph
 */

'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, FileText, ChevronUp, ChevronDown, ExternalLink, Link2 } from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'

interface MiniGraphProps {
  metadata: StrandMetadata
  currentFile: GitHubFile | null
  currentPath: string
  allFiles: GitHubFile[]
  onNavigate?: (path: string) => void
  /** Panel size for responsive text scaling */
  panelSize?: 's' | 'm' | 'l'
}

interface GraphNode {
  id: string
  label: string
  type: 'current' | 'requires' | 'references' | 'backlink' | 'sibling'
  path?: string
}

interface GraphEdge {
  from: string
  to: string
  type: 'requires' | 'references' | 'backlink'
}

export default function MiniGraph({
  metadata,
  currentFile,
  currentPath,
  allFiles,
  onNavigate,
  panelSize = 's',
}: MiniGraphProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('list')
  const [expandedSection, setExpandedSection] = useState<'requires' | 'references' | null>('requires')
  
  // Dynamic text sizes based on panel size
  const textSizes = {
    base: panelSize === 'l' ? 'text-[12px]' : panelSize === 'm' ? 'text-[11px]' : 'text-[10px]',
    sm: panelSize === 'l' ? 'text-[11px]' : panelSize === 'm' ? 'text-[10px]' : 'text-[9px]',
    xs: panelSize === 'l' ? 'text-[10px]' : panelSize === 'm' ? 'text-[9px]' : 'text-[8px]',
  }
  
  const iconSize = panelSize === 'l' ? 'w-4 h-4' : panelSize === 'm' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  
  const { nodes, edges } = useMemo(() => {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    
    // Current node
    const currentId = metadata.slug || currentFile?.name?.replace('.md', '') || 'current'
    nodes.push({
      id: currentId,
      label: metadata.title || currentFile?.name?.replace('.md', '') || 'Current',
      type: 'current',
      path: currentPath,
    })
    
    // Parse relationships
    const relationships = metadata.relationships
    
    let prerequisites: string[] = []
    let references: string[] = []
    
    if (relationships) {
      if (Array.isArray(relationships)) {
        relationships.forEach((rel: any) => {
          const slug = rel.targetSlug || rel.target || rel.slug || rel
          if (typeof slug === 'string') {
            const relType = rel.type?.toLowerCase() || 'references'
            if (relType === 'requires' || relType === 'prerequisite' || relType === 'depends') {
              prerequisites.push(slug)
            } else {
              references.push(slug)
            }
          }
        })
      } else if (typeof relationships === 'object') {
        const rel = relationships as Record<string, string[] | undefined>
        prerequisites = rel.prerequisites || rel.requires || []
        references = rel.references || rel.seeAlso || rel.related || []
      }
    }
    
    // Add prerequisites nodes
    prerequisites.forEach((req, i) => {
      const reqId = `req-${i}`
      nodes.push({
        id: reqId,
        label: req,
        type: 'requires',
        path: findFilePath(req, allFiles),
      })
      edges.push({ from: reqId, to: currentId, type: 'requires' })
    })
    
    // Add references nodes
    references.forEach((ref, i) => {
      const refId = `ref-${i}`
      nodes.push({
        id: refId,
        label: ref,
        type: 'references',
        path: findFilePath(ref, allFiles),
      })
      edges.push({ from: currentId, to: refId, type: 'references' })
    })
    
    return { nodes, edges }
  }, [metadata, currentFile, currentPath, allFiles])
  
  // Group nodes by type
  const requiresNodes = nodes.filter(n => n.type === 'requires')
  const referencesNodes = nodes.filter(n => n.type === 'references')
  const currentNode = nodes.find(n => n.type === 'current')
  
  const hasConnections = requiresNodes.length > 0 || referencesNodes.length > 0

  if (!hasConnections) {
    return (
      <div className="py-4 text-center">
        <div className={`inline-flex items-center justify-center ${panelSize === 'l' ? 'w-14 h-14' : 'w-10 h-10'} rounded-full bg-zinc-100 dark:bg-zinc-800 mb-2`}>
          <FileText className={iconSize + ' text-zinc-400'} />
        </div>
        <p className={`${textSizes.sm} text-zinc-500 dark:text-zinc-400`}>
          No explicit relationships defined
        </p>
        <p className={`${textSizes.xs} text-zinc-400 dark:text-zinc-500 mt-1`}>
          Add <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">relationships</code> to frontmatter
        </p>
      </div>
    )
  }

  // Render a single relationship node as a list item
  const renderNodeItem = (node: GraphNode, type: 'requires' | 'references') => {
    const isRequires = type === 'requires'
    const colorClasses = isRequires 
      ? 'border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40'
      : 'border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40'
    const textColor = isRequires 
      ? 'text-red-700 dark:text-red-300' 
      : 'text-blue-700 dark:text-blue-300'
    const badgeColor = isRequires
      ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
      : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'

    return (
      <motion.button
        key={node.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={() => node.path && onNavigate?.(node.path)}
        disabled={!node.path}
        className={`
          w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border
          transition-all duration-200
          ${colorClasses}
          ${node.path ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default opacity-60'}
        `}
        title={node.path ? `Navigate to ${node.label}` : 'Not found in this weave'}
      >
        {/* Icon */}
        <div className={`shrink-0 ${isRequires ? 'text-red-500' : 'text-blue-500'}`}>
          {isRequires ? <ArrowLeft className={iconSize} /> : <ArrowRight className={iconSize} />}
        </div>
        
        {/* Label */}
        <span className={`flex-1 ${textSizes.sm} font-medium ${textColor} truncate text-left`}>
          {node.label}
        </span>
        
        {/* Navigate indicator */}
        {node.path && (
          <ExternalLink className={`${panelSize === 'l' ? 'w-3.5 h-3.5' : 'w-3 h-3'} opacity-50 group-hover:opacity-100 shrink-0 ${textColor}`} />
        )}
      </motion.button>
    )
  }

  // Collapsible section component
  const CollapsibleSection = ({ 
    title, 
    type, 
    nodes, 
    icon: Icon,
    accentColor 
  }: { 
    title: string
    type: 'requires' | 'references'
    nodes: GraphNode[]
    icon: typeof ArrowLeft
    accentColor: string
  }) => {
    const isExpanded = expandedSection === type
    
    if (nodes.length === 0) return null
    
    return (
      <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
        {/* Header */}
        <button
          onClick={() => setExpandedSection(isExpanded ? null : type)}
          className={`
            w-full flex items-center justify-between gap-2 px-3 py-2
            bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors
          `}
        >
          <div className="flex items-center gap-2">
            <Icon className={`${iconSize} ${accentColor}`} />
            <span className={`${textSizes.sm} font-semibold text-zinc-700 dark:text-zinc-200`}>
              {title}
            </span>
            <span className={`${textSizes.xs} px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300`}>
              {nodes.length}
            </span>
          </div>
          <ChevronDown className={`${iconSize} text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
                {nodes.map(node => renderNodeItem(node, type))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Current Strand Card */}
      <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-3 shadow-lg shadow-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="shrink-0 p-1.5 rounded-lg bg-white/20">
            <FileText className={iconSize + ' text-white'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${textSizes.base} font-bold text-white truncate`}>
              {currentNode?.label}
            </p>
            <p className={`${textSizes.xs} text-white/70`}>Current strand</p>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="mt-2 pt-2 border-t border-white/20 flex gap-4">
          {requiresNodes.length > 0 && (
            <div className="flex items-center gap-1">
              <ArrowLeft className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-red-300`} />
              <span className={`${textSizes.xs} text-white/80`}>{requiresNodes.length} prereq{requiresNodes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {referencesNodes.length > 0 && (
            <div className="flex items-center gap-1">
              <ArrowRight className={`${panelSize === 'l' ? 'w-3 h-3' : 'w-2.5 h-2.5'} text-blue-300`} />
              <span className={`${textSizes.xs} text-white/80`}>{referencesNodes.length} ref{referencesNodes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Relationship Lists - Scrollable and Interactive */}
      <div className="space-y-2">
        <CollapsibleSection
          title="Prerequisites"
          type="requires"
          nodes={requiresNodes}
          icon={ArrowLeft}
          accentColor="text-red-500"
        />
        
        <CollapsibleSection
          title="References"
          type="references"
          nodes={referencesNodes}
          icon={ArrowRight}
          accentColor="text-blue-500"
        />
      </div>
      
      {/* Legend */}
      <div className={`flex flex-wrap justify-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 ${textSizes.xs}`}>
        <div className="flex items-center gap-1.5">
          <div className={`${panelSize === 'l' ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-red-400`} />
          <span className="text-zinc-500 dark:text-zinc-400">Must read first</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`${panelSize === 'l' ? 'w-2.5 h-2.5' : 'w-2 h-2'} rounded-full bg-blue-400`} />
          <span className="text-zinc-500 dark:text-zinc-400">Related content</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Find a file path by slug or partial name match
 */
function findFilePath(slug: string, files: GitHubFile[]): string | undefined {
  // Exact slug match
  const exactMatch = files.find(f => 
    f.name?.replace('.md', '') === slug ||
    f.path?.endsWith(`/${slug}.md`) ||
    f.path?.endsWith(`/${slug}`)
  )
  if (exactMatch) return exactMatch.path
  
  // Partial match
  const partialMatch = files.find(f =>
    f.name?.toLowerCase().includes(slug.toLowerCase()) ||
    f.path?.toLowerCase().includes(slug.toLowerCase())
  )
  return partialMatch?.path
}
