/**
 * Reusable paper-textured card with analog depth styling
 * @module codex/ui/PaperCard
 */

'use client'

import type { ReactNode } from 'react'

interface PaperCardProps {
  /** Card content */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Whether to show paper texture overlay */
  showTexture?: boolean
  /** Whether to show inner shadow for depth */
  showShadow?: boolean
  /** Texture intensity (0-1) */
  textureOpacity?: number
}

/**
 * Card component with analog paper texture and depth styling
 * 
 * @remarks
 * - Subtle noise texture overlay for tactile feel
 * - Inner shadow for embossed depth
 * - Configurable opacity and effects
 * - Light/dark mode compatible
 * 
 * @example
 * ```tsx
 * <PaperCard showTexture showShadow>
 *   <h2>My Content</h2>
 *   <p>Some text...</p>
 * </PaperCard>
 * ```
 */
export default function PaperCard({
  children,
  className = '',
  showTexture = true,
  showShadow = true,
  textureOpacity = 0.02,
}: PaperCardProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Paper Texture Overlay */}
      {showTexture && (
        <div
          className="absolute inset-0 pointer-events-none dark:opacity-50"
          style={{
            opacity: textureOpacity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}
        />
      )}

      {/* Inner Shadow for Depth */}
      {showShadow && (
        <div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), inset 0 -2px 8px rgba(0,0,0,0.03)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}



