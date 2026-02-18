'use client'

/**
 * Focus Mode Icon
 * @module components/quarry/ui/icons/FocusIcon
 * 
 * Custom animated SVG icon for Focus Mode.
 * Features concentric circles with pulse animation on hover.
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface FocusIconProps {
    className?: string
    animated?: boolean
    size?: number
}

/**
 * Animated Focus icon with concentric circles and Quarry brand colors.
 * Pulses gently on hover to indicate it's a special interactive mode.
 */
export default function FocusIcon({
    className = '',
    animated = true,
    size = 24
}: FocusIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
                'transition-transform duration-300',
                animated && 'group-hover:scale-110',
                className
            )}
        >
            {/* Gradient definition */}
            <defs>
                <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                </linearGradient>
                <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Outer glow ring - animated */}
            <circle
                cx="12"
                cy="12"
                r="10"
                fill="url(#glowGradient)"
                className={cn(
                    animated && 'animate-[pulse_2s_ease-in-out_infinite]'
                )}
                style={{
                    transformOrigin: 'center',
                    opacity: 0.3,
                }}
            />

            {/* Outer ring */}
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="url(#focusGradient)"
                strokeWidth="1.5"
                fill="none"
                className={cn(
                    'transition-all duration-500',
                    animated && 'group-hover:stroke-[2]'
                )}
            />

            {/* Middle ring */}
            <circle
                cx="12"
                cy="12"
                r="6"
                stroke="url(#focusGradient)"
                strokeWidth="1.5"
                fill="none"
                strokeOpacity="0.7"
                className={cn(
                    'transition-all duration-500',
                    animated && 'group-hover:r-7'
                )}
            />

            {/* Inner dot */}
            <circle
                cx="12"
                cy="12"
                r="2.5"
                fill="url(#focusGradient)"
                className={cn(
                    'transition-all duration-300',
                    animated && 'group-hover:r-3'
                )}
            />
        </svg>
    )
}

/**
 * Inline variant for use in navigation menus.
 * Slightly smaller with adjusted proportions.
 */
export function FocusIconInline({ className = '' }: { className?: string }) {
    return <FocusIcon size={18} className={className} animated />
}

/**
 * Large variant for landing page hero sections.
 */
export function FocusIconLarge({ className = '' }: { className?: string }) {
    return <FocusIcon size={48} className={className} animated />
}
