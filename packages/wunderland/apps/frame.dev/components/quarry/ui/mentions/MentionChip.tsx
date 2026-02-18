'use client'

/**
 * Mention Chip Component
 * @module components/quarry/ui/mentions/MentionChip
 *
 * @description
 * Inline rendered mention chip that displays entity information
 * with hover preview and click-to-navigate behavior.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Calendar,
  User,
  FileText,
  CalendarDays,
  Folder,
  Users,
  Lightbulb,
  Tag,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MentionableEntity, MentionableEntityType } from '@/lib/mentions/types'
import { ENTITY_TYPE_COLORS } from '@/lib/mentions/types'

// ============================================================================
// TYPES
// ============================================================================

export interface MentionChipProps {
  /** The mentionable entity to display */
  entity: MentionableEntity
  /** Click handler */
  onClick?: () => void
  /** Whether the chip is editable (can be removed) */
  editable?: boolean
  /** Remove handler */
  onRemove?: () => void
  /** Additional class names */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the type icon */
  showIcon?: boolean
  /** Whether to show hover preview */
  showPreview?: boolean
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const EntityIcon: React.FC<{ type: MentionableEntityType; className?: string }> = ({
  type,
  className,
}) => {
  const iconClass = cn('w-3.5 h-3.5', className)
  
  switch (type) {
    case 'place':
      return <MapPin className={iconClass} />
    case 'date':
      return <Calendar className={iconClass} />
    case 'person':
      return <User className={iconClass} />
    case 'strand':
      return <FileText className={iconClass} />
    case 'event':
      return <CalendarDays className={iconClass} />
    case 'project':
      return <Folder className={iconClass} />
    case 'team':
      return <Users className={iconClass} />
    case 'concept':
      return <Lightbulb className={iconClass} />
    case 'tag':
      return <Tag className={iconClass} />
    default:
      return <HelpCircle className={iconClass} />
  }
}

// ============================================================================
// PREVIEW POPUP
// ============================================================================

interface PreviewPopupProps {
  entity: MentionableEntity
}

const PreviewPopup: React.FC<PreviewPopupProps> = ({ entity }) => {
  const color = entity.color || ENTITY_TYPE_COLORS[entity.type]
  
  // Format properties for display
  const displayProperties = Object.entries(entity.properties || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .slice(0, 5)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
    >
      <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div
          className="px-3 py-2 border-b border-border/50"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-6 h-6 rounded"
              style={{ backgroundColor: `${color}20` }}
            >
              <span style={{ color }}>
                <EntityIcon type={entity.type} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{entity.label}</h4>
              <p className="text-xs text-muted-foreground capitalize">{entity.type}</p>
            </div>
          </div>
        </div>
        
        {/* Description */}
        {entity.description && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
            {entity.description}
          </div>
        )}
        
        {/* Properties */}
        {displayProperties.length > 0 && (
          <div className="px-3 py-2 space-y-1">
            {displayProperties.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground capitalize whitespace-nowrap">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-foreground truncate">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Source strand link */}
        {entity.sourceStrandPath && (
          <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span className="truncate">{entity.sourceStrandPath}</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </div>
          </div>
        )}
      </div>
      
      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-popover border-r border-b border-border" />
    </motion.div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MentionChip: React.FC<MentionChipProps> = ({
  entity,
  onClick,
  editable = false,
  onRemove,
  className,
  size = 'md',
  showIcon = true,
  showPreview = true,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const color = entity.color || ENTITY_TYPE_COLORS[entity.type]
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-0.5 gap-1.5',
    lg: 'text-base px-2.5 py-1 gap-2',
  }
  
  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded-full font-medium cursor-pointer transition-all',
        'border hover:shadow-sm',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        color: color,
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* @ Symbol */}
      <span className="opacity-60">@</span>
      
      {/* Icon */}
      {showIcon && (
        <EntityIcon
          type={entity.type}
          className={cn(
            size === 'sm' && 'w-3 h-3',
            size === 'md' && 'w-3.5 h-3.5',
            size === 'lg' && 'w-4 h-4'
          )}
        />
      )}
      
      {/* Label */}
      <span>{entity.label}</span>
      
      {/* Remove button */}
      {editable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
      
      {/* Hover Preview */}
      {showPreview && (
        <AnimatePresence>
          {isHovered && <PreviewPopup entity={entity} />}
        </AnimatePresence>
      )}
    </span>
  )
}

export default MentionChip

