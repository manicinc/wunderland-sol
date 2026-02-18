/**
 * Heading Anchor Component
 * @module codex/ui/outline/HeadingAnchor
 *
 * Shows a hoverable anchor link (#) next to headings for easy sharing.
 * Features:
 * - Appears on hover
 * - Click to copy link to clipboard
 * - Smooth visual feedback
 * - Respects theme
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Link, Check, Copy } from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface HeadingAnchorProps {
  /** Heading slug/ID for the anchor */
  slug: string
  /** Heading level (1-6) for sizing */
  level?: number
  /** Theme */
  theme?: string
  /** Base URL for the link (defaults to current page) */
  baseUrl?: string
  /** Position relative to heading */
  position?: 'left' | 'right'
  /** Custom className */
  className?: string
  /** Whether parent is hovered (for external hover control) */
  isParentHovered?: boolean
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function HeadingAnchor({
  slug,
  level = 2,
  theme = 'light',
  baseUrl,
  position = 'left',
  className = '',
  isParentHovered,
}: HeadingAnchorProps) {
  const isDark = theme?.includes('dark')
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Determine visibility
  const isVisible = isParentHovered ?? isHovered
  
  // Build the full URL
  const getFullUrl = useCallback(() => {
    if (typeof window === 'undefined') return `#${slug}`
    
    const base = baseUrl || window.location.href.split('#')[0]
    return `${base}#${slug}`
  }, [slug, baseUrl])
  
  // Copy link to clipboard
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const url = getFullUrl()
    
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }, [getFullUrl])
  
  // Navigate to anchor
  const handleClick = useCallback((e: React.MouseEvent) => {
    // If it's a regular click, navigate to anchor
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault()
      const element = document.getElementById(slug)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Update URL without page reload
        window.history.pushState(null, '', `#${slug}`)
      }
    }
  }, [slug])
  
  // Size based on heading level
  const iconSize = level <= 2 ? 'w-4 h-4' : 'w-3.5 h-3.5'
  
  return (
    <a
      href={`#${slug}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        inline-flex items-center justify-center
        rounded transition-all duration-200
        ${position === 'left' ? 'mr-2' : 'ml-2'}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}
        ${isDark
          ? 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
          : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50'
        }
        ${className}
      `}
      title={copied ? 'Copied!' : 'Copy link to section'}
      aria-label={`Link to ${slug}`}
    >
      <span
        className={`
          p-1 rounded cursor-pointer
          ${copied ? 'ring-2 ring-emerald-500/50' : ''}
        `}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className={`${iconSize} text-emerald-500`} />
        ) : (
          <Link className={iconSize} />
        )}
      </span>
    </a>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADING WRAPPER
   Wraps a heading element to add anchor link functionality
═══════════════════════════════════════════════════════════════════════════ */

export interface HeadingWithAnchorProps {
  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Heading ID/slug */
  id: string
  /** Theme */
  theme?: string
  /** Children (heading content) */
  children: React.ReactNode
  /** Additional className for heading */
  className?: string
}

export function HeadingWithAnchor({
  level,
  id,
  theme = 'light',
  children,
  className = '',
}: HeadingWithAnchorProps) {
  const [isHovered, setIsHovered] = useState(false)
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  
  return (
    <Tag
      id={id}
      className={`group relative flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HeadingAnchor
        slug={id}
        level={level}
        theme={theme}
        isParentHovered={isHovered}
        position="left"
        className="absolute -left-8"
      />
      {children}
    </Tag>
  )
}

