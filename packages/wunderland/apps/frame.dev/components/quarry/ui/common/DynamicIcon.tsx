/**
 * Dynamic Lucide Icon Loader
 * @module codex/ui/DynamicIcon
 * 
 * @remarks
 * Dynamically loads Lucide icons by name string.
 * Used for weave/loom custom icons from YAML config.
 * Accessible with proper ARIA attributes.
 */

'use client'

import React, { useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Type for valid Lucide icon names
export type LucideIconName = keyof typeof LucideIcons

// Curated list of recommended icons for weaves/looms
// Organized by category for easier selection
export const RECOMMENDED_ICONS = {
  // Knowledge & Learning
  knowledge: [
    'BookOpen', 'Book', 'GraduationCap', 'Library', 'Lightbulb', 
    'Brain', 'Sparkles', 'Star', 'Zap', 'Award'
  ],
  // Technology & Code
  technology: [
    'Code', 'Terminal', 'Cpu', 'Server', 'Database', 
    'Cloud', 'Wifi', 'Smartphone', 'Monitor', 'Laptop'
  ],
  // Science & Math
  science: [
    'Atom', 'FlaskConical', 'Microscope', 'Dna', 'Calculator',
    'Sigma', 'Pi', 'Infinity', 'BarChart', 'LineChart'
  ],
  // Creative & Media
  creative: [
    'Palette', 'Paintbrush', 'Camera', 'Video', 'Music',
    'Mic', 'Film', 'Image', 'Pen', 'PenTool'
  ],
  // Business & Finance
  business: [
    'Briefcase', 'Building', 'DollarSign', 'TrendingUp', 'PieChart',
    'Target', 'Users', 'UserCircle', 'Handshake', 'Scale'
  ],
  // Nature & Health
  nature: [
    'Leaf', 'Tree', 'Flower', 'Sun', 'Moon',
    'Heart', 'Activity', 'Stethoscope', 'Apple', 'Droplet'
  ],
  // Communication & Social
  communication: [
    'MessageCircle', 'Mail', 'Send', 'Share2', 'Globe',
    'Link', 'Rss', 'Radio', 'Phone', 'AtSign'
  ],
  // Navigation & Structure
  navigation: [
    'Folder', 'FolderOpen', 'Layers', 'Box', 'Grid',
    'Layout', 'Map', 'Compass', 'Navigation', 'Route'
  ],
  // Tools & Settings
  tools: [
    'Wrench', 'Settings', 'Cog', 'Hammer', 'Scissors',
    'Key', 'Lock', 'Shield', 'Filter', 'Search'
  ],
  // Documents & Files
  documents: [
    'FileText', 'File', 'Files', 'Clipboard', 'ScrollText',
    'Newspaper', 'BookMarked', 'Archive', 'FolderKanban', 'ListTodo'
  ],
} as const

// Flatten all recommended icons into a single array
export const ALL_RECOMMENDED_ICONS = Object.values(RECOMMENDED_ICONS).flat()

// Get all available Lucide icon names (for advanced users)
export const ALL_LUCIDE_ICONS = Object.keys(LucideIcons).filter(
  key => key !== 'createLucideIcon' && 
         key !== 'default' && 
         typeof (LucideIcons as any)[key] === 'function'
) as LucideIconName[]

interface DynamicIconProps {
  /** Icon name from Lucide library */
  name: string
  /** CSS class for styling */
  className?: string
  /** Icon size (applies to both width and height) */
  size?: number | string
  /** Stroke width */
  strokeWidth?: number
  /** Accessible label */
  'aria-label'?: string
  /** Inline style */
  style?: React.CSSProperties
  /** Fallback icon if name not found */
  fallback?: LucideIconName
}

/**
 * Check if a string is a valid Lucide icon name
 */
export function isValidIconName(name: string): name is LucideIconName {
  return name in LucideIcons && typeof (LucideIcons as any)[name] === 'function'
}

/**
 * Get a Lucide icon component by name
 */
export function getIconByName(name: string): LucideIcon | null {
  if (isValidIconName(name)) {
    return (LucideIcons as any)[name] as LucideIcon
  }
  return null
}

/**
 * Dynamic icon component that loads Lucide icons by name
 * 
 * @example
 * ```tsx
 * <DynamicIcon name="BookOpen" className="w-5 h-5" />
 * <DynamicIcon name="InvalidIcon" fallback="Folder" />
 * ```
 */
export default function DynamicIcon({
  name,
  className = '',
  size,
  strokeWidth = 2,
  'aria-label': ariaLabel,
  style,
  fallback = 'HelpCircle',
}: DynamicIconProps) {
  const IconComponent = useMemo(() => {
    // Try to get the requested icon
    const icon = getIconByName(name)
    if (icon) return icon
    
    // Fall back to default if invalid
    return getIconByName(fallback) || LucideIcons.HelpCircle
  }, [name, fallback])

  return (
    <IconComponent
      className={className}
      size={size}
      strokeWidth={strokeWidth}
      aria-label={ariaLabel || name}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : 'presentation'}
      style={style}
    />
  )
}

/**
 * Icon with label for use in selectors/menus
 */
export function IconWithLabel({ 
  name, 
  label,
  className = '',
  iconClassName = 'w-4 h-4',
}: { 
  name: string
  label?: string
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <DynamicIcon name={name} className={iconClassName} />
      {label && <span>{label}</span>}
    </span>
  )
}


















