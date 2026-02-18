/**
 * InteractiveRelationGraph - Visual node graph for strand relationships
 * @module codex/ui/InteractiveRelationGraph
 * 
 * Beautiful animated graph showing current strand's relationships.
 * Central node with orbiting related strands, click to navigate.
 */

'use client'

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { FileText, ArrowRight, Sparkles, Zap, ExternalLink, X } from 'lucide-react'
import type { StrandMetadata, GitHubFile } from '../../types'

interface InteractiveRelationGraphProps {
  metadata: StrandMetadata
  currentFile: GitHubFile | null
  currentPath: string
  allFiles: GitHubFile[]
  onNavigate?: (path: string) => void
  theme?: string
  panelSize?: 's' | 'm' | 'l'
}

interface RelationNode {
  id: string
  label: string
  type: 'current' | 'prerequisite' | 'reference' | 'tag' | 'sibling'
  path?: string
  angle: number
  distance: number
}

// Vibrant color palette
const COLORS = {
  current: {
    bg: 'from-cyan-500 via-blue-500 to-purple-500',
    glow: 'rgba(6, 182, 212, 0.5)',
    ring: 'ring-cyan-400/50',
  },
  prerequisite: {
    bg: 'from-rose-500 to-pink-500',
    glow: 'rgba(244, 63, 94, 0.4)',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-700',
  },
  reference: {
    bg: 'from-emerald-500 to-teal-500',
    glow: 'rgba(16, 185, 129, 0.4)',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700',
  },
  tag: {
    bg: 'from-amber-500 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.4)',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
  },
  sibling: {
    bg: 'from-violet-500 to-purple-500',
    glow: 'rgba(139, 92, 246, 0.4)',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-300 dark:border-violet-700',
  },
}

/**
 * Animated connection line between nodes
 */
function ConnectionLine({
  start,
  end,
  type,
  isHovered,
  delay = 0,
}: {
  start: { x: number; y: number }
  end: { x: number; y: number }
  type: string
  isHovered: boolean
  delay?: number
}) {
  const pathRef = useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = useState(0)
  
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength())
    }
  }, [start, end])
  
  // Curved path
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const curvature = 0.2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const controlX = midX - dy * curvature
  const controlY = midY + dx * curvature
  
  const pathD = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`
  
  const strokeColor = type === 'prerequisite' 
    ? 'rgb(244, 63, 94)' 
    : type === 'reference' 
      ? 'rgb(16, 185, 129)' 
      : type === 'tag'
        ? 'rgb(245, 158, 11)'
        : 'rgb(139, 92, 246)'
  
  return (
    <motion.path
      ref={pathRef}
      d={pathD}
      fill="none"
      stroke={strokeColor}
      strokeWidth={isHovered ? 3 : 2}
      strokeLinecap="round"
      strokeDasharray={pathLength}
      initial={{ strokeDashoffset: pathLength, opacity: 0 }}
      animate={{ 
        strokeDashoffset: 0, 
        opacity: isHovered ? 1 : 0.5,
      }}
      transition={{ 
        strokeDashoffset: { duration: 0.8, delay, ease: 'easeOut' },
        opacity: { duration: 0.3 },
      }}
      style={{
        filter: isHovered ? `drop-shadow(0 0 4px ${strokeColor})` : 'none',
      }}
    />
  )
}

/**
 * Orbital node component with hover effects
 */
function OrbitalNode({
  node,
  centerX,
  centerY,
  onNavigate,
  onHover,
  isHovered,
  index,
  panelSize,
}: {
  node: RelationNode
  centerX: number
  centerY: number
  onNavigate?: (path: string) => void
  onHover: (id: string | null) => void
  isHovered: boolean
  index: number
  panelSize: 's' | 'm' | 'l'
}) {
  const x = centerX + Math.cos(node.angle) * node.distance
  const y = centerY + Math.sin(node.angle) * node.distance
  
  const colors = COLORS[node.type as keyof typeof COLORS] || COLORS.sibling
  const nodeSize = panelSize === 'l' ? 44 : panelSize === 'm' ? 38 : 32
  
  // Gentle floating animation
  const floatY = useSpring(0, { stiffness: 100, damping: 10 })
  
  useEffect(() => {
    const interval = setInterval(() => {
      floatY.set(Math.sin(Date.now() / 1000 + index) * 3)
    }, 50)
    return () => clearInterval(interval)
  }, [floatY, index])
  
  const animatedY = useTransform(floatY, (v) => y + v)
  
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        delay: 0.2 + index * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
    >
      {/* Connection line */}
      <ConnectionLine
        start={{ x: centerX, y: centerY }}
        end={{ x, y }}
        type={node.type}
        isHovered={isHovered}
        delay={0.1 + index * 0.05}
      />
      
      {/* Node */}
      <motion.g
        style={{ y: animatedY }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => node.path && onNavigate?.(node.path)}
        className={node.path ? 'cursor-pointer' : 'cursor-default'}
      >
        {/* Glow effect */}
        <motion.circle
          cx={x}
          cy={0}
          r={nodeSize / 2 + 8}
          fill={colors.glow || 'rgba(0,0,0,0.1)'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: isHovered ? 1.5 : 1,
            opacity: isHovered ? 0.8 : 0.3,
          }}
          transition={{ duration: 0.3 }}
          style={{ filter: 'blur(8px)' }}
        />
        
        {/* Main circle */}
        <motion.circle
          cx={x}
          cy={0}
          r={nodeSize / 2}
          fill="url(#nodeGradient)"
          stroke={isHovered ? 'white' : 'transparent'}
          strokeWidth={2}
          animate={{
            scale: isHovered ? 1.15 : 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        />
        
        {/* Icon */}
        <foreignObject
          x={x - nodeSize / 4}
          y={-nodeSize / 4}
          width={nodeSize / 2}
          height={nodeSize / 2}
          className="pointer-events-none"
        >
          <div className="w-full h-full flex items-center justify-center">
            {node.type === 'prerequisite' && (
              <Zap className={`${panelSize === 'l' ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
            )}
            {node.type === 'reference' && (
              <ArrowRight className={`${panelSize === 'l' ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
            )}
            {node.type === 'tag' && (
              <Sparkles className={`${panelSize === 'l' ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
            )}
            {node.type === 'sibling' && (
              <FileText className={`${panelSize === 'l' ? 'w-4 h-4' : 'w-3 h-3'} text-white`} />
            )}
          </div>
        </foreignObject>
        
        {/* Label */}
        <motion.text
          x={x}
          y={nodeSize / 2 + 12}
          textAnchor="middle"
          className={`${panelSize === 'l' ? 'text-[10px]' : 'text-[8px]'} font-medium fill-current text-zinc-700 dark:text-zinc-300`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + index * 0.1 }}
        >
          {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
        </motion.text>
        
        {/* Navigate indicator on hover */}
        {isHovered && node.path && (
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            <circle
              cx={x + nodeSize / 3}
              cy={-nodeSize / 3}
              r={8}
              fill="white"
              className="drop-shadow-lg"
            />
            <foreignObject
              x={x + nodeSize / 3 - 5}
              y={-nodeSize / 3 - 5}
              width={10}
              height={10}
            >
              <ExternalLink className="w-2.5 h-2.5 text-zinc-600" />
            </foreignObject>
          </motion.g>
        )}
      </motion.g>
    </motion.g>
  )
}

/**
 * Central current strand node
 */
function CenterNode({
  label,
  centerX,
  centerY,
  panelSize,
}: {
  label: string
  centerX: number
  centerY: number
  panelSize: 's' | 'm' | 'l'
}) {
  const nodeSize = panelSize === 'l' ? 60 : panelSize === 'm' ? 50 : 44
  
  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Pulse ring animation */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r={nodeSize / 2 + 4}
        fill="none"
        stroke="url(#pulseGradient)"
        strokeWidth={2}
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.8, 0, 0.8],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Outer glow */}
      <motion.circle
        cx={centerX}
        cy={centerY}
        r={nodeSize / 2 + 12}
        fill={COLORS.current.glow}
        style={{ filter: 'blur(12px)' }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Main node */}
      <circle
        cx={centerX}
        cy={centerY}
        r={nodeSize / 2}
        fill="url(#centerGradient)"
        className={`ring-4 ${COLORS.current.ring}`}
      />
      
      {/* Icon */}
      <foreignObject
        x={centerX - nodeSize / 4}
        y={centerY - nodeSize / 4}
        width={nodeSize / 2}
        height={nodeSize / 2}
      >
        <div className="w-full h-full flex items-center justify-center">
          <FileText className={`${panelSize === 'l' ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
        </div>
      </foreignObject>
      
      {/* Label */}
      <text
        x={centerX}
        y={centerY + nodeSize / 2 + 14}
        textAnchor="middle"
        className={`${panelSize === 'l' ? 'text-xs' : 'text-[10px]'} font-bold fill-current text-zinc-800 dark:text-zinc-200`}
      >
        {label.length > 16 ? label.slice(0, 16) + '...' : label}
      </text>
    </motion.g>
  )
}

/**
 * Interactive relationship graph visualization
 */
export default function InteractiveRelationGraph({
  metadata,
  currentFile,
  currentPath,
  allFiles,
  onNavigate,
  theme = 'light',
  panelSize = 's',
}: InteractiveRelationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 280, height: 200 })
  
  const isDark = theme?.includes('dark')
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const { width } = svgRef.current.parentElement.getBoundingClientRect()
        const height = panelSize === 'l' ? 240 : panelSize === 'm' ? 200 : 180
        setDimensions({ width: Math.max(200, width - 16), height })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [panelSize])
  
  // Build relation nodes
  const { nodes, currentLabel } = useMemo(() => {
    const nodes: RelationNode[] = []
    const currentLabel = metadata.title || currentFile?.name?.replace('.md', '') || 'Current'
    
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
    
    // Add tags as nodes (max 3)
    const tags = Array.isArray(metadata.tags) 
      ? metadata.tags.slice(0, 3) 
      : metadata.tags 
        ? [metadata.tags].slice(0, 3) 
        : []
    
    // Calculate positions in orbital layout
    const allRelations = [
      ...prerequisites.map(p => ({ label: p, type: 'prerequisite' as const })),
      ...references.map(r => ({ label: r, type: 'reference' as const })),
      ...tags.map(t => ({ label: String(t), type: 'tag' as const })),
    ]
    
    const totalNodes = allRelations.length
    if (totalNodes === 0) return { nodes: [], currentLabel }
    
    const baseDistance = panelSize === 'l' ? 70 : panelSize === 'm' ? 60 : 55
    
    allRelations.forEach((rel, i) => {
      const angle = (i / totalNodes) * 2 * Math.PI - Math.PI / 2
      nodes.push({
        id: `${rel.type}-${i}`,
        label: rel.label,
        type: rel.type,
        path: findFilePath(rel.label, allFiles),
        angle,
        distance: baseDistance + (i % 2) * 15, // Stagger distances
      })
    })
    
    return { nodes, currentLabel }
  }, [metadata, currentFile, allFiles, panelSize])
  
  const centerX = dimensions.width / 2
  const centerY = dimensions.height / 2 - 10
  
  // No relationships - show empty state
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center mb-3"
        >
          <FileText className="w-7 h-7 text-zinc-400" />
        </motion.div>
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          No relationships defined
        </p>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
          Add <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px]">relationships</code> to frontmatter
        </p>
      </div>
    )
  }
  
  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="overflow-visible"
      >
        {/* Gradients */}
        <defs>
          <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          
          <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          
          {/* Prerequisite gradient */}
          <linearGradient id="prereqGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          
          {/* Reference gradient */}
          <linearGradient id="refGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          
          {/* Tag gradient */}
          <linearGradient id="tagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        
        {/* Background decoration */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={panelSize === 'l' ? 90 : panelSize === 'm' ? 75 : 65}
          fill="none"
          stroke={isDark ? 'rgba(63, 63, 70, 0.3)' : 'rgba(228, 228, 231, 0.5)'}
          strokeWidth={1}
          strokeDasharray="4 4"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
        
        {/* Orbital nodes */}
        {nodes.map((node, i) => (
          <OrbitalNode
            key={node.id}
            node={node}
            centerX={centerX}
            centerY={centerY}
            onNavigate={onNavigate}
            onHover={setHoveredNode}
            isHovered={hoveredNode === node.id}
            index={i}
            panelSize={panelSize}
          />
        ))}
        
        {/* Center node (current strand) */}
        <CenterNode
          label={currentLabel}
          centerX={centerX}
          centerY={centerY}
          panelSize={panelSize}
        />
      </svg>
      
      {/* Legend */}
      <div className={`
        flex flex-wrap justify-center gap-2 mt-2 px-2
        ${panelSize === 'l' ? 'text-[10px]' : 'text-[8px]'}
      `}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Prerequisites</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <span className="text-zinc-500 dark:text-zinc-400">References</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <span className="text-zinc-500 dark:text-zinc-400">Tags</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Find a file path by slug or partial name match
 */
function findFilePath(slug: string, files: GitHubFile[]): string | undefined {
  const exactMatch = files.find(f => 
    f.name?.replace('.md', '') === slug ||
    f.path?.endsWith(`/${slug}.md`) ||
    f.path?.endsWith(`/${slug}`)
  )
  if (exactMatch) return exactMatch.path
  
  const partialMatch = files.find(f =>
    f.name?.toLowerCase().includes(slug.toLowerCase()) ||
    f.path?.toLowerCase().includes(slug.toLowerCase())
  )
  return partialMatch?.path
}














