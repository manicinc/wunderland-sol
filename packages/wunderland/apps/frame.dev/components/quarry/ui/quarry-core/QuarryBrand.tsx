/**
 * QuarryBrand - Customizable brand display component
 *
 * Shows the "Quarry" brand (immutable) with a customizable suffix.
 * The suffix defaults to "Codex" but can be changed to Garden, Notes, Library, etc.
 *
 * Examples:
 * - "Quarry Codex" (default)
 * - "Quarry Garden"
 * - "Quarry Notes"
 * - "Quarry Library"
 * - "Quarry Vault"
 *
 * Users can also customize the suffix color.
 *
 * @module codex/ui/QuarryBrand
 */

'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { useInstanceConfig } from '@/lib/config'
import { useQuarryPath } from '@/lib/hooks/useQuarryPath'

interface QuarryBrandProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Show the icon */
  showIcon?: boolean
  /** Show tagline */
  showTagline?: boolean
  /** Link to home */
  linkToHome?: boolean
  /** Home URL */
  homeUrl?: string
  /** Theme override */
  theme?: string
  /** Additional className */
  className?: string
  /** Compact mode - icon only on small screens */
  compact?: boolean
  /** Interactive hover effects */
  interactive?: boolean
  /** Click handler - called before navigation to reset state */
  onClick?: () => void
  
  // Preview overrides - for settings preview before saving
  /** Override codex name for preview */
  previewCodexName?: string
  /** Override suffix color for preview */
  previewSuffixColor?: string
  /** Override tagline for preview */
  previewTagline?: string
  /** Override showCodexSuffix for preview */
  previewShowSuffix?: boolean
}

const sizeClasses = {
  xs: {
    icon: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
    name: 'text-[11px] sm:text-xs',
    codex: 'text-[7px] sm:text-[8px]',
    tagline: 'text-[7px] sm:text-[8px]',
    gap: 'gap-0.5 sm:gap-1',
  },
  sm: {
    icon: 'w-4 h-4 sm:w-5 sm:h-5',
    name: 'text-xs sm:text-sm',
    codex: 'text-[8px] sm:text-[10px]',
    tagline: 'text-[8px] sm:text-[9px]',
    gap: 'gap-1 sm:gap-1.5',
  },
  md: {
    icon: 'w-5 h-5 sm:w-6 sm:h-6',
    name: 'text-sm sm:text-base',
    codex: 'text-[10px] sm:text-xs',
    tagline: 'text-[9px] sm:text-[10px]',
    gap: 'gap-1 sm:gap-1.5',
  },
  lg: {
    icon: 'w-6 h-6 sm:w-8 sm:h-8',
    name: 'text-base sm:text-lg',
    codex: 'text-xs sm:text-sm',
    tagline: 'text-[10px] sm:text-xs',
    gap: 'gap-1.5 sm:gap-2',
  },
}

export default function QuarryBrand({
  size = 'sm',
  showIcon = true,
  showTagline = false,
  linkToHome = true,
  homeUrl = '/quarry/app',
  theme: themeProp,
  className = '',
  compact = false,
  interactive = true,
  onClick,
  // Preview overrides
  previewCodexName,
  previewSuffixColor,
  previewTagline,
  previewShowSuffix,
}: QuarryBrandProps) {
  const { config, brandName, codexName: savedCodexName } = useInstanceConfig()
  const pathname = usePathname()
  const classes = sizeClasses[size]
  const resolvePath = useQuarryPath()
  const { resolvedTheme } = useTheme()

  // Determine dark mode from theme prop or fall back to system theme
  const isDark = themeProp?.includes('dark') ?? resolvedTheme === 'dark'

  // Smart home URL: logo links to app home, resolved for domain
  // On quarry.space: /, on frame.dev: /quarry
  const effectiveHomeUrl = resolvePath(homeUrl)
  
  // Use preview values if provided, otherwise use saved config
  const codexName = previewCodexName ?? savedCodexName
  const showSuffix = previewShowSuffix ?? config.showCodexSuffix
  const tagline = previewTagline ?? config.tagline
  
  // Suffix color: preview > config > theme default (emerald)
  const suffixColor = previewSuffixColor || config.suffixColor || (isDark ? '#34d399' : '#10b981')
  
  const content = (
    <motion.div 
      className={`flex items-center ${classes.gap} ${className}`}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
    >
      {/* Icon */}
      {showIcon && (
        <div className={`relative ${classes.icon} flex-shrink-0`}>
          {config.iconUrl ? (
            <Image
              src={config.iconUrl}
              alt={brandName}
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <Image
                src="/quarry-icon-mono-light.svg"
                alt={brandName}
                width={32}
                height={32}
                className="w-full h-full block dark:hidden"
              />
              <Image
                src="/quarry-icon-mono-dark.svg"
                alt={brandName}
                width={32}
                height={32}
                className="w-full h-full hidden dark:block absolute inset-0"
              />
            </>
          )}
        </div>
      )}
      
      {/* Text - hide on compact mobile if needed */}
      <div className={compact ? 'hidden sm:flex flex-col' : 'flex flex-col'}>
        <div className="flex items-baseline gap-1">
          {/* Brand Name (Quarry) - Fraunces font per brand spec */}
          <span 
            className={`${classes.name} font-display font-normal tracking-[0.01em] text-zinc-900 dark:text-zinc-100`}
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, Georgia, serif' }}
          >
            {brandName}
          </span>
          
          {/* Codex Suffix - customizable name with custom color, hidden on mobile */}
          {showSuffix && (
            <span
              className={`${classes.codex} font-semibold tracking-[0.08em] uppercase hidden sm:inline`}
              style={{ 
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                color: suffixColor,
              }}
            >
              {codexName}
            </span>
          )}
        </div>
        
        {/* Tagline - Inter font per brand spec */}
        {showTagline && tagline && (
          <span 
            className={`${classes.tagline} text-zinc-500 dark:text-zinc-400 leading-tight tracking-[0.04em]`}
            style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
          >
            {tagline}
          </span>
        )}
      </div>
    </motion.div>
  )
  
  if (linkToHome) {
    return (
      <Link
        href={effectiveHomeUrl}
        className="group"
        onClick={(e) => {
          // Call onClick handler to reset state before navigation
          if (onClick) {
            onClick()
          }
        }}
      >
        {content}
      </Link>
    )
  }
  
  // If not linking to home but has onClick, make it a button
  if (onClick) {
    return (
      <button onClick={onClick} className="group">
        {content}
      </button>
    )
  }
  
  return content
}

/**
 * Compact brand for tight spaces (icon + abbreviated text)
 */
export function QuarryBrandCompact({
  theme,
  className = '',
}: {
  theme?: string
  className?: string
}) {
  return (
    <QuarryBrand
      size="xs"
      showIcon={true}
      showTagline={false}
      compact={true}
      theme={theme}
      className={className}
    />
  )
}

/**
 * Full brand with tagline for landing pages
 */
export function QuarryBrandFull({
  theme,
  className = '',
}: {
  theme?: string
  className?: string
}) {
  return (
    <QuarryBrand
      size="lg"
      showIcon={true}
      showTagline={true}
      linkToHome={false}
      theme={theme}
      className={className}
    />
  )
}

/**
 * Inline text-only brand (no icon)
 */
export function QuarryBrandText({
  size = 'sm',
  theme,
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  theme?: string
  className?: string
}) {
  return (
    <QuarryBrand
      size={size}
      showIcon={false}
      showTagline={false}
      theme={theme}
      className={className}
    />
  )
}

