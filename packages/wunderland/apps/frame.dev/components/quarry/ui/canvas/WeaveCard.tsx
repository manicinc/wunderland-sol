/**
 * Weave Card - Special rendering for knowledge weaves
 * @module codex/ui/WeaveCard
 * 
 * @remarks
 * Weaves are top-level knowledge universes in the Quarry Codex schema.
 * This component provides a rich, visually distinctive display with:
 * - Animated entrance effects
 * - Metadata summary (loom count, strand count)
 * - Visual hierarchy indicators
 * - Quick navigation to looms
 * - Custom visual styling (thumbnail, cover, background, colors)
 */

'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Box, FileText, ChevronRight, Settings2 } from 'lucide-react'
import type { KnowledgeTreeNode, NodeVisualStyle } from '../../types'
import Image from 'next/image'
import DynamicIcon, { isValidIconName } from '../common/DynamicIcon'

interface WeaveCardProps {
  /** Weave node data */
  node: KnowledgeTreeNode
  /** Is this weave currently selected/active */
  isActive?: boolean
  /** Is this weave expanded */
  isExpanded?: boolean
  /** Toggle expansion callback */
  onToggle: () => void
  /** Navigate to weave callback */
  onNavigate: (path: string) => void
  /** Toggle a specific loom path in the tree */
  onToggleLoom?: (path: string) => void
  /** Edit weave config callback */
  onEdit?: (node: KnowledgeTreeNode) => void
  /** Current theme */
  theme?: string
}

// Weave-specific color palettes (fallback when no custom style)
const WEAVE_PALETTES = [
  { gradient: 'from-purple-500 to-indigo-600', accent: 'purple', bg: 'bg-purple-50 dark:bg-purple-950/30', color: '#8b5cf6' },
  { gradient: 'from-emerald-500 to-teal-600', accent: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/30', color: '#10b981' },
  { gradient: 'from-amber-500 to-orange-600', accent: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/30', color: '#f59e0b' },
  { gradient: 'from-cyan-500 to-blue-600', accent: 'cyan', bg: 'bg-cyan-50 dark:bg-cyan-950/30', color: '#06b6d4' },
  { gradient: 'from-rose-500 to-pink-600', accent: 'rose', bg: 'bg-rose-50 dark:bg-rose-950/30', color: '#f43f5e' },
]

/**
 * Get consistent palette for a weave based on its name
 */
function getWeavePalette(name: string, customStyle?: NodeVisualStyle) {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const basePalette = WEAVE_PALETTES[hash % WEAVE_PALETTES.length]
  
  // If custom accent color provided, create custom gradient
  if (customStyle?.accentColor) {
    return {
      ...basePalette,
      color: customStyle.accentColor,
      hasCustomStyle: true,
    }
  }
  
  return { ...basePalette, hasCustomStyle: false }
}

/**
 * Count looms in a weave node
 */
function countLooms(node: KnowledgeTreeNode): number {
  if (!node.children) return 0
  return node.children.filter(child => 
    child.type === 'dir' && child.level === 'loom'
  ).length
}

/**
 * Weave Card with rich metadata, animations, and custom visual styling
 */
export default function WeaveCard({
  node,
  isActive = false,
  isExpanded = false,
  onToggle,
  onNavigate,
  onToggleLoom,
  onEdit,
  theme = 'light',
}: WeaveCardProps) {
  const customStyle = node.style
  const palette = getWeavePalette(node.name, customStyle)
  const loomCount = countLooms(node)
  const isDark = theme.includes('dark')
  
  // Format display name
  const displayName = node.name
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Compute custom styles
  const cardStyles = useMemo(() => {
    const styles: React.CSSProperties = {}
    
    if (customStyle?.backgroundImage) {
      styles.backgroundImage = `url(${customStyle.backgroundImage})`
      styles.backgroundSize = 'cover'
      styles.backgroundPosition = 'center'
    }
    
    if (customStyle?.backgroundColor) {
      styles.backgroundColor = customStyle.backgroundColor
    }
    
    if (customStyle?.backgroundGradient) {
      styles.background = customStyle.backgroundGradient
    }
    
    if (customStyle?.borderColor) {
      styles.borderColor = customStyle.borderColor
    }
    
    return styles
  }, [customStyle])

  const textColorClass = customStyle?.darkText 
    ? 'text-zinc-900' 
    : customStyle?.textColor 
      ? '' 
      : 'text-zinc-900 dark:text-zinc-100'

  const accentGradient = customStyle?.backgroundGradient 
    ? customStyle.backgroundGradient 
    : `linear-gradient(to right, ${palette.color}, ${palette.color}dd)`
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="relative"
    >
      {/* Main Card - Premium glass styling with paper texture */}
      <motion.div
        className={`
          relative overflow-hidden rounded-xl
          border transition-all duration-300 touch-manipulation
          glass-subtle
          ${!customStyle?.backgroundColor && !customStyle?.backgroundGradient ? palette.bg : ''}
          ${isActive 
            ? `border-${palette.accent}-400/60 dark:border-${palette.accent}-600/50 shadow-premium ring-1 ring-${palette.accent}-500/10` 
            : 'border-zinc-200/60 dark:border-zinc-700/40 hover:border-zinc-300/60 dark:hover:border-zinc-600/50 hover:shadow-sm'
          }
        `}
        style={cardStyles}
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.995 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* Background overlay for readability when using images */}
        {customStyle?.backgroundImage && (
          <div 
            className="absolute inset-0 bg-black/40 dark:bg-black/60" 
            style={{ opacity: customStyle.backgroundOpacity ?? 0.4 }}
          />
        )}
        
        {/* Gradient header accent */}
        <div 
          className={`absolute top-0 left-0 right-0 h-0.5 ${!customStyle?.accentColor ? `bg-gradient-to-r ${palette.gradient}` : ''}`}
          style={customStyle?.accentColor ? { background: accentGradient } : undefined}
        />
        
        {/* Content - Touch-optimized with premium spacing */}
        <div className="relative p-2.5 z-10">
          {/* Header Row - Clickable to toggle - Touch-optimized */}
          <div
            onClick={onToggle}
            className="w-full flex items-center gap-2 text-left cursor-pointer group min-h-[44px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onToggle()}
          >
            {/* Icon/Thumbnail - supports images, emojis, Lucide icons */}
            {customStyle?.thumbnail ? (
              <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 border border-white/20">
                <Image 
                  src={customStyle.thumbnail} 
                  alt={displayName} 
                  width={28} 
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : customStyle?.emoji ? (
              <div className={`w-7 h-7 rounded flex items-center justify-center text-sm ${!customStyle?.backgroundColor ? `bg-gradient-to-br ${palette.gradient}` : 'bg-white/20'}`}>
                {customStyle.emoji}
              </div>
            ) : customStyle?.icon && isValidIconName(customStyle.icon) ? (
              <div 
                className={`p-1.5 rounded ${!customStyle?.accentColor ? `bg-gradient-to-br ${palette.gradient}` : ''}`}
                style={customStyle?.accentColor ? { background: accentGradient } : undefined}
              >
                <DynamicIcon name={customStyle.icon} className="w-3 h-3 text-white" aria-label={`${displayName} icon`} />
              </div>
            ) : (
              <div 
                className={`p-1.5 rounded ${!customStyle?.accentColor ? `bg-gradient-to-br ${palette.gradient}` : ''}`}
                style={customStyle?.accentColor ? { background: accentGradient } : undefined}
              >
                <Layers className="w-3 h-3 text-white" />
              </div>
            )}
            
            {/* Title & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 
                  className={`text-[11px] font-bold truncate ${customStyle?.backgroundImage ? 'text-white' : textColorClass}`}
                  style={customStyle?.textColor ? { color: customStyle.textColor } : undefined}
                >
                  {displayName}
                </h3>
                <span 
                  className={`text-[8px] uppercase tracking-wider font-bold px-1 rounded text-white ${!customStyle?.accentColor ? `bg-gradient-to-r ${palette.gradient}` : ''}`}
                  style={customStyle?.accentColor ? { background: accentGradient } : undefined}
                >
                  Weave
                </span>
              </div>
              
              {/* Description (if provided) */}
              {node.description && (
                <p className={`text-[8px] truncate mt-0.5 ${customStyle?.backgroundImage ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {node.description}
                </p>
              )}
              
              {/* Stats Row */}
              <div className="flex items-center gap-1.5">
                <span className={`flex items-center gap-0.5 text-[9px] ${customStyle?.backgroundImage ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  <Box className="w-2.5 h-2.5 text-amber-500" />
                  {loomCount}
                </span>
                <span className={`flex items-center gap-0.5 text-[9px] ${customStyle?.backgroundImage ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  <FileText className="w-2.5 h-2.5 text-emerald-500" />
                  {node.strandCount}
                </span>
              </div>
            </div>
            
            {/* Expand/Collapse + Edit + Explore - Touch-optimized */}
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(node)
                  }}
                  className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:opacity-90 touch-manipulation ${customStyle?.backgroundImage ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  whileTap={{ scale: 0.95 }}
                  title="Edit weave settings"
                >
                  <Settings2 className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isExpanded) onToggle()
                  onNavigate(node.path)
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white hover:opacity-90 shadow-sm touch-manipulation ${!customStyle?.accentColor ? `bg-gradient-to-r ${palette.gradient}` : ''}`}
                style={customStyle?.accentColor ? { background: accentGradient } : undefined}
                whileTap={{ scale: 0.95 }}
              >
                Explore
              </motion.button>
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="min-w-[24px] flex items-center justify-center"
              >
                <ChevronRight className={`w-4 h-4 ${customStyle?.backgroundImage ? 'text-white/60' : 'text-zinc-400'}`} />
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Expanded Looms List - Compact */}
        <AnimatePresence>
          {isExpanded && node.children && node.children.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="px-1.5 pb-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <div className="space-y-px">
                  {node.children
                    .filter(child => child.type === 'dir')
                    .map((loom, index) => (
                      <LoomItem
                        key={loom.path}
                        node={loom}
                        index={index}
                        onNavigate={onNavigate}
                        onToggleLoom={onToggleLoom}
                        palette={palette}
                      />
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/**
 * Individual loom item within a weave
 * Supports custom visual styling from loom.yaml
 */
function LoomItem({
  node,
  index,
  onNavigate,
  onToggleLoom,
  palette,
}: {
  node: KnowledgeTreeNode
  index: number
  onNavigate: (path: string) => void
  onToggleLoom?: (path: string) => void
  palette: typeof WEAVE_PALETTES[0]
}) {
  const customStyle = node.style
  const displayName = node.name
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // Custom background styles
  const itemStyles: React.CSSProperties = {}
  if (customStyle?.backgroundColor) {
    itemStyles.backgroundColor = customStyle.backgroundColor
  }
  if (customStyle?.backgroundGradient) {
    itemStyles.background = customStyle.backgroundGradient
  }
  
  return (
    <motion.button
      onClick={() => {
        // Expand the loom to show strands in sidebar
        onToggleLoom?.(node.path)
        // Navigate to the loom directory
        onNavigate(node.path)
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ x: 2 }}
      className={`
        w-full flex items-center gap-1 px-1 py-0.5 rounded
        text-left transition-all
        hover:bg-zinc-100 dark:hover:bg-zinc-800/50
        active:bg-zinc-200 dark:active:bg-zinc-800
        group
        ${customStyle?.backgroundColor || customStyle?.backgroundGradient ? 'hover:opacity-90' : ''}
      `}
      style={itemStyles}
    >
      {/* Thumbnail/Emoji/Icon or default icon */}
      {customStyle?.thumbnail ? (
        <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
          <Image 
            src={customStyle.thumbnail} 
            alt={displayName} 
            width={16} 
            height={16}
            className="w-full h-full object-cover"
          />
        </div>
      ) : customStyle?.emoji ? (
        <span className="text-[10px] flex-shrink-0">{customStyle.emoji}</span>
      ) : customStyle?.icon && isValidIconName(customStyle.icon) ? (
        <DynamicIcon 
          name={customStyle.icon} 
          className="w-2.5 h-2.5 flex-shrink-0" 
          style={customStyle?.accentColor ? { color: customStyle.accentColor } : { color: 'rgb(217 119 6)' }}
          aria-label={`${displayName} icon`}
        />
      ) : (
        <Box 
          className="w-2.5 h-2.5 flex-shrink-0" 
          style={customStyle?.accentColor ? { color: customStyle.accentColor } : undefined}
          color={customStyle?.accentColor || undefined}
        />
      )}
      
      <span 
        className={`flex-1 text-[10px] font-medium truncate capitalize ${
          customStyle?.darkText 
            ? 'text-zinc-900' 
            : 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
        }`}
        style={customStyle?.textColor ? { color: customStyle.textColor } : undefined}
      >
        {displayName}
      </span>
      
      {/* Description tooltip */}
      {node.description && (
        <span className="hidden group-hover:block absolute left-full ml-2 px-2 py-1 text-[8px] bg-zinc-900 text-white rounded whitespace-nowrap z-50">
          {node.description}
        </span>
      )}
      
      <span 
        className={`text-[8px] font-semibold px-1 rounded ${
          customStyle?.accentColor 
            ? 'text-white' 
            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
        }`}
        style={customStyle?.accentColor ? { backgroundColor: customStyle.accentColor } : undefined}
      >
        {node.strandCount}
      </span>
      
      <ChevronRight className="w-2.5 h-2.5 text-zinc-400" />
    </motion.button>
  )
}

